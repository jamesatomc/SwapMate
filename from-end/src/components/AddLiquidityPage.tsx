"use client";

import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';
import { CONTRACTS, USDK_ABI, KANARI_ABI, SWAP_ABI } from '@/lib/contracts';

export default function AddLiquidityPage() {
  const { address, isConnected } = useAccount();
  const [amountA, setAmountA] = useState(''); // USDK
  const [amountB, setAmountB] = useState(''); // KANARI
  const [balanceA, setBalanceA] = useState<string | null>(null);
  const [balanceB, setBalanceB] = useState<string | null>(null);
  const [lpBalance, setLpBalance] = useState<string | null>(null);
  const [reserves, setReserves] = useState<{ a: bigint; b: bigint } | null>(null);
  const [estimatedLP, setEstimatedLP] = useState<string | null>(null);

  useEffect(() => {
    if (address && isConnected) {
      loadBalances();
      loadReserves();
    }
  }, [address, isConnected]);

  useEffect(() => {
    if (amountA && amountB && reserves) {
      calculateEstimatedLP();
    } else {
      setEstimatedLP(null);
    }
  }, [amountA, amountB, reserves]);

  // Auto-calculate proportional amounts
  useEffect(() => {
    if (amountA && reserves && reserves.a > 0 && reserves.b > 0) {
      const ratio = Number(ethers.formatUnits(reserves.b, 18)) / Number(ethers.formatUnits(reserves.a, 6));
      const calculatedB = (Number(amountA) * ratio).toFixed(6);
      if (calculatedB !== amountB) {
        setAmountB(calculatedB);
      }
    }
  }, [amountA, reserves]);

  useEffect(() => {
    if (amountB && reserves && reserves.a > 0 && reserves.b > 0) {
      const ratio = Number(ethers.formatUnits(reserves.a, 6)) / Number(ethers.formatUnits(reserves.b, 18));
      const calculatedA = (Number(amountB) * ratio).toFixed(6);
      if (calculatedA !== amountA) {
        setAmountA(calculatedA);
      }
    }
  }, [amountB, reserves]);

  async function loadBalances() {
    if (!address) return;
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const usdkContract = new ethers.Contract(CONTRACTS.USDK, USDK_ABI as any, provider);
      const kanariContract = new ethers.Contract(CONTRACTS.KANARI, KANARI_ABI as any, provider);
      const swapContract = new ethers.Contract(CONTRACTS.SWAP, SWAP_ABI as any, provider);
      
      const [usdkBal, kanariBal, lpBal] = await Promise.all([
        usdkContract.balanceOf(address),
        kanariContract.balanceOf(address),
        swapContract.balanceOf(address)
      ]);
      
      setBalanceA(ethers.formatUnits(usdkBal, 6));
      setBalanceB(ethers.formatUnits(kanariBal, 18));
      setLpBalance(ethers.formatUnits(lpBal, 18));
    } catch (error) {
      console.error('Error loading balances:', error);
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

  async function calculateEstimatedLP() {
    if (!amountA || !amountB || !reserves) return;
    
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const swapContract = new ethers.Contract(CONTRACTS.SWAP, SWAP_ABI as any, provider);
      
      const amountABig = ethers.parseUnits(amountA, 6);
      const amountBBig = ethers.parseUnits(amountB, 18);
      
      const totalSupply = await swapContract.totalSupply();
      
      if (totalSupply === BigInt(0)) {
        // First liquidity
        const estimatedLPTokens = Math.sqrt(Number(amountABig) * Number(amountBBig)) / 1e12;
        setEstimatedLP(estimatedLPTokens.toFixed(6));
      } else {
        // Subsequent liquidity
        const lpFromA = (amountABig * totalSupply) / reserves.a;
        const lpFromB = (amountBBig * totalSupply) / reserves.b;
        const estimatedLPTokens = lpFromA < lpFromB ? lpFromA : lpFromB;
        setEstimatedLP(ethers.formatUnits(estimatedLPTokens, 18));
      }
    } catch (error) {
      console.error('Error calculating LP tokens:', error);
      setEstimatedLP(null);
    }
  }

  async function handleAddLiquidity() {
    if (!address || !amountA || !amountB || Number(amountA) === 0 || Number(amountB) === 0) return;
    
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const swapContract = new ethers.Contract(CONTRACTS.SWAP, SWAP_ABI as any, signer);
      
      const amountABig = ethers.parseUnits(amountA, 6);
      const amountBBig = ethers.parseUnits(amountB, 18);
      
      // Approve tokens
      await approveIfNeeded(CONTRACTS.USDK, CONTRACTS.SWAP, amountA, 6);
      await approveIfNeeded(CONTRACTS.KANARI, CONTRACTS.SWAP, amountB, 18);
      
      // Add liquidity (contract expects only amountA, amountB)
      const tx = await swapContract.addLiquidity(
        amountABig,
        amountBBig
      );
      
      await tx.wait();
      alert('Liquidity added successfully!');
      
      // Refresh balances
      await loadBalances();
      await loadReserves();
      setAmountA('');
      setAmountB('');
      setEstimatedLP(null);
    } catch (error) {
      console.error('Add liquidity failed:', error);
      alert(`Add liquidity failed: ${error}`);
    }
  }

  async function approveIfNeeded(tokenAddress: string, spender: string, amountRaw: string, decimals = 18) {
    const provider = new ethers.BrowserProvider((window as any).ethereum);
    const signer = await provider.getSigner();
    const token = new ethers.Contract(tokenAddress, USDK_ABI as any, signer);
    const allowance = await token.allowance(await signer.getAddress(), spender);
    const amt = ethers.parseUnits(amountRaw || '0', decimals);
    if (allowance < amt) {
      const tx = await token.approve(spender, amt);
      await tx.wait();
    }
  }

  function setMaxAmountA() {
    if (balanceA) {
      setAmountA(balanceA);
    }
  }

  function setMaxAmountB() {
    if (balanceB) {
      setAmountB(balanceB);
    }
  }

  const ratio = reserves && reserves.a > 0 && reserves.b > 0 
    ? Number(ethers.formatUnits(reserves.b, 18)) / Number(ethers.formatUnits(reserves.a, 6))
    : null;

  return (
    <div className="bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Add Liquidity</h1>
        <button className="text-gray-400 hover:text-white transition-colors">
          ⚙️
        </button>
      </div>

      {!isConnected ? (
        <div className="text-center py-8">
          <p className="text-gray-400">Please connect your wallet to add liquidity</p>
        </div>
      ) : (
        <>
          <div className="mb-4 text-sm text-gray-400">
            Provide both tokens to earn trading fees as a liquidity provider
          </div>

          {/* USDK Input */}
          <div className="bg-slate-700 rounded-xl p-4 mb-2">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3 bg-slate-600 rounded-lg px-3 py-2">
                <div className="w-6 h-6 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full"></div>
                <span className="text-white font-medium">USDK</span>
              </div>
              <input
                className="bg-transparent text-white text-right text-2xl font-semibold placeholder-gray-500 focus:outline-none flex-1 ml-4"
                placeholder="0.0"
                value={amountA}
                onChange={(e) => setAmountA(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Balance: {balanceA || '0.00'}</span>
              <button 
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-xs font-medium transition-colors"
                onClick={setMaxAmountA}
              >
                MAX
              </button>
            </div>
          </div>

          {/* Plus Icon */}
          <div className="flex justify-center -my-1 relative z-10">
            <div className="bg-slate-700 border-4 border-slate-800 text-white w-10 h-10 rounded-full flex items-center justify-center text-lg">
              +
            </div>
          </div>

          {/* KANARI Input */}
          <div className="bg-slate-700 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3 bg-slate-600 rounded-lg px-3 py-2">
                <div className="w-6 h-6 bg-gradient-to-r from-purple-400 to-purple-600 rounded-full"></div>
                <span className="text-white font-medium">KANARI</span>
              </div>
              <input
                className="bg-transparent text-white text-right text-2xl font-semibold placeholder-gray-500 focus:outline-none flex-1 ml-4"
                placeholder="0.0"
                value={amountB}
                onChange={(e) => setAmountB(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Balance: {balanceB || '0.00'}</span>
              <button 
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-xs font-medium transition-colors"
                onClick={setMaxAmountB}
              >
                MAX
              </button>
            </div>
          </div>

          {/* Pool Info */}
          {ratio && (
            <div className="bg-slate-700 rounded-xl p-4 mb-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Pool ratio</span>
                <span className="text-white font-medium">1 USDK = {ratio.toFixed(6)} KANARI</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Your pool share</span>
                <span className="text-white font-medium">{estimatedLP ? '~0.01%' : '0%'}</span>
              </div>
              {estimatedLP && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">LP tokens to receive</span>
                  <span className="text-white font-medium">~{estimatedLP}</span>
                </div>
              )}
            </div>
          )}

          {/* Add Liquidity Button */}
          <button
            className={`w-full py-4 rounded-xl font-semibold text-lg transition-all duration-200 ${
              !amountA || !amountB || Number(amountA) === 0 || Number(amountB) === 0
                ? 'bg-slate-600 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl'
            }`}
            onClick={handleAddLiquidity}
            disabled={!amountA || !amountB || Number(amountA) === 0 || Number(amountB) === 0}
          >
            {!amountA || !amountB || Number(amountA) === 0 || Number(amountB) === 0
              ? 'Enter amounts'
              : 'Add Liquidity'
            }
          </button>

          {/* Pool Stats */}
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="bg-slate-700 rounded-lg p-4 text-center">
              <div className="text-white text-lg font-semibold">{lpBalance || '0.00'}</div>
              <div className="text-gray-400 text-sm">Your LP Tokens</div>
            </div>
            <div className="bg-slate-700 rounded-lg p-4 text-center">
              <div className="text-white text-lg font-semibold">
                {reserves ? 
                  `${ethers.formatUnits(reserves.a, 6)} / ${ethers.formatUnits(reserves.b, 18)}` 
                  : '0 / 0'
                }
              </div>
              <div className="text-gray-400 text-sm">Pool Reserves</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}