"use client";

import React, { useEffect, useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther, formatUnits, parseUnits, Address } from 'viem';
import { CONTRACTS, USDK_ABI, KANARI_ABI, SWAP_ABI } from '@/lib/contracts';

export default function AddLiquidityPage() {
  const { address, isConnected } = useAccount();
  
  // State for liquidity
  const [usdkAmount, setUsdkAmount] = useState('');
  const [kanariAmount, setKanariAmount] = useState('');
  const [slippage, setSlippage] = useState('0.5');
  const [isAddingLiquidity, setIsAddingLiquidity] = useState(false);

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
  const { writeContract: writeAddLiquidity, data: addLiquidityHash } = useWriteContract();

  const { isLoading: isApproving } = useWaitForTransactionReceipt({
    hash: approveHash,
  });

  const { isLoading: isAddLiquidityPending } = useWaitForTransactionReceipt({
    hash: addLiquidityHash,
  });

  // Auto-calculate proportional amounts
  useEffect(() => {
    if (!reserves || !usdkAmount) return;
    
    const [reserveA, reserveB] = reserves as [bigint, bigint];
    if (reserveA === BigInt(0) || reserveB === BigInt(0)) return;
    
    try {
      const usdkAmountWei = parseUnits(usdkAmount, 18);
      const proportionalKanari = (usdkAmountWei * reserveB) / reserveA;
      setKanariAmount(formatUnits(proportionalKanari, 18));
    } catch (error) {
      console.error('Error calculating proportional amount:', error);
    }
  }, [usdkAmount, reserves]);

  useEffect(() => {
    if (!reserves || !kanariAmount || usdkAmount) return;
    
    const [reserveA, reserveB] = reserves as [bigint, bigint];
    if (reserveA === BigInt(0) || reserveB === BigInt(0)) return;
    
    try {
      const kanariAmountWei = parseUnits(kanariAmount, 18);
      const proportionalUsdk = (kanariAmountWei * reserveA) / reserveB;
      setUsdkAmount(formatUnits(proportionalUsdk, 18));
    } catch (error) {
      console.error('Error calculating proportional amount:', error);
    }
  }, [kanariAmount, reserves]);

  const handleApprove = async (token: 'USDK' | 'KANARI') => {
    if (!address) return;
    
    const tokenAddress = token === 'USDK' ? CONTRACTS.USDK : CONTRACTS.KANARI;
    const abi = token === 'USDK' ? USDK_ABI : KANARI_ABI;
    
    writeApprove({
      address: tokenAddress,
      abi,
      functionName: 'approve',
      args: [CONTRACTS.SWAP, parseUnits('1000000', 18)], // Approve large amount
    });
  };

  const handleAddLiquidity = async () => {
    if (!address || !usdkAmount || !kanariAmount) return;

    setIsAddingLiquidity(true);
    try {
      const usdkAmountWei = parseUnits(usdkAmount, 18);
      const kanariAmountWei = parseUnits(kanariAmount, 18);
      const slippagePercent = parseFloat(slippage) / 100;
      
      const minUsdkAmount = usdkAmountWei * BigInt(Math.floor((1 - slippagePercent) * 10000)) / BigInt(10000);
      const minKanariAmount = kanariAmountWei * BigInt(Math.floor((1 - slippagePercent) * 10000)) / BigInt(10000);
      
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200); // 20 minutes
      
      writeAddLiquidity({
        address: CONTRACTS.SWAP,
        abi: SWAP_ABI,
        functionName: 'addLiquidity',
        args: [usdkAmountWei, kanariAmountWei, minUsdkAmount, minKanariAmount, deadline],
      });
    } catch (error) {
      console.error('Add liquidity failed:', error);
    } finally {
      setIsAddingLiquidity(false);
    }
  };

  // Check if approvals are needed
  const needsUsdkApproval = () => {
    if (!usdkAmount) return false;
    const usdkAmountWei = parseUnits(usdkAmount, 18);
    return !usdkAllowance || usdkAllowance < usdkAmountWei;
  };

  const needsKanariApproval = () => {
    if (!kanariAmount) return false;
    const kanariAmountWei = parseUnits(kanariAmount, 18);
    return !kanariAllowance || kanariAllowance < kanariAmountWei;
  };

  const getBalance = (token: 'USDK' | 'KANARI') => {
    const balance = token === 'USDK' ? usdkBalance : kanariBalance;
    return balance ? formatUnits(balance, 18) : '0';
  };

  const getPoolShare = () => {
    if (!usdkAmount || !totalSupply || !reserves) return '0';
    
    const [reserveA] = reserves as [bigint, bigint];
    if (reserveA === BigInt(0)) return '100'; // First liquidity provider gets 100%
    
    try {
      const usdkAmountWei = parseUnits(usdkAmount, 18);
      const lpTokens = (usdkAmountWei * totalSupply) / reserveA;
      const newTotalSupply = totalSupply + lpTokens;
      const poolShare = (lpTokens * BigInt(10000)) / newTotalSupply;
      return (Number(poolShare) / 100).toFixed(2);
    } catch {
      return '0';
    }
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
                  <span className="text-[var(--muted-text)]">USDK Reserve</span>
                  <span>{formatUnits(reserves[0], 18)} USDK</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted-text)]">KANARI Reserve</span>
                  <span>{formatUnits(reserves[1], 18)} KANARI</span>
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

          {/* USDK Input */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-[var(--muted-text)]">USDK Amount</label>
              <span className="text-sm text-[var(--muted-text)]">
                Balance: {getBalance('USDK')} USDK
              </span>
            </div>
            <div className="flex items-center gap-3 p-4 bg-[var(--background)]/50 rounded-xl border border-white/5">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold">
                  U
                </div>
                <span className="font-medium">USDK</span>
              </div>
              <input
                type="text"
                placeholder="0.0"
                value={usdkAmount}
                onChange={(e) => setUsdkAmount(e.target.value)}
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

          {/* KANARI Input */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-[var(--muted-text)]">KANARI Amount</label>
              <span className="text-sm text-[var(--muted-text)]">
                Balance: {getBalance('KANARI')} KANARI
              </span>
            </div>
            <div className="flex items-center gap-3 p-4 bg-[var(--background)]/50 rounded-xl border border-white/5">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-full bg-orange-400 flex items-center justify-center text-white text-sm font-bold">
                  K
                </div>
                <span className="font-medium">KANARI</span>
              </div>
              <input
                type="text"
                placeholder="0.0"
                value={kanariAmount}
                onChange={(e) => setKanariAmount(e.target.value)}
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
              {needsUsdkApproval() && (
                <button
                  onClick={() => handleApprove('USDK')}
                  disabled={isApproving}
                  className="w-full py-3 bg-blue-500 text-white font-medium rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {isApproving ? 'Approving...' : 'Approve USDK'}
                </button>
              )}
              
              {needsKanariApproval() && (
                <button
                  onClick={() => handleApprove('KANARI')}
                  disabled={isApproving}
                  className="w-full py-3 bg-orange-500 text-white font-medium rounded-xl hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {isApproving ? 'Approving...' : 'Approve KANARI'}
                </button>
              )}

              {/* Add Liquidity Button */}
              <button
                onClick={handleAddLiquidity}
                disabled={
                  isAddingLiquidity || 
                  isAddLiquidityPending || 
                  !usdkAmount || 
                  !kanariAmount || 
                  needsUsdkApproval() || 
                  needsKanariApproval()
                }
                className="w-full py-4 bg-[var(--primary-color)] text-white font-medium rounded-xl hover:bg-[var(--primary-color)]/90 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {isAddingLiquidity || isAddLiquidityPending ? 'Adding Liquidity...' : 'Add Liquidity'}
              </button>
            </div>
          )}

          {/* Pool Share Info */}
          {usdkAmount && kanariAmount && (
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
                  <span>1 USDK = {(Number(formatUnits(reserves[1], 18)) / Number(formatUnits(reserves[0], 18))).toFixed(6)} KANARI</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
