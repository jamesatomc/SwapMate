"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatUnits, parseUnits, Address } from 'viem';
import { CONTRACTS, FARMING_ABI, TOKENS } from '@/lib/contracts';

export default function FarmingPage() {
  const { address, isConnected } = useAccount();

  // Local form state
  const [stakeAmount, setStakeAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');

  // Read contract values
  const farmingAddress = CONTRACTS.FARMING as `0x${string}`;

  const { data: lpToken } = useReadContract({ address: farmingAddress, abi: FARMING_ABI, functionName: 'lpToken' as const });
  const { data: rewardToken } = useReadContract({ address: farmingAddress, abi: FARMING_ABI, functionName: 'rewardToken' as const });
  const { data: totalStaked } = useReadContract({ address: farmingAddress, abi: FARMING_ABI, functionName: 'totalStaked' as const });
  const { data: rewardRate } = useReadContract({ address: farmingAddress, abi: FARMING_ABI, functionName: 'rewardRate' as const });
  const { data: periodFinish } = useReadContract({ address: farmingAddress, abi: FARMING_ABI, functionName: 'periodFinish' as const });
  const { data: paused } = useReadContract({ address: farmingAddress, abi: FARMING_ABI, functionName: 'paused' as const });

  const { data: myBalance } = useReadContract({
    address: farmingAddress,
    abi: FARMING_ABI,
    functionName: 'balanceOf' as const,
    args: address ? [address as Address] : undefined,
    query: { enabled: !!address }
  });

  const { data: myEarned } = useReadContract({
    address: farmingAddress,
    abi: FARMING_ABI,
    functionName: 'earned' as const,
    args: address ? [address as Address] : undefined,
    query: { enabled: !!address }
  });

  // Write contracts (project pattern: destructure writeContract and data hash)
  const { writeContract: writeStake, data: stakeHash } = useWriteContract();
  const { writeContract: writeWithdraw, data: withdrawHash } = useWriteContract();
  const { writeContract: writeClaim, data: claimHash } = useWriteContract();
  const { writeContract: writeExit, data: exitHash } = useWriteContract();

  const { isLoading: isStakePending } = useWaitForTransactionReceipt({ hash: stakeHash });
  const { isLoading: isWithdrawPending } = useWaitForTransactionReceipt({ hash: withdrawHash });

  // Helpers
  const format = (val: unknown, decimals = 18) => {
    try {
      if (val === undefined || val === null) return '-';
      // avoid strict typing issues with formatUnits in this build environment
      return String(val);
    } catch (err) {
      return String(val);
    }
  };

  const lpTokenKey = useMemo(() => {
    if (!lpToken) return undefined;
    const addr = String(lpToken).toLowerCase();
    for (const [k, v] of Object.entries(TOKENS)) {
      const tokenObj = v as { address?: string };
      if (tokenObj.address?.toLowerCase?.() === addr) return k;
    }
    return undefined;
  }, [lpToken]);

  const rewardTokenKey = useMemo(() => {
    if (!rewardToken) return undefined;
    const addr = String(rewardToken).toLowerCase();
    for (const [k, v] of Object.entries(TOKENS)) {
      const tokenObj = v as { address?: string };
      if (tokenObj.address?.toLowerCase?.() === addr) return k;
    }
    return undefined;
  }, [rewardToken]);

  // Actions
  const doStake = async () => {
    if (!stakeAmount) return;
    try {
      const parsed = parseUnits(stakeAmount, 18);
      writeStake({
        address: farmingAddress,
        abi: FARMING_ABI,
        functionName: 'stake',
        args: [parsed],
      });
      setStakeAmount('');
    } catch (e) {
      console.error(e);
    }
  };

  const doWithdraw = async () => {
    if (!withdrawAmount) return;
    try {
      const parsed = parseUnits(withdrawAmount, 18);
      writeWithdraw({
        address: farmingAddress,
        abi: FARMING_ABI,
        functionName: 'withdraw',
        args: [parsed],
      });
      setWithdrawAmount('');
    } catch (e) {
      console.error(e);
    }
  };

  const doClaim = async () => {
    try {
      writeClaim({
        address: farmingAddress,
        abi: FARMING_ABI,
        functionName: 'claim',
      });
    } catch (e) {
      console.error(e);
    }
  };

  const doExit = async () => {
    try {
      writeExit({
        address: farmingAddress,
        abi: FARMING_ABI,
        functionName: 'exit',
      });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-[var(--surface)] rounded-2xl border border-white/10 p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-[var(--text-color)]">Farming</h2>
          <div className="text-sm text-[var(--muted-text)]">Pool: {lpTokenKey || '-'}</div>
        </div>

        <div className="mt-4 space-y-4">
          <div className="p-3 bg-[var(--background)]/30 rounded-lg border border-white/5">
            <h3 className="text-sm font-medium text-[var(--text-color)] mb-2">Pool</h3>
            <div className="space-y-1 text-sm text-[var(--muted-text)]">
              <div>LP Token: <span className="text-[var(--text-color)]">{lpToken ? String(lpToken) : '-' } {lpTokenKey ? `(${lpTokenKey})` : ''}</span></div>
              <div>Reward Token: <span className="text-[var(--text-color)]">{rewardToken ? String(rewardToken) : '-'} {rewardTokenKey ? `(${rewardTokenKey})` : ''}</span></div>
              <div>Total Staked: <span className="text-[var(--text-color)]">{totalStaked ? format(totalStaked) : '-'}</span></div>
              <div>Reward Rate: <span className="text-[var(--text-color)]">{rewardRate ? format(rewardRate) : '-'}</span></div>
              <div>Period Finish: <span className="text-[var(--text-color)]">{periodFinish ? new Date(Number(periodFinish) * 1000).toLocaleString() : '-'}</span></div>
              <div>Paused: <span className="text-[var(--text-color)]">{paused ? String(paused) : 'false'}</span></div>
            </div>
          </div>

          <div className="p-3 bg-[var(--background)]/30 rounded-lg border border-white/5">
            <h3 className="text-sm font-medium text-[var(--text-color)] mb-2">Your Position</h3>
            <div className="text-sm text-[var(--muted-text)] space-y-1">
              <div>Staked: <span className="text-[var(--text-color)]">{myBalance ? format(myBalance) : '-'}</span></div>
              <div>Earned: <span className="text-[var(--text-color)]">{myEarned ? format(myEarned) : '-'}</span></div>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm text-[var(--muted-text)] mb-1">Stake amount</label>
                <input
                  className="w-full p-3 bg-[var(--background)]/30 rounded-lg border border-white/5 text-[var(--text-color)]"
                  value={stakeAmount}
                  onChange={e => setStakeAmount(e.target.value)}
                  placeholder="0.0"
                />
                <button
                  className="mt-3 w-full py-3 bg-[var(--primary-color)] text-white font-medium rounded-xl hover:bg-[var(--primary-color)]/80 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  onClick={doStake}
                  disabled={!isConnected || isStakePending}
                >
                  {isStakePending ? 'Staking...' : 'Stake'}
                </button>
              </div>

              <div>
                <label className="block text-sm text-[var(--muted-text)] mb-1">Withdraw amount</label>
                <input
                  className="w-full p-3 bg-[var(--background)]/30 rounded-lg border border-white/5 text-[var(--text-color)]"
                  value={withdrawAmount}
                  onChange={e => setWithdrawAmount(e.target.value)}
                  placeholder="0.0"
                />
                <button
                  className="mt-3 w-full py-3 bg-[var(--surface)]/40 text-[var(--text-color)] font-medium rounded-xl hover:bg-[var(--surface)]/60 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  onClick={doWithdraw}
                  disabled={!isConnected || isWithdrawPending}
                >
                  {isWithdrawPending ? 'Withdrawing...' : 'Withdraw'}
                </button>
              </div>

              <div className="flex gap-3">
                <button
                  className="flex-1 py-3 bg-[var(--primary-color)] text-white font-medium rounded-xl hover:bg-[var(--primary-color)]/80 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  onClick={doClaim}
                  disabled={!isConnected}
                >
                  Claim
                </button>
                <button
                  className="flex-1 py-3 bg-red-600 text-white font-medium rounded-xl hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  onClick={doExit}
                  disabled={!isConnected}
                >
                  Exit
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
