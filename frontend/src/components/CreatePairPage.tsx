"use client";

import React, { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { Address } from 'viem';
import { CONTRACTS, DEX_FACTORY_ABI } from '@/lib/contracts';
import TokenSelector, { getTokenInfo } from './TokenSelector';
import { useAllTokens } from './TokenManager';

type CustomPool = {
  poolAddress: string;
  tokenAKey?: string;
  tokenBKey?: string;
  pairName?: string;
};

export default function CreatePairPage() {
  const { isConnected } = useAccount();
  
  // State for creating pair
  const [tokenA, setTokenA] = useState<string>('');
  const [tokenB, setTokenB] = useState<string>('');
  const [isCreatingPair, setIsCreatingPair] = useState(false);
  const { customTokens } = useAllTokens();

  // Check if pool already exists
  const { data: existingPool, refetch: refetchExistingPool } = useReadContract({
    address: CONTRACTS.DEX_FACTORY,
    abi: DEX_FACTORY_ABI,
    functionName: 'getPool',
    args: [
      getTokenInfo(tokenA, customTokens)?.address as Address,
      getTokenInfo(tokenB, customTokens)?.address as Address
    ],
    query: { enabled: !!tokenA && !!tokenB }
  });

  // Get total number of pools
  const { data: totalPools, refetch: refetchTotalPools } = useReadContract({
    address: CONTRACTS.DEX_FACTORY,
    abi: DEX_FACTORY_ABI,
    functionName: 'allPoolsLength'
  });

  // Contract writes
  const { writeContract: writeCreatePool, data: createPoolHash } = useWriteContract();

  const { isLoading: isCreatePoolPending } = useWaitForTransactionReceipt({
    hash: createPoolHash,
  });

  // Handle creating pool
  const handleCreatePair = async () => {
    if (!tokenA || !tokenB) return;

    const tokenAInfo = getTokenInfo(tokenA, customTokens);
    const tokenBInfo = getTokenInfo(tokenB, customTokens);
    
    if (!tokenAInfo || !tokenBInfo) return;

    setIsCreatingPair(true);
    try {
      writeCreatePool({
        address: CONTRACTS.DEX_FACTORY,
        abi: DEX_FACTORY_ABI,
        functionName: 'createPool',
        args: [
          tokenAInfo.address as Address,
          tokenBInfo.address as Address
        ],
      });
    } catch (error) {
      console.error('Create pair failed:', error);
    } finally {
      setIsCreatingPair(false);
    }
  };

  // Handle token selection
  const handleTokenASelect = (tokenKey: string) => setTokenA(tokenKey);
  const handleTokenBSelect = (tokenKey: string) => setTokenB(tokenKey);

  // Swap token positions
  const handleSwapTokens = () => {
    const tempA = tokenA;
    setTokenA(tokenB);
    setTokenB(tempA);
  };

  // Check if pair can be created
  const canCreatePair = () => {
    if (!tokenA || !tokenB || tokenA === tokenB) return false;
    if (existingPool && existingPool !== "0x0000000000000000000000000000000000000000") return false;
    return true;
  };

  // Refresh data when transaction completes
  useEffect(() => {
    if (createPoolHash) {
      const timer = setTimeout(() => {
        refetchTotalPools();
        // also try to refresh the getPool result so we can pick up the new pool address
          try {
            refetchExistingPool?.();
          } catch {
            // noop
          }
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [createPoolHash, refetchTotalPools, refetchExistingPool]);

  const tokenAInfo = getTokenInfo(tokenA, customTokens);
  const tokenBInfo = getTokenInfo(tokenB, customTokens);
  const poolExists = existingPool && existingPool !== "0x0000000000000000000000000000000000000000";

  // When the factory reports the pool address after creation, persist it to localStorage
  useEffect(() => {
    if (existingPool && existingPool !== "0x0000000000000000000000000000000000000000") {
      try {
        const stored = localStorage.getItem('customPools');
        const arr: CustomPool[] = stored ? JSON.parse(stored) as CustomPool[] : [];
        const poolAddress = existingPool as string;
        const exists = arr.find((p) => p.poolAddress && p.poolAddress.toLowerCase() === poolAddress.toLowerCase());
        if (!exists) {
          arr.push({
            poolAddress,
            tokenAKey: tokenA,
            tokenBKey: tokenB,
            pairName: `${tokenAInfo?.symbol || tokenA}/${tokenBInfo?.symbol || tokenB}`,
          });
          localStorage.setItem('customPools', JSON.stringify(arr));
        }
      } catch {
        console.error('Error saving custom pool:');
      }
    }
  }, [existingPool, tokenA, tokenB, tokenAInfo, tokenBInfo]);

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-[var(--surface)] rounded-2xl border border-white/10 p-6 shadow-xl">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-[var(--text-color)]">Create Trading Pair</h2>
            <div className="text-sm text-[var(--muted-text)]">
              Total Pools: {totalPools ? totalPools.toString() : '0'}
            </div>
          </div>

          {/* Token A Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-[var(--muted-text)]">First Token</label>
            <TokenSelector
              selectedToken={tokenA}
              onTokenSelect={handleTokenASelect}
              excludeTokens={[tokenB]}
            />
            {tokenAInfo && (
              <div className="text-xs text-[var(--muted-text)] px-2">
                Address: {tokenAInfo.address}
              </div>
            )}
          </div>

          {/* Swap Button */}
          <div className="flex justify-center">
            <button
              onClick={handleSwapTokens}
              className="w-8 h-8 rounded-full bg-[var(--surface)] border border-white/10 flex items-center justify-center hover:bg-[var(--background)]/80 transition"
              title="Swap token positions"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </button>
          </div>

          {/* Token B Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-[var(--muted-text)]">Second Token</label>
            <TokenSelector
              selectedToken={tokenB}
              onTokenSelect={handleTokenBSelect}
              excludeTokens={[tokenA]}
            />
            {tokenBInfo && (
              <div className="text-xs text-[var(--muted-text)] px-2">
                Address: {tokenBInfo.address}
              </div>
            )}
          </div>

          {/* Fee Information */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-[var(--muted-text)]">Trading Fees</label>
            <div className="p-3 bg-[var(--background)]/30 rounded-lg border border-white/5">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--muted-text)]">Trading Fee:</span>
                  <span className="text-[var(--text-color)]">0.3%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted-text)]">Dev Fee:</span>
                  <span className="text-[var(--text-color)]">0.1%</span>
                </div>
                <div className="text-xs text-[var(--muted-text)] mt-2">
                  Fees are set automatically by the factory contract
                </div>
              </div>
            </div>
          </div>

          {/* Pair Information */}
          {tokenAInfo && tokenBInfo && (
            <div className="p-3 bg-[var(--background)]/30 rounded-lg border border-white/5">
              <h4 className="text-sm font-medium text-[var(--text-color)] mb-2">Pair Preview</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--muted-text)]">Pair Name:</span>
                  <span className="text-sm text-[var(--text-color)]">
                    {tokenAInfo.symbol}/{tokenBInfo.symbol}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--muted-text)]">Trading Fee:</span>
                  <span className="text-sm text-[var(--text-color)]">
                    0.30%
                  </span>
                </div>
                {poolExists && (
                  <div className="text-xs text-red-500 font-medium">
                    ⚠️ Pool already exists at: {existingPool}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Button */}
          {!isConnected ? (
            <div className="text-center py-4 text-[var(--muted-text)]">
              Please connect your wallet
            </div>
          ) : poolExists ? (
            <button
              disabled
              className="w-full py-4 bg-gray-500 text-white font-medium rounded-xl cursor-not-allowed"
            >
              Pool Already Exists
            </button>
          ) : !canCreatePair() ? (
            <button
              disabled
              className="w-full py-4 bg-gray-500 text-white font-medium rounded-xl cursor-not-allowed"
            >
              {!tokenA || !tokenB ? 'Select Tokens' : 'Invalid Pair'}
            </button>
          ) : (
            <button
              onClick={handleCreatePair}
              disabled={isCreatingPair || isCreatePoolPending}
              className="w-full py-4 bg-[var(--primary-color)] text-white font-medium rounded-xl hover:bg-[var(--primary-color)]/80 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {isCreatingPair || isCreatePoolPending ? 'Creating Pair...' : 'Create Trading Pair'}
            </button>
          )}

          {/* Help Text */}
          <div className="text-xs text-[var(--muted-text)] text-center space-y-1">
            <p>Creating a new trading pair will deploy a new liquidity pool contract.</p>
            <p>You can add liquidity to the pool after creation.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
