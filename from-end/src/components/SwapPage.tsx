"use client";

import React, { useEffect, useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther, formatUnits, parseUnits, Address } from 'viem';
import { CONTRACTS, USDK_ABI, KANARI_ABI, SWAP_ABI } from '@/lib/contracts';

export default function SwapPage() {
  const { address, isConnected } = useAccount();
  
  // State for swap
  const [tokenIn, setTokenIn] = useState<'USDK' | 'KANARI'>('USDK');
  const [tokenOut, setTokenOut] = useState<'USDK' | 'KANARI'>('KANARI');
  const [amountIn, setAmountIn] = useState('');
  const [amountOut, setAmountOut] = useState('');
  const [slippage, setSlippage] = useState('0.5');
  const [isSwapping, setIsSwapping] = useState(false);

  // Contract reads
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

  const { data: reserves } = useReadContract({
    address: CONTRACTS.SWAP,
    abi: SWAP_ABI,
    functionName: 'getReserves',
  });

  const { data: usdkAllowance } = useReadContract({
    address: CONTRACTS.USDK,
    abi: USDK_ABI,
    functionName: 'allowance',
    args: [address as Address, CONTRACTS.SWAP],
    query: { enabled: !!address }
  });

  const { data: kanariAllowance } = useReadContract({
    address: CONTRACTS.KANARI,
    abi: KANARI_ABI,
    functionName: 'allowance',
    args: [address as Address, CONTRACTS.SWAP],
    query: { enabled: !!address }
  });

  // Contract writes
  const { writeContract: writeApprove, data: approveHash } = useWriteContract();
  const { writeContract: writeSwap, data: swapHash } = useWriteContract();

  const { isLoading: isApproving } = useWaitForTransactionReceipt({
    hash: approveHash,
  });

  const { isLoading: isSwapPending } = useWaitForTransactionReceipt({
    hash: swapHash,
  });

  // Calculate output amount
  useEffect(() => {
    if (!amountIn || !reserves || parseFloat(amountIn) <= 0) {
      setAmountOut('');
      return;
    }

    try {
      const [reserveA, reserveB] = reserves as [bigint, bigint];
      const amountInWei = parseUnits(amountIn, 18);
      
      const isUSDKIn = tokenIn === 'USDK';
      const reserveIn = isUSDKIn ? reserveA : reserveB;
      const reserveOut = isUSDKIn ? reserveB : reserveA;
      
      // Calculate output using AMM formula: (amountIn * reserveOut) / (reserveIn + amountIn)
      // With 0.3% fee: amountInWithFee = amountIn * 997 / 1000
      const feeBps = BigInt(30); // 0.3%
      const bps = BigInt(10000);
      const amountInWithFee = (amountInWei * (bps - feeBps)) / bps;
      
      const numerator = amountInWithFee * reserveOut;
      const denominator = reserveIn + amountInWithFee;
      const amountOutWei = numerator / denominator;
      
      setAmountOut(formatUnits(amountOutWei, 18));
    } catch (error) {
      console.error('Error calculating output:', error);
      setAmountOut('');
    }
  }, [amountIn, tokenIn, tokenOut, reserves]);

  const switchTokens = () => {
    setTokenIn(tokenOut);
    setTokenOut(tokenIn);
    setAmountIn(amountOut);
    setAmountOut('');
  };

  const handleApprove = async () => {
    if (!address) return;
    
    const tokenAddress = tokenIn === 'USDK' ? CONTRACTS.USDK : CONTRACTS.KANARI;
    const abi = tokenIn === 'USDK' ? USDK_ABI : KANARI_ABI;
    
    writeApprove({
      address: tokenAddress,
      abi,
      functionName: 'approve',
      args: [CONTRACTS.SWAP, parseUnits('1000000', 18)], // Approve large amount
    });
  };

  const handleSwap = async () => {
    if (!address || !amountIn || !amountOut) return;

    setIsSwapping(true);
    try {
      const tokenInAddress = tokenIn === 'USDK' ? CONTRACTS.USDK : CONTRACTS.KANARI;
      const amountInWei = parseUnits(amountIn, 18);
      const amountOutWei = parseUnits(amountOut, 18);
      const slippagePercent = parseFloat(slippage) / 100;
      const minAmountOut = amountOutWei * BigInt(Math.floor((1 - slippagePercent) * 10000)) / BigInt(10000);
      
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200); // 20 minutes
      
      writeSwap({
        address: CONTRACTS.SWAP,
        abi: SWAP_ABI,
        functionName: 'swap',
        args: [tokenInAddress, amountInWei, minAmountOut, deadline],
      });
    } catch (error) {
      console.error('Swap failed:', error);
    } finally {
      setIsSwapping(false);
    }
  };

  // Check if approval is needed
  const needsApproval = () => {
    if (!amountIn) return false;
    const amountInWei = parseUnits(amountIn, 18);
    const allowance = tokenIn === 'USDK' ? usdkAllowance : kanariAllowance;
    return !allowance || allowance < amountInWei;
  };

  const getBalance = (token: 'USDK' | 'KANARI') => {
    const balance = token === 'USDK' ? usdkBalance : kanariBalance;
    return balance ? formatUnits(balance, 18) : '0';
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-[var(--surface)] rounded-2xl border border-white/10 p-6 shadow-xl">
        <div className="space-y-4">
          {/* From Token */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-[var(--muted-text)]">From</label>
              <span className="text-sm text-[var(--muted-text)]">
                Balance: {getBalance(tokenIn)} {tokenIn}
              </span>
            </div>
            <div className="flex items-center gap-3 p-4 bg-[var(--background)]/50 rounded-xl border border-white/5">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-full bg-orange-400 flex items-center justify-center text-white text-sm font-bold">
                  {tokenIn === 'USDK' ? 'U' : 'K'}
                </div>
                <span className="font-medium">{tokenIn}</span>
              </div>
              <input
                type="text"
                placeholder="0.0"
                value={amountIn}
                onChange={(e) => setAmountIn(e.target.value)}
                className="flex-1 bg-transparent text-right text-lg font-medium placeholder-[var(--muted-text)] outline-none"
              />
            </div>
          </div>

          {/* Switch Button */}
          <div className="flex justify-center">
            <button
              onClick={switchTokens}
              className="p-2 rounded-lg bg-[var(--surface)] border border-white/10 hover:bg-[var(--background)]/80 transition-colors"
            >
              <svg className="w-5 h-5 text-[var(--text-color)]" viewBox="0 0 24 24" fill="none">
                <path d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          {/* To Token */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-[var(--muted-text)]">To</label>
              <span className="text-sm text-[var(--muted-text)]">
                Balance: {getBalance(tokenOut)} {tokenOut}
              </span>
            </div>
            <div className="flex items-center gap-3 p-4 bg-[var(--background)]/50 rounded-xl border border-white/5">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-full bg-orange-400 flex items-center justify-center text-white text-sm font-bold">
                  {tokenOut === 'USDK' ? 'U' : 'K'}
                </div>
                <span className="font-medium">{tokenOut}</span>
              </div>
              <input
                type="text"
                placeholder="0.0"
                value={amountOut}
                readOnly
                className="flex-1 bg-transparent text-right text-lg font-medium text-[var(--muted-text)] outline-none"
              />
            </div>
          </div>

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
          ) : needsApproval() ? (
            <button
              onClick={handleApprove}
              disabled={isApproving || !amountIn}
              className="w-full py-4 bg-[var(--primary-color)] text-white font-medium rounded-xl hover:bg-[var(--primary-color)]/90 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {isApproving ? 'Approving...' : `Approve ${tokenIn}`}
            </button>
          ) : (
            <button
              onClick={handleSwap}
              disabled={isSwapping || isSwapPending || !amountIn || !amountOut}
              className="w-full py-4 bg-[var(--primary-color)] text-white font-medium rounded-xl hover:bg-[var(--primary-color)]/90 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {isSwapping || isSwapPending ? 'Swapping...' : 'Swap'}
            </button>
          )}

          {/* Trade Info */}
          {amountOut && (
            <div className="space-y-2 p-3 bg-[var(--background)]/30 rounded-lg border border-white/5">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--muted-text)]">Exchange Rate</span>
                <span>1 {tokenIn} = {(parseFloat(amountOut) / parseFloat(amountIn || '1')).toFixed(6)} {tokenOut}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--muted-text)]">Slippage Tolerance</span>
                <span>{slippage}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--muted-text)]">Minimum Received</span>
                <span>{(parseFloat(amountOut) * (1 - parseFloat(slippage) / 100)).toFixed(6)} {tokenOut}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
