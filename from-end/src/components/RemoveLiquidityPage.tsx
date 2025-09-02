"use client";

import React, { useEffect, useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useBalance } from 'wagmi';
import { formatUnits, parseUnits, Address } from 'viem';
import { CONTRACTS, USDK_ABI, KANARI_ABI, SWAP_ABI, TOKENS, TokenKey } from '@/lib/contracts';

export default function RemoveLiquidityPage() {
  const { address, isConnected } = useAccount();
  
  // State for removing liquidity
  const [lpAmount, setLpAmount] = useState('');
  const [percentage, setPercentage] = useState('25');
  const [slippage, setSlippage] = useState('0.5');
  const [isRemovingLiquidity, setIsRemovingLiquidity] = useState(false);

  // Get current token pair from pool
  const [tokenA, setTokenA] = useState<TokenKey>('USDK');
  const [tokenB, setTokenB] = useState<TokenKey>('KANARI');

  // Contract reads - Native balance
  const { data: nativeBalance } = useBalance({
    address: address,
    query: { enabled: !!address }
  });

  // Contract reads
  const { data: lpBalance } = useReadContract({
    address: CONTRACTS.SWAP,
    abi: SWAP_ABI,
    functionName: 'balanceOf',
    args: [address as Address],
    query: { enabled: !!address }
  });

  const { data: reserves } = useReadContract({
    address: CONTRACTS.SWAP,
    abi: SWAP_ABI,
    functionName: 'getReserves',
  });

  const { data: totalSupply } = useReadContract({
    address: CONTRACTS.SWAP,
    abi: SWAP_ABI,
    functionName: 'totalSupply',
  });

  // Read pool tokens to determine current pair
  const { data: poolTokenA } = useReadContract({
    address: CONTRACTS.SWAP,
    abi: SWAP_ABI,
    functionName: 'tokenA',
  });

  const { data: poolTokenB } = useReadContract({
    address: CONTRACTS.SWAP,
    abi: SWAP_ABI,
    functionName: 'tokenB',
  });

  // Token balances
  const { data: usdkBalance } = useReadContract({
    address: CONTRACTS.USDK,
    abi: USDK_ABI,
    functionName: 'balanceOf',
    args: [address as Address],
    query: { enabled: !!address }
  });

  const { data: kanariBalance } = useReadContract({
    address: CONTRACTS.KANARI,
    abi: KANARI_ABI,
    functionName: 'balanceOf',
    args: [address as Address],
    query: { enabled: !!address }
  });

  // Helper functions
  const getTokenKeyFromAddress = (tokenAddress: string): TokenKey => {
    if (tokenAddress === TOKENS.USDK.address) return 'USDK';
    if (tokenAddress === TOKENS.KANARI.address) return 'KANARI';
    if (tokenAddress === TOKENS.NATIVE.address) return 'NATIVE';
    return 'USDK'; // fallback
  };

  const getTokenBalance = (tokenKey: TokenKey) => {
    switch (tokenKey) {
      case 'NATIVE':
        return nativeBalance?.value || BigInt(0);
      case 'USDK':
        return usdkBalance || BigInt(0);
      case 'KANARI':
        return kanariBalance || BigInt(0);
      default:
        return BigInt(0);
    }
  };

  const getTokenDecimals = (tokenKey: TokenKey) => {
    return TOKENS[tokenKey].decimals;
  };

  // Update token pair when pool data is available
  useEffect(() => {
    if (poolTokenA && poolTokenB) {
      setTokenA(getTokenKeyFromAddress(poolTokenA as string));
      setTokenB(getTokenKeyFromAddress(poolTokenB as string));
    }
  }, [poolTokenA, poolTokenB]);

  // Contract writes
  const { writeContract: writeRemoveLiquidity, data: removeLiquidityHash } = useWriteContract();

  const { isLoading: isRemoveLiquidityPending } = useWaitForTransactionReceipt({
    hash: removeLiquidityHash,
  });

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
        address: CONTRACTS.SWAP,
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
