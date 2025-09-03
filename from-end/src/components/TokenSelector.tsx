'use client';

import React, { useState, useEffect } from 'react';
import { useReadContract } from 'wagmi';
import { Address, isAddress } from 'viem';
import { TOKENS, TokenKey } from '@/lib/contracts';

// ERC20 ABI for reading token info
const ERC20_ABI = [
  {
    "constant": true,
    "inputs": [],
    "name": "name",
    "outputs": [{"name": "", "type": "string"}],
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

export interface CustomToken {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  isCustom: true;
}

export interface TokenOption {
  key: TokenKey | 'CUSTOM';
  symbol: string;
  name: string;
  address?: string;
  decimals?: number;
  isCustom?: boolean;
}

interface TokenSelectorProps {
  selectedToken: TokenKey | CustomToken;
  onTokenSelect: (token: TokenKey | CustomToken) => void;
  onClose: () => void;
  excludeToken?: TokenKey | CustomToken;
  title?: string;
}

export default function TokenSelector({ 
  selectedToken, 
  onTokenSelect, 
  onClose, 
  excludeToken,
  title = "Select Token"
}: TokenSelectorProps) {
  const [customAddress, setCustomAddress] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customTokenInfo, setCustomTokenInfo] = useState<CustomToken | null>(null);

  // Read custom token info
  const { data: tokenName } = useReadContract({
    address: isAddress(customAddress) ? customAddress as Address : undefined,
    abi: ERC20_ABI,
    functionName: 'name',
    query: { enabled: isAddress(customAddress) }
  });

  const { data: tokenSymbol } = useReadContract({
    address: isAddress(customAddress) ? customAddress as Address : undefined,
    abi: ERC20_ABI,
    functionName: 'symbol',
    query: { enabled: isAddress(customAddress) }
  });

  const { data: tokenDecimals } = useReadContract({
    address: isAddress(customAddress) ? customAddress as Address : undefined,
    abi: ERC20_ABI,
    functionName: 'decimals',
    query: { enabled: isAddress(customAddress) }
  });

  // Update custom token info when contract data changes
  useEffect(() => {
    if (tokenName && tokenSymbol && tokenDecimals !== undefined && isAddress(customAddress)) {
      const customToken: CustomToken = {
        address: customAddress,
        symbol: String(tokenSymbol),
        name: String(tokenName),
        decimals: Number(tokenDecimals),
        isCustom: true
      };
      setCustomTokenInfo(customToken);
    } else {
      setCustomTokenInfo(null);
    }
  }, [tokenName, tokenSymbol, tokenDecimals, customAddress]);

  const predefinedTokens: TokenOption[] = [
    { key: 'KANARI', symbol: 'KANARI', name: 'Kanari Token', address: TOKENS.KANARI.address, decimals: TOKENS.KANARI.decimals },
    { key: 'USDK', symbol: 'USDK', name: 'USD Kanari', address: TOKENS.USDK.address, decimals: TOKENS.USDK.decimals },
    { key: 'NATIVE', symbol: 'sBTC', name: 'Native sBTC', decimals: 18 }
  ];

  const isTokenExcluded = (token: TokenOption | CustomToken) => {
    if (!excludeToken) return false;
    
    if (typeof excludeToken === 'string') {
      if ('key' in token) {
        return token.key === excludeToken;
      } else {
        return token.symbol === excludeToken;
      }
    } else {
      return 'address' in token && 'address' in excludeToken && token.address === excludeToken.address;
    }
  };

  const handleTokenSelect = (token: TokenOption) => {
    if (token.key === 'CUSTOM') {
      setShowCustomInput(true);
      return;
    }
    onTokenSelect(token.key as TokenKey);
    onClose();
  };

  const handleCustomTokenSelect = () => {
    if (customTokenInfo) {
      onTokenSelect(customTokenInfo);
      onClose();
    }
  };

  const handleAddressChange = (value: string) => {
    setCustomAddress(value);
    if (!isAddress(value)) {
      setCustomTokenInfo(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {!showCustomInput ? (
          <div className="space-y-2">
            {/* Predefined Tokens */}
            {predefinedTokens.map((token) => (
              <button
                key={token.key}
                onClick={() => handleTokenSelect(token)}
                disabled={isTokenExcluded(token)}
                className={`w-full p-3 rounded-lg border text-left hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed ${
                  isTokenExcluded(token) ? 'bg-gray-100' : 'bg-white hover:border-orange-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{token.symbol}</div>
                    <div className="text-sm text-gray-500">{token.name}</div>
                  </div>
                  {token.address && (
                    <div className="text-xs text-gray-400 font-mono">
                      {token.address.slice(0, 6)}...{token.address.slice(-4)}
                    </div>
                  )}
                </div>
              </button>
            ))}

            {/* Custom Token Option */}
            <button
              onClick={() => setShowCustomInput(true)}
              className="w-full p-3 rounded-lg border-2 border-dashed border-gray-300 text-center hover:border-orange-300 hover:bg-orange-50"
            >
              <div className="text-orange-600 font-medium">+ Add Custom Token</div>
              <div className="text-sm text-gray-500">Enter contract address</div>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <button
              onClick={() => setShowCustomInput(false)}
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to token list
            </button>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Token Contract Address
              </label>
              <input
                type="text"
                value={customAddress}
                onChange={(e) => handleAddressChange(e.target.value)}
                placeholder="0x..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
              {customAddress && !isAddress(customAddress) && (
                <p className="text-sm text-red-500 mt-1">Invalid address format</p>
              )}
            </div>

            {customTokenInfo && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Token Information</h4>
                <div className="space-y-1 text-sm">
                  <div><span className="text-gray-500">Symbol:</span> {customTokenInfo.symbol}</div>
                  <div><span className="text-gray-500">Name:</span> {customTokenInfo.name}</div>
                  <div><span className="text-gray-500">Decimals:</span> {customTokenInfo.decimals}</div>
                  <div className="text-xs text-gray-400 font-mono break-all">
                    <span className="text-gray-500">Address:</span> {customTokenInfo.address}
                  </div>
                </div>
                
                <button
                  onClick={handleCustomTokenSelect}
                  className="w-full mt-3 bg-orange-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-orange-700"
                >
                  Select {customTokenInfo.symbol}
                </button>
              </div>
            )}

            {isAddress(customAddress) && !customTokenInfo && (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
                <p className="text-sm text-gray-500 mt-2">Loading token information...</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
