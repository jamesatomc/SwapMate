"use client";

import React, { useEffect, useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useBalance, usePublicClient } from 'wagmi';
import { formatUnits, parseUnits, Address } from 'viem';
import { CONTRACTS, USDC_ABI, KANARI_ABI, SWAP_ABI, DEX_FACTORY_ABI, TOKENS, TokenKey, POOLS, PoolKey } from '@/lib/contracts';
import { useAllTokens } from './TokenManager';
import TokenSelector from './TokenSelector'; // 👈 FIXED: Import was missing!

export default function AddLiquidityPage() {
  const { address, isConnected } = useAccount();

  // State for liquidity
  const [selectedPool, setSelectedPool] = useState<string>('KANARI-NATIVE');
  const [amountA, setAmountA] = useState('');
  const [amountB, setAmountB] = useState('');
  const [slippage, setSlippage] = useState('0.5');
  const [isAddingLiquidity, setIsAddingLiquidity] = useState(false);
  const [showPoolSelect, setShowPoolSelect] = useState(false);
  const [poolNotFound, setPoolNotFound] = useState<string | null>(null); // 👈 NEW: For non-existent pool CTA

  // Load custom pools saved by CreatePairPage (persisted to localStorage)
  type CustomPool = { poolAddress: string; tokenAKey?: string; tokenBKey?: string; tokenAAddress?: string; tokenBAddress?: string; pairName?: string };
  const [customPools, setCustomPools] = useState<CustomPool[]>([]);
  const [factoryPools, setFactoryPools] = useState<string[]>([]);
  useEffect(() => {
    try {
      const stored = localStorage.getItem('customPools');
      if (stored) setCustomPools(JSON.parse(stored));
    } catch {
      console.error('Error loading custom pools');
    }
  }, []);

  const publicClient = usePublicClient();

  // Fetch pools from on-chain factory so we can display pools created by others
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
            // ignore individual failures
          }
        }
        if (mounted) setFactoryPools(pools);
      } catch {
        // ignore
      }
    };

    fetchFactoryPools();
    return () => { mounted = false; };
  }, [publicClient]);

  // Helper to map token address ->TokenKey when possible
  const getTokenKeyFromAddress = (tokenAddress?: string): TokenKey => {
    if (!tokenAddress) return 'USDC';
    const lower = tokenAddress.toLowerCase();
    for (const k of Object.keys(TOKENS) as TokenKey[]) {
      if (TOKENS[k].address.toLowerCase() === lower) return k;
    }
    return 'USDC';
  };

  const { customTokens } = useAllTokens();
  // Helper to resolve a display token object (works for built-in TOKENS and custom tokens saved to localStorage)
  const getDisplayToken = React.useCallback((keyOrAddress?: string) => {
    // Default fallback display
    const fallback = { address: '', name: '', symbol: keyOrAddress || 'TOKEN', decimals: 18, icon: (keyOrAddress ? String(keyOrAddress).charAt(0).toUpperCase() : '?'), color: 'bg-gray-400' };

    if (!keyOrAddress) return fallback;

    // If it's a built-in token key
    try {
      if (keyOrAddress in TOKENS) {
        return TOKENS[keyOrAddress as TokenKey];
      }
    } catch {
      // ignore
    }

    // Try to find in saved custom tokens in localStorage
    // Check custom tokens from hook
    try {
      const found = (customTokens || []).find(t => String(t.address).toLowerCase() === String(keyOrAddress).toLowerCase());
      if (found) return { address: found.address, name: found.name, symbol: found.symbol, decimals: found.decimals, icon: found.icon || String(found.symbol).charAt(0).toUpperCase(), color: found.color || 'bg-gray-400' };
    } catch {
      // ignore
    }

    // Try mapping address to known built-in token key
    try {
      const mapped = getTokenKeyFromAddress(keyOrAddress);
      if (mapped && mapped in TOKENS) return TOKENS[mapped];
    } catch {
      // ignore
    }

    return fallback;
  }, [customTokens]);

  const getTokenDecimals = React.useCallback((tokenKey?: TokenKey | string) => {
    try {
      return getDisplayToken(tokenKey as string).decimals;
    } catch {
      return 18;
    }
  }, [getDisplayToken]);

  // Resolve current pool info whether built-in or custom
  const isCustomSelection = selectedPool.startsWith('CUSTOM:');
  const poolAddress = isCustomSelection ? selectedPool.split(':')[1] : (POOLS[selectedPool as PoolKey]?.address);
  // If custom, try to find token keys saved with the custom pool entry
  let tokenA: TokenKey = 'USDC';
  let tokenB: TokenKey = 'USDC';
  let currentPoolName = '';
  let currentPoolDescription = '';
  if (isCustomSelection) {
    const poolAddr = poolAddress?.toLowerCase();
    const found = customPools.find((p) => p.poolAddress && String(p.poolAddress).toLowerCase() === poolAddr);
    if (found) {
      tokenA = (found.tokenAKey as TokenKey) || (found.tokenAAddress ? getTokenKeyFromAddress(found.tokenAAddress) : 'USDC');
      tokenB = (found.tokenBKey as TokenKey) || (found.tokenBAddress ? getTokenKeyFromAddress(found.tokenBAddress) : 'USDC');
      currentPoolName = found.pairName || `${getDisplayToken(tokenA).symbol}/${getDisplayToken(tokenB).symbol}`;
      currentPoolDescription = 'Custom pool';
    } else {
      // fallback: try to read on-chain token ordering later via contract reads
      tokenA = 'USDC';
      tokenB = 'KANARI';
      currentPoolName = poolAddress || 'Custom Pool';
      currentPoolDescription = 'Custom pool';
    }
  } else {
    type PoolLike = { tokenA?: string; tokenB?: string; name?: string; description?: string };
    const built: PoolLike = POOLS[selectedPool as PoolKey] || {} as PoolLike;
    tokenA = (built.tokenA as TokenKey) || 'USDC';
    tokenB = (built.tokenB as TokenKey) || 'KANARI';
    currentPoolName = built.name || `${getDisplayToken(tokenA).symbol}/${getDisplayToken(tokenB).symbol}`;
    currentPoolDescription = built.description || '';
  }
  const currentPool = { address: poolAddress, tokenA, tokenB, name: currentPoolName, description: currentPoolDescription };

  // Safe display objects for the currently selected tokens (used in JSX to avoid indexing TOKENS[...] directly)
  const displayA = getDisplayToken(tokenA);
  const displayB = getDisplayToken(tokenB);

  // Contract reads - Native balance
  const { data: nativeBalance, refetch: refetchNativeBalance } = useBalance({
    address: address,
    query: { enabled: !!address }
  });

  // Token balances
  const { data: usdcBalance, refetch: refetchUsdcBalance } = useReadContract({
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

  // LP balance for selected pool
  const { data: lpBalance, refetch: refetchLpBalance } = useReadContract({
    address: poolAddress as Address,
    abi: SWAP_ABI,
    functionName: 'balanceOf',
    args: [address as Address],
    query: { enabled: !!address }
  });

  // Update reserves query to use selected pool
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

  // Derived helper values for native checks and UX
  const nativeZero = getDisplayToken('NATIVE').address.toLowerCase();
  const aAddr = String(getDisplayToken(tokenA).address).toLowerCase(); // 👈 Always use local mapping
  const bAddr = String(getDisplayToken(tokenB).address).toLowerCase(); // 👈 Always use local mapping
  const poolRequiresNative = aAddr === nativeZero || bAddr === nativeZero;

  // Preview the native amount required (if inputs are available) so we can disable the button when balance is insufficient
  let previewNativeRequired: bigint | null = null;
  try {
    if ((aAddr === nativeZero || bAddr === nativeZero) && (amountA || amountB)) {
      const decimalsA = getTokenDecimals(tokenA);
      const decimalsB = getTokenDecimals(tokenB);
      const aWei = amountA ? parseUnits(amountA, decimalsA) : BigInt(0);
      const bWei = amountB ? parseUnits(amountB, decimalsB) : BigInt(0);
      previewNativeRequired = BigInt(0);
      if (aAddr === nativeZero) previewNativeRequired += aWei;
      if (bAddr === nativeZero) previewNativeRequired += bWei;
    }
  } catch {
    previewNativeRequired = null;
  }

  // Token allowances for selected pool
  const { data: usdcAllowance, refetch: refetchUsdcAllowance } = useReadContract({
    address: CONTRACTS.USDC,
    abi: USDC_ABI,
    functionName: 'allowance',
    args: [address as Address, poolAddress as Address],
    query: { enabled: !!address && (tokenA === 'USDC' || tokenB === 'USDC') }
  });

  const { data: kanariAllowance, refetch: refetchKanariAllowance } = useReadContract({
    address: CONTRACTS.KANARI,
    abi: KANARI_ABI,
    functionName: 'allowance',
    args: [address as Address, poolAddress as Address],
    query: { enabled: !!address && (tokenA === 'KANARI' || tokenB === 'KANARI') }
  });

  // Contract writes
  const { writeContract: writeApprove, data: approveHash } = useWriteContract();
  const { writeContract: writeAddLiquidity, data: addLiquidityHash } = useWriteContract();

  const { isLoading: isApproving } = useWaitForTransactionReceipt({
    hash: approveHash,
  });

  const { isLoading: isAddLiquidityPending } = useWaitForTransactionReceipt({
    hash: addLiquidityHash,
  });

  // Refresh relevant data when approve completes
  useEffect(() => {
    if (approveHash && !isApproving) {
      try {
        refetchUsdcAllowance?.();
        refetchKanariAllowance?.();
        refetchUsdcBalance?.();
        refetchKanariBalance?.();
        refetchNativeBalance?.();
      } catch {
        // ignore
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approveHash, isApproving]);

  // Refresh pool and balances after add liquidity completes and clear inputs
  useEffect(() => {
    if (addLiquidityHash && !isAddLiquidityPending) {
      try {
        refetchReserves?.();
        refetchTotalSupply?.();
        refetchLpBalance?.();
        refetchUsdcBalance?.();
        refetchKanariBalance?.();
        refetchNativeBalance?.();
        refetchUsdcAllowance?.();
        refetchKanariAllowance?.();
      } catch {
        // ignore
      }

      setAmountA('');
      setAmountB('');
      setPoolNotFound(null); // 👈 Reset error message
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addLiquidityHash, isAddLiquidityPending]);

  // Helper functions
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

  const getTokenAllowance = (tokenKey: TokenKey) => {
    switch (tokenKey) {
      case 'NATIVE':
        return BigInt(0); // Native doesn't need approval
      case 'USDC':
        return usdcAllowance || BigInt(0);
      case 'KANARI':
        return kanariAllowance || BigInt(0);
      default:
        return BigInt(0);
    }
  };

  const isNativeToken = (tokenKey: TokenKey) => {
    return tokenKey === 'NATIVE';
  };

  // Auto-calculate proportional amounts
  useEffect(() => {
    if (!reserves || !amountA || amountA === '0') {
      setAmountB('');
      return;
    }

    const [reserveA, reserveB] = reserves as [bigint, bigint];
    if (reserveA === BigInt(0) || reserveB === BigInt(0)) return;

    try {
      const decimalsA = getTokenDecimals(tokenA);
      const decimalsB = getTokenDecimals(tokenB);
      const amountAWei = parseUnits(amountA, decimalsA);
      const proportionalB = (amountAWei * reserveB) / reserveA;
      setAmountB(formatUnits(proportionalB, decimalsB));
    } catch (error) {
      console.error('Error calculating proportional amount:', error);
    }
  }, [amountA, reserves, tokenA, tokenB, getTokenDecimals]);

  const handleApprove = async (tokenKey: TokenKey) => {
    if (!address || isNativeToken(tokenKey)) return;

    const tokenAddress = TOKENS[tokenKey].address;
    const abi = tokenKey === 'USDC' ? USDC_ABI : KANARI_ABI;

    writeApprove({
      address: tokenAddress,
      abi,
      functionName: 'approve',
      args: [poolAddress as Address, parseUnits('1000000', 18)], // Approve large amount
    });
  };

  const handleAddLiquidity = async () => {
    if (!address || !amountA || !amountB) return;

    // If pool requires native currency, ensure nativeBalance is loaded and sufficient before opening wallet
    if (poolRequiresNative && previewNativeRequired !== null) {
      if (!nativeBalance || typeof nativeBalance.value !== 'bigint') {
        setPoolNotFound('Native balance is still loading — please wait a moment and try again.');
        return;
      }
      if (nativeBalance.value < previewNativeRequired) {
        setPoolNotFound('Insufficient native balance for this add liquidity operation.');
        return;
      }
    }

    setIsAddingLiquidity(true);
    try {
      const decimalsA = getTokenDecimals(tokenA);
      const decimalsB = getTokenDecimals(tokenB);
      const amountAWei = parseUnits(amountA, decimalsA);
      const amountBWei = parseUnits(amountB, decimalsB);
      const slippagePercent = parseFloat(slippage) / 100;

      const minAmountA = amountAWei * BigInt(Math.floor((1 - slippagePercent) * 10000)) / BigInt(10000);
      const minAmountB = amountBWei * BigInt(Math.floor((1 - slippagePercent) * 10000)) / BigInt(10000);

      const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200); // 20 minutes

      // Determine native value according to LOCAL token mapping (not on-chain!)
      let nativeValue = BigInt(0);
      if (aAddr === nativeZero) nativeValue += amountAWei;
      if (bAddr === nativeZero) nativeValue += amountBWei;

      // Debug output
      console.debug('AddLiquidity debug', {
        poolAddress,
        tokenA: tokenA,
        tokenB: tokenB,
        aAddr,
        bAddr,
        amountAWei: amountAWei.toString(),
        amountBWei: amountBWei.toString(),
        nativeValue: nativeValue.toString(),
        nativeBalance: nativeBalance?.value ? nativeBalance.value.toString() : null,
      });

      writeAddLiquidity({
        address: poolAddress as Address,
        abi: SWAP_ABI,
        functionName: 'addLiquidity',
        args: [amountAWei, amountBWei, minAmountA, minAmountB, deadline],
        value: nativeValue,
      });
    } catch (error) {
      console.error('Add liquidity failed:', error);
      setPoolNotFound('Failed to add liquidity. Please try again.');
    } finally {
      setIsAddingLiquidity(false);
    }
  };

  // Check if approvals are needed
  const needsApproval = (tokenKey: TokenKey, amount: string) => {
    if (!amount || isNativeToken(tokenKey)) return false;
    try {
      const decimals = getTokenDecimals(tokenKey);
      const amountWei = parseUnits(amount, decimals);
      const allowance = getTokenAllowance(tokenKey);
      return allowance < amountWei;
    } catch {
      return false;
    }
  };

  const getBalance = (tokenKey: TokenKey) => {
    const balance = getTokenBalance(tokenKey);
    const decimals = getTokenDecimals(tokenKey);
    return balance ? formatUnits(balance, decimals) : '0';
  };

  // Fill amount fields based on percent of user's balance for token A or B
  const handlePercentFill = (percent: number, which: 'A' | 'B') => {
    try {
      if (percent <= 0 || percent > 100) return;

      if (which === 'A') {
        const bal = getTokenBalance(tokenA);
        const decimalsA = getTokenDecimals(tokenA);
        const use = bal === BigInt(0) ? BigInt(0) : (bal * BigInt(percent)) / BigInt(100);
        const amountStr = formatUnits(use, decimalsA);
        setAmountA(amountStr);

        if (reserves) {
          const [reserveA, reserveB] = reserves as [bigint, bigint];
          if (reserveA !== BigInt(0)) {
            const proportionalB = (use * reserveB) / reserveA;
            const decimalsB = getTokenDecimals(tokenB);
            setAmountB(formatUnits(proportionalB, decimalsB));
          }
        }
      } else {
        const bal = getTokenBalance(tokenB);
        const decimalsB = getTokenDecimals(tokenB);
        const use = bal === BigInt(0) ? BigInt(0) : (bal * BigInt(percent)) / BigInt(100);
        const amountStr = formatUnits(use, decimalsB);
        setAmountB(amountStr);

        if (reserves) {
          const [reserveA, reserveB] = reserves as [bigint, bigint];
          if (reserveB !== BigInt(0)) {
            const proportionalA = (use * reserveA) / reserveB;
            const decimalsA = getTokenDecimals(tokenA);
            setAmountA(formatUnits(proportionalA, decimalsA));
          }
        }
      }
    } catch (err) {
      console.error('Percent fill failed', err);
    }
  };

  const getPoolShare = () => {
    if (!amountA || !totalSupply || !reserves) return '0';

    const [reserveA] = reserves as [bigint, bigint];
    if (reserveA === BigInt(0)) return '100'; // First liquidity provider gets 100%

    try {
      const decimalsA = getTokenDecimals(tokenA);
      const amountAWei = parseUnits(amountA, decimalsA);
      const lpTokens = (amountAWei * totalSupply) / reserveA;
      const newTotalSupply = totalSupply + lpTokens;
      const poolShare = (lpTokens * BigInt(10000)) / newTotalSupply;
      return (Number(poolShare) / 100).toFixed(2);
    } catch {
      return '0';
    }
  };

  // Reset form when pool changes
  useEffect(() => {
    setAmountA('');
    setAmountB('');
    setPoolNotFound(null); // 👈 Clear any error on pool change
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

  // ✅ NEW: Handle token selection without alert
  const handleTokenASelect = (tokenKey: string) => {
    try {
      const chosen = getDisplayToken(tokenKey);
      const other = getDisplayToken(tokenB);
      const chosenAddr = String(chosen.address).toLowerCase();
      const otherAddr = String(other.address).toLowerCase();

      // Search built-in POOLS
      for (const [k, pool] of Object.entries(POOLS)) {
        const aAddr = String(getDisplayToken(pool.tokenA).address).toLowerCase();
        const bAddr = String(getDisplayToken(pool.tokenB).address).toLowerCase();
        if ((aAddr === chosenAddr && bAddr === otherAddr) || (bAddr === chosenAddr && aAddr === otherAddr)) {
          setSelectedPool(k as PoolKey);
          setAmountA('');
          setAmountB('');
          return;
        }
      }

      // Search saved custom pools
      for (const p of customPools) {
        const aAddr = String((p.tokenAAddress || getDisplayToken(p.tokenAKey).address) || '').toLowerCase();
        const bAddr = String((p.tokenBAddress || getDisplayToken(p.tokenBKey).address) || '').toLowerCase();
        if ((aAddr === chosenAddr && bAddr === otherAddr) || (bAddr === chosenAddr && aAddr === otherAddr)) {
          setSelectedPool(`CUSTOM:${String(p.poolAddress)}`);
          setAmountA('');
          setAmountB('');
          return;
        }
      }

      // No pool found → show persistent CTA instead of alert()
      setPoolNotFound('No liquidity pool found for this token pair. Create one now?');
    } catch (err) {
      console.error('Token A select failed', err);
    }
  };

  const handleTokenBSelect = (tokenKey: string) => {
    try {
      const chosen = getDisplayToken(tokenKey);
      const other = getDisplayToken(tokenA);
      const chosenAddr = String(chosen.address).toLowerCase();
      const otherAddr = String(other.address).toLowerCase();

      for (const [k, pool] of Object.entries(POOLS)) {
        const aAddr = String(getDisplayToken(pool.tokenA).address).toLowerCase();
        const bAddr = String(getDisplayToken(pool.tokenB).address).toLowerCase();
        if ((aAddr === chosenAddr && bAddr === otherAddr) || (bAddr === chosenAddr && aAddr === otherAddr)) {
          setSelectedPool(k as PoolKey);
          setAmountA('');
          setAmountB('');
          return;
        }
      }

      for (const p of customPools) {
        const aAddr = String((p.tokenAAddress || getDisplayToken(p.tokenAKey).address) || '').toLowerCase();
        const bAddr = String((p.tokenBAddress || getDisplayToken(p.tokenBKey).address) || '').toLowerCase();
        if ((aAddr === chosenAddr && bAddr === otherAddr) || (bAddr === chosenAddr && aAddr === otherAddr)) {
          setSelectedPool(`CUSTOM:${String(p.poolAddress)}`);
          setAmountA('');
          setAmountB('');
          return;
        }
      }

      setPoolNotFound('No liquidity pool found for this token pair. Create one now?');
    } catch (err) {
      console.error('Token B select failed', err);
    }
  };

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
                    <div className={`w-8 h-8 rounded-full ${displayA.color} flex items-center justify-center text-white text-sm font-bold z-10`}>
                      {displayA.icon}
                    </div>
                    <div className={`w-8 h-8 rounded-full ${displayB.color} flex items-center justify-center text-white text-sm font-bold`}>
                      {displayB.icon}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium">{currentPool.name}</div>
                    <div className="text-sm text-[var(--muted-text)]">{currentPool.description}</div>
                  </div>
                </div>
                <div className="text-[var(--muted-text)]">
                  {showPoolSelect ? '↑' : '↓'} {/* ✅ FIXED: Real Unicode arrows */}
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
                      className={`w-full flex items-center gap-3 p-4 hover:bg-[var(--background)]/30 transition ${selectedPool === key ? 'bg-[var(--primary-color)]/10' : ''
                        }`}
                    >
                      <div className="flex items-center -space-x-2">
                        <div className={`w-6 h-6 rounded-full ${getDisplayToken(pool.tokenA).color} flex items-center justify-center text-white text-xs font-bold z-10`}>
                          {getDisplayToken(pool.tokenA).icon}
                        </div>
                        <div className={`w-6 h-6 rounded-full ${getDisplayToken(pool.tokenB).color} flex items-center justify-center text-white text-xs font-bold`}>
                          {getDisplayToken(pool.tokenB).icon}
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

                  {/* Custom pools saved in localStorage (created via CreatePairPage) */}
                  {customPools && customPools.length > 0 && (
                    <div className="border-t border-white/5">
                      {customPools.map((p) => {
                        const addr = String(p.poolAddress || p.poolAddress).toLowerCase();
                        const key = `CUSTOM:${addr}`;
                        const aDisplay = getDisplayToken(p.tokenAKey || p.tokenAAddress);
                        const bDisplay = getDisplayToken(p.tokenBKey || p.tokenBAddress);
                        const name = p.pairName || `${aDisplay.symbol}/${bDisplay.symbol}`;
                        return (
                          <button
                            key={key}
                            onClick={() => {
                              setSelectedPool(key);
                              setShowPoolSelect(false);
                            }}
                            className={`w-full flex items-center gap-3 p-4 hover:bg-[var(--background)]/30 transition ${selectedPool === key ? 'bg-[var(--primary-color)]/10' : ''
                              }`}
                          >
                            <div className="flex items-center -space-x-2">
                              <div className={`w-6 h-6 rounded-full ${aDisplay.color} flex items-center justify-center text-white text-xs font-bold z-10`}>
                                {aDisplay.icon}
                              </div>
                              <div className={`w-6 h-6 rounded-full ${bDisplay.color} flex items-center justify-center text-white text-xs font-bold`}>
                                {bDisplay.icon}
                              </div>
                            </div>
                            <div className="text-left">
                              <div className="font-medium">{name}</div>
                              <div className="text-sm text-[var(--muted-text)]">Custom pool: {p.poolAddress}</div>
                            </div>
                            {selectedPool === key && (
                              <div className="ml-auto text-[var(--primary-color)]">✓</div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* ✅ FIXED: Factory pools now show correct icons per pool */}
                  {factoryPools && factoryPools.length > 0 && (
                    <div className="border-t border-white/5">
                      {factoryPools.map((addr) => {
                        // Only show correct tokens if THIS is the selected pool
                        const isSelected = selectedPool === `CUSTOM:${addr}`;
                        const aIcon = isSelected ? displayA.icon : '?';
                        const bIcon = isSelected ? displayB.icon : '?';
                        const aColor = isSelected ? displayA.color : 'bg-gray-500';
                        const bColor = isSelected ? displayB.color : 'bg-gray-500';

                        return (
                          <button
                            key={addr}
                            onClick={() => {
                              setSelectedPool(`CUSTOM:${addr}`);
                              setShowPoolSelect(false);
                            }}
                            className={`w-full flex items-center gap-3 p-4 hover:bg-[var(--background)]/30 transition ${selectedPool === `CUSTOM:${addr}` ? 'bg-[var(--primary-color)]/10' : ''
                              }`}
                          >
                            <div className="flex items-center -space-x-2">
                              <div className={`w-6 h-6 rounded-full ${aColor} flex items-center justify-center text-white text-xs font-bold z-10`}>
                                {aIcon}
                              </div>
                              <div className={`w-6 h-6 rounded-full ${bColor} flex items-center justify-center text-white text-xs font-bold`}>
                                {bIcon}
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
            {!reserves ? (
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <div className="text-blue-500 text-sm font-medium">🔄 Loading pool data...</div>
                <div className="text-blue-500/80 text-xs">Fetching pool information from the blockchain.</div>
              </div>
            ) : null}

            {/* ❗ Persistent CTA for missing pool */}
            {poolNotFound && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
                <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="text-sm text-red-500">{poolNotFound}</div>

              </div>

            )}
          </div>

          {/* Pool Info */}
          {reserves && (
            <div className="p-4 bg-[var(--background)]/30 rounded-xl border border-white/5">
              <h3 className="text-lg font-semibold mb-3">Pool Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--muted-text)]">{displayA.symbol} Reserve</span>
                  <span>{formatUnits(reserves[0], getTokenDecimals(tokenA))} {displayA.symbol}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted-text)]">{displayB.symbol} Reserve</span>
                  <span>{formatUnits(reserves[1], getTokenDecimals(tokenB))} {displayB.symbol}</span>
                </div>
                {lpBalance && (
                  <div className="flex justify-between">
                    <span className="text-[var(--muted-text)]">Your LP Tokens</span>
                    <span>{formatUnits(lpBalance, 18)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Token A Input */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-[var(--muted-text)]">{displayA.symbol} Amount</label>
              <div className="text-sm text-[var(--muted-text)] flex items-center gap-2">
                <span>Balance: {parseFloat(getBalance(tokenA)).toFixed(4)} {displayA.symbol}</span>
                <button
                  onClick={() => handlePercentFill(100, 'A')}
                  className="px-2 py-0.5 bg-[var(--background)]/50 rounded-md text-xs hover:bg-[var(--background)]/80"
                >
                  Max
                </button>
                <button
                  onClick={() => handlePercentFill(50, 'A')}
                  className="px-2 py-0.5 bg-[var(--background)]/50 rounded-md text-xs hover:bg-[var(--background)]/80"
                >
                  50%
                </button>
              </div>
            </div>
            <div>
              {/* ✅ FIXED: Render TokenSelector */}
              <TokenSelector
                selectedToken={tokenA}
                onTokenSelect={handleTokenASelect}
                excludeTokens={[tokenB]}
              />
              <div className="flex items-center gap-3 p-4 bg-[var(--background)]/50 rounded-xl border border-white/5 mt-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-8 h-8 rounded-full ${displayA.color} flex items-center justify-center text-white text-sm font-bold`}>
                    {displayA.icon}
                  </div>
                  <span className="font-medium">{displayA.symbol}</span>
                </div>
                <input
                  type="number" // ✅ FIXED: Mobile numeric keypad
                  step="any" // ✅ Allow decimals
                  placeholder="0.0"
                  value={amountA}
                  onChange={(e) => setAmountA(e.target.value)}
                  className="flex-1 bg-transparent text-right text-lg font-medium placeholder-[var(--muted-text)] outline-none"
                />
              </div>
            </div>
          </div>

          {/* Plus Icon */}
          <div className="flex justify-center">
            <div className="w-8 h-8 rounded-full bg-[var(--surface)] border border-white/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-[var(--text-color)]" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>

          {/* Token B Input */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-[var(--muted-text)]">{displayB.symbol} Amount</label>
              <div className="text-sm text-[var(--muted-text)] flex items-center gap-2">
                <span>Balance: {parseFloat(getBalance(tokenB)).toFixed(4)} {displayB.symbol}</span>
                <button
                  onClick={() => handlePercentFill(100, 'B')}
                  className="px-2 py-0.5 bg-[var(--background)]/50 rounded-md text-xs hover:bg-[var(--background)]/80"
                >
                  Max
                </button>
                <button
                  onClick={() => handlePercentFill(50, 'B')}
                  className="px-2 py-0.5 bg-[var(--background)]/50 rounded-md text-xs hover:bg-[var(--background)]/80"
                >
                  50%
                </button>
              </div>
            </div>
            <div>
              {/* ✅ FIXED: Render TokenSelector */}
              <TokenSelector
                selectedToken={tokenB}
                onTokenSelect={handleTokenBSelect}
                excludeTokens={[tokenA]}
              />
              <div className="flex items-center gap-3 p-4 bg-[var(--background)]/50 rounded-xl border border-white/5 mt-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-8 h-8 rounded-full ${displayB.color} flex items-center justify-center text-white text-sm font-bold`}>
                    {displayB.icon}
                  </div>
                  <span className="font-medium">{displayB.symbol}</span>
                </div>
                <input
                  type="number" // ✅ FIXED
                  step="any" // ✅ FIXED
                  placeholder="0.0"
                  value={amountB}
                  onChange={(e) => setAmountB(e.target.value)}
                  className="flex-1 bg-transparent text-right text-lg font-medium placeholder-[var(--muted-text)] outline-none"
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
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || /^\d*\.?\d*$/.test(val)) {
                    const num = parseFloat(val);
                    if (num >= 0 && num <= 50) setSlippage(val);
                    else if (val === '') setSlippage('');
                  }
                }}
                className="flex-1 px-3 py-1 bg-[var(--background)]/50 rounded-lg text-sm text-center outline-none border border-white/5 focus:border-[var(--primary-color)]/50"
                placeholder="0.5"
              />
            </div>
          </div>

          {/* Action Buttons */}
          {!isConnected ? (
            <div className="text-center py-4 text-[var(--muted-text)]">
              Please connect your wallet
            </div>
          ) : (
            <div className="space-y-3">
              {/* Approval Buttons */}
              {needsApproval(tokenA, amountA) && (
                <button
                  onClick={() => handleApprove(tokenA)}
                  disabled={isApproving}
                  className={`w-full py-3 ${displayA.color} text-white font-medium rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition`}
                >
                  {isApproving ? 'Approving...' : `Approve ${displayA.symbol}`}
                </button>
              )}

              {needsApproval(tokenB, amountB) && (
                <button
                  onClick={() => handleApprove(tokenB)}
                  disabled={isApproving}
                  className={`w-full py-3 ${displayB.color} text-white font-medium rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition`}
                >
                  {isApproving ? 'Approving...' : `Approve ${displayB.symbol}`}
                </button>
              )}

              {/* Add Liquidity Button */}
              <button
                onClick={handleAddLiquidity}
                disabled={
                  isAddingLiquidity ||
                  isAddLiquidityPending ||
                  !amountA ||
                  !amountB ||
                  needsApproval(tokenA, amountA) ||
                  needsApproval(tokenB, amountB) ||
                  // Removed: !(onChainTokenA && onChainTokenB) — NOT needed anymore!
                  (poolRequiresNative && previewNativeRequired !== null && (!nativeBalance || typeof nativeBalance.value !== 'bigint' || nativeBalance.value < previewNativeRequired))
                }
                className="w-full py-4 bg-[var(--primary-color)] text-white font-medium rounded-xl hover:bg-[var(--primary-color)]/90 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {isAddingLiquidity || isAddLiquidityPending ? 'Adding Liquidity...' : 'Add Liquidity'}
              </button>
            </div>
          )}

          {/* Pool Share Info */}
          {amountA && amountB && (
            <div className="space-y-2 p-3 bg-[var(--background)]/30 rounded-lg border border-white/5">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--muted-text)]">Pool Share</span>
                <span>{getPoolShare()}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--muted-text)]">Slippage Tolerance</span>
                <span>{slippage}%</span>
              </div>
              {reserves && (
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--muted-text)]">Exchange Rate</span>
                  <span>1 {displayA.symbol} = {(Number(formatUnits(reserves[1], getTokenDecimals(tokenB))) / Number(formatUnits(reserves[0], getTokenDecimals(tokenA)))).toFixed(6)} {displayB.symbol}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}