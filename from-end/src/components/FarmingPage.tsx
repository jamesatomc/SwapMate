'use client';

import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatEther, parseEther } from 'viem';
import { CONTRACTS, FARMING_ABI, SWAP_ABI, KANARI_ABI } from '@/lib/contracts';

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
    functionName: 'totalStaked',
  });

  const { data: rewardRateData } = useReadContract({
    address: CONTRACTS.FARMING,
    abi: FARMING_ABI,
    functionName: 'rewardRate',
  });

  const { data: periodFinishData } = useReadContract({
    address: CONTRACTS.FARMING,
    abi: FARMING_ABI,
    functionName: 'periodFinish',
  });

  const { data: pausedData } = useReadContract({
    address: CONTRACTS.FARMING,
    abi: FARMING_ABI,
    functionName: 'paused',
  });

  // Update state when data changes
  useEffect(() => {
    if (lpBalanceData) setLpBalance(formatEther(lpBalanceData));
    if (stakedData) setStakedBalance(formatEther(stakedData));
    if (earnedData) setEarnedRewards(formatEther(earnedData));
    if (totalStakedData) setTotalStaked(formatEther(totalStakedData));
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
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">🚜 LP Farming</h1>
        <p className="text-gray-600">Stake your KANARI/sBTC LP tokens to earn KANARI rewards</p>
      </div>

      {/* Farming Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border">
          <h3 className="text-sm font-medium text-gray-500">Total Staked</h3>
          <p className="text-2xl font-bold text-gray-900">{parseFloat(totalStaked).toFixed(4)} LP</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow border">
          <h3 className="text-sm font-medium text-gray-500">Reward Rate</h3>
          <p className="text-2xl font-bold text-orange-600">{parseFloat(rewardRate).toFixed(6)} KANARI/sec</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow border">
          <h3 className="text-sm font-medium text-gray-500">Est. APR</h3>
          <p className="text-2xl font-bold text-green-600">{aprEstimate.toFixed(2)}%</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow border">
          <h3 className="text-sm font-medium text-gray-500">Time Remaining</h3>
          <p className="text-2xl font-bold text-blue-600">{daysRemaining}d {hoursRemaining}h</p>
        </div>
      </div>

      {/* Farming Status */}
      {isPaused && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-yellow-400">⚠️</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Farming Paused</h3>
              <p className="text-sm text-yellow-700">Farming is currently paused. You can still withdraw but cannot stake new tokens.</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stake Section */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <h2 className="text-xl font-bold mb-4">💰 Stake LP Tokens</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount to Stake
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  placeholder="0.0"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  disabled={isPaused}
                />
                <button
                  onClick={() => setStakeAmount(lpBalance)}
                  className="absolute right-3 top-3 text-sm text-orange-600 hover:text-orange-800"
                  disabled={isPaused}
                >
                  MAX
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Available: {parseFloat(lpBalance).toFixed(6)} LP
              </p>
            </div>

            <div className="space-y-2">
              <button
                onClick={handleApprove}
                disabled={!stakeAmount || isPending || isConfirming || isPaused}
                className="w-full bg-orange-100 text-orange-700 py-3 px-4 rounded-lg font-medium hover:bg-orange-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending || isConfirming ? 'Approving...' : '1. Approve LP Tokens'}
              </button>
              
              <button
                onClick={handleStake}
                disabled={!stakeAmount || isPending || isConfirming || isPaused}
                className="w-full bg-orange-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending || isConfirming ? 'Staking...' : '2. Stake LP Tokens'}
              </button>
            </div>
          </div>
        </div>

        {/* Withdraw/Claim Section */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <h2 className="text-xl font-bold mb-4">📤 Manage Staking</h2>
          
          <div className="space-y-4">
            {/* Your Position */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">Your Position</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Staked:</span>
                  <p className="font-medium">{parseFloat(stakedBalance).toFixed(6)} LP</p>
                </div>
                <div>
                  <span className="text-gray-500">Earned:</span>
                  <p className="font-medium text-orange-600">{parseFloat(earnedRewards).toFixed(6)} KANARI</p>
                </div>
              </div>
            </div>

            {/* Withdraw */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount to Withdraw
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="0.0"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
                <button
                  onClick={() => setWithdrawAmount(stakedBalance)}
                  className="absolute right-3 top-3 text-sm text-orange-600 hover:text-orange-800"
                >
                  MAX
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={handleWithdraw}
                disabled={!withdrawAmount || isPending || isConfirming}
                className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending || isConfirming ? 'Withdrawing...' : 'Withdraw LP Tokens'}
              </button>
              
              <button
                onClick={handleClaim}
                disabled={isPending || isConfirming || parseFloat(earnedRewards) === 0}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending || isConfirming ? 'Claiming...' : 'Claim Rewards'}
              </button>
              
              <button
                onClick={handleExit}
                disabled={isPending || isConfirming || parseFloat(stakedBalance) === 0}
                className="w-full bg-red-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending || isConfirming ? 'Exiting...' : 'Exit (Withdraw All + Claim)'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Status */}
      {hash && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-blue-400">ℹ️</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Transaction Submitted</h3>
              <p className="text-sm text-blue-700">
                {isConfirming && 'Waiting for confirmation...'}
                {isConfirmed && 'Transaction confirmed!'}
              </p>
              <p className="text-xs text-blue-600 font-mono break-all">
                Hash: {hash}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* How to Get LP Tokens */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <h3 className="text-lg font-medium text-orange-800 mb-2">💡 How to Get LP Tokens</h3>
        <ol className="list-decimal list-inside text-sm text-orange-700 space-y-1">
          <li>Go to the <strong>Add Liquidity</strong> page</li>
          <li>Add equal value of KANARI and sBTC (Native) tokens</li>
          <li>Receive LP tokens representing your share</li>
          <li>Come back here to stake your LP tokens and earn rewards!</li>
        </ol>
      </div>
    </div>
  );
}
