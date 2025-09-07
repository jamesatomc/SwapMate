"use client";

import React, { useEffect, useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useBalance } from 'wagmi';
import { formatUnits, parseUnits, Address } from 'viem';
import { CONTRACTS, USDC_ABI, KANARI_ABI, SWAP_ABI, TOKENS, TokenKey, POOLS, PoolKey } from '@/lib/contracts';

type CustomPool = {
  poolAddress: string;
  tokenAKey?: string;
  tokenBKey?: string;
  pairName?: string;
};

export default function RemoveLiquidityPage() {
  const { address, isConnected } = useAccount();
  
  // State for removing liquidity
  const [selectedPool, setSelectedPool] = useState<string>('KANARI-NATIVE');
  const [customPools, setCustomPools] = useState<CustomPool[]>([]);
  const [lpAmount, setLpAmount] = useState('');
  const [percentage, setPercentage] = useState('25');
  const [slippage, setSlippage] = useState('0.5');
  const [isRemovingLiquidity, setIsRemovingLiquidity] = useState(false);
  const [showPoolSelect, setShowPoolSelect] = useState(false);

  // Get current pool info
  const currentPool = POOLS[(selectedPool as unknown) as PoolKey];
  let poolAddress: string | undefined = undefined;
  if (typeof selectedPool === 'string' && selectedPool.startsWith('CUSTOM:')) {
    poolAddress = selectedPool.split(':')[1];
  } else if (currentPool) {
    poolAddress = currentPool.address;
  }

  const tokenA = currentPool?.tokenA;
  const tokenB = currentPool?.tokenB;

  // Contract reads - Native balance
  const { data: nativeBalance, refetch: refetchNativeBalance } = useBalance({
    address: address,
    query: { enabled: !!address }
  });

  // Contract reads for selected pool
  const { data: lpBalance, refetch: refetchLpBalance } = useReadContract({
    address: poolAddress as Address,
    abi: SWAP_ABI,
    functionName: 'balanceOf',
    args: [address as Address],
    query: { enabled: !!address }
  });

  const { data: reserves, refetch: refetchReserves } = useReadContract({
    address: poolAddress as Address,
    abi: SWAP_ABI,
    functionName: 'getReserves',
  });

  const { data: totalSupply, refetch: refetchTotalSupply } = useReadContract({
    address: poolAddress as Address,
    abi: SWAP_ABI,
    functionName: 'totalSupply',
  });

  // Read pool tokens to determine current pair
  const { data: poolTokenA } = useReadContract({
    address: poolAddress as Address,
    abi: SWAP_ABI,
    functionName: 'tokenA',
  });

  const { data: poolTokenB } = useReadContract({
    address: poolAddress as Address,
    abi: SWAP_ABI,
    functionName: 'tokenB',
  });

  // Load custom pools from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('customPools');
      if (stored) setCustomPools(JSON.parse(stored));
    } catch (e) {
      console.error('Error loading custom pools:', e);
    }
  }, []);

  // ...existing code...

  // Token balances
  const { data: usdcBalance } = useReadContract({
    address: CONTRACTS.USDC,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: [address as Address],
    query: { enabled: !!address }
  });

  const { data: kanariBalance, refetch: refetchKanariBalance } = useReadContract({
    address: CONTRACTS.KANARI,
    abi: KANARI_ABI,
    functionName: 'balanceOf',
    args: [address as Address],
    query: { enabled: !!address }
  });

  const { refetch: refetchUsdcBalance } = useReadContract({
    address: CONTRACTS.USDC,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: [address as Address],
    query: { enabled: !!address }
  });

  // Helper functions
  const getTokenKeyFromAddress = (tokenAddress: string): TokenKey => {
    if (tokenAddress === TOKENS.USDC.address) return 'USDC';
    if (tokenAddress === TOKENS.KANARI.address) return 'KANARI';
    if (tokenAddress === TOKENS.NATIVE.address) return 'NATIVE';
    return 'USDC'; // fallback
  };

  const displayTokenAKey = ((typeof selectedPool === 'string' && selectedPool.startsWith('CUSTOM:'))
    ? (poolTokenA ? getTokenKeyFromAddress(String(poolTokenA)) : (tokenA as TokenKey) ?? 'USDC')
    : (tokenA as TokenKey)) as TokenKey;

  const displayTokenBKey = ((typeof selectedPool === 'string' && selectedPool.startsWith('CUSTOM:'))
    ? (poolTokenB ? getTokenKeyFromAddress(String(poolTokenB)) : (tokenB as TokenKey) ?? 'USDC')
    : (tokenB as TokenKey)) as TokenKey;

  const getTokenBalance = (tokenKey: TokenKey) => {
    switch (tokenKey) {
      case 'NATIVE':
        return nativeBalance?.value || BigInt(0);
      case 'USDC':
        return usdcBalance || BigInt(0);
      case 'KANARI':
        return kanariBalance || BigInt(0);
      default:
        return BigInt(0);
    }
  };

  const getTokenDecimals = (tokenKey: TokenKey) => {
    return TOKENS[tokenKey].decimals;
  };

  // Reset form when pool changes
  useEffect(() => {
    setLpAmount('');
    setPercentage('25');
  }, [selectedPool]);

  // Close pool selector when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showPoolSelect && !target.closest('.pool-selector')) {
        setShowPoolSelect(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPoolSelect]);

  // Contract writes
  const { writeContract: writeRemoveLiquidity, data: removeLiquidityHash } = useWriteContract();

  const { isLoading: isRemoveLiquidityPending } = useWaitForTransactionReceipt({
    hash: removeLiquidityHash,
  });

  // Refresh state after remove liquidity completes
  useEffect(() => {
    if (removeLiquidityHash && !isRemoveLiquidityPending) {
      try {
        refetchReserves?.();
        refetchTotalSupply?.();
        refetchLpBalance?.();
        refetchUsdcBalance?.();
        refetchKanariBalance?.();
        refetchNativeBalance?.();
      } catch (e) {
        // ignore
      }

      setLpAmount('');
      setPercentage('0');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [removeLiquidityHash, isRemoveLiquidityPending]);

  // Auto-calculate LP amount based on percentage
  useEffect(() => {
    if (!lpBalance || !percentage) return;
    
    try {
      const percentageNum = parseFloat(percentage) / 100;
      const lpAmountWei = (lpBalance * BigInt(Math.floor(percentageNum * 10000))) / BigInt(10000);
      setLpAmount(formatUnits(lpAmountWei, 18));
    } catch (error) {
      console.error('Error calculating LP amount:', error);
    }
  }, [percentage, lpBalance]);

  // Calculate expected amounts to receive
  const getExpectedAmounts = () => {
    if (!lpAmount || !reserves || !totalSupply) {
      return { amountA: '0', amountB: '0' };
    }

    try {
      const lpAmountWei = parseUnits(lpAmount, 18);
      const [reserveA, reserveB] = reserves as [bigint, bigint];
      
      const decimalsA = getTokenDecimals(tokenA);
      const decimalsB = getTokenDecimals(tokenB);
      
      const amountAWei = (reserveA * lpAmountWei) / totalSupply;
      const amountBWei = (reserveB * lpAmountWei) / totalSupply;
      
      return {
        amountA: formatUnits(amountAWei, decimalsA),
        amountB: formatUnits(amountBWei, decimalsB)
      };
    } catch (error) {
      console.error('Error calculating expected amounts:', error);
      return { amountA: '0', amountB: '0' };
    }
  };

  const handlePercentageClick = (percent: string) => {
    setPercentage(percent);
  };

  const handleRemoveLiquidity = async () => {
    if (!address || !lpAmount) return;

    setIsRemovingLiquidity(true);
    try {
      const lpAmountWei = parseUnits(lpAmount, 18);
      const { amountA, amountB } = getExpectedAmounts();
      const slippagePercent = parseFloat(slippage) / 100;
      
      const decimalsA = getTokenDecimals(tokenA);
      const decimalsB = getTokenDecimals(tokenB);
      
      const minAmountA = parseUnits(amountA, decimalsA) * BigInt(Math.floor((1 - slippagePercent) * 10000)) / BigInt(10000);
      const minAmountB = parseUnits(amountB, decimalsB) * BigInt(Math.floor((1 - slippagePercent) * 10000)) / BigInt(10000);
      
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200); // 20 minutes
      
      writeRemoveLiquidity({
        address: poolAddress as Address,
        abi: SWAP_ABI,
        functionName: 'removeLiquidity',
        args: [lpAmountWei, minAmountA, minAmountB, deadline],
      });
    } catch (error) {
      console.error('Remove liquidity failed:', error);
    } finally {
      setIsRemovingLiquidity(false);
    }
  };

  const getPoolShare = () => {
    if (!lpBalance || !totalSupply) return '0';
    
    try {
      const poolShare = (lpBalance * BigInt(10000)) / totalSupply;
      return (Number(poolShare) / 100).toFixed(2);
    } catch {
      return '0';
    }
  };

  const { amountA, amountB } = getExpectedAmounts();

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-[var(--surface)] rounded-2xl border border-white/10 p-6 shadow-xl">
        <div className="space-y-4">
          {/* Pool Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-[var(--muted-text)]">Select Liquidity Pool</label>
            <div className="relative pool-selector">
              <button
                onClick={() => setShowPoolSelect(!showPoolSelect)}
                className="w-full flex items-center justify-between p-4 bg-[var(--background)]/50 rounded-xl border border-white/5 hover:bg-[var(--background)]/80 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center -space-x-2">
                    <div className={`w-8 h-8 rounded-full ${TOKENS[displayTokenAKey].color} flex items-center justify-center text-white text-sm font-bold z-10`}>
                      {TOKENS[displayTokenAKey].icon}
                    </div>
                    <div className={`w-8 h-8 rounded-full ${TOKENS[displayTokenBKey].color} flex items-center justify-center text-white text-sm font-bold`}>
                      {TOKENS[displayTokenBKey].icon}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium">{currentPool?.name ?? (customPools.find(p=>p.poolAddress===poolAddress)?.pairName || poolAddress)}</div>
                    <div className="text-sm text-[var(--muted-text)]">{currentPool?.description ?? ''}</div>
                  </div>
                </div>
                <div className="text-[var(--muted-text)]">
                  {showPoolSelect ? '↑' : '↓'}
                </div>
              </button>

              {showPoolSelect && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--surface)] border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden">
                  {Object.entries(POOLS).map(([key, pool]) => (
                    <button
                      key={key}
                      onClick={() => {
                        setSelectedPool(key as PoolKey);
                        setShowPoolSelect(false);
                      }}
                      className={`w-full flex items-center gap-3 p-4 hover:bg-[var(--background)]/30 transition ${
                        selectedPool === key ? 'bg-[var(--primary-color)]/10' : ''
                      }`}
                    >
                      <div className="flex items-center -space-x-2">
                        <div className={`w-6 h-6 rounded-full ${TOKENS[pool.tokenA].color} flex items-center justify-center text-white text-xs font-bold z-10`}>
                          {TOKENS[pool.tokenA].icon}
                        </div>
                        <div className={`w-6 h-6 rounded-full ${TOKENS[pool.tokenB].color} flex items-center justify-center text-white text-xs font-bold`}>
                          {TOKENS[pool.tokenB].icon}
                        </div>
                      </div>
                      <div className="text-left">
                        <div className="font-medium">{pool.name}</div>
                        <div className="text-sm text-[var(--muted-text)]">{pool.description}</div>
                      </div>
                      {selectedPool === key && (
                        <div className="ml-auto text-[var(--primary-color)]">✓</div>
                      )}
                    </button>
                  ))}
                  {customPools.length > 0 && (
                    <div className="border-t border-white/5">
                      {customPools.map((p) => (
                        <button
                          key={p.poolAddress}
                          onClick={() => {
                            setSelectedPool(`CUSTOM:${p.poolAddress}`);
                            setShowPoolSelect(false);
                          }}
                          className={`w-full flex items-center gap-3 p-4 hover:bg-[var(--background)]/30 transition ${selectedPool === `CUSTOM:${p.poolAddress}` ? 'bg-[var(--primary-color)]/10' : ''}`}
                        >
                          <div className="flex items-center -space-x-2">
                            <div className={`w-6 h-6 rounded-full ${TOKENS[displayTokenAKey].color} flex items-center justify-center text-white text-xs font-bold z-10`}>
                              {TOKENS[displayTokenAKey].icon}
                            </div>
                            <div className={`w-6 h-6 rounded-full ${TOKENS[displayTokenBKey].color} flex items-center justify-center text-white text-xs font-bold`}>
                              {TOKENS[displayTokenBKey].icon}
                            </div>
                          </div>
                          <div className="text-left">
                            <div className="font-medium">{p.pairName}</div>
                            <div className="text-sm text-[var(--muted-text)]">{p.poolAddress}</div>
                          </div>
                          {selectedPool === `CUSTOM:${p.poolAddress}` && (
                            <div className="ml-auto text-[var(--primary-color)]">✓</div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Pool Status */}
            {!lpBalance && !reserves ? (
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <div className="text-blue-500 text-sm font-medium">🔄 Loading pool data...</div>
                <div className="text-blue-500/80 text-xs">Fetching pool information from the blockchain.</div>
              </div>
            ) : null}
          </div>
          {/* Pool Position Info */}
          {lpBalance && reserves && (
            <div className="p-4 bg-[var(--background)]/30 rounded-xl border border-white/5">
              <h3 className="text-lg font-semibold mb-3">Your Pool Position</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--muted-text)]">LP Tokens</span>
                  <span>{formatUnits(lpBalance, 18)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted-text)]">Pool Share</span>
                  <span>{getPoolShare()}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted-text)]">{TOKENS[tokenA].symbol} in Pool</span>
                  <span>{(Number(formatUnits(reserves[0], getTokenDecimals(tokenA))) * Number(getPoolShare()) / 100).toFixed(6)} {TOKENS[tokenA].symbol}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted-text)]">{TOKENS[tokenB].symbol} in Pool</span>
                  <span>{(Number(formatUnits(reserves[1], getTokenDecimals(tokenB))) * Number(getPoolShare()) / 100).toFixed(6)} {TOKENS[tokenB].symbol}</span>
                </div>
              </div>
            </div>
          )}

          {/* Percentage Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-[var(--muted-text)]">Amount to Remove</label>
            
            {/* Percentage Buttons */}
            <div className="grid grid-cols-4 gap-2">
              {['25', '50', '75', '100'].map((percent) => (
                <button
                  key={percent}
                  onClick={() => handlePercentageClick(percent)}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition ${
                    percentage === percent
                      ? 'bg-[var(--primary-color)] text-white'
                      : 'bg-[var(--background)]/50 text-[var(--text-color)] hover:bg-[var(--background)]/80'
                  }`}
                >
                  {percent}%
                </button>
              ))}
            </div>

            {/* Custom Percentage Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--muted-text)]">Custom percentage</span>
                <span>{percentage}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={percentage}
                onChange={(e) => setPercentage(e.target.value)}
                className="w-full h-2 bg-[var(--background)]/50 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>

            {/* LP Amount Input */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-[var(--muted-text)]">LP Tokens to Remove</span>
                <span className="text-sm text-[var(--muted-text)]">
                  Balance: {lpBalance ? formatUnits(lpBalance, 18) : '0'}
                </span>
              </div>
              <div className="flex items-center gap-3 p-4 bg-[var(--background)]/50 rounded-xl border border-white/5">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white text-sm font-bold">
                    LP
                  </div>
                  <span className="font-medium">LP Token</span>
                </div>
                <input
                  type="text"
                  placeholder="0.0"
                  value={lpAmount}
                  onChange={(e) => setLpAmount(e.target.value)}
                  className="flex-1 bg-transparent text-right text-lg font-medium placeholder-[var(--muted-text)] outline-none"
                />
              </div>
            </div>
          </div>

          {/* Expected Amounts */}
          {lpAmount && parseFloat(lpAmount) > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-[var(--muted-text)]">You will receive:</h4>
              
              {/* Token A Amount */}
              <div className="flex items-center justify-between p-3 bg-[var(--background)]/30 rounded-xl border border-white/5">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full ${TOKENS[tokenA].color} flex items-center justify-center text-white text-xs font-bold`}>
                    {TOKENS[tokenA].icon}
                  </div>
                  <span className="font-medium">{TOKENS[tokenA].symbol}</span>
                </div>
                <span className="font-medium">{parseFloat(amountA).toFixed(6)}</span>
              </div>

              {/* Token B Amount */}
              <div className="flex items-center justify-between p-3 bg-[var(--background)]/30 rounded-xl border border-white/5">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full ${TOKENS[tokenB].color} flex items-center justify-center text-white text-xs font-bold`}>
                    {TOKENS[tokenB].icon}
                  </div>
                  <span className="font-medium">{TOKENS[tokenB].symbol}</span>
                </div>
                <span className="font-medium">{parseFloat(amountB).toFixed(6)}</span>
              </div>
            </div>
          )}

          {/* Slippage Settings */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--muted-text)]">Slippage Tolerance</label>
            <div className="flex gap-2">
              {['0.1', '0.5', '1.0'].map((preset) => (
                <button
                  key={preset}
                  onClick={() => setSlippage(preset)}
                  className={`px-3 py-1 rounded-lg text-sm transition ${
                    slippage === preset
                      ? 'bg-[var(--primary-color)] text-white'
                      : 'bg-[var(--background)]/50 text-[var(--text-color)] hover:bg-[var(--background)]/80'
                  }`}
                >
                  {preset}%
                </button>
              ))}
              <input
                type="text"
                value={slippage}
                onChange={(e) => setSlippage(e.target.value)}
                className="flex-1 px-3 py-1 bg-[var(--background)]/50 rounded-lg text-sm text-center outline-none border border-white/5 focus:border-[var(--primary-color)]/50"
                placeholder="0.5"
              />
            </div>
          </div>

          {/* Action Button */}
          {!isConnected ? (
            <div className="text-center py-4 text-[var(--muted-text)]">
              Please connect your wallet
            </div>
          ) : !lpBalance || lpBalance === BigInt(0) ? (
            <div className="text-center py-4 text-[var(--muted-text)]">
              No liquidity to remove
            </div>
          ) : (
            <button
              onClick={handleRemoveLiquidity}
              disabled={isRemovingLiquidity || isRemoveLiquidityPending || !lpAmount || parseFloat(lpAmount) <= 0}
              className="w-full py-4 bg-red-500 text-white font-medium rounded-xl hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {isRemovingLiquidity || isRemoveLiquidityPending ? 'Removing Liquidity...' : 'Remove Liquidity'}
            </button>
          )}

          {/* Transaction Details */}
          {lpAmount && parseFloat(lpAmount) > 0 && (
            <div className="space-y-2 p-3 bg-[var(--background)]/30 rounded-lg border border-white/5">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--muted-text)]">Slippage Tolerance</span>
                <span>{slippage}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--muted-text)]">Min {TOKENS[tokenA].symbol} Received</span>
                <span>{(parseFloat(amountA) * (1 - parseFloat(slippage) / 100)).toFixed(6)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--muted-text)]">Min {TOKENS[tokenB].symbol} Received</span>
                <span>{(parseFloat(amountB) * (1 - parseFloat(slippage) / 100)).toFixed(6)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
