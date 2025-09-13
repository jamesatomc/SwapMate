"use client";

import React, { useEffect, useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useBalance, usePublicClient } from 'wagmi';
import { formatUnits, parseUnits, Address } from 'viem';
import { CONTRACTS, SWAP_ABI, DEX_FACTORY_ABI, TOKENS, TokenKey, POOLS, PoolKey } from '@/lib/contracts';
import { useAllTokens } from './TokenManager';

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
  const [factoryPools, setFactoryPools] = useState<string[]>([]);
  const [lpAmount, setLpAmount] = useState('');
  const [percentage, setPercentage] = useState('25');
  const [slippage, setSlippage] = useState('0.5');
  const [isRemovingLiquidity, setIsRemovingLiquidity] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showPoolSelect, setShowPoolSelect] = useState(false);

  const lpAmountInputRef = React.useRef<HTMLInputElement>(null);

  // Get current pool info
  const currentPool = POOLS[(selectedPool as unknown) as PoolKey];
  let poolAddress: string | undefined = undefined;

  if (typeof selectedPool === 'string' && selectedPool.startsWith('CUSTOM:')) {
    poolAddress = selectedPool.split(':')[1];
  } else if (currentPool) {
    poolAddress = currentPool.address;
  }

  // Contract reads - Native balance (we only need the refetch function)
  const { refetch: refetchNativeBalance } = useBalance({
    address: address,
    query: { enabled: !!address }
  });

  // Contract reads for selected pool
  const { 
    data: lpBalance, 
    refetch: refetchLpBalance,
    isLoading: isLoadingLpBalance 
  } = useReadContract({
    address: poolAddress as Address,
    abi: SWAP_ABI,
    functionName: 'balanceOf',
    args: [address as Address],
    query: { enabled: !!address && !!poolAddress }
  });

  const { 
    data: reserves, 
    refetch: refetchReserves,
    isLoading: isLoadingReserves 
  } = useReadContract({
    address: poolAddress as Address,
    abi: SWAP_ABI,
    functionName: 'getReserves',
    query: { enabled: !!poolAddress }
  });

  const { 
    data: totalSupply, 
    refetch: refetchTotalSupply,
    isLoading: isLoadingTotalSupply 
  } = useReadContract({
    address: poolAddress as Address,
    abi: SWAP_ABI,
    functionName: 'totalSupply',
    query: { enabled: !!poolAddress }
  });

  // Read pool tokens to determine current pair
  const { data: poolTokenA } = useReadContract({
    address: poolAddress as Address,
    abi: SWAP_ABI,
    functionName: 'tokenA',
    query: { enabled: !!poolAddress }
  });

  const { data: poolTokenB } = useReadContract({
    address: poolAddress as Address,
    abi: SWAP_ABI,
    functionName: 'tokenB',
    query: { enabled: !!poolAddress }
  });

  // Load custom pools from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('customPools');
      if (stored) setCustomPools(JSON.parse(stored));
    } catch {
      console.error('Error loading custom pools');
    }
  }, []);

  const publicClient = usePublicClient();

  // Fetch on-chain factory pools
  useEffect(() => {
    let mounted = true;
    const fetchFactoryPools = async () => {
      try {
        if (!publicClient) return;
        const totalRes = await publicClient.readContract({
          address: CONTRACTS.DEX_FACTORY,
          abi: DEX_FACTORY_ABI,
          functionName: 'allPoolsLength',
        });
        const total = Number(totalRes || 0);
        const pools: string[] = [];
        for (let i = 0; i < total; i++) {
          try {
            const p = await publicClient.readContract({
              address: CONTRACTS.DEX_FACTORY,
              abi: DEX_FACTORY_ABI,
              functionName: 'allPools',
              args: [BigInt(i)],
            });
            if (p && typeof p === 'string') pools.push(p);
          } catch {
            // ignore
          }
        }
        if (mounted) setFactoryPools(pools);
      } catch (err) {
        console.error('Failed to fetch factory pools:', err);
      }
    };

    fetchFactoryPools();
    return () => { mounted = false; };
  }, [publicClient]);

  const { customTokens } = useAllTokens();

  // Helper: Safely get token key from address
  const getTokenKeyFromAddress = (tokenAddress: string): TokenKey => {
    if (!tokenAddress) return 'USDC';
    const lower = tokenAddress.toLowerCase();

    // Built-in tokens
    if (lower === TOKENS.USDC.address.toLowerCase()) return 'USDC';
    if (lower === TOKENS.KANARI.address.toLowerCase()) return 'KANARI';
    if (lower === TOKENS.NATIVE.address.toLowerCase()) return 'NATIVE';

    // Custom tokens
    const found = customTokens?.find(t => t.address.toLowerCase() === lower);
    if (found) {
      // Map known custom tokens back to base keys if needed
      if (found.address.toLowerCase() === TOKENS.USDC.address.toLowerCase()) return 'USDC';
      if (found.address.toLowerCase() === TOKENS.KANARI.address.toLowerCase()) return 'KANARI';
      if (found.address.toLowerCase() === TOKENS.NATIVE.address.toLowerCase()) return 'NATIVE';
    }

    // Fallback: return first available token type (could be improved with dynamic token registry)
    return 'USDC';
  };

  // Resolve token keys from the current pool (declare tokenA/tokenB first)
  const tokenA = currentPool?.tokenA;
  const tokenB = currentPool?.tokenB;

  // Resolve token keys dynamically based on pool
  const displayTokenAKey: TokenKey = (() => {
    if (typeof selectedPool === 'string' && selectedPool.startsWith('CUSTOM:')) {
      if (poolTokenA) return getTokenKeyFromAddress(String(poolTokenA));
      return (tokenA ?? 'USDC') as TokenKey;
    }
    return (tokenA ?? 'USDC') as TokenKey;
  })();

  const displayTokenBKey: TokenKey = (() => {
    if (typeof selectedPool === 'string' && selectedPool.startsWith('CUSTOM:')) {
      if (poolTokenB) return getTokenKeyFromAddress(String(poolTokenB));
      return (tokenB ?? 'USDC') as TokenKey;
    }
    return (tokenB ?? 'USDC') as TokenKey;
  })();

  // Get decimals safely
  const getTokenDecimals = (tokenKey: TokenKey): number => {
    const token = TOKENS[tokenKey as keyof typeof TOKENS];
    return token ? token.decimals : 18;
  };

  // Reset form when pool changes
  useEffect(() => {
    setLpAmount('');
    setPercentage('25');
    // focus the LP amount input when pool changes to encourage interaction
    if (lpAmountInputRef.current) {
      lpAmountInputRef.current.focus();
    }
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
        refetchNativeBalance?.();
      } catch {}
      setLpAmount('');
      setPercentage('0');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [removeLiquidityHash, isRemoveLiquidityPending]);

  // Auto-calculate LP amount based on percentage (safe BigInt math)
  useEffect(() => {
    if (!lpBalance || !totalSupply || !percentage) return;

    try {
      const pctNum = parseFloat(percentage) / 100;
      const pctBasisPoints = BigInt(Math.floor(pctNum * 10000)); // e.g., 25% → 2500
      const lpAmountWei = (lpBalance * pctBasisPoints) / BigInt(10000);
      setLpAmount(formatUnits(lpAmountWei, 18));
    } catch (error) {
      console.error('Error calculating LP amount:', error);
      setLpAmount('');
    }
  }, [percentage, lpBalance, totalSupply]);

  // Calculate expected amounts to receive (correctly using BigInt)
  const getExpectedAmounts = () => {
    if (!lpAmount || !reserves || !totalSupply || !poolAddress) {
      return { amountA: '0', amountB: '0' };
    }

    try {
      const lpAmountWei = parseUnits(lpAmount, 18);
      const [reserveA, reserveB] = reserves as [bigint, bigint];

      const decimalsA = getTokenDecimals(displayTokenAKey);
      const decimalsB = getTokenDecimals(displayTokenBKey);

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

  // Validate slippage input
  const handleSlippageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      const num = parseFloat(value);
      if (num >= 0 && num <= 50) {
        setSlippage(value);
      } else if (value === '') {
        setSlippage('');
      }
    }
  };

  const handleRemoveLiquidity = async () => {
    if (!address || !lpAmount || !poolAddress) return;

    setIsRemovingLiquidity(true);
    try {
      const lpAmountWei = parseUnits(lpAmount, 18);
      const { amountA, amountB } = getExpectedAmounts();

      const decimalsA = getTokenDecimals(displayTokenAKey);
      const decimalsB = getTokenDecimals(displayTokenBKey);

      const slippageBps = BigInt(Math.floor(parseFloat(slippage) * 100)); // e.g., 0.5% → 50 bps
      const minAmountA = (parseUnits(amountA, decimalsA) * (BigInt(10000) - slippageBps)) / BigInt(10000);
      const minAmountB = (parseUnits(amountB, decimalsB) * (BigInt(10000) - slippageBps)) / BigInt(10000);

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

  // Calculate pool share safely
  const getPoolShare = () => {
    if (!lpBalance || !totalSupply || totalSupply === BigInt(0)) return '0';
    
    try {
      const share = (lpBalance * BigInt(10000)) / totalSupply;
      return (Number(share) / 100).toFixed(2);
    } catch {
      return '0';
    }
  };

  const { amountA, amountB } = getExpectedAmounts();

  // Loading state helper
  const isLoadingData = isLoadingLpBalance || isLoadingReserves || isLoadingTotalSupply;

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
                aria-label="Select liquidity pool"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center -space-x-2">
                    <div className={`w-8 h-8 rounded-full ${TOKENS[displayTokenAKey]?.color || 'bg-gray-500'} flex items-center justify-center text-white text-sm font-bold z-10`}
                      title={displayTokenAKey}>
                      {TOKENS[displayTokenAKey]?.icon || '?'}
                    </div>
                    <div className={`w-8 h-8 rounded-full ${TOKENS[displayTokenBKey]?.color || 'bg-gray-500'} flex items-center justify-center text-white text-sm font-bold`}
                      title={displayTokenBKey}>
                      {TOKENS[displayTokenBKey]?.icon || '?'}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium">
                      {currentPool?.name ?? (customPools.find(p => p.poolAddress === poolAddress)?.pairName) ?? `${TOKENS[displayTokenAKey]?.symbol}/${TOKENS[displayTokenBKey]?.symbol}`}
                    </div>
                    <div className="text-sm text-[var(--muted-text)]">
                      {currentPool?.description ?? ''}
                    </div>
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
                      aria-label={`Select ${pool.name} pool`}
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
                      {customPools.map((p) => {
                        const aKey = (p.tokenAKey ?? getTokenKeyFromAddress(p.poolAddress === poolAddress ? String(poolTokenA) : '')) as TokenKey;
                        const bKey = (p.tokenBKey ?? getTokenKeyFromAddress(p.poolAddress === poolAddress ? String(poolTokenB) : '')) as TokenKey;
                        return (
                          <button
                            key={p.poolAddress}
                            onClick={() => {
                              setSelectedPool(`CUSTOM:${p.poolAddress}`);
                              setShowPoolSelect(false);
                            }}
                            className={`w-full flex items-center gap-3 p-4 hover:bg-[var(--background)]/30 transition ${
                              selectedPool === `CUSTOM:${p.poolAddress}` ? 'bg-[var(--primary-color)]/10' : ''
                            }`}
                            aria-label={`Select custom pool ${p.pairName}`}
                          >
                            <div className="flex items-center -space-x-2">
                              <div className={`w-6 h-6 rounded-full ${TOKENS[aKey]?.color || 'bg-gray-500'} flex items-center justify-center text-white text-xs font-bold z-10`}>
                                {TOKENS[aKey]?.icon || '?'}
                              </div>
                              <div className={`w-6 h-6 rounded-full ${TOKENS[bKey]?.color || 'bg-gray-500'} flex items-center justify-center text-white text-xs font-bold`}>
                                {TOKENS[bKey]?.icon || '?'}
                              </div>
                            </div>
                            <div className="text-left">
                              <div className="font-medium">{p.pairName}</div>
                              <div className="text-sm text-[var(--muted-text)]">{p.poolAddress.slice(0, 8)}...</div>
                            </div>
                            {selectedPool === `CUSTOM:${p.poolAddress}` && (
                              <div className="ml-auto text-[var(--primary-color)]">✓</div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {factoryPools.length > 0 && (
                    <div className="border-t border-white/5">
                      {factoryPools.map((addr) => {
                        // We don't know tokenA/tokenB yet — so we'll show placeholder
                        // But if this is the currently selected pool, use real values
                        // Always show generic icon for factory pools unless explicitly selected
                        const isSelectedFactory = selectedPool === `CUSTOM:${addr}`;
                        const aKey: TokenKey = isSelectedFactory ? displayTokenAKey : 'USDC';
                        const bKey: TokenKey = isSelectedFactory ? displayTokenBKey : 'NATIVE';
                        return (
                          <button
                            key={addr}
                            onClick={() => {
                              setSelectedPool(`CUSTOM:${addr}`);
                              setShowPoolSelect(false);
                            }}
                            className={`w-full flex items-center gap-3 p-4 hover:bg-[var(--background)]/30 transition ${
                              selectedPool === `CUSTOM:${addr}` ? 'bg-[var(--primary-color)]/10' : ''
                            }`}
                            aria-label={`Select factory pool ${addr.slice(0, 8)}...`}
                          >
                            <div className="flex items-center -space-x-2">
                              <div className={`w-6 h-6 rounded-full ${TOKENS[aKey]?.color || 'bg-gray-500'} flex items-center justify-center text-white text-xs font-bold z-10`}>
                                {TOKENS[aKey]?.icon || '?'}
                              </div>
                              <div className={`w-6 h-6 rounded-full ${TOKENS[bKey]?.color || 'bg-gray-500'} flex items-center justify-center text-white text-xs font-bold`}>
                                {TOKENS[bKey]?.icon || '?'}
                              </div>
                            </div>
                            <div className="text-left">
                              <div className="font-medium">Factory Pool</div>
                              <div className="text-sm text-[var(--muted-text)]">{addr.slice(0, 8)}...</div>
                            </div>
                            {selectedPool === `CUSTOM:${addr}` && (
                              <div className="ml-auto text-[var(--primary-color)]">✓</div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Pool Status */}
            {isLoadingData && (
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <div className="text-blue-500 text-sm font-medium">🔄 Loading pool data...</div>
                <div className="text-blue-500/80 text-xs">Fetching pool information from the blockchain.</div>
              </div>
            )}
          </div>

          {/* Pool Position Info */}
          {lpBalance !== undefined && reserves !== undefined && totalSupply !== undefined && !isLoadingData && (
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
                  <span className="text-[var(--muted-text)]">{TOKENS[displayTokenAKey]?.symbol} in Pool</span>
                  <span>{(Number(formatUnits(reserves[0], getTokenDecimals(displayTokenAKey))) * Number(getPoolShare()) / 100).toFixed(6)} {TOKENS[displayTokenAKey]?.symbol}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted-text)]">{TOKENS[displayTokenBKey]?.symbol} in Pool</span>
                  <span>{(Number(formatUnits(reserves[1], getTokenDecimals(displayTokenBKey))) * Number(getPoolShare()) / 100).toFixed(6)} {TOKENS[displayTokenBKey]?.symbol}</span>
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
                  aria-label={`Remove ${percent}% of liquidity`}
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
                aria-label="Custom percentage slider"
              />
              {/* Sync input field */}
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                value={percentage}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || (Number(val) >= 0 && Number(val) <= 100)) {
                    setPercentage(val);
                  }
                }}
                className="w-full px-3 py-2 bg-[var(--background)]/50 rounded-lg text-sm text-center outline-none border border-white/5 focus:border-[var(--primary-color)]/50"
                placeholder="0"
                aria-label="Custom percentage input"
              />
            </div>

            {/* LP Amount Input */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="relative group">
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-[var(--muted-text)]">LP Tokens to Remove</span>
                    <button
                      type="button"
                      aria-label="What are LP tokens?"
                      className="text-[var(--muted-text)] hover:text-[var(--text-color)] transition"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                  <div className="hidden group-hover:block absolute z-10 w-48 bg-[var(--surface)] border border-white/10 rounded-lg p-3 text-xs text-[var(--text-color)] shadow-lg mt-2">
                    <strong>LP Tokens</strong> represent your share of the liquidity pool. Removing them returns your portion of the two underlying tokens.
                  </div>
                </div>
                <span className="text-sm text-[var(--muted-text)]">
                  Balance: {lpBalance ? formatUnits(lpBalance, 18) : '0'}
                </span>
              </div>
              <div className="flex items-center gap-3 p-4 bg-[var(--background)]/50 rounded-xl border border-white/5">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-md">
                    LP
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium text-[var(--text-color)]">Liquidity Pool Tokens</span>
                    <span className="text-xs text-[var(--muted-text)]">Share of pool</span>
                  </div>
                </div>
                <input
                  type="text"
                  placeholder="0.0"
                  ref={lpAmountInputRef}
                  value={lpAmount}
                  onChange={(e) => setLpAmount(e.target.value)}
                  inputMode="decimal"
                  pattern="[0-9]*"
                  className="flex-1 bg-transparent text-right text-lg font-medium placeholder-[var(--muted-text)] outline-none"
                  aria-label="Enter LP amount to remove"
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
                  <div className={`w-6 h-6 rounded-full ${TOKENS[displayTokenAKey]?.color || 'bg-gray-500'} flex items-center justify-center text-white text-xs font-bold`}>
                    {TOKENS[displayTokenAKey]?.icon || '?'}
                  </div>
                  <span className="font-medium">{TOKENS[displayTokenAKey]?.symbol}</span>
                </div>
                <span className="font-medium">{parseFloat(amountA).toFixed(6)}</span>
              </div>

              {/* Token B Amount */}
              <div className="flex items-center justify-between p-3 bg-[var(--background)]/30 rounded-xl border border-white/5">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full ${TOKENS[displayTokenBKey]?.color || 'bg-gray-500'} flex items-center justify-center text-white text-xs font-bold`}>
                    {TOKENS[displayTokenBKey]?.icon || '?'}
                  </div>
                  <span className="font-medium">{TOKENS[displayTokenBKey]?.symbol}</span>
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
                  aria-label={`Set slippage to ${preset}%`}
                >
                  {preset}%
                </button>
              ))}
              <input
                type="text"
                value={slippage}
                onChange={handleSlippageChange}
                className="flex-1 px-3 py-1 bg-[var(--background)]/50 rounded-lg text-sm text-center outline-none border border-white/5 focus:border-[var(--primary-color)]/50"
                placeholder="0.5"
                aria-label="Slippage tolerance percentage"
              />
            </div>
            <p className="text-xs text-[var(--muted-text)] mt-1">
              Slippage protects you from price movement during transaction.
            </p>
          </div>

          {/* Action Button */}
          {!isConnected ? (
            <div className="text-center py-4 text-[var(--muted-text)]">
              Please connect your wallet
            </div>
          ) : !lpBalance || lpBalance === BigInt(0) ? (
            <div className="text-center py-4 text-[var(--muted-text)]">
              You have no liquidity in this pool.
            </div>
          ) : (
            <button
              onClick={() => setShowConfirmation(true)}
              disabled={
                isRemovingLiquidity || 
                isRemoveLiquidityPending || 
                !lpAmount || 
                parseFloat(lpAmount) <= 0 ||
                parseFloat(slippage) < 0
              }
              className="w-full py-4 bg-red-500 text-white font-medium rounded-xl hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {isRemovingLiquidity || isRemoveLiquidityPending ? 'Removing...' : 'Remove Liquidity'}
            </button>
          )}

          {/* Confirmation Modal */}
          {showConfirmation && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-[var(--surface)] rounded-2xl border border-white/10 p-6 shadow-xl w-full max-w-md">
                <h3 className="text-xl font-bold text-[var(--text-color)] mb-4">Confirm Removal</h3>
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between">
                    <span className="text-[var(--muted-text)]">You are removing:</span>
                    <span className="font-medium">{lpAmount} LP Tokens</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--muted-text)]">You will receive:</span>
                    <span className="font-medium">
                      {parseFloat(amountA).toFixed(6)} {TOKENS[displayTokenAKey]?.symbol} & {parseFloat(amountB).toFixed(6)} {TOKENS[displayTokenBKey]?.symbol}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--muted-text)]">Slippage tolerance:</span>
                    <span className="font-medium">{slippage}%</span>
                  </div>
                </div>
                <p className="text-xs text-red-500/80 mb-6">
                  ⚠️ This action cannot be undone. You may lose value due to price impact.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowConfirmation(false)}
                    className="flex-1 py-3 bg-[var(--background)]/50 text-[var(--text-color)] rounded-xl font-medium hover:bg-[var(--background)]/80 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setShowConfirmation(false);
                      handleRemoveLiquidity();
                    }}
                    className="flex-1 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition"
                    disabled={isRemovingLiquidity || isRemoveLiquidityPending}
                  >
                    {isRemovingLiquidity || isRemoveLiquidityPending ? 'Removing...' : 'Confirm Remove'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Transaction Details */}
          {lpAmount && parseFloat(lpAmount) > 0 && (
            <div className="space-y-2 p-3 bg-[var(--background)]/30 rounded-lg border border-white/5">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--muted-text)]">Slippage Tolerance</span>
                <span>{slippage}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--muted-text)]">Min {TOKENS[displayTokenAKey]?.symbol} Received</span>
                <span>{(parseFloat(amountA) * (1 - parseFloat(slippage) / 100)).toFixed(6)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--muted-text)]">Min {TOKENS[displayTokenBKey]?.symbol} Received</span>
                <span>{(parseFloat(amountB) * (1 - parseFloat(slippage) / 100)).toFixed(6)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}