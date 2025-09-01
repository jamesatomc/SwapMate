"use client";

import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';
import { CONTRACTS, USDK_ABI, KANARI_ABI } from '@/lib/contracts';

export default function MintPage() {
  const { address, isConnected } = useAccount();
  const [mintAmountA, setMintAmountA] = useState(''); // USDK (6 decimals)
  const [mintAmountB, setMintAmountB] = useState(''); // KANARI (18 decimals)
  const [balanceA, setBalanceA] = useState<string | null>(null);
  const [balanceB, setBalanceB] = useState<string | null>(null);

  useEffect(() => {
    if (address && isConnected) {
      loadBalances();
    }
  }, [address, isConnected]);

  async function loadBalances() {
    if (!address) return;
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const usdk = new ethers.Contract(CONTRACTS.USDK, USDK_ABI as any, provider);
      const kanari = new ethers.Contract(CONTRACTS.KANARI, KANARI_ABI as any, provider);
      const [a, b] = await Promise.all([usdk.balanceOf(address), kanari.balanceOf(address)]);
      setBalanceA(ethers.formatUnits(a, 6));
      setBalanceB(ethers.formatUnits(b, 18));
    } catch (err) {
      console.error('loadBalances failed', err);
    }
  }

  async function handleMintUSDK() {
    if (!isConnected || !mintAmountA || Number(mintAmountA) === 0) return;
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const usdk = new ethers.Contract(CONTRACTS.USDK, USDK_ABI as any, signer);
      const amt = ethers.parseUnits(mintAmountA, 6);
      const tx = await usdk.mint(await signer.getAddress(), amt);
      await tx.wait();
      alert('USDK minted');
      setMintAmountA('');
      await loadBalances();
    } catch (err) {
      console.error('mint USDK failed', err);
      alert(`Mint failed: ${err}`);
    }
  }

  async function handleMintKANARI() {
    if (!isConnected || !mintAmountB || Number(mintAmountB) === 0) return;
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const kanari = new ethers.Contract(CONTRACTS.KANARI, KANARI_ABI as any, signer);
      const amt = ethers.parseUnits(mintAmountB, 18);
      const tx = await kanari.mint(await signer.getAddress(), amt);
      await tx.wait();
      alert('KANARI minted');
      setMintAmountB('');
      await loadBalances();
    } catch (err) {
      console.error('mint KANARI failed', err);
      alert(`Mint failed: ${err}`);
    }
  }

  return (
    <div className="bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Mint Tokens</h1>
        <button className="text-gray-400 hover:text-white transition-colors">⚙️</button>
      </div>

      {!isConnected ? (
        <div className="text-center py-8">
          <p className="text-gray-400">Please connect your wallet to mint tokens</p>
        </div>
      ) : (
        <>
          <div className="mb-4 text-sm text-gray-400">Mint test tokens to your connected account (requires contract mint permission).</div>

          <div className="bg-slate-700 rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3 bg-slate-600 rounded-lg px-3 py-2">
                <div className="w-6 h-6 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full"></div>
                <span className="text-white font-medium">USDK</span>
              </div>
              <input
                className="bg-transparent text-white text-right text-2xl font-semibold placeholder-gray-500 focus:outline-none flex-1 ml-4"
                placeholder="0.0"
                value={mintAmountA}
                onChange={(e) => setMintAmountA(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Balance: {balanceA || '0.00'}</span>
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-xs font-medium transition-colors" onClick={() => setMintAmountA(balanceA || '0')}>MAX</button>
            </div>
            <button className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-green-500 to-blue-600 text-white font-semibold" onClick={handleMintUSDK}>
              Mint USDK
            </button>
          </div>

          <div className="bg-slate-700 rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3 bg-slate-600 rounded-lg px-3 py-2">
                <div className="w-6 h-6 bg-gradient-to-r from-purple-400 to-purple-600 rounded-full"></div>
                <span className="text-white font-medium">KANARI</span>
              </div>
              <input
                className="bg-transparent text-white text-right text-2xl font-semibold placeholder-gray-500 focus:outline-none flex-1 ml-4"
                placeholder="0.0"
                value={mintAmountB}
                onChange={(e) => setMintAmountB(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Balance: {balanceB || '0.00'}</span>
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-xs font-medium transition-colors" onClick={() => setMintAmountB(balanceB || '0')}>MAX</button>
            </div>
            <button className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-green-500 to-blue-600 text-white font-semibold" onClick={handleMintKANARI}>
              Mint KANARI
            </button>
          </div>
        </>
      )}
    </div>
  );
}
