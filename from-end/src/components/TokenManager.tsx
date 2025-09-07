"use client";

import React, { useState, useEffect } from 'react';
import { useReadContract } from 'wagmi';
import { Address, isAddress } from 'viem';

// Basic ERC20 ABI for token validation
const ERC20_ABI = [
  {
    "type": "function",
    "name": "name",
    "inputs": [],
    "outputs": [{"type": "string", "name": ""}],
    "stateMutability": "view"
  },
  {
    "type": "function", 
    "name": "symbol",
    "inputs": [],
    "outputs": [{"type": "string", "name": ""}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "decimals", 
    "inputs": [],
    "outputs": [{"type": "uint8", "name": ""}],
    "stateMutability": "view"
  }
] as const;

export interface CustomToken {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  icon?: string;
  color: string;
}

interface TokenManagerProps {
  onTokenAdded?: (token: CustomToken) => void;
  onClose?: () => void;
}

export default function TokenManager({ onTokenAdded, onClose }: TokenManagerProps) {
  const [tokenAddress, setTokenAddress] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [customTokens, setCustomTokens] = useState<CustomToken[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);

  // Token validation using contract reads
  const { data: tokenName, isError: nameError } = useReadContract({
    address: isAddress(tokenAddress) ? tokenAddress as Address : undefined,
    abi: ERC20_ABI,
    functionName: 'name',
    query: { enabled: isAddress(tokenAddress) }
  });

  const { data: tokenSymbol, isError: symbolError } = useReadContract({
    address: isAddress(tokenAddress) ? tokenAddress as Address : undefined,
    abi: ERC20_ABI,
    functionName: 'symbol',
    query: { enabled: isAddress(tokenAddress) }
  });

  const { data: tokenDecimals, isError: decimalsError } = useReadContract({
    address: isAddress(tokenAddress) ? tokenAddress as Address : undefined,
    abi: ERC20_ABI,
    functionName: 'decimals',
    query: { enabled: isAddress(tokenAddress) }
  });

  // Load custom tokens from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('customTokens');
    if (stored) {
      try {
        setCustomTokens(JSON.parse(stored));
      } catch (e) {
        console.error('Error loading custom tokens:', e);
      }
    }
    const handler = () => {
      const s = localStorage.getItem('customTokens');
      if (s) {
        try {
          setCustomTokens(JSON.parse(s));
        } catch (e) {
          console.error('Error loading custom tokens:', e);
        }
      } else {
        setCustomTokens([]);
      }
    };

    window.addEventListener('customTokensUpdated', handler);
    return () => window.removeEventListener('customTokensUpdated', handler);
  }, []);

  // Save custom tokens to localStorage
  const saveCustomTokens = (tokens: CustomToken[]) => {
    localStorage.setItem('customTokens', JSON.stringify(tokens));
    setCustomTokens(tokens);
  };

  // Notify other components that custom tokens updated
  const notifyCustomTokensUpdated = () => {
    try {
      // dispatch a simple event that other hooks/components can listen to
      window.dispatchEvent(new Event('customTokensUpdated'));
    } catch (e) {
      // ignore
    }
  };

  // Generate random color for token
  const generateTokenColor = () => {
    const colors = [
      'bg-purple-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
      'bg-red-500', 'bg-indigo-500', 'bg-pink-500', 'bg-teal-500'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  // Add token
  const handleAddToken = async () => {
    if (!isAddress(tokenAddress)) {
      setValidationError('Please enter a valid contract address');
      return;
    }

    if (nameError || symbolError || decimalsError) {
      setValidationError('Invalid token contract - cannot read token details');
      return;
    }

    if (!tokenName || !tokenSymbol || tokenDecimals === undefined) {
      setValidationError('Token contract validation in progress...');
      return;
    }

    // Check if token already exists
    const exists = customTokens.find(t => t.address.toLowerCase() === tokenAddress.toLowerCase());
    if (exists) {
      setValidationError('Token already added');
      return;
    }

    const newToken: CustomToken = {
      address: tokenAddress,
      name: tokenName as string,
      symbol: tokenSymbol as string,
      decimals: tokenDecimals as number,
      icon: (tokenSymbol as string).charAt(0).toUpperCase(),
      color: generateTokenColor()
    };

    const updatedTokens = [...customTokens, newToken];
  saveCustomTokens(updatedTokens);
  notifyCustomTokensUpdated();
    
    if (onTokenAdded) {
      onTokenAdded(newToken);
    }

    // Reset form
    setTokenAddress('');
    setValidationError('');
    setShowAddForm(false);
  };

  // Remove token
  const handleRemoveToken = (address: string) => {
    const updatedTokens = customTokens.filter(t => t.address.toLowerCase() !== address.toLowerCase());
  saveCustomTokens(updatedTokens);
  notifyCustomTokensUpdated();
  };

  // Token validation effect
  useEffect(() => {
    if (tokenAddress && isAddress(tokenAddress)) {
      setIsValidating(true);
      setValidationError('');
      
      const timer = setTimeout(() => {
        if (nameError || symbolError || decimalsError) {
          setValidationError('Invalid token contract');
          setIsValidating(false);
        } else if (tokenName && tokenSymbol && tokenDecimals !== undefined) {
          setValidationError('');
          setIsValidating(false);
        }
      }, 1000);

      return () => clearTimeout(timer);
    } else if (tokenAddress) {
      setValidationError('Invalid address format');
      setIsValidating(false);
    } else {
      setValidationError('');
      setIsValidating(false);
    }
  }, [tokenAddress, tokenName, tokenSymbol, tokenDecimals, nameError, symbolError, decimalsError]);

  return (
    <div className="bg-[var(--surface)] rounded-2xl border border-white/10 p-6 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-[var(--text-color)]">Token Manager</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-[var(--muted-text)] hover:text-[var(--text-color)] transition"
          >
            ✕
          </button>
        )}
      </div>

      {/* Add Token Button */}
      {!showAddForm && (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full mb-4 py-3 px-4 bg-[var(--primary-color)] text-white font-medium rounded-xl hover:bg-[var(--primary-color)]/80 transition flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Custom Token
        </button>
      )}

      {/* Add Token Form */}
      {showAddForm && (
        <div className="mb-6 p-4 bg-[var(--background)]/50 rounded-xl border border-white/5">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--muted-text)] mb-2">
                Token Contract Address
              </label>
              <input
                type="text"
                value={tokenAddress}
                onChange={(e) => setTokenAddress(e.target.value)}
                placeholder="0x..."
                className="w-full px-4 py-3 bg-[var(--background)]/50 rounded-xl border border-white/5 focus:border-[var(--primary-color)]/50 outline-none text-[var(--text-color)] placeholder-[var(--muted-text)]"
              />
              {validationError && (
                <p className="mt-2 text-sm text-red-500">{validationError}</p>
              )}
              {isValidating && (
                <p className="mt-2 text-sm text-[var(--muted-text)]">Validating token...</p>
              )}
            </div>

            {/* Token Preview */}
            {tokenName && tokenSymbol && tokenDecimals !== undefined && !validationError && (
              <div className="p-3 bg-[var(--background)]/30 rounded-lg border border-white/5">
                <h4 className="text-sm font-medium text-[var(--text-color)] mb-2">Token Preview</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[var(--muted-text)]">Name:</span>
                    <span className="text-[var(--text-color)]">{tokenName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--muted-text)]">Symbol:</span>
                    <span className="text-[var(--text-color)]">{tokenSymbol}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--muted-text)]">Decimals:</span>
                    <span className="text-[var(--text-color)]">{tokenDecimals}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleAddToken}
                disabled={!tokenName || !tokenSymbol || tokenDecimals === undefined || !!validationError || isValidating}
                className="flex-1 py-2 px-4 bg-green-500 text-white font-medium rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Add Token
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setTokenAddress('');
                  setValidationError('');
                }}
                className="flex-1 py-2 px-4 bg-gray-500 text-white font-medium rounded-lg hover:bg-gray-600 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Tokens List */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-[var(--text-color)]">Custom Tokens</h3>
        
        {customTokens.length === 0 ? (
          <div className="text-center py-8 text-[var(--muted-text)]">
            <div className="w-16 h-16 mx-auto mb-4 bg-[var(--background)]/50 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <p>No custom tokens added yet</p>
            <p className="text-sm mt-1">Add custom tokens to trade on the DEX</p>
          </div>
        ) : (
          <div className="space-y-2">
            {customTokens.map((token) => (
              <div
                key={token.address}
                className="flex items-center justify-between p-3 bg-[var(--background)]/30 rounded-xl border border-white/5 hover:bg-[var(--background)]/50 transition"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full ${token.color} flex items-center justify-center text-white font-bold`}>
                    {token.icon}
                  </div>
                  <div>
                    <div className="font-medium text-[var(--text-color)]">{token.symbol}</div>
                    <div className="text-sm text-[var(--muted-text)]">{token.name}</div>
                    <div className="text-xs text-[var(--muted-text)] font-mono">
                      {token.address.slice(0, 6)}...{token.address.slice(-4)}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveToken(token.address)}
                  className="text-red-500 hover:text-red-400 transition p-2"
                  title="Remove token"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Hook to get all tokens (built-in + custom)
export function useAllTokens() {
  const [customTokens, setCustomTokens] = useState<CustomToken[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('customTokens');
    if (stored) {
      try {
        setCustomTokens(JSON.parse(stored));
      } catch (e) {
        console.error('Error loading custom tokens:', e);
      }
    }
  }, []);

  return { customTokens };
}
