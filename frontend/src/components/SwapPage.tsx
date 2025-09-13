"use client";

import React, { useEffect, useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useBalance } from 'wagmi';
import { parseUnits, formatUnits, Address } from 'viem';
import { CONTRACTS, SWAP_ABI, KANARI_ABI, USDC_ABI, DEX_FACTORY_ABI, POOLS } from '@/lib/contracts';
import TokenManager, { useAllTokens } from './TokenManager';
import TokenSelector, { getTokenInfo } from './TokenSelector';

export default function SwapPage() {
  const { address, isConnected } = useAccount();

  // State for swapping (default: NATIVE -> KANARI per UI request)
  const [tokenIn, setTokenIn] = useState<string>('NATIVE');
  const [tokenOut, setTokenOut] = useState<string>('KANARI');
  const [amountIn, setAmountIn] = useState('');
  const [amountOut, setAmountOut] = useState('');
  const [slippage, setSlippage] = useState('0.5'); // validated later
  const [isSwapping, setIsSwapping] = useState(false);
  const [showTokenManager, setShowTokenManager] = useState(false);
  const { customTokens } = useAllTokens();
  const [priceImpact, setPriceImpact] = useState('0');

  // Load custom pools
  type CustomPool = {
    poolAddress: string;
    tokenAKey?: string;
    tokenBKey?: string;
    tokenAAddress?: string;
    tokenBAddress?: string;
    pairName?: string
  };
  const [customPools, setCustomPools] = useState<CustomPool[]>([]);
  useEffect(() => {
    try {
      const stored = localStorage.getItem('customPools');
      if (stored) setCustomPools(JSON.parse(stored));
    } catch {
      console.error('Error loading custom pools');
    }
  }, []);

  // Find available pool (built-in or custom)
  const availablePoolBuiltIn = Object.values(POOLS).find(pool =>
    (pool.tokenA === tokenIn && pool.tokenB === tokenOut) ||
    (pool.tokenA === tokenOut && pool.tokenB === tokenIn)
  );

  const availablePoolCustom = customPools.find((p) => {
    const aKey = p.tokenAKey || null;
    const bKey = p.tokenBKey || null;
    if (aKey && bKey) {
      return (aKey === tokenIn && bKey === tokenOut) || (aKey === tokenOut && bKey === tokenIn);
    }
    return false;
  });

  const availablePool = availablePoolBuiltIn || (availablePoolCustom
    ? {
      address: availablePoolCustom.poolAddress,
      tokenA: availablePoolCustom.tokenAKey,
      tokenB: availablePoolCustom.tokenBKey,
      name: availablePoolCustom.pairName
    }
    : undefined);

  const poolAddress = availablePool?.address;

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

  const { data: kanariAllowance } = useReadContract({
    address: CONTRACTS.KANARI,
    abi: KANARI_ABI,
    functionName: 'allowance',
    args: [address as Address, poolAddress as Address],
    query: { enabled: !!address && !!poolAddress }
  });

  // Resolve token info objects
  const tokenInInfo = getTokenInfo(tokenIn, customTokens);
  const tokenOutInfo = getTokenInfo(tokenOut, customTokens);

  const isNativeToken = (tokenKey: string) => tokenKey === 'NATIVE';

  // Generic ERC20 balances
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

  // On-chain factory pool lookup
  const { data: factoryPoolAddress } = useReadContract({
    address: CONTRACTS.DEX_FACTORY,
    abi: DEX_FACTORY_ABI,
    functionName: 'getPool',
    args: [tokenInInfo?.address as Address, tokenOutInfo?.address as Address],
    query: { enabled: !!tokenInInfo?.address && !!tokenOutInfo?.address }
  });

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

  // Get price impact (on-chain)
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

  // Helper: get formatted balance
  const getTokenBalance = (tokenKey: string) => {
    const tokenInfo = getTokenInfo(tokenKey, customTokens);
    if (!tokenInfo) return BigInt(0);

    if (tokenKey === 'NATIVE') return nativeBalance?.value || BigInt(0);

    if (tokenInfo.address && String(tokenInfo.address).toLowerCase() === String(CONTRACTS.KANARI).toLowerCase()) {
      return kanariBalance || BigInt(0);
    }

    try {
      if (tokenInfo.address && tokenInInfo && String(tokenInfo.address).toLowerCase() === String(tokenInInfo.address).toLowerCase()) {
        return tokenInGenericBalance || BigInt(0);
      }
      if (tokenInfo.address && tokenOutInfo && String(tokenInfo.address).toLowerCase() === String(tokenOutInfo.address).toLowerCase()) {
        return tokenOutGenericBalance || BigInt(0);
      }
    } catch { }

    return BigInt(0);
  };

  const getTokenAllowance = (tokenKey: string) => {
    const token = getTokenInfo(tokenKey, customTokens);
    if (!token || isNativeToken(tokenKey)) return BigInt(0);
    if (token.address && String(token.address).toLowerCase() === String(CONTRACTS.KANARI).toLowerCase()) {
      return kanariAllowance || BigInt(0);
    }
    return BigInt(0);
  };

  const getBalance = (tokenKey: string) => {
    const balance = getTokenBalance(tokenKey);
    const token = getTokenInfo(tokenKey, customTokens);
    if (!token || !token.decimals) return '0.0000'; // safe fallback
    return formatUnits(balance, token.decimals);
  };

  // Set max amount
  const handleSetMax = () => {
    const token = getTokenInfo(tokenIn, customTokens);
    if (!token) return;
    try {
      let balanceWei = getTokenBalance(tokenIn);
      if (isNativeToken(tokenIn)) {
        const buffer = parseUnits('0.001', token.decimals);
        if (balanceWei > buffer) balanceWei -= buffer;
      }
      setAmountIn(formatUnits(balanceWei, token.decimals));
    } catch (e) {
      console.error('Failed to set max amount', e);
    }
  };

  // Set half amount
  const handleSetHalf = () => {
    const token = getTokenInfo(tokenIn, customTokens);
    if (!token) return;
    try {
      let balanceWei = getTokenBalance(tokenIn);
      if (isNativeToken(tokenIn)) {
        const buffer = parseUnits('0.001', token.decimals);
        if (balanceWei > buffer) balanceWei -= buffer;
      }
      const halfWei = balanceWei / BigInt(2);
      setAmountIn(formatUnits(halfWei, token.decimals));
    } catch (e) {
      console.error('Failed to set half amount', e);
    }
  };

  // Check if approval needed
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

  // Update output amount when quote changes
  useEffect(() => {
    if (swapQuote && tokenOutInfo) {
      setAmountOut(formatUnits(swapQuote, tokenOutInfo.decimals));
    } else {
      setAmountOut('');
    }
  }, [swapQuote, tokenOutInfo]);

  // Update price impact
  useEffect(() => {
    if (priceImpactData) {
      const impact = (Number(priceImpactData) / 100).toFixed(2);
      setPriceImpact(impact);
    } else {
      setPriceImpact('0');
    }
  }, [priceImpactData]);

  // Validate slippage input
  const handleSlippageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      const num = parseFloat(value);
      if (num >= 0 && num <= 50) { // reasonable upper bound
        setSlippage(value);
      } else if (value === '') {
        setSlippage('');
      }
    }
  };

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
    const abi = KANARI_ABI;

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
    if (!amountIn || !poolAddress || !tokenInInfo || !tokenOutInfo) return;

    setIsSwapping(true);
    try {
      const amountInWei = parseUnits(amountIn, tokenInInfo.decimals);
      const slippageBps = BigInt(Math.floor(parseFloat(slippage) * 100)); // convert % to basis points
      const minAmountOut = swapQuote
        ? (swapQuote * (BigInt(10000) - slippageBps)) / BigInt(10000)
        : BigInt(0);

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

  // Format token symbol safely
  const safeSymbol = (tokenKey: string) => {
    const token = getTokenInfo(tokenKey, customTokens);
    return token?.symbol || tokenKey;
  };

  // Loading states
  const isLoadingBalance = !nativeBalance && tokenIn === 'NATIVE';
  const isLoadingTokenInBalance = !tokenInGenericBalance && !isNativeToken(tokenIn) && tokenInInfo?.address;
  const isLoadingTokenOutBalance = !tokenOutGenericBalance && !isNativeToken(tokenOut) && tokenOutInfo?.address;
  const isLoadingQuote = !swapQuote && !!amountIn && !!resolvedPoolAddress;

  return (
    <div className="max-w-md mx-auto space-y-6">
      {/* Token Manager Toggle */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowTokenManager(!showTokenManager)}
          className="px-4 py-2 bg-[var(--primary-color)] text-white font-medium rounded-lg hover:bg-[var(--primary-color)]/80 transition flex items-center gap-2"
          aria-label={showTokenManager ? "Hide token manager" : "Manage tokens"}
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
          onTokenAdded={() => { }}
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
                <div className="text-sm text-[var(--muted-text)]">
                  Balance: {isLoadingBalance || isLoadingTokenInBalance ? '...' : parseFloat(getBalance(tokenIn)).toFixed(4)} {safeSymbol(tokenIn)}
                </div>
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
                  inputMode="decimal"
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
              aria-label="Swap tokens"
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
                <div className="text-sm text-[var(--muted-text)]">
                  Balance: {isLoadingTokenOutBalance ? '...' : parseFloat(getBalance(tokenOut)).toFixed(4)} {safeSymbol(tokenOut)}
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-[var(--background)]/30 rounded-xl border border-white/5">
                <input
                  type="text"
                  placeholder="0.0"
                  value={isLoadingQuote ? 'Calculating...' : amountOut}
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
                  className={`px-3 py-1 rounded-lg text-sm transition ${slippage === preset
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
                onChange={handleSlippageChange}
                className="flex-1 px-3 py-1 bg-[var(--background)]/50 rounded-lg text-sm text-center outline-none border border-white/5 focus:border-[var(--primary-color)]/50"
                placeholder="0.5"
                aria-label="Slippage tolerance percentage"
              />
            </div>
            <p className="text-xs text-[var(--muted-text)] mt-1">
              Slippage adjusts minimum received. Higher = more risk, lower = better rate.
            </p>
          </div>

          {/* Swap Information */}
          {amountIn && amountOut && resolvedPoolAddress && (
            <div className="p-3 bg-[var(--background)]/30 rounded-lg border border-white/5">
              <h4 className="text-sm font-medium text-[var(--text-color)] mb-2">Swap Details</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--muted-text)]">Estimated Price Impact</span>
                  <span className={`${parseFloat(priceImpact) > 5 ? 'text-red-500' : parseFloat(priceImpact) > 2 ? 'text-yellow-500' : 'text-green-500'}`}>
                    {priceImpact}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted-text)]">Minimum Received</span>
                  <span className="text-[var(--text-color)]">
                    {swapQuote
                      ? formatUnits(
                        (swapQuote * (BigInt(10000) - BigInt(Math.floor(parseFloat(slippage) * 100)))) / BigInt(10000),
                        tokenOutInfo?.decimals || 18
                      )
                      : '0'} {safeSymbol(tokenOut)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Pool Status */}
          {!availablePool && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <div className="text-red-500 text-sm font-medium">
                ⚠️ No liquidity pool available for this pair.
              </div>
              <p className="text-xs text-red-500/80 mt-1">
                Create a pool using the “Create Pair” page first.
              </p>
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
              Approve {safeSymbol(tokenIn)}
            </button>
          ) : (
            <button
              onClick={handleSwap}
              disabled={
                isSwapping ||
                isSwapPending ||
                !amountIn ||
                !amountOut ||
                !resolvedPoolAddress ||
                parseFloat(priceImpact) > 10 ||
                parseFloat(slippage) < 0
              }
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