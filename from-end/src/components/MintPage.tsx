"use client";

import React, { useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatUnits, parseUnits, Address } from 'viem';
import { CONTRACTS, USDK_ABI, KANARI_ABI } from '@/lib/contracts';

export default function MintPage() {
  const { address, isConnected } = useAccount();
  
  // State for minting
  const [selectedToken, setSelectedToken] = useState<'USDK' | 'KANARI'>('USDK');
  const [mintAmount, setMintAmount] = useState('');
  const [isMinting, setIsMinting] = useState(false);

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

  const { data: usdkTotalSupply } = useReadContract({
    address: CONTRACTS.USDK,
    abi: USDK_ABI,
    functionName: 'totalSupply',
  });

  const { data: kanariTotalSupply } = useReadContract({
    address: CONTRACTS.KANARI,
    abi: KANARI_ABI,
    functionName: 'totalSupply',
  });

  // Contract writes
  const { writeContract: writeMint, data: mintHash } = useWriteContract();

  const { isLoading: isMintPending } = useWaitForTransactionReceipt({
    hash: mintHash,
  });

  const handleMint = async () => {
    if (!address || !mintAmount) return;

    setIsMinting(true);
    try {
      const mintAmountWei = parseUnits(mintAmount, 18);
      const tokenAddress = selectedToken === 'USDK' ? CONTRACTS.USDK : CONTRACTS.KANARI;
      const abi = selectedToken === 'USDK' ? USDK_ABI : KANARI_ABI;
      
      writeMint({
        address: tokenAddress,
        abi,
        functionName: 'mint',
        args: [address, mintAmountWei],
      });
    } catch (error) {
      console.error('Mint failed:', error);
    } finally {
      setIsMinting(false);
    }
  };

  const getBalance = (token: 'USDK' | 'KANARI') => {
    const balance = token === 'USDK' ? usdkBalance : kanariBalance;
    return balance ? formatUnits(balance, 18) : '0';
  };

  const getTotalSupply = (token: 'USDK' | 'KANARI') => {
    const supply = token === 'USDK' ? usdkTotalSupply : kanariTotalSupply;
    return supply ? formatUnits(supply, 18) : '0';
  };

  const presetAmounts = ['10', '100', '1000', '10000'];

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-[var(--surface)] rounded-2xl border border-white/10 p-6 shadow-xl">
        <div className="space-y-4">
          {/* Header */}
          <div className="text-center">
            <h2 className="text-xl font-semibold text-[var(--text-color)]">Mint Tokens</h2>
            <p className="text-sm text-[var(--muted-text)] mt-1">
              Mint test tokens for development and testing
            </p>
          </div>

          {/* Token Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--muted-text)]">Select Token</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setSelectedToken('USDK')}
                className={`p-4 rounded-xl border transition ${
                  selectedToken === 'USDK'
                    ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                    : 'border-white/10 bg-[var(--background)]/50 hover:bg-[var(--background)]/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold">
                    U
                  </div>
                  <div className="text-left">
                    <div className="font-medium">USDK</div>
                    <div className="text-xs text-[var(--muted-text)]">USD Kanari</div>
                  </div>
                </div>
              </button>
              
              <button
                onClick={() => setSelectedToken('KANARI')}
                className={`p-4 rounded-xl border transition ${
                  selectedToken === 'KANARI'
                    ? 'border-orange-500 bg-orange-500/10 text-orange-400'
                    : 'border-white/10 bg-[var(--background)]/50 hover:bg-[var(--background)]/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-orange-400 flex items-center justify-center text-white text-sm font-bold">
                    K
                  </div>
                  <div className="text-left">
                    <div className="font-medium">KANARI</div>
                    <div className="text-xs text-[var(--muted-text)]">Kanari Token</div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Current Balance & Total Supply */}
          <div className="p-4 bg-[var(--background)]/30 rounded-xl border border-white/5">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--muted-text)]">Your Balance</span>
                <span>{parseFloat(getBalance(selectedToken)).toLocaleString()} {selectedToken}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted-text)]">Total Supply</span>
                <span>{parseFloat(getTotalSupply(selectedToken)).toLocaleString()} {selectedToken}</span>
              </div>
            </div>
          </div>

          {/* Preset Amount Buttons */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--muted-text)]">Quick Select</label>
            <div className="grid grid-cols-4 gap-2">
              {presetAmounts.map((amount) => (
                <button
                  key={amount}
                  onClick={() => setMintAmount(amount)}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition ${
                    mintAmount === amount
                      ? 'bg-[var(--primary-color)] text-white'
                      : 'bg-[var(--background)]/50 text-[var(--text-color)] hover:bg-[var(--background)]/80'
                  }`}
                >
                  {amount}
                </button>
              ))}
            </div>
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--muted-text)]">Amount to Mint</label>
            <div className="flex items-center gap-3 p-4 bg-[var(--background)]/50 rounded-xl border border-white/5">
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                  selectedToken === 'USDK' ? 'bg-blue-500' : 'bg-orange-400'
                }`}>
                  {selectedToken === 'USDK' ? 'U' : 'K'}
                </div>
                <span className="font-medium">{selectedToken}</span>
              </div>
              <input
                type="text"
                placeholder="0.0"
                value={mintAmount}
                onChange={(e) => setMintAmount(e.target.value)}
                className="flex-1 bg-transparent text-right text-lg font-medium placeholder-[var(--muted-text)] outline-none"
              />
            </div>
          </div>

          {/* Warning Notice */}
          <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none">
                <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <div className="text-sm">
                <p className="font-medium text-yellow-500">Test Network Only</p>
                <p className="text-yellow-600 mt-1">
                  These are test tokens for development purposes. They have no real value.
                </p>
              </div>
            </div>
          </div>

          {/* Action Button */}
          {!isConnected ? (
            <div className="text-center py-4 text-[var(--muted-text)]">
              Please connect your wallet
            </div>
          ) : (
            <button
              onClick={handleMint}
              disabled={isMinting || isMintPending || !mintAmount || parseFloat(mintAmount) <= 0}
              className={`w-full py-4 text-white font-medium rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed ${
                selectedToken === 'USDK'
                  ? 'bg-blue-500 hover:bg-blue-600'
                  : 'bg-orange-500 hover:bg-orange-600'
              }`}
            >
              {isMinting || isMintPending ? 'Minting...' : `Mint ${mintAmount ? parseFloat(mintAmount).toLocaleString() : ''} ${selectedToken}`}
            </button>
          )}

          {/* Additional Info */}
          <div className="text-center">
            <p className="text-xs text-[var(--muted-text)]">
              Free minting for testing purposes. No gas fees required.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
