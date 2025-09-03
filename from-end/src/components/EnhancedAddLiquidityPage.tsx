"use client";

import React, { useEffect, useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useBalance } from 'wagmi';
import { parseEther, formatEther, formatUnits, parseUnits, Address, isAddress } from 'viem';
import { CONTRACTS, USDK_ABI, KANARI_ABI, SWAP_ABI, TOKENS, TokenKey } from '@/lib/contracts';
import TokenSelector, { CustomToken } from './TokenSelector';

// Generic ERC20 ABI for custom tokens
const ERC20_ABI = [
  {
    "constant": true,
    "inputs": [{"name": "_owner", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"name": "balance", "type": "uint256"}],
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [{"name": "_spender", "type": "address"}, {"name": "_value", "type": "uint256"}],
    "name": "approve",
    "outputs": [{"name": "", "type": "bool"}],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "symbol",
    "outputs": [{"name": "", "type": "string"}],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{"name": "", "type": "uint8"}],
    "type": "function"
  }
] as const;

// Simple factory-like contract for deploying new pools
const FACTORY_ABI = [
  {
    "inputs": [
      {"name": "_tokenA", "type": "address"},
      {"name": "_tokenB", "type": "address"}
    ],
    "name": "createPool",
    "outputs": [{"name": "pool", "type": "address"}],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

export default function EnhancedAddLiquidityPage() {
  const { address, isConnected } = useAccount();
  
  // State for tokens
  const [tokenA, setTokenA] = useState<TokenKey | CustomToken>('KANARI');
  const [tokenB, setTokenB] = useState<TokenKey | CustomToken>('USDK');
  const [amountA, setAmountA] = useState('');
  const [amountB, setAmountB] = useState('');
  const [slippage, setSlippage] = useState('0.5');
  
  // UI state
  const [showTokenSelectorA, setShowTokenSelectorA] = useState(false);
  const [showTokenSelectorB, setShowTokenSelectorB] = useState(false);
  const [poolAddress, setPoolAddress] = useState<string>('');
  const [poolExists, setPoolExists] = useState<boolean | null>(null);
  const [isCreatingPool, setIsCreatingPool] = useState(false);

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // Helper functions to get token info
  const getTokenAddress = (token: TokenKey | CustomToken): string => {
    if (typeof token === 'string') {
      if (token === 'NATIVE') return '0x0000000000000000000000000000000000000000';
      return TOKENS[token].address;
    }
    return token.address;
  };

  const getTokenSymbol = (token: TokenKey | CustomToken): string => {
    if (typeof token === 'string') {
      if (token === 'NATIVE') return 'sBTC';
      return TOKENS[token].symbol;
    }
    return token.symbol;
  };

  const getTokenDecimals = (token: TokenKey | CustomToken): number => {
    if (typeof token === 'string') {
      if (token === 'NATIVE') return 18;
      return TOKENS[token].decimals;
    }
    return token.decimals;
  };

  const getTokenABI = (token: TokenKey | CustomToken) => {
    if (typeof token === 'string') {
      switch (token) {
        case 'KANARI': return KANARI_ABI;
        case 'USDK': return USDK_ABI;
        case 'NATIVE': return null; // Native token doesn't need ABI
        default: return ERC20_ABI;
      }
    }
    return ERC20_ABI;
  };

  // Check if pool exists for selected tokens
  useEffect(() => {
    const checkPoolExists = async () => {
      const addrA = getTokenAddress(tokenA);
      const addrB = getTokenAddress(tokenB);
      
      // For demo purposes, we'll use a simple deterministic address generation
      // In a real implementation, you'd query a factory contract
      if (addrA && addrB && addrA !== addrB) {
        // Check if this is one of our existing pools
        const existingPools = [
          { a: TOKENS.KANARI.address, b: TOKENS.USDK.address, pool: CONTRACTS.KANARI_USDK_POOL },
          { a: TOKENS.KANARI.address, b: '0x0000000000000000000000000000000000000000', pool: CONTRACTS.KANARI_NATIVE_POOL },
          { a: TOKENS.USDK.address, b: '0x0000000000000000000000000000000000000000', pool: CONTRACTS.USDK_NATIVE_POOL }
        ];
        
        const existingPool = existingPools.find(p => 
          (p.a === addrA && p.b === addrB) || (p.a === addrB && p.b === addrA)
        );
        
        if (existingPool) {
          setPoolAddress(existingPool.pool);
          setPoolExists(true);
        } else {
          setPoolAddress('');
          setPoolExists(false);
        }
      }
    };
    
    checkPoolExists();
  }, [tokenA, tokenB]);

  // Read balances for selected tokens
  const { data: balanceA } = useBalance({
    address: address,
    token: getTokenAddress(tokenA) === '0x0000000000000000000000000000000000000000' ? undefined : getTokenAddress(tokenA) as Address,
    query: { enabled: !!address }
  });

  const { data: balanceB } = useBalance({
    address: address,
    token: getTokenAddress(tokenB) === '0x0000000000000000000000000000000000000000' ? undefined : getTokenAddress(tokenB) as Address,
    query: { enabled: !!address }
  });

  // Read custom token balances
  const { data: customBalanceA } = useReadContract({
    address: typeof tokenA !== 'string' ? tokenA.address as Address : undefined,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address && typeof tokenA !== 'string' }
  });

  const { data: customBalanceB } = useReadContract({
    address: typeof tokenB !== 'string' ? tokenB.address as Address : undefined,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address && typeof tokenB !== 'string' }
  });

  // Get formatted balance for display
  const getFormattedBalance = (token: TokenKey | CustomToken, isTokenA: boolean): string => {
    let balance: bigint | undefined;
    if (typeof token === 'string' && (token === 'NATIVE' || getTokenAddress(token) === '0x0000000000000000000000000000000000000000')) {
      balance = isTokenA ? balanceA?.value : balanceB?.value;
    } else if (typeof token !== 'string') {
      balance = isTokenA ? customBalanceA as bigint : customBalanceB as bigint;
    } else {
      balance = isTokenA ? balanceA?.value : balanceB?.value;
    }
    
    if (!balance) return '0';
    return formatUnits(balance, getTokenDecimals(token));
  };

  // Handle token approval
  const handleApprove = async (token: TokenKey | CustomToken, amount: string, isTokenA: boolean) => {
    const tokenAddress = getTokenAddress(token);
    const tokenABI = getTokenABI(token);
    
    if (tokenAddress === '0x0000000000000000000000000000000000000000' || !tokenABI) {
      // Native token doesn't need approval
      return;
    }

    const poolAddr = poolAddress || CONTRACTS.KANARI_USDK_POOL; // Fallback to default pool
    
    writeContract({
      address: tokenAddress as Address,
      abi: tokenABI,
      functionName: 'approve',
      args: [poolAddr as Address, parseUnits(amount, getTokenDecimals(token))],
    });
  };

  // Create new pool for custom tokens
  const handleCreatePool = async () => {
    if (!poolExists && poolExists !== null) {
      setIsCreatingPool(true);
      // In a real implementation, you would call a factory contract here
      // For now, we'll just show a message
      alert('Pool creation functionality would be implemented here with a Factory contract');
      setIsCreatingPool(false);
    }
  };

  // Swap tokens A and B
  const handleSwapTokens = () => {
    const tempToken = tokenA;
    const tempAmount = amountA;
    setTokenA(tokenB);
    setTokenB(tempToken);
    setAmountA(amountB);
    setAmountB(tempAmount);
  };

  const isNativeToken = (token: TokenKey | CustomToken): boolean => {
    return typeof token === 'string' && token === 'NATIVE';
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg p-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Add Liquidity</h2>
        <p className="text-gray-600 mt-1">Add tokens to liquidity pools to earn fees</p>
      </div>

      {/* Pool Status */}
      {poolExists === false && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center">
            <span className="text-yellow-600 mr-2">⚠️</span>
            <div>
              <p className="text-sm font-medium text-yellow-800">Pool doesn't exist</p>
              <p className="text-xs text-yellow-700">You can create a new pool for these tokens</p>
            </div>
          </div>
          <button
            onClick={handleCreatePool}
            disabled={isCreatingPool}
            className="mt-2 w-full bg-yellow-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-yellow-700 disabled:opacity-50"
          >
            {isCreatingPool ? 'Creating Pool...' : 'Create New Pool'}
          </button>
        </div>
      )}

      {poolExists === true && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center">
            <span className="text-green-600 mr-2">✅</span>
            <div>
              <p className="text-sm font-medium text-green-800">Pool found</p>
              <p className="text-xs text-green-700 font-mono">{poolAddress}</p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* Token A Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">First Token</label>
          <div className="relative">
            <input
              type="number"
              value={amountA}
              onChange={(e) => setAmountA(e.target.value)}
              placeholder="0.0"
              className="w-full p-4 pr-32 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
            <button
              onClick={() => setShowTokenSelectorA(true)}
              className="absolute right-2 top-2 bottom-2 px-3 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <span className="font-medium">{getTokenSymbol(tokenA)}</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>Balance: {parseFloat(getFormattedBalance(tokenA, true)).toFixed(6)}</span>
            <button
              onClick={() => setAmountA(getFormattedBalance(tokenA, true))}
              className="text-orange-600 hover:text-orange-800 font-medium"
            >
              MAX
            </button>
          </div>
        </div>

        {/* Swap Button */}
        <div className="flex justify-center">
          <button
            onClick={handleSwapTokens}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </button>
        </div>

        {/* Token B Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Second Token</label>
          <div className="relative">
            <input
              type="number"
              value={amountB}
              onChange={(e) => setAmountB(e.target.value)}
              placeholder="0.0"
              className="w-full p-4 pr-32 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
            <button
              onClick={() => setShowTokenSelectorB(true)}
              className="absolute right-2 top-2 bottom-2 px-3 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <span className="font-medium">{getTokenSymbol(tokenB)}</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>Balance: {parseFloat(getFormattedBalance(tokenB, false)).toFixed(6)}</span>
            <button
              onClick={() => setAmountB(getFormattedBalance(tokenB, false))}
              className="text-orange-600 hover:text-orange-800 font-medium"
            >
              MAX
            </button>
          </div>
        </div>

        {/* Slippage Settings */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <label className="block text-sm font-medium text-gray-700 mb-2">Slippage Tolerance</label>
          <div className="flex space-x-2">
            {['0.1', '0.5', '1.0'].map((value) => (
              <button
                key={value}
                onClick={() => setSlippage(value)}
                className={`px-3 py-1 rounded text-sm ${
                  slippage === value
                    ? 'bg-orange-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {value}%
              </button>
            ))}
            <input
              type="number"
              value={slippage}
              onChange={(e) => setSlippage(e.target.value)}
              placeholder="Custom"
              className="flex-1 px-3 py-1 border border-gray-300 rounded text-sm"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {!isNativeToken(tokenA) && (
            <button
              onClick={() => handleApprove(tokenA, amountA, true)}
              disabled={!amountA || isPending || isConfirming}
              className="w-full bg-orange-100 text-orange-700 py-3 px-4 rounded-lg font-medium hover:bg-orange-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending || isConfirming ? 'Approving...' : `Approve ${getTokenSymbol(tokenA)}`}
            </button>
          )}
          
          {!isNativeToken(tokenB) && (
            <button
              onClick={() => handleApprove(tokenB, amountB, false)}
              disabled={!amountB || isPending || isConfirming}
              className="w-full bg-orange-100 text-orange-700 py-3 px-4 rounded-lg font-medium hover:bg-orange-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending || isConfirming ? 'Approving...' : `Approve ${getTokenSymbol(tokenB)}`}
            </button>
          )}
          
          <button
            onClick={() => {/* Add liquidity logic */}}
            disabled={!amountA || !amountB || isPending || isConfirming || poolExists === false}
            className="w-full bg-orange-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending || isConfirming ? 'Adding Liquidity...' : 'Add Liquidity'}
          </button>
        </div>

        {/* Transaction Status */}
        {hash && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              {isConfirming && 'Waiting for confirmation...'}
              {isConfirmed && 'Transaction confirmed!'}
            </p>
            <p className="text-xs text-blue-600 font-mono break-all mt-1">
              {hash}
            </p>
          </div>
        )}
      </div>

      {/* Token Selectors */}
      {showTokenSelectorA && (
        <TokenSelector
          selectedToken={tokenA}
          onTokenSelect={setTokenA}
          onClose={() => setShowTokenSelectorA(false)}
          excludeToken={tokenB}
          title="Select First Token"
        />
      )}

      {showTokenSelectorB && (
        <TokenSelector
          selectedToken={tokenB}
          onTokenSelect={setTokenB}
          onClose={() => setShowTokenSelectorB(false)}
          excludeToken={tokenA}
          title="Select Second Token"
        />
      )}
    </div>
  );
}
