"use client";

import React, { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { ethers } from 'ethers';
import { CONTRACTS, USDK_ABI, KANARI_ABI, SWAP_ABI } from '@/lib/contracts';

export default function SwapPage() {
  const { address, isConnected } = useAccount();
  const [swapAmount, setSwapAmount] = useState('');
  const [outputAmount, setOutputAmount] = useState('');
  const [balanceA, setBalanceA] = useState<string | null>(null); // USDK
  const [balanceB, setBalanceB] = useState<string | null>(null); // KANARI
  const [estimatedOut, setEstimatedOut] = useState<string | null>(null);
  const [slippage, setSlippage] = useState('0.5');
  const [reserves, setReserves] = useState<{ a: bigint; b: bigint } | null>(null);
  const [swapDirection, setSwapDirection] = useState<'AtoB' | 'BtoA'>('AtoB'); // A = USDK, B = KANARI

  useEffect(() => {
    if (address && isConnected) {
      loadBalances();
      loadReserves();
    }
  }, [address, isConnected]);

  useEffect(() => {
    if (swapAmount && reserves && Number(swapAmount) > 0) {
      calculateEstimatedOutput();
    } else {
      setEstimatedOut(null);
    }
  }, [swapAmount, reserves, swapDirection]);

  async function loadBalances() {
    if (!address) return;
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const usdkContract = new ethers.Contract(CONTRACTS.USDK, USDK_ABI as any, provider);
      const kanariContract = new ethers.Contract(CONTRACTS.KANARI, KANARI_ABI as any, provider);
      
      const [usdkBal, kanariBal] = await Promise.all([
        usdkContract.balanceOf(address),
        kanariContract.balanceOf(address)
      ]);
      
      setBalanceA(ethers.formatUnits(usdkBal, 6));
      setBalanceB(ethers.formatUnits(kanariBal, 18));
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

  function calculateEstimatedOutput() {
    if (!reserves || !swapAmount || Number(swapAmount) === 0) return;
    
    try {
      const amountIn = swapDirection === 'AtoB' 
        ? ethers.parseUnits(swapAmount, 6)  // USDK
        : ethers.parseUnits(swapAmount, 18); // KANARI
      
      const reserveIn = swapDirection === 'AtoB' ? reserves.a : reserves.b;
      const reserveOut = swapDirection === 'AtoB' ? reserves.b : reserves.a;
      
      // AMM formula: amountOut = (amountIn * 997 * reserveOut) / (reserveIn * 1000 + amountIn * 997)
      const amountInWithFee = amountIn * BigInt(997);
      const numerator = amountInWithFee * reserveOut;
      const denominator = reserveIn * BigInt(1000) + amountInWithFee;
      const amountOut = numerator / denominator;
      
      const decimals = swapDirection === 'AtoB' ? 18 : 6;
      setEstimatedOut(ethers.formatUnits(amountOut, decimals));
    } catch (error) {
      console.error('Error calculating output:', error);
      setEstimatedOut(null);
    }
  }

  async function handleSwap() {
    if (!address || !swapAmount || Number(swapAmount) === 0) return;
    
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const swapContract = new ethers.Contract(CONTRACTS.SWAP, SWAP_ABI as any, signer);
      
      const amountIn = swapDirection === 'AtoB' 
        ? ethers.parseUnits(swapAmount, 6)
        : ethers.parseUnits(swapAmount, 18);
      
      // Approve token
      const tokenAddress = swapDirection === 'AtoB' ? CONTRACTS.USDK : CONTRACTS.KANARI;
      const decimals = swapDirection === 'AtoB' ? 6 : 18;
      await approveIfNeeded(tokenAddress, CONTRACTS.SWAP, swapAmount, decimals);
      
      // Calculate minimum amount out with slippage
      const estimatedOutBig = swapDirection === 'AtoB' 
        ? ethers.parseUnits(estimatedOut || '0', 18)
        : ethers.parseUnits(estimatedOut || '0', 6);
      
      const slippageBig = BigInt(Math.floor(Number(slippage) * 100));
      const minAmountOut = estimatedOutBig * (BigInt(10000) - slippageBig) / BigInt(10000);
      
      let tx;
      if (swapDirection === 'AtoB') {
        tx = await swapContract.swapExactAForB(amountIn, minAmountOut);
      } else {
        tx = await swapContract.swapExactBForA(amountIn, minAmountOut);
      }
      
      await tx.wait();
      alert('Swap successful!');
      
      // Refresh balances and reserves
      await loadBalances();
      await loadReserves();
      setSwapAmount('');
      setEstimatedOut(null);
    } catch (error) {
      console.error('Swap failed:', error);
      alert(`Swap failed: ${error}`);
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

  function switchTokens() {
    setSwapDirection(swapDirection === 'AtoB' ? 'BtoA' : 'AtoB');
    setSwapAmount('');
    setEstimatedOut(null);
  }

  function setMaxAmount() {
    const maxBalance = swapDirection === 'AtoB' ? balanceA : balanceB;
    if (maxBalance) {
      setSwapAmount(maxBalance);
    }
  }

  const inputToken = swapDirection === 'AtoB' ? 'USDK' : 'KANARI';
  const outputToken = swapDirection === 'AtoB' ? 'KANARI' : 'USDK';
  const inputBalance = swapDirection === 'AtoB' ? balanceA : balanceB;
  const outputBalance = swapDirection === 'AtoB' ? balanceB : balanceA;

  return (
    <div className="bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Swap</h1>
        <button className="text-gray-400 hover:text-white transition-colors">
          ⚙️
        </button>
      </div>

      {!isConnected ? (
        <div className="text-center py-8">
          <p className="text-gray-400">Please connect your wallet to start swapping</p>
        </div>
      ) : (
        <>
          {/* From Token */}
          <div className="bg-slate-700 rounded-xl p-4 mb-2">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3 bg-slate-600 rounded-lg px-3 py-2">
                <div className="w-6 h-6 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full"></div>
                <span className="text-white font-medium">{inputToken}</span>
                <span className="text-gray-400">⌄</span>
              </div>
              <input
                className="bg-transparent text-white text-right text-2xl font-semibold placeholder-gray-500 focus:outline-none flex-1 ml-4"
                placeholder="0.0"
                value={swapAmount}
                onChange={(e) => setSwapAmount(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Balance: {inputBalance || '0.00'}</span>
              <button 
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-xs font-medium transition-colors"
                onClick={setMaxAmount}
              >
                MAX
              </button>
            </div>
          </div>

          {/* Swap Arrow */}
          <div className="flex justify-center -my-1 relative z-10">
            <button 
              className="bg-slate-700 hover:bg-slate-600 border-4 border-slate-800 text-white w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all duration-200 hover:scale-110"
              onClick={switchTokens}
            >
              ⇅
            </button>
          </div>

          {/* To Token */}
          <div className="bg-slate-700 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3 bg-slate-600 rounded-lg px-3 py-2">
                <div className="w-6 h-6 bg-gradient-to-r from-purple-400 to-purple-600 rounded-full"></div>
                <span className="text-white font-medium">{outputToken}</span>
                <span className="text-gray-400">⌄</span>
              </div>
              <div className="text-gray-400 text-right text-2xl font-semibold flex-1 ml-4">
                {estimatedOut || '0.0'}
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Balance: {outputBalance || '0.00'}</span>
            </div>
          </div>

          {/* Swap Details */}
          {estimatedOut && (
            <div className="bg-slate-700 rounded-xl p-4 mb-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Slippage tolerance</span>
                <div className="flex items-center gap-2">
                  <input
                    className="w-16 px-2 py-1 bg-slate-600 border border-slate-500 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={slippage}
                    onChange={(e) => setSlippage(e.target.value)}
                  />
                  <span className="text-gray-300">%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Minimum received</span>
                <span className="text-white font-medium">
                  {estimatedOut ? 
                    (Number(estimatedOut) * (1 - Number(slippage) / 100)).toFixed(6) 
                    : '0.00'
                  } {outputToken}
                </span>
              </div>
            </div>
          )}

          {/* Swap Button */}
          <button
            className={`w-full py-4 rounded-xl font-semibold text-lg transition-all duration-200 ${
              !swapAmount || Number(swapAmount) === 0 || !estimatedOut
                ? 'bg-slate-600 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl'
            }`}
            onClick={handleSwap}
            disabled={!swapAmount || Number(swapAmount) === 0 || !estimatedOut}
          >
            {!swapAmount || Number(swapAmount) === 0 
              ? 'Enter an amount' 
              : `Swap ${inputToken} for ${outputToken}`
            }
          </button>

          {/* Pool Stats */}
          {reserves && (
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="bg-slate-700 rounded-lg p-4 text-center">
                <div className="text-white text-lg font-semibold">{ethers.formatUnits(reserves.a, 6)}</div>
                <div className="text-gray-400 text-sm">USDK Reserve</div>
              </div>
              <div className="bg-slate-700 rounded-lg p-4 text-center">
                <div className="text-white text-lg font-semibold">{ethers.formatUnits(reserves.b, 18)}</div>
                <div className="text-gray-400 text-sm">KANARI Reserve</div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
