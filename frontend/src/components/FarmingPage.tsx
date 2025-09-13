'use client';

import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatEther, parseEther } from 'viem';
import { CONTRACTS, FARMING_ABI, SWAP_ABI } from '@/lib/contracts';

export default function FarmingPage() {
  const { address } = useAccount();
  const [stakeAmount, setStakeAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [lpBalance, setLpBalance] = useState('0');
  const [stakedBalance, setStakedBalance] = useState('0');
  const [earnedRewards, setEarnedRewards] = useState('0');
  const [totalStaked, setTotalStaked] = useState('0');
  const [rewardRate, setRewardRate] = useState('0');
  const [periodFinish, setPeriodFinish] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // Read LP token balance (KANARI/Native LP)
  const { data: lpBalanceData } = useReadContract({
    address: CONTRACTS.KANARI_NATIVE_POOL,
    abi: SWAP_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  // Read staked balance
  const { data: stakedData } = useReadContract({
    address: CONTRACTS.FARMING,
    abi: FARMING_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  // Read earned rewards
  const { data: earnedData } = useReadContract({
    address: CONTRACTS.FARMING,
    abi: FARMING_ABI,
    functionName: 'earned',
    args: address ? [address] : undefined,
  });

  // Read farming stats
  const { data: totalStakedData } = useReadContract({
    address: CONTRACTS.FARMING,
    abi: FARMING_ABI,
    functionName: 'totalSupply',
  });

  const { data: rewardRateData } = useReadContract({
    address: CONTRACTS.FARMING,
    abi: FARMING_ABI,
    // use the helper that returns a human-scaled reward rate
    functionName: 'getRewardRate',
  });

  const { data: periodFinishData } = useReadContract({
    address: CONTRACTS.FARMING,
    abi: FARMING_ABI,
    functionName: 'periodFinish',
  });

  const { data: pausedData } = useReadContract({
    address: CONTRACTS.FARMING,
    abi: FARMING_ABI,
    functionName: 'isPaused',
  });

  // Update state when data changes
  useEffect(() => {
    if (lpBalanceData) setLpBalance(formatEther(lpBalanceData));
    if (stakedData) setStakedBalance(formatEther(stakedData));
    if (earnedData) setEarnedRewards(formatEther(earnedData));
  if (totalStakedData) setTotalStaked(formatEther(totalStakedData));
  // getRewardRate() returns the token/sec value already scaled to token units
  // but it's still a BigInt in wei-style units; formatEther will convert to decimal
  if (rewardRateData) setRewardRate(formatEther(rewardRateData));
    if (periodFinishData) setPeriodFinish(Number(periodFinishData));
    if (pausedData !== undefined) setIsPaused(pausedData);
  }, [lpBalanceData, stakedData, earnedData, totalStakedData, rewardRateData, periodFinishData, pausedData]);

  // Approve LP tokens for staking (KANARI/Native LP)
  const handleApprove = async () => {
    if (!stakeAmount) return;
    
    writeContract({
      address: CONTRACTS.KANARI_NATIVE_POOL,
      abi: SWAP_ABI,
      functionName: 'approve',
      args: [CONTRACTS.FARMING, parseEther(stakeAmount)],
    });
  };

  // Stake LP tokens
  const handleStake = async () => {
    if (!stakeAmount) return;
    
    writeContract({
      address: CONTRACTS.FARMING,
      abi: FARMING_ABI,
      functionName: 'stake',
      args: [parseEther(stakeAmount)],
    });
  };

  // Withdraw LP tokens
  const handleWithdraw = async () => {
    if (!withdrawAmount) return;
    
    writeContract({
      address: CONTRACTS.FARMING,
      abi: FARMING_ABI,
      functionName: 'withdraw',
      args: [parseEther(withdrawAmount)],
    });
  };

  // Claim rewards
  const handleClaim = async () => {
    writeContract({
      address: CONTRACTS.FARMING,
      abi: FARMING_ABI,
      functionName: 'claim',
      args: [],
    });
  };

  // Exit (withdraw all + claim)
  const handleExit = async () => {
    writeContract({
      address: CONTRACTS.FARMING,
      abi: FARMING_ABI,
      functionName: 'exit',
      args: [],
    });
  };

  // Calculate time remaining
  const timeRemaining = Math.max(0, periodFinish - Math.floor(Date.now() / 1000));
  const daysRemaining = Math.floor(timeRemaining / 86400);
  const hoursRemaining = Math.floor((timeRemaining % 86400) / 3600);

  // Calculate APR (rough estimate)
  const totalStakedNum = parseFloat(totalStaked);
  const rewardRateNum = parseFloat(rewardRate);
  const aprEstimate = totalStakedNum > 0 ? (rewardRateNum * 86400 * 365 * 100) / totalStakedNum : 0;

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="flex justify-end">
        {/* Placeholder for potential manager toggle - kept for parity with SwapPage layout */}
      </div>

      <div className="bg-[var(--surface)] rounded-2xl border border-white/10 p-6 shadow-xl">
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-[var(--text-color)]">LP Farming</h2>
          <p className="text-sm text-[var(--muted-text)]">Stake your LP tokens to earn KANARI rewards</p>

          {/* Compact stats row */}
          <div className="flex justify-between items-center p-3 bg-[var(--background)]/30 rounded-lg border border-white/5">
            <div>
              <div className="text-xs text-[var(--muted-text)]">Total Staked</div>
              <div className="text-lg font-medium">{parseFloat(totalStaked).toFixed(4)} LP</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-[var(--muted-text)]">Reward Rate</div>
              <div className="text-lg font-medium text-orange-600">{parseFloat(rewardRate).toFixed(6)}</div>
            </div>
          </div>

          {/* Time remaining and APR estimate */}
          <div className="mt-3 p-3 bg-[var(--background)]/20 rounded-lg border border-white/5 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--muted-text)]">Farming ends in</span>
              <span>{daysRemaining}d {hoursRemaining}h</span>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[var(--muted-text)]">Estimated APR</span>
              <span className="text-orange-600">{aprEstimate.toFixed(2)}%</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Stake box */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-[var(--muted-text)]">Amount to Stake</label>
              <div className="flex items-center gap-3 p-3 bg-[var(--background)]/50 rounded-xl border border-white/5">
                <input
                  type="number"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  placeholder="0.0"
                  className="w-full bg-transparent text-right text-lg font-medium placeholder-[var(--muted-text)] outline-none"
                  disabled={isPaused}
                />
                <button onClick={() => setStakeAmount(lpBalance)} className="px-3 py-1 bg-[var(--background)]/50 rounded text-sm">Max</button>
              </div>

              <div className="flex gap-2">
                <button onClick={handleApprove} disabled={!stakeAmount || isPending || isConfirming || isPaused} className="flex-1 py-3 bg-[var(--primary-color)] text-white font-medium rounded-lg hover:bg-[var(--primary-color)]/80 transition">Approve</button>
                <button onClick={handleStake} disabled={!stakeAmount || isPending || isConfirming || isPaused} className="flex-1 py-3 bg-[var(--primary-color)]/80 text-white font-medium rounded-lg hover:bg-[var(--primary-color)]/80 transition">Stake</button>
              </div>
            </div>

            {/* Manage box */}
            <div className="space-y-3">
              <div className="text-sm text-[var(--muted-text)]">Your Position</div>
              <div className="p-3 bg-[var(--background)]/30 rounded-xl border border-white/5">
                <div className="flex justify-between text-sm mb-2">
                  <span>Staked</span>
                  <span>{parseFloat(stakedBalance).toFixed(6)} LP</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Earned</span>
                  <span className="text-orange-600">{parseFloat(earnedRewards).toFixed(6)} KANARI</span>
                </div>
              </div>

              <label className="text-sm font-medium text-[var(--muted-text)]">Withdraw Amount</label>
              <div className="flex items-center gap-3 p-3 bg-[var(--background)]/50 rounded-xl border border-white/5">
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="0.0"
                  className="w-full bg-transparent text-right text-lg font-medium placeholder-[var(--muted-text)] outline-none"
                />
                <button onClick={() => setWithdrawAmount(stakedBalance)} className="px-3 py-1 bg-[var(--background)]/50 rounded text-sm">Max</button>
              </div>

              <div className="flex gap-2">
                <button onClick={handleWithdraw} disabled={!withdrawAmount || isPending || isConfirming} className="flex-1 py-3 bg-gray-600 text-white font-medium rounded-lg">Withdraw</button>
                <button onClick={handleClaim} disabled={isPending || isConfirming || parseFloat(earnedRewards) === 0} className="flex-1 py-3 bg-green-600 text-white font-medium rounded-lg">Claim</button>
                <button onClick={handleExit} disabled={isPending || isConfirming || parseFloat(stakedBalance) === 0} className="flex-1 py-3 bg-red-600 text-white font-medium rounded-lg">Exit</button>
              </div>
            </div>
          </div>

          {isPaused && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">Farming is paused — staking disabled.</div>
          )}

          {hash && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
              <div>{isConfirming ? 'Waiting for confirmation...' : isConfirmed ? 'Transaction confirmed!' : 'Transaction submitted'}</div>
              <div className="mt-1 font-mono text-xs break-all">{hash}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
