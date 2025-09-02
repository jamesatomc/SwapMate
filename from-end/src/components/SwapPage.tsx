"use client";

import React, { useEffect, useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useBalance } from 'wagmi';
import { parseEther, formatEther, formatUnits, parseUnits, Address } from 'viem';
import { CONTRACTS, USDK_ABI, KANARI_ABI, SWAP_ABI, TOKENS, TokenKey } from '@/lib/contracts';

export default function SwapPage() {
  const { address, isConnected } = useAccount();
  
  // State for swap
  const [tokenIn, setTokenIn] = useState<TokenKey>('USDK');
  const [tokenOut, setTokenOut] = useState<TokenKey>('KANARI');
  const [amountIn, setAmountIn] = useState('');
  const [amountOut, setAmountOut] = useState('');
  const [slippage, setSlippage] = useState('0.5');
  const [isSwapping, setIsSwapping] = useState(false);
  const [showTokenSelectIn, setShowTokenSelectIn] = useState(false);
  const [showTokenSelectOut, setShowTokenSelectOut] = useState(false);

  // Contract reads - Native balance
  const { data: nativeBalance, refetch: refetchNativeBalance } = useBalance({
    address: address,
    query: { enabled: !!address }
  });

  // Token balances
  const { data: usdkBalance, refetch: refetchUsdkBalance } = useReadContract({
    address: CONTRACTS.USDK,
    abi: USDK_ABI,
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

  const { data: reserves, refetch: refetchReserves } = useReadContract({
    address: CONTRACTS.SWAP,
    abi: SWAP_ABI,
    functionName: 'getReserves',
  });

  // Token allowances
  const { data: usdkAllowance, refetch: refetchUsdkAllowance } = useReadContract({
    address: CONTRACTS.USDK,
    abi: USDK_ABI,
    functionName: 'allowance',
    args: [address as Address, CONTRACTS.SWAP],
    query: { enabled: !!address && (tokenIn === 'USDK' || tokenOut === 'USDK') }
  });

  const { data: kanariAllowance, refetch: refetchKanariAllowance } = useReadContract({
    address: CONTRACTS.KANARI,
    abi: KANARI_ABI,
    functionName: 'allowance',
    args: [address as Address, CONTRACTS.SWAP],
    query: { enabled: !!address && (tokenIn === 'KANARI' || tokenOut === 'KANARI') }
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

  // When approve transaction finishes, refresh allowances and balances
  useEffect(() => {
    if (approveHash && !isApproving) {
      try {
        refetchUsdkAllowance?.();
        refetchKanariAllowance?.();
        refetchUsdkBalance?.();
        refetchKanariBalance?.();
        refetchNativeBalance?.();
      } catch (e) {
        // ignore
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approveHash, isApproving]);

  // When swap transaction finishes, refresh reserves, balances and allowances and clear inputs
  useEffect(() => {
    if (swapHash && !isSwapPending) {
      try {
        refetchReserves?.();
        refetchUsdkBalance?.();
        refetchKanariBalance?.();
        refetchNativeBalance?.();
        refetchUsdkAllowance?.();
        refetchKanariAllowance?.();
      } catch (e) {
        // ignore
      }

      // clear inputs to reflect updated state
      setAmountIn('');
      setAmountOut('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [swapHash, isSwapPending]);

  // Helper functions
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

  const getTokenAllowance = (tokenKey: TokenKey) => {
    switch (tokenKey) {
      case 'NATIVE':
        return BigInt(0); // Native doesn't need approval
      case 'USDK':
        return usdkAllowance || BigInt(0);
      case 'KANARI':
        return kanariAllowance || BigInt(0);
      default:
        return BigInt(0);
    }
  };

  const getTokenDecimals = (tokenKey: TokenKey) => {
    return TOKENS[tokenKey].decimals;
  };

  const isNativeToken = (tokenKey: TokenKey) => {
    return tokenKey === 'NATIVE';
  };

  const getBalance = (tokenKey: TokenKey) => {
    const balance = getTokenBalance(tokenKey);
    const decimals = getTokenDecimals(tokenKey);
    return balance ? formatUnits(balance, decimals) : '0';
  };

  // Calculate output amount
  useEffect(() => {
    if (!amountIn || !reserves || parseFloat(amountIn) <= 0) {
      setAmountOut('');
      return;
    }

    try {
      const [reserveA, reserveB] = reserves as [bigint, bigint];
      const amountInWei = parseUnits(amountIn, getTokenDecimals(tokenIn));
      
      // Determine which reserve corresponds to which token
      // For now, assume reserveA is for the first token (USDK) and reserveB is for the second token (KANARI/NATIVE)
      const isFirstTokenIn = tokenIn === 'USDK' || (tokenIn === 'NATIVE' && tokenOut !== 'USDK');
      const reserveIn = isFirstTokenIn ? reserveA : reserveB;
      const reserveOut = isFirstTokenIn ? reserveB : reserveA;
      
      // Calculate output using AMM formula with 0.3% fee
      const feeBps = BigInt(30); // 0.3%
      const bps = BigInt(10000);
      const amountInWithFee = (amountInWei * (bps - feeBps)) / bps;
      
      const numerator = amountInWithFee * reserveOut;
      const denominator = reserveIn + amountInWithFee;
      const amountOutWei = numerator / denominator;
      
      setAmountOut(formatUnits(amountOutWei, getTokenDecimals(tokenOut)));
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

  // Token selection handlers
  const handleTokenSelect = (tokenKey: TokenKey, isTokenIn: boolean) => {
    if (isTokenIn) {
      if (tokenKey === tokenOut) {
        setTokenOut(tokenIn);
      }
      setTokenIn(tokenKey);
      setShowTokenSelectIn(false);
    } else {
      if (tokenKey === tokenIn) {
        setTokenIn(tokenOut);
      }
      setTokenOut(tokenKey);
      setShowTokenSelectOut(false);
    }
    setAmountIn('');
    setAmountOut('');
  };

  const handleApprove = async () => {
    if (!address || isNativeToken(tokenIn)) return;
    
    const tokenAddress = TOKENS[tokenIn].address as Address;
    const abi = tokenIn === 'USDK' ? USDK_ABI : KANARI_ABI;
    
    writeApprove({
      address: tokenAddress,
      abi,
      functionName: 'approve',
      args: [CONTRACTS.SWAP, parseUnits('1000000', getTokenDecimals(tokenIn))], // Approve large amount
    });
  };

  const handleSwap = async () => {
    if (!address || !amountIn || !amountOut) return;

    setIsSwapping(true);
    try {
      const amountInWei = parseUnits(amountIn, getTokenDecimals(tokenIn));
      const amountOutWei = parseUnits(amountOut, getTokenDecimals(tokenOut));
      const slippagePercent = parseFloat(slippage) / 100;
      const minAmountOut = amountOutWei * BigInt(Math.floor((1 - slippagePercent) * 10000)) / BigInt(10000);
      
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200); // 20 minutes
      
      // For native token support, we need to use special addresses
      const NATIVE_ADDRESS = '0x0000000000000000000000000000000000000000' as Address;
      const tokenInAddress = isNativeToken(tokenIn) ? NATIVE_ADDRESS : TOKENS[tokenIn].address as Address;
      
      if (isNativeToken(tokenIn)) {
        // When swapping native token, send value with transaction
        writeSwap({
          address: CONTRACTS.SWAP,
          abi: SWAP_ABI,
          functionName: 'swap',
          args: [tokenInAddress, amountInWei, minAmountOut, deadline],
          value: amountInWei,
        });
      } else {
        // Regular token swap
        writeSwap({
          address: CONTRACTS.SWAP,
          abi: SWAP_ABI,
          functionName: 'swap',
          args: [tokenInAddress, amountInWei, minAmountOut, deadline],
        });
      }
    } catch (error) {
      console.error('Swap failed:', error);
    } finally {
      setIsSwapping(false);
    }
  };

  // Check if approval is needed
  const needsApproval = () => {
    if (!amountIn || isNativeToken(tokenIn)) return false;
    const amountInWei = parseUnits(amountIn, getTokenDecimals(tokenIn));
    const allowance = getTokenAllowance(tokenIn);
    return !allowance || allowance < amountInWei;
  };

  // Token selector component
  const TokenSelector = ({ 
    isOpen, 
    onClose, 
    onSelect, 
    selectedToken, 
    otherToken, 
    isTokenIn
  }: { 
    isOpen: boolean; 
    onClose: () => void; 
    onSelect: (token: TokenKey) => void; 
    selectedToken: TokenKey; 
    otherToken: TokenKey; 
    isTokenIn: boolean;
  }) => {
    if (!isOpen) return null;

    return (
      <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--surface)] border border-white/10 rounded-xl shadow-xl z-50">
        {Object.entries(TOKENS).map(([key, token]) => (
          <button
            key={key}
            onClick={() => onSelect(key as TokenKey)}
            className="w-full flex items-center gap-3 p-3 hover:bg-[var(--background)]/50 transition-colors first:rounded-t-xl last:rounded-b-xl"
          >
            <div className={`w-8 h-8 rounded-full ${token.color} flex items-center justify-center text-white text-sm font-bold`}>
              {token.icon}
            </div>
            <div className="flex-1 text-left">
              <div className="font-medium">{token.symbol}</div>
              <div className="text-sm text-[var(--muted-text)]">{token.name}</div>
            </div>
            <div className="text-sm text-[var(--muted-text)]">
              {parseFloat(getBalance(key as TokenKey)).toFixed(4)}
            </div>
          </button>
        ))}
      </div>
    );
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
                Balance: {parseFloat(getBalance(tokenIn)).toFixed(4)} {TOKENS[tokenIn].symbol}
              </span>
            </div>
            <div className="flex items-center gap-3 p-4 bg-[var(--background)]/50 rounded-xl border border-white/5">
              <div className="relative">
                <button
                  onClick={() => setShowTokenSelectIn(true)}
                  className="flex items-center gap-2 min-w-0 hover:bg-[var(--background)]/30 rounded-lg p-2 transition-colors"
                >
                  <div className={`w-8 h-8 rounded-full ${TOKENS[tokenIn].color} flex items-center justify-center text-white text-sm font-bold`}>
                    {TOKENS[tokenIn].icon}
                  </div>
                  <span className="font-medium">{TOKENS[tokenIn].symbol}</span>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <TokenSelector
                  isOpen={showTokenSelectIn}
                  onClose={() => setShowTokenSelectIn(false)}
                  onSelect={(token) => handleTokenSelect(token, true)}
                  selectedToken={tokenIn}
                  otherToken={tokenOut}
                  isTokenIn={true}
                />
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
                Balance: {parseFloat(getBalance(tokenOut)).toFixed(4)} {TOKENS[tokenOut].symbol}
              </span>
            </div>
            <div className="flex items-center gap-3 p-4 bg-[var(--background)]/50 rounded-xl border border-white/5">
              <div className="relative">
                <button
                  onClick={() => setShowTokenSelectOut(true)}
                  className="flex items-center gap-2 min-w-0 hover:bg-[var(--background)]/30 rounded-lg p-2 transition-colors"
                >
                  <div className={`w-8 h-8 rounded-full ${TOKENS[tokenOut].color} flex items-center justify-center text-white text-sm font-bold`}>
                    {TOKENS[tokenOut].icon}
                  </div>
                  <span className="font-medium">{TOKENS[tokenOut].symbol}</span>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <TokenSelector
                  isOpen={showTokenSelectOut}
                  onClose={() => setShowTokenSelectOut(false)}
                  onSelect={(token) => handleTokenSelect(token, false)}
                  selectedToken={tokenOut}
                  otherToken={tokenIn}
                  isTokenIn={false}
                />
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
              {isApproving ? 'Approving...' : `Approve ${TOKENS[tokenIn].symbol}`}
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
                <span>1 {TOKENS[tokenIn].symbol} = {(parseFloat(amountOut) / parseFloat(amountIn || '1')).toFixed(6)} {TOKENS[tokenOut].symbol}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--muted-text)]">Slippage Tolerance</span>
                <span>{slippage}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--muted-text)]">Minimum Received</span>
                <span>{(parseFloat(amountOut) * (1 - parseFloat(slippage) / 100)).toFixed(6)} {TOKENS[tokenOut].symbol}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Click outside to close token selectors */}
      {(showTokenSelectIn || showTokenSelectOut) && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => {
            setShowTokenSelectIn(false);
            setShowTokenSelectOut(false);
          }}
        />
      )}
    </div>
  );
}
