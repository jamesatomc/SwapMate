"use client";

import React, { useMemo, useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, Address } from 'viem';
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
  const { data: totalStaked, refetch: refetchTotalStaked } = useReadContract({ address: farmingAddress, abi: FARMING_ABI, functionName: 'totalStaked' as const });
  const { data: rewardRate } = useReadContract({ address: farmingAddress, abi: FARMING_ABI, functionName: 'rewardRate' as const });
  const { data: periodFinish } = useReadContract({ address: farmingAddress, abi: FARMING_ABI, functionName: 'periodFinish' as const });
  const { data: paused } = useReadContract({ address: farmingAddress, abi: FARMING_ABI, functionName: 'paused' as const });

  const { data: myBalance, refetch: refetchMyBalance } = useReadContract({
    address: farmingAddress,
    abi: FARMING_ABI,
    functionName: 'balanceOf' as const,
    args: address ? [address as Address] : undefined,
    query: { enabled: !!address }
  });

  const { data: myEarned, refetch: refetchMyEarned } = useReadContract({
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
  const { isLoading: isClaimPending } = useWaitForTransactionReceipt({ hash: claimHash });
  const { isLoading: isExitPending } = useWaitForTransactionReceipt({ hash: exitHash });

  // Helpers
  const format = (val: unknown) => {
    if (val === undefined || val === null) return '-';
    return String(val);
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
      await writeStake({
        address: farmingAddress,
        abi: FARMING_ABI,
        functionName: 'stake',
        args: [parsed],
      });
      setStakeAmount('');
    } catch {
      // ignore
    }
  };

  const doWithdraw = async () => {
    if (!withdrawAmount) return;
    try {
      const parsed = parseUnits(withdrawAmount, 18);
      await writeWithdraw({
        address: farmingAddress,
        abi: FARMING_ABI,
        functionName: 'withdraw',
        args: [parsed],
      });
      setWithdrawAmount('');
    } catch {
      // ignore
    }
  };

  const doClaim = async () => {
    try {
      await writeClaim({
        address: farmingAddress,
        abi: FARMING_ABI,
        functionName: 'claim',
      });
    } catch {
      // ignore
    }
  };

  const doExit = async () => {
    try {
      await writeExit({
        address: farmingAddress,
        abi: FARMING_ABI,
        functionName: 'exit',
      });
    } catch {
      // ignore
    }
  };

  // Refresh read data after transactions complete
  React.useEffect(() => {
    if (stakeHash && !isStakePending) {
      try {
        refetchMyBalance?.();
        refetchMyEarned?.();
        refetchTotalStaked?.();
      } catch {}
    }
  }, [stakeHash, isStakePending, refetchMyBalance, refetchMyEarned, refetchTotalStaked]);

  React.useEffect(() => {
    if (withdrawHash && !isWithdrawPending) {
      try {
        refetchMyBalance?.();
        refetchMyEarned?.();
        refetchTotalStaked?.();
      } catch {}
    }
  }, [withdrawHash, isWithdrawPending, refetchMyBalance, refetchMyEarned, refetchTotalStaked]);

  React.useEffect(() => {
    if (claimHash && !isClaimPending) {
      try {
        refetchMyEarned?.();
      } catch {}
    }
  }, [claimHash, isClaimPending, refetchMyEarned]);

  React.useEffect(() => {
    if (exitHash && !isExitPending) {
      try {
        refetchMyBalance?.();
        refetchMyEarned?.();
        refetchTotalStaked?.();
      } catch {}
    }
  }, [exitHash, isExitPending, refetchMyBalance, refetchMyEarned, refetchTotalStaked]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <header className="mb-6 text-center">
        <h1 className="text-3xl font-bold text-gray-800">LP Farming</h1>
        <p className="text-sm text-gray-600 mt-1">Stake your KANARI/USDC LP tokens to earn KANARI rewards</p>
      </header>

      {/* Top stats: 4 cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="text-xs text-gray-500">Total Staked</div>
          <div className="text-xl font-semibold text-gray-800 mt-2">{totalStaked ? format(totalStaked) : '0.0000'} LP</div>
        </div>

        <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="text-xs text-gray-500">Reward Rate</div>
          <div className="text-xl font-semibold text-gray-800 mt-2">{rewardRate ? format(rewardRate) : '0.000000'} KANARI/sec</div>
        </div>

        <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="text-xs text-gray-500">Est. APR</div>
          <div className="text-xl font-semibold text-gray-800 mt-2">0.00%</div>
        </div>

        <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="text-xs text-gray-500">Time Remaining</div>
          <div className="text-xl font-semibold text-gray-800 mt-2">{periodFinish ? `${Math.max(0, Math.floor((Number(periodFinish) - Date.now()/1000)/86400))}d 0h` : '0d 0h'}</div>
        </div>
      </div>

      {/* Main content two-column */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Stake card */}
        <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Stake LP Tokens</h2>
          <p className="text-sm text-gray-600 mb-4">Amount to Stake</p>

          <input
            className="w-full p-3 border border-gray-200 rounded-lg text-gray-800 mb-3"
            value={stakeAmount}
            onChange={e => setStakeAmount(e.target.value)}
            placeholder="0.0"
          />

          <div className="text-sm text-gray-600 mb-4">Available: {myBalance ? format(myBalance) : '0.000000'} LP</div>

          <button className="w-full py-3 mb-3 bg-gray-100 text-gray-700 font-medium rounded-lg border border-gray-200" disabled>
            1. Approve LP Tokens
          </button>

          <button
            className="w-full py-3 bg-gray-700 text-white font-medium rounded-lg"
            onClick={doStake}
            disabled={!isConnected || isStakePending}
          >
            {isStakePending ? 'Staking...' : '2. Stake LP Tokens'}
          </button>
        </div>

        {/* Right: Manage Staking */}
        <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Manage Staking</h2>

          <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 mb-4">
            <div className="text-xs text-gray-500">Your Position</div>
            <div className="flex items-baseline justify-between mt-2">
              <div>
                <div className="text-sm text-gray-600">Staked:</div>
                <div className="text-lg font-semibold text-gray-800">{myBalance ? format(myBalance) : '0.000000'} LP</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Earned:</div>
                <div className="text-lg font-semibold text-gray-800">{myEarned ? format(myEarned) : '0.000000'} KANARI</div>
              </div>
            </div>
          </div>

          <p className="text-sm text-gray-600 mb-2">Amount to Withdraw</p>
          <input
            className="w-full p-3 border border-gray-200 rounded-lg text-gray-800 mb-3"
            value={withdrawAmount}
            onChange={e => setWithdrawAmount(e.target.value)}
            placeholder="0.0"
          />

          <button
            className="w-full py-3 mb-3 bg-gray-300 text-gray-700 font-medium rounded-lg"
            onClick={doWithdraw}
            disabled={!isConnected || isWithdrawPending}
          >
            {isWithdrawPending ? 'Withdrawing...' : 'Withdraw LP Tokens'}
          </button>

          <button
            className="w-full py-3 mb-3 bg-green-500 text-white font-medium rounded-lg"
            onClick={doClaim}
            disabled={!isConnected || isClaimPending}
          >
            {isClaimPending ? 'Claiming...' : 'Claim Rewards'}
          </button>

          <button
            className="w-full py-3 bg-red-500 text-white font-medium rounded-lg"
            onClick={doExit}
            disabled={!isConnected || isExitPending}
          >
            {isExitPending ? 'Exiting...' : 'Exit (Withdraw All + Claim)'}
          </button>
        </div>
      </div>
    </div>
  );
}
