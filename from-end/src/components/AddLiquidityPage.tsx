"use client";

import React, { useEffect, useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useBalance } from 'wagmi';
import { parseEther, formatEther, formatUnits, parseUnits, Address } from 'viem';
import { CONTRACTS, USDK_ABI, KANARI_ABI, SWAP_ABI, TOKENS, TokenKey } from '@/lib/contracts';

export default function AddLiquidityPage() {
  const { address, isConnected } = useAccount();
  
  // State for liquidity
  const [tokenA, setTokenA] = useState<TokenKey>('USDK');
  const [tokenB, setTokenB] = useState<TokenKey>('KANARI');
  const [amountA, setAmountA] = useState('');
  const [amountB, setAmountB] = useState('');
  const [slippage, setSlippage] = useState('0.5');
  const [isAddingLiquidity, setIsAddingLiquidity] = useState(false);
  const [showTokenSelectA, setShowTokenSelectA] = useState(false);
  const [showTokenSelectB, setShowTokenSelectB] = useState(false);

  // Contract reads - Native balance
  const { data: nativeBalance } = useBalance({
    address: address,
    query: { enabled: !!address }
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

  // Token allowances
  const { data: usdkAllowance } = useReadContract({
    address: CONTRACTS.USDK,
    abi: USDK_ABI,
    functionName: 'allowance',
    args: [address as Address, CONTRACTS.SWAP],
    query: { enabled: !!address && (tokenA === 'USDK' || tokenB === 'USDK') }
  });

  const { data: kanariAllowance } = useReadContract({
    address: CONTRACTS.KANARI,
    abi: KANARI_ABI,
    functionName: 'allowance',
    args: [address as Address, CONTRACTS.SWAP],
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
    const abi = tokenKey === 'USDK' ? USDK_ABI : KANARI_ABI;
    
    writeApprove({
      address: tokenAddress,
      abi,
      functionName: 'approve',
      args: [CONTRACTS.SWAP, parseUnits('1000000', 18)], // Approve large amount
    });
  };

  const handleAddLiquidity = async () => {
    if (!address || !amountA || !amountB) return;

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
      
      // Calculate native value to send
      let nativeValue = BigInt(0);
      if (isNativeToken(tokenA)) nativeValue += amountAWei;
      if (isNativeToken(tokenB)) nativeValue += amountBWei;
      
      writeAddLiquidity({
        address: CONTRACTS.SWAP,
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

  // Token selection handlers
  const handleTokenSelect = (tokenKey: TokenKey, isTokenA: boolean) => {
    if (isTokenA) {
      if (tokenKey === tokenB) {
        setTokenB(tokenA);
      }
      setTokenA(tokenKey);
      setShowTokenSelectA(false);
    } else {
      if (tokenKey === tokenA) {
        setTokenA(tokenB);
      }
      setTokenB(tokenKey);
      setShowTokenSelectB(false);
    }
    setAmountA('');
    setAmountB('');
  };

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
              <div className="relative">
                <button
                  onClick={() => setShowTokenSelectA(true)}
                  className="flex items-center gap-2 min-w-0 hover:bg-[var(--background)]/30 rounded-lg p-2 transition-colors"
                >
                  <div className={`w-8 h-8 rounded-full ${TOKENS[tokenA].color} flex items-center justify-center text-white text-sm font-bold`}>
                    {TOKENS[tokenA].icon}
                  </div>
                  <span className="font-medium">{TOKENS[tokenA].symbol}</span>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <TokenSelector
                  isOpen={showTokenSelectA}
                  onClose={() => setShowTokenSelectA(false)}
                  onSelect={(token) => handleTokenSelect(token, true)}
                  selectedToken={tokenA}
                  otherToken={tokenB}
                  isTokenA={true}
                />
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
              <div className="relative">
                <button
                  onClick={() => setShowTokenSelectB(true)}
                  className="flex items-center gap-2 min-w-0 hover:bg-[var(--background)]/30 rounded-lg p-2 transition-colors"
                >
                  <div className={`w-8 h-8 rounded-full ${TOKENS[tokenB].color} flex items-center justify-center text-white text-sm font-bold`}>
                    {TOKENS[tokenB].icon}
                  </div>
                  <span className="font-medium">{TOKENS[tokenB].symbol}</span>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <TokenSelector
                  isOpen={showTokenSelectB}
                  onClose={() => setShowTokenSelectB(false)}
                  onSelect={(token) => handleTokenSelect(token, false)}
                  selectedToken={tokenB}
                  otherToken={tokenA}
                  isTokenA={false}
                />
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
                  needsApproval(tokenB, amountB)
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

      {/* Click outside to close token selectors */}
      {(showTokenSelectA || showTokenSelectB) && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => {
            setShowTokenSelectA(false);
            setShowTokenSelectB(false);
          }}
        />
      )}
    </div>
  );
}
