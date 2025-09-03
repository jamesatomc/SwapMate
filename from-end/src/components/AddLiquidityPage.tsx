"use client";

import React, { useEffect, useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useBalance } from 'wagmi';
import { parseEther, formatEther, formatUnits, parseUnits, Address } from 'viem';
import { CONTRACTS, USDC_ABI, KANARI_ABI, SWAP_ABI, TOKENS, TokenKey, POOLS, PoolKey } from '@/lib/contracts';

export default function AddLiquidityPage() {
  const { address, isConnected } = useAccount();
  
  // State for liquidity
  const [selectedPool, setSelectedPool] = useState<PoolKey>('KANARI-USDC');
  const [amountA, setAmountA] = useState('');
  const [amountB, setAmountB] = useState('');
  const [slippage, setSlippage] = useState('0.5');
  const [isAddingLiquidity, setIsAddingLiquidity] = useState(false);
  const [showPoolSelect, setShowPoolSelect] = useState(false);

  // Get current pool info
  const currentPool = POOLS[selectedPool];
  const poolAddress = currentPool.address;
  const tokenA = currentPool.tokenA;
  const tokenB = currentPool.tokenB;

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

  // Read on-chain token ordering for the pool to avoid relying solely on local POOLS mapping
  const { data: onChainTokenA } = useReadContract({
    address: poolAddress as Address,
    abi: SWAP_ABI,
    functionName: 'tokenA',
  });

  const { data: onChainTokenB } = useReadContract({
    address: poolAddress as Address,
    abi: SWAP_ABI,
    functionName: 'tokenB',
  });

  // Derived helper values for native checks and UX
  const onChainAaddr = onChainTokenA ? String(onChainTokenA).toLowerCase() : null;
  const onChainBaddr = onChainTokenB ? String(onChainTokenB).toLowerCase() : null;
  const nativeZero = TOKENS.NATIVE.address.toLowerCase();
  const poolRequiresNative = onChainAaddr === nativeZero || onChainBaddr === nativeZero;

  // Preview the native amount required (if inputs are available) so we can disable the button when balance is insufficient
  let previewNativeRequired: bigint | null = null;
  try {
    if ((onChainAaddr || onChainBaddr) && (amountA || amountB)) {
      const decimalsA = TOKENS[tokenA].decimals;
      const decimalsB = TOKENS[tokenB].decimals;
      const aWei = amountA ? parseUnits(amountA, decimalsA) : BigInt(0);
      const bWei = amountB ? parseUnits(amountB, decimalsB) : BigInt(0);
      if (onChainAaddr === nativeZero) previewNativeRequired = aWei;
      if (onChainBaddr === nativeZero) previewNativeRequired = (previewNativeRequired || BigInt(0)) + bWei;
    }
  } catch (e) {
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
      } catch (e) {
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
      } catch (e) {
        // ignore
      }

      setAmountA('');
      setAmountB('');
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

  const getTokenDecimals = (tokenKey: TokenKey) => {
    return TOKENS[tokenKey].decimals;
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
  }, [amountA, reserves, tokenA, tokenB]);

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
        alert('Native balance is still loading — please wait a moment and try again');
        return;
      }
      if (nativeBalance.value < previewNativeRequired) {
        alert('Insufficient native balance for this add liquidity operation');
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
      
      // Determine native value according to on-chain token ordering when available
      let nativeValue = BigInt(0);
      const aAddrRaw = onChainTokenA || TOKENS[tokenA].address;
      const bAddrRaw = onChainTokenB || TOKENS[tokenB].address;
      if (!onChainTokenA || !onChainTokenB) {
        console.warn('onChain token addresses not available yet; falling back to local POOLS mapping. This may cause Incorrect native value errors.');
      }
      const aAddr = String(aAddrRaw).toLowerCase();
      const bAddr = String(bAddrRaw).toLowerCase();
      const nativeZero = TOKENS.NATIVE.address.toLowerCase();
      if (aAddr === nativeZero) nativeValue += amountAWei;
      if (bAddr === nativeZero) nativeValue += amountBWei;

      // Debug output to help diagnose Incorrect native value errors
      console.debug('AddLiquidity debug', {
        poolAddress,
        onChainTokenA: aAddr,
        onChainTokenB: bAddr,
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

  // Token selector component
  const TokenSelector = ({ 
    isOpen, 
    onClose, 
    onSelect, 
    selectedToken, 
    otherToken, 
    isTokenA 
  }: { 
    isOpen: boolean; 
    onClose: () => void; 
    onSelect: (token: TokenKey) => void; 
    selectedToken: TokenKey; 
    otherToken: TokenKey; 
    isTokenA: boolean;
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
                    <div className={`w-8 h-8 rounded-full ${TOKENS[tokenA].color} flex items-center justify-center text-white text-sm font-bold z-10`}>
                      {TOKENS[tokenA].icon}
                    </div>
                    <div className={`w-8 h-8 rounded-full ${TOKENS[tokenB].color} flex items-center justify-center text-white text-sm font-bold`}>
                      {TOKENS[tokenB].icon}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium">{currentPool.name}</div>
                    <div className="text-sm text-[var(--muted-text)]">{currentPool.description}</div>
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
          </div>

          {/* Pool Info */}
          {reserves && (
            <div className="p-4 bg-[var(--background)]/30 rounded-xl border border-white/5">
              <h3 className="text-lg font-semibold mb-3">Pool Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--muted-text)]">{TOKENS[tokenA].symbol} Reserve</span>
                  <span>{formatUnits(reserves[0], getTokenDecimals(tokenA))} {TOKENS[tokenA].symbol}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted-text)]">{TOKENS[tokenB].symbol} Reserve</span>
                  <span>{formatUnits(reserves[1], getTokenDecimals(tokenB))} {TOKENS[tokenB].symbol}</span>
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
              <label className="text-sm font-medium text-[var(--muted-text)]">{TOKENS[tokenA].symbol} Amount</label>
              <span className="text-sm text-[var(--muted-text)]">
                Balance: {parseFloat(getBalance(tokenA)).toFixed(4)} {TOKENS[tokenA].symbol}
              </span>
            </div>
            <div className="flex items-center gap-3 p-4 bg-[var(--background)]/50 rounded-xl border border-white/5">
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-8 h-8 rounded-full ${TOKENS[tokenA].color} flex items-center justify-center text-white text-sm font-bold`}>
                  {TOKENS[tokenA].icon}
                </div>
                  <span className="font-medium">{TOKENS[tokenA].symbol}</span>
                </div>
                <input
                  type="text"
                  placeholder="0.0"
                  value={amountA}
                  onChange={(e) => setAmountA(e.target.value)}
                  className="flex-1 bg-transparent text-right text-lg font-medium placeholder-[var(--muted-text)] outline-none"
                />
              </div>
            </div>

          {/* Plus Icon */}
          <div className="flex justify-center">
            <div className="w-8 h-8 rounded-full bg-[var(--surface)] border border-white/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-[var(--text-color)]" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>

          {/* Token B Input */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-[var(--muted-text)]">{TOKENS[tokenB].symbol} Amount</label>
              <span className="text-sm text-[var(--muted-text)]">
                Balance: {parseFloat(getBalance(tokenB)).toFixed(4)} {TOKENS[tokenB].symbol}
              </span>
            </div>
            <div className="flex items-center gap-3 p-4 bg-[var(--background)]/50 rounded-xl border border-white/5">
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-8 h-8 rounded-full ${TOKENS[tokenB].color} flex items-center justify-center text-white text-sm font-bold`}>
                  {TOKENS[tokenB].icon}
                </div>
                <span className="font-medium">{TOKENS[tokenB].symbol}</span>
                </div>
                <input
                  type="text"
                  placeholder="0.0"
                  value={amountB}
                  onChange={(e) => setAmountB(e.target.value)}
                  className="flex-1 bg-transparent text-right text-lg font-medium placeholder-[var(--muted-text)] outline-none"
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
                  className={`w-full py-3 ${TOKENS[tokenA].color} text-white font-medium rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition`}
                >
                  {isApproving ? 'Approving...' : `Approve ${TOKENS[tokenA].symbol}`}
                </button>
              )}
              
              {needsApproval(tokenB, amountB) && (
                <button
                  onClick={() => handleApprove(tokenB)}
                  disabled={isApproving}
                  className={`w-full py-3 ${TOKENS[tokenB].color} text-white font-medium rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition`}
                >
                  {isApproving ? 'Approving...' : `Approve ${TOKENS[tokenB].symbol}`}
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
                  !(onChainTokenA && onChainTokenB) ||
                  // If the pool requires native and we have a preview requirement, ensure nativeBalance is loaded and sufficient
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
                  <span>1 {TOKENS[tokenA].symbol} = {(Number(formatUnits(reserves[1], getTokenDecimals(tokenB))) / Number(formatUnits(reserves[0], getTokenDecimals(tokenA)))).toFixed(6)} {TOKENS[tokenB].symbol}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
