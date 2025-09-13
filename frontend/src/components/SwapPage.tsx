"use client";

import React, { useEffect, useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useBalance } from 'wagmi';
import { parseUnits, formatUnits, Address } from 'viem';
import { CONTRACTS, SWAP_ABI, KANARI_ABI, USDC_ABI, DEX_FACTORY_ABI, POOLS } from '@/lib/contracts';
import TokenManager, { useAllTokens } from './TokenManager';
import TokenSelector, { getTokenInfo } from './TokenSelector';

export default function SwapPage() {
  const { address, isConnected } = useAccount();
  
  // State for swapping
  const [tokenIn, setTokenIn] = useState<string>('KANARI');
  const [tokenOut, setTokenOut] = useState<string>('NATIVE');
  const [amountIn, setAmountIn] = useState('');
  const [amountOut, setAmountOut] = useState('');
  const [slippage, setSlippage] = useState('0.5');
  const [isSwapping, setIsSwapping] = useState(false);
  const [showTokenManager, setShowTokenManager] = useState(false);
  const { customTokens } = useAllTokens();
  const [priceImpact, setPriceImpact] = useState('0');

  // Find available pools
  // Load custom pools (created via CreatePairPage) and include them when searching for a matching pool
  type CustomPool = { poolAddress: string; tokenAKey?: string; tokenBKey?: string; tokenAAddress?: string; tokenBAddress?: string; pairName?: string };
  const [customPools, setCustomPools] = useState<CustomPool[]>([]);
  useEffect(() => {
    try {
      const stored = localStorage.getItem('customPools');
      if (stored) setCustomPools(JSON.parse(stored));
    } catch {
      console.error('Error loading custom pools');
    }
  }, []);

  // Find available pools in built-in POOLS or custom pools
  const availablePoolBuiltIn = Object.values(POOLS).find(pool => 
    (pool.tokenA === tokenIn && pool.tokenB === tokenOut) ||
    (pool.tokenA === tokenOut && pool.tokenB === tokenIn)
  );

  const availablePoolCustom = customPools.find((p) => {
    // p may contain tokenAKey/tokenBKey or token addresses
    const aKey = p.tokenAKey || null;
    const bKey = p.tokenBKey || null;
    if (aKey && bKey) {
      return (aKey === tokenIn && bKey === tokenOut) || (aKey === tokenOut && bKey === tokenIn);
    }
    return false;
  });

  const availablePool = availablePoolBuiltIn || (availablePoolCustom ? { address: availablePoolCustom.poolAddress, tokenA: availablePoolCustom.tokenAKey, tokenB: availablePoolCustom.tokenBKey, name: availablePoolCustom.pairName } : undefined);

  const poolAddress = availablePool?.address;

  // Load custom tokens
  // customTokens provided by useAllTokens

  // Token balances
  const { data: nativeBalance } = useBalance({
    address: address,
    query: { enabled: !!address }
  });

  const { data: kanariBalance } = useReadContract({
    address: CONTRACTS.KANARI,
    abi: KANARI_ABI,
    functionName: 'balanceOf',
    args: [address as Address],
    query: { enabled: !!address }
  });
  // Token allowances
  const { data: kanariAllowance } = useReadContract({
    address: CONTRACTS.KANARI,
    abi: KANARI_ABI,
    functionName: 'allowance',
    args: [address as Address, poolAddress as Address],
    query: { enabled: !!address && !!poolAddress }
  });

  // Resolve token info objects (built-in or custom)
  const tokenInInfo = getTokenInfo(tokenIn, customTokens);
  const tokenOutInfo = getTokenInfo(tokenOut, customTokens);

  const isNativeToken = (tokenKey: string) => {
    return tokenKey === 'NATIVE';
  };

  // Generic ERC20 balances for the currently selected tokens (if not native)
  const { data: tokenInGenericBalance } = useReadContract({
    address: tokenInInfo?.address as Address,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: [address as Address],
    query: { enabled: !!address && !!tokenInInfo && !isNativeToken(tokenIn) }
  });

  const { data: tokenOutGenericBalance } = useReadContract({
    address: tokenOutInfo?.address as Address,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: [address as Address],
    query: { enabled: !!address && !!tokenOutInfo && !isNativeToken(tokenOut) }
  });

  // Try to resolve pool address from on-chain factory when possible (covers pools not present in local POOLS mapping)
  const { data: factoryPoolAddress } = useReadContract({
    address: CONTRACTS.DEX_FACTORY,
    abi: DEX_FACTORY_ABI,
    functionName: 'getPool',
    args: [tokenInInfo?.address as Address, tokenOutInfo?.address as Address],
    query: { enabled: !!tokenInInfo?.address && !!tokenOutInfo?.address }
  });

  // Prefer on-chain factory pool if present, otherwise fallback to availablePool address
  const resolvedPoolAddress = (factoryPoolAddress && String(factoryPoolAddress) !== '0x0000000000000000000000000000000000000000')
    ? String(factoryPoolAddress) : poolAddress;

  // Get swap quote
  const { data: swapQuote } = useReadContract({
    address: resolvedPoolAddress as Address,
    abi: SWAP_ABI,
    functionName: 'getAmountOut',
    args: [
      amountIn ? parseUnits(amountIn, tokenInInfo?.decimals || 18) : BigInt(0),
      tokenInInfo?.address as Address
    ],
    query: { enabled: !!resolvedPoolAddress && !!amountIn && parseFloat(amountIn) > 0 }
  });

  // Get price impact
  const { data: priceImpactData } = useReadContract({
    address: resolvedPoolAddress as Address,
    abi: SWAP_ABI,
    functionName: 'getPriceImpact',
    args: [
      amountIn ? parseUnits(amountIn, tokenInInfo?.decimals || 18) : BigInt(0),
      tokenInInfo?.address as Address
    ],
    query: { enabled: !!resolvedPoolAddress && !!amountIn && parseFloat(amountIn) > 0 }
  });

  // Contract writes
  const { writeContract: writeSwap, data: swapHash } = useWriteContract();
  const { writeContract: writeApprove } = useWriteContract();

  const { isLoading: isSwapPending } = useWaitForTransactionReceipt({
    hash: swapHash,
  });

  // Helper functions
  const getTokenBalance = (tokenKey: string) => {
    const tokenInfo = getTokenInfo(tokenKey, customTokens);
    if (!tokenInfo) return BigInt(0);

    // Native
    if (tokenKey === 'NATIVE') return nativeBalance?.value || BigInt(0);

    // Known KANARI (we already fetch specifically)
    if (tokenInfo.address && String(tokenInfo.address).toLowerCase() === String(CONTRACTS.KANARI).toLowerCase()) {
      return kanariBalance || BigInt(0);
    }

    // If token matches the currently selected input or output, return their generic balance reads
    try {
      if (tokenInfo.address && tokenInInfo && String(tokenInfo.address).toLowerCase() === String(tokenInInfo.address).toLowerCase()) {
        return tokenInGenericBalance || BigInt(0);
      }
      if (tokenInfo.address && tokenOutInfo && String(tokenInfo.address).toLowerCase() === String(tokenOutInfo.address).toLowerCase()) {
        return tokenOutGenericBalance || BigInt(0);
      }
    } catch {
      // ignore
    }

    // Fallback: zero
    return BigInt(0);
  };

  const getTokenAllowance = (tokenKey: string) => {
    const tokenInfo = getTokenInfo(tokenKey, customTokens);
    if (!tokenInfo) return BigInt(0);
    if (tokenKey === 'NATIVE') return BigInt(0);

    // KANARI allowance (already fetched)
    if (tokenInfo.address && String(tokenInfo.address).toLowerCase() === String(CONTRACTS.KANARI).toLowerCase()) {
      return kanariAllowance || BigInt(0);
    }

    // Other tokens: not fetched here (could add dynamic allowance fetches if needed)
    return BigInt(0);
  };


  const getBalance = (tokenKey: string) => {
    const balance = getTokenBalance(tokenKey);
    const token = getTokenInfo(tokenKey, customTokens);
    if (!token) return '0';
    return balance ? formatUnits(balance, token.decimals) : '0';
  };

  // Set the input to the token's full available balance (with optional native buffer)
  const handleSetMax = () => {
    const token = getTokenInfo(tokenIn, customTokens);
    if (!token) return;
    try {
      let balanceWei = getTokenBalance(tokenIn);
      // If native token, leave a small buffer for gas to avoid accidental full-balance send.
      if (isNativeToken(tokenIn)) {
        try {
          const buffer = parseUnits('0.001', token.decimals);
          if (balanceWei > buffer) balanceWei = balanceWei - buffer;
        } catch {
          // ignore buffer on parse error
        }
      }
      setAmountIn(formatUnits(balanceWei, token.decimals));
    } catch (e) {
      console.error('Failed to set max amount', e);
    }
  };

  // Set the input to half of the token's available balance
  const handleSetHalf = () => {
    const token = getTokenInfo(tokenIn, customTokens);
    if (!token) return;
    try {
      let balanceWei = getTokenBalance(tokenIn);
      // For native token, leave a small buffer for gas before halving
      if (isNativeToken(tokenIn)) {
        try {
          const buffer = parseUnits('0.001', token.decimals);
          if (balanceWei > buffer) balanceWei = balanceWei - buffer;
        } catch {
          // ignore
        }
      }
      const halfWei = balanceWei / BigInt(2);
      setAmountIn(formatUnits(halfWei, token.decimals));
    } catch (e) {
      console.error('Failed to set half amount', e);
    }
  };

  const needsApproval = (tokenKey: string, amount: string) => {
    if (!amount || isNativeToken(tokenKey)) return false;
    
    const token = getTokenInfo(tokenKey, customTokens);
    if (!token) return false;

    try {
      const amountWei = parseUnits(amount, token.decimals);
      const allowance = getTokenAllowance(tokenKey);
      return allowance < amountWei;
    } catch {
      return true;
    }
  };

  // Update output amount when input changes
  useEffect(() => {
    if (swapQuote && tokenOut) {
      const tokenOutInfo = getTokenInfo(tokenOut, customTokens);
      if (tokenOutInfo) {
        const outputAmount = formatUnits(swapQuote, tokenOutInfo.decimals);
        setAmountOut(outputAmount);
      }
    } else {
      setAmountOut('');
    }
  }, [swapQuote, tokenOut, customTokens]);

  // Update price impact
  useEffect(() => {
    if (priceImpactData) {
      const impact = (Number(priceImpactData) / 100).toFixed(2);
      setPriceImpact(impact);
    } else {
      setPriceImpact('0');
    }
  }, [priceImpactData]);

  // Handlers
  const handleTokenInSelect = (tokenKey: string) => {
    setTokenIn(tokenKey);
    setAmountIn('');
    setAmountOut('');
  };

  const handleTokenOutSelect = (tokenKey: string) => {
    setTokenOut(tokenKey);
    setAmountOut('');
  };

  const handleSwapTokens = () => {
    const tempIn = tokenIn;
    const tempAmountIn = amountIn;
    
    setTokenIn(tokenOut);
    setTokenOut(tempIn);
    setAmountIn(amountOut);
    setAmountOut(tempAmountIn);
  };

  const handleApprove = async (tokenKey: string) => {
    const token = getTokenInfo(tokenKey, customTokens);
    if (!token || isNativeToken(tokenKey)) return;

    const tokenContract = tokenKey === 'KANARI' ? CONTRACTS.KANARI : token.address;
    const abi = KANARI_ABI; // Use KANARI_ABI for ERC20 approvals

    try {
      writeApprove({
        address: tokenContract as Address,
        abi,
        functionName: 'approve',
        args: [poolAddress as Address, parseUnits('1000000', token.decimals)],
      });
    } catch (error) {
      console.error('Approval failed:', error);
    }
  };

  const handleSwap = async () => {
    if (!amountIn || !poolAddress) return;

    setIsSwapping(true);
    try {
      const tokenInInfo = getTokenInfo(tokenIn, customTokens);
      const tokenOutInfo = getTokenInfo(tokenOut, customTokens);
      
      if (!tokenInInfo || !tokenOutInfo) return;

      const amountInWei = parseUnits(amountIn, tokenInInfo.decimals);
      const slippagePercent = parseFloat(slippage) / 100;
      const minAmountOut = swapQuote ? swapQuote * BigInt(Math.floor((1 - slippagePercent) * 10000)) / BigInt(10000) : BigInt(0);
      
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200);

      let nativeValue = BigInt(0);
      if (isNativeToken(tokenIn)) {
        nativeValue = amountInWei;
      }

      writeSwap({
        address: poolAddress as Address,
        abi: SWAP_ABI,
        functionName: 'swap',
        args: [tokenInInfo.address as Address, amountInWei, minAmountOut, deadline],
        value: nativeValue,
      });
    } catch (error) {
      console.error('Swap failed:', error);
    } finally {
      setIsSwapping(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      {/* Token Manager Toggle */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowTokenManager(!showTokenManager)}
          className="px-4 py-2 bg-[var(--primary-color)] text-white font-medium rounded-lg hover:bg-[var(--primary-color)]/80 transition flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
          </svg>
          {showTokenManager ? 'Hide' : 'Manage'} Tokens
        </button>
      </div>

      {/* Token Manager */}
      {showTokenManager && (
        <TokenManager 
            onTokenAdded={() => { /* token manager persists and broadcasts update via customTokensUpdated event */ }}
          onClose={() => setShowTokenManager(false)}
        />
      )}

      {/* Swap Form */}
      <div className="bg-[var(--surface)] rounded-2xl border border-white/10 p-6 shadow-xl">
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-[var(--text-color)]">Swap Tokens</h2>

          {/* Token In */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-[var(--muted-text)]">From</label>
            <div className="space-y-2">
              <TokenSelector
                selectedToken={tokenIn}
                onTokenSelect={handleTokenInSelect}
                excludeTokens={[tokenOut]}
              />

              <div className="flex justify-between items-center">
                <div className="text-sm text-[var(--muted-text)]">Balance: {parseFloat(getBalance(tokenIn)).toFixed(4)} {getTokenInfo(tokenIn, customTokens)?.symbol}</div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSetMax}
                    className="px-2 py-0.5 bg-[var(--background)]/50 rounded-md text-xs hover:bg-[var(--background)]/80"
                  >
                    Max
                  </button>
                  <button
                    onClick={handleSetHalf}
                    className="px-2 py-0.5 bg-[var(--background)]/50 rounded-md text-xs hover:bg-[var(--background)]/80"
                  >
                    50%
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-[var(--background)]/50 rounded-xl border border-white/5">
                <input
                  type="text"
                  placeholder="0.0"
                  value={amountIn}
                  onChange={(e) => setAmountIn(e.target.value)}
                  className="w-full bg-transparent text-right text-lg font-medium placeholder-[var(--muted-text)] outline-none"
                />
              </div>
            </div>
          </div>

          {/* Swap Arrow */}
          <div className="flex justify-center">
            <button
              onClick={handleSwapTokens}
              className="w-10 h-10 rounded-full bg-[var(--surface)] border border-white/10 flex items-center justify-center hover:bg-[var(--background)]/80 transition"
              title="Swap tokens"
            >
              <svg className="w-5 h-5 text-[var(--text-color)]" viewBox="0 0 24 24" fill="none">
                <path d="M7 7l5-5v3h5v4h-2V6.414L9.414 11H7V7z" fill="currentColor" />
                <path d="M17 17l-5 5v-3H7v-4h2v3.586L14.586 13H17v4z" fill="currentColor" />
              </svg>
            </button>
          </div>

          {/* Token Out */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-[var(--muted-text)]">To</label>
            <div className="space-y-2">
              <TokenSelector
                selectedToken={tokenOut}
                onTokenSelect={handleTokenOutSelect}
                excludeTokens={[tokenIn]}
              />

              <div className="flex justify-between items-center">
                <div className="text-sm text-[var(--muted-text)]">Balance: {parseFloat(getBalance(tokenOut)).toFixed(4)} {getTokenInfo(tokenOut, customTokens)?.symbol}</div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-[var(--background)]/30 rounded-xl border border-white/5">
                <input
                  type="text"
                  placeholder="0.0"
                  value={amountOut}
                  readOnly
                  className="w-full bg-transparent text-right text-lg font-medium placeholder-[var(--muted-text)] outline-none"
                />
              </div>
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

          {/* Swap Information */}
          {amountIn && amountOut && (
            <div className="p-3 bg-[var(--background)]/30 rounded-lg border border-white/5">
              <h4 className="text-sm font-medium text-[var(--text-color)] mb-2">Swap Details</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--muted-text)]">Price Impact</span>
                  <span className={`${parseFloat(priceImpact) > 5 ? 'text-red-500' : parseFloat(priceImpact) > 2 ? 'text-yellow-500' : 'text-green-500'}`}>
                    {priceImpact}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted-text)]">Minimum Received</span>
                  <span className="text-[var(--text-color)]">
                    {swapQuote ? formatUnits(
                      swapQuote * BigInt(Math.floor((1 - parseFloat(slippage) / 100) * 10000)) / BigInt(10000),
                      getTokenInfo(tokenOut, customTokens)?.decimals || 18
                    ) : '0'} {getTokenInfo(tokenOut, customTokens)?.symbol}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Pool Status */}
          {!availablePool && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <div className="text-red-500 text-sm font-medium">⚠️ No liquidity pool available for this pair</div>
            </div>
          )}

          {/* Action Buttons */}
          {!isConnected ? (
            <div className="text-center py-4 text-[var(--muted-text)]">
              Please connect your wallet
            </div>
          ) : !availablePool ? (
            <button
              disabled
              className="w-full py-4 bg-gray-500 text-white font-medium rounded-xl cursor-not-allowed"
            >
              No Pool Available
            </button>
          ) : needsApproval(tokenIn, amountIn) ? (
            <button
              onClick={() => handleApprove(tokenIn)}
              className="w-full py-4 bg-[var(--primary-color)] text-white font-medium rounded-xl hover:bg-[var(--primary-color)]/80 transition"
            >
              Approve {getTokenInfo(tokenIn, customTokens)?.symbol}
            </button>
          ) : (
            <button
              onClick={handleSwap}
              disabled={isSwapping || isSwapPending || !amountIn || !amountOut || parseFloat(priceImpact) > 10}
              className="w-full py-4 bg-[var(--primary-color)] text-white font-medium rounded-xl hover:bg-[var(--primary-color)]/80 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {isSwapping || isSwapPending ? 'Swapping...' : 
               parseFloat(priceImpact) > 10 ? 'Price Impact Too High' : 'Swap'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
