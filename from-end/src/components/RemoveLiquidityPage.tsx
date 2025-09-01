"use client";

import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';
import { CONTRACTS, USDK_ABI, KANARI_ABI, SWAP_ABI } from '@/lib/contracts';

export default function RemoveLiquidityPage() {
  const { address, isConnected } = useAccount();
  const [lpAmount, setLpAmount] = useState('');
  const [percentage, setPercentage] = useState('25');
  const [lpBalance, setLpBalance] = useState<string | null>(null);
  const [reserves, setReserves] = useState<{ a: bigint; b: bigint } | null>(null);
  const [estimatedA, setEstimatedA] = useState<string | null>(null);
  const [estimatedB, setEstimatedB] = useState<string | null>(null);
  const [totalSupply, setTotalSupply] = useState<bigint | null>(null);

  useEffect(() => {
    if (address && isConnected) {
      loadBalances();
      loadReserves();
      loadTotalSupply();
    }
  }, [address, isConnected]);

  useEffect(() => {
    if (lpAmount && reserves && totalSupply && Number(lpAmount) > 0) {
      calculateEstimatedWithdraw();
    } else {
      setEstimatedA(null);
      setEstimatedB(null);
    }
  }, [lpAmount, reserves, totalSupply]);

  useEffect(() => {
    if (lpBalance && Number(percentage) > 0) {
      const calculatedLP = (Number(lpBalance) * Number(percentage) / 100).toString();
      setLpAmount(calculatedLP);
    }
  }, [percentage, lpBalance]);

  async function loadBalances() {
    if (!address) return;
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const swapContract = new ethers.Contract(CONTRACTS.SWAP, SWAP_ABI as any, provider);
      
      const lpBal = await swapContract.balanceOf(address);
      setLpBalance(ethers.formatUnits(lpBal, 18));
    } catch (error) {
      console.error('Error loading LP balance:', error);
    }
  }

  async function loadReserves() {
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const swapContract = new ethers.Contract(CONTRACTS.SWAP, SWAP_ABI as any, provider);
      const [reserveA, reserveB] = await swapContract.getReserves();
      setReserves({ a: reserveA, b: reserveB });
    } catch (error) {
      console.error('Error loading reserves:', error);
    }
  }

  async function loadTotalSupply() {
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const swapContract = new ethers.Contract(CONTRACTS.SWAP, SWAP_ABI as any, provider);
      const supply = await swapContract.totalSupply();
      setTotalSupply(supply);
    } catch (error) {
      console.error('Error loading total supply:', error);
    }
  }

  function calculateEstimatedWithdraw() {
    if (!reserves || !totalSupply || !lpAmount || Number(lpAmount) === 0) return;
    
    try {
      const lpAmountBig = ethers.parseUnits(lpAmount, 18);
      
      // Calculate proportional amounts
      const amountA = (lpAmountBig * reserves.a) / totalSupply;
      const amountB = (lpAmountBig * reserves.b) / totalSupply;
      
      setEstimatedA(ethers.formatUnits(amountA, 6));
      setEstimatedB(ethers.formatUnits(amountB, 18));
    } catch (error) {
      console.error('Error calculating withdraw amounts:', error);
      setEstimatedA(null);
      setEstimatedB(null);
    }
  }

  async function handleRemoveLiquidity() {
    if (!address || !lpAmount || Number(lpAmount) === 0) return;
    
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const swapContract = new ethers.Contract(CONTRACTS.SWAP, SWAP_ABI as any, signer);
      
      const lpAmountBig = ethers.parseUnits(lpAmount, 18);
  // Contract ABI expects only the LP amount for removeLiquidity
  const tx = await swapContract.removeLiquidity(lpAmountBig);
      
      await tx.wait();
      alert('Liquidity removed successfully!');
      
      // Refresh balances
      await loadBalances();
      await loadReserves();
      await loadTotalSupply();
      setLpAmount('');
      setPercentage('25');
      setEstimatedA(null);
      setEstimatedB(null);
    } catch (error) {
      console.error('Remove liquidity failed:', error);
      alert(`Remove liquidity failed: ${error}`);
    }
  }

  function setMaxLP() {
    if (lpBalance) {
      setLpAmount(lpBalance);
      setPercentage('100');
    }
  }

  const percentageButtons = ['25', '50', '75', '100'];
  const ratio = reserves && reserves.a > 0 && reserves.b > 0
    ? Number(ethers.formatUnits(reserves.b, 18)) / Number(ethers.formatUnits(reserves.a, 6))
    : null;

  return (
    <div className="bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Remove Liquidity</h1>
        <button className="text-gray-400 hover:text-white transition-colors">⚙️</button>
      </div>

      {!isConnected ? (
        <div className="text-center py-8">
          <p className="text-gray-400">Please connect your wallet to remove liquidity</p>
        </div>
      ) : (
        <>
          <div className="mb-4 text-sm text-gray-400">
            Remove your liquidity tokens to withdraw your share of the pool
          </div>

          {/* Percentage / LP Amount */}
          <div className="bg-slate-700 rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-white font-medium">Amount to remove</div>
              <div className="text-sm text-gray-400">Balance: {lpBalance || '0.00'}</div>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-3">
              {percentageButtons.map((pct) => (
                <button
                  key={pct}
                  onClick={() => setPercentage(pct)}
                  className={`py-2 rounded-md text-sm font-semibold transition-colors ${percentage === pct ? 'border-2 border-slate-600 bg-slate-600 text-white' : 'bg-slate-600/30 text-gray-300'}`}
                >
                  {pct}%
                </button>
              ))}
            </div>

            <div className="mb-3">
              <input
                type="range"
                min="0"
                max="100"
                value={percentage}
                onChange={(e) => setPercentage(e.target.value)}
                className="w-full h-2 appearance-none rounded-lg bg-slate-600/50"
              />
              <div className="text-center mt-2 text-lg font-bold text-white">{percentage}%</div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 bg-slate-600 rounded-lg px-3 py-2">
                <div className="w-6 h-6 bg-gradient-to-r from-indigo-400 to-indigo-600 rounded-full"></div>
                <span className="text-white font-medium">LP Tokens</span>
              </div>
              <input
                className="bg-transparent text-white text-right text-2xl font-semibold placeholder-gray-500 focus:outline-none flex-1 ml-4"
                placeholder="0.0"
                value={lpAmount}
                onChange={(e) => {
                  setLpAmount(e.target.value);
                  if (lpBalance && Number(e.target.value) > 0) {
                    const pct = (Number(e.target.value) / Number(lpBalance)) * 100;
                    setPercentage(Math.min(100, pct).toFixed(0));
                  }
                }}
              />
            </div>

            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-gray-400">Your LP: {lpBalance || '0.00'}</span>
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-xs font-medium transition-colors" onClick={setMaxLP}>
                MAX
              </button>
            </div>
          </div>

          {/* Arrow */}
          <div className="flex justify-center -my-1 relative z-10">
            <div className="bg-slate-700 border-4 border-slate-800 text-white w-10 h-10 rounded-full flex items-center justify-center text-lg">↓</div>
          </div>

          {/* Expected tokens */}
          <div className="bg-slate-700 rounded-xl p-4 mb-2">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3 bg-slate-600 rounded-lg px-3 py-2">
                <div className="w-6 h-6 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full"></div>
                <span className="text-white font-medium">USDK</span>
              </div>
              <div className="text-white text-2xl font-semibold">{estimatedA || '0.0'}</div>
            </div>
          </div>

          <div className="bg-slate-700 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3 bg-slate-600 rounded-lg px-3 py-2">
                <div className="w-6 h-6 bg-gradient-to-r from-purple-400 to-purple-600 rounded-full"></div>
                <span className="text-white font-medium">KANARI</span>
              </div>
              <div className="text-white text-2xl font-semibold">{estimatedB || '0.0'}</div>
            </div>
          </div>

          {/* Details */}
          {estimatedA && estimatedB && (
            <div className="bg-slate-700 rounded-xl p-4 mb-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-300">USDK to receive</span>
                <span className="text-white font-medium">{estimatedA}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">KANARI to receive</span>
                <span className="text-white font-medium">{estimatedB}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Slippage tolerance</span>
                <span className="text-white font-medium">5%</span>
              </div>
            </div>
          )}

          {/* Remove Button */}
          <button
            className={`w-full py-4 rounded-xl font-semibold text-lg transition-all duration-200 ${!lpAmount || Number(lpAmount) === 0 ? 'bg-slate-600 text-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-red-500 to-yellow-500 hover:from-red-600 hover:to-yellow-600 text-white shadow-lg hover:shadow-xl'}`}
            onClick={handleRemoveLiquidity}
            disabled={!lpAmount || Number(lpAmount) === 0}
          >
            {!lpAmount || Number(lpAmount) === 0 ? 'Enter LP amount' : 'Remove Liquidity'}
          </button>

          {/* Pool Stats */}
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="bg-slate-700 rounded-lg p-4 text-center">
              <div className="text-white text-lg font-semibold">{lpBalance || '0.00'}</div>
              <div className="text-gray-400 text-sm">Your LP Tokens</div>
            </div>
            <div className="bg-slate-700 rounded-lg p-4 text-center">
              <div className="text-white text-lg font-semibold">
                {reserves ? `${ethers.formatUnits(reserves.a, 6)} / ${ethers.formatUnits(reserves.b, 18)}` : '0 / 0'}
              </div>
              <div className="text-gray-400 text-sm">Pool Reserves</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
