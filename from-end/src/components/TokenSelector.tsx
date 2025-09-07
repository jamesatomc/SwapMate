"use client";

import React, { useState, useEffect } from 'react';
import { TOKENS, TokenKey } from '@/lib/contracts';
import { CustomToken, useAllTokens } from './TokenManager';

// Extended token key type that includes custom token addresses
export type ExtendedTokenKey = TokenKey | string;

export interface ExtendedToken {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  icon: string;
  color: string;
}

interface TokenSelectorProps {
  selectedToken?: string; // Can be TokenKey or custom token address
  onTokenSelect: (tokenKey: string, token: ExtendedToken) => void;
  excludeTokens?: string[];
  className?: string;
}

export default function TokenSelector({ 
  selectedToken, 
  onTokenSelect, 
  excludeTokens = [],
  className = ""
}: TokenSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { customTokens } = useAllTokens();

  // Combine built-in tokens with custom tokens
  const allTokens: Record<string, ExtendedToken> = {
    ...Object.fromEntries(
      Object.entries(TOKENS).map(([key, token]) => [
        key,
        {
          address: token.address,
          name: token.name,
          symbol: token.symbol,
          decimals: token.decimals,
          icon: token.icon,
          color: token.color
        }
      ])
    ),
    ...Object.fromEntries(
      customTokens.map(token => [
        token.address, // Use address as key for custom tokens
        {
          address: token.address,
          name: token.name,
          symbol: token.symbol,
          decimals: token.decimals,
          icon: token.icon || token.symbol.charAt(0).toUpperCase(),
          color: token.color
        }
      ])
    )
  };

  // Filter tokens based on search and exclusions
  const filteredTokens = Object.entries(allTokens).filter(([key, token]) => {
    const isExcluded = excludeTokens.includes(key);
    const matchesSearch = !searchQuery || 
      token.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      token.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      token.address.toLowerCase().includes(searchQuery.toLowerCase());
    
    return !isExcluded && matchesSearch;
  });

  // Get current selected token
  const currentToken = selectedToken ? allTokens[selectedToken] : null;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (isOpen && !target.closest('.token-selector')) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleTokenSelect = (tokenKey: string, token: ExtendedToken) => {
    onTokenSelect(tokenKey, token);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div className={`relative token-selector ${className}`}>
      {/* Token Display/Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-[var(--background)]/50 rounded-xl border border-white/5 hover:bg-[var(--background)]/80 transition"
      >
        {currentToken ? (
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full ${currentToken.color} flex items-center justify-center text-white font-bold text-sm`}>
              {currentToken.icon}
            </div>
            <div className="text-left">
              <div className="font-medium text-[var(--text-color)]">{currentToken.symbol}</div>
              <div className="text-sm text-[var(--muted-text)]">{currentToken.name}</div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[var(--muted-text)]/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-[var(--muted-text)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <div className="text-left">
              <div className="font-medium text-[var(--muted-text)]">Select Token</div>
              <div className="text-sm text-[var(--muted-text)]">Choose a token</div>
            </div>
          </div>
        )}
        <div className="text-[var(--muted-text)]">
          {isOpen ? '↑' : '↓'}
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--surface)] border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden">
          {/* Search */}
          <div className="p-4 border-b border-white/5">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tokens..."
              className="w-full px-3 py-2 bg-[var(--background)]/50 rounded-lg text-sm outline-none border border-white/5 focus:border-[var(--primary-color)]/50 text-[var(--text-color)] placeholder-[var(--muted-text)]"
              autoFocus
            />
          </div>

          {/* Token List */}
          <div className="max-h-64 overflow-y-auto">
            {filteredTokens.length === 0 ? (
              <div className="p-4 text-center text-[var(--muted-text)]">
                No tokens found
              </div>
            ) : (
              filteredTokens.map(([key, token]) => (
                <button
                  key={key}
                  onClick={() => handleTokenSelect(key, token)}
                  className={`w-full flex items-center gap-3 p-4 hover:bg-[var(--background)]/30 transition ${
                    selectedToken === key ? 'bg-[var(--primary-color)]/10' : ''
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full ${token.color} flex items-center justify-center text-white font-bold text-sm`}>
                    {token.icon}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-medium text-[var(--text-color)]">{token.symbol}</div>
                    <div className="text-sm text-[var(--muted-text)]">{token.name}</div>
                    {customTokens.some(ct => ct.address === token.address) && (
                      <div className="text-xs text-[var(--muted-text)] font-mono">
                        {token.address.slice(0, 6)}...{token.address.slice(-4)}
                      </div>
                    )}
                  </div>
                  {selectedToken === key && (
                    <div className="text-[var(--primary-color)]">✓</div>
                  )}
                </button>
              ))
            )}
          </div>

          {/* Add Custom Token Link */}
          <div className="p-3 border-t border-white/5">
            <div className="text-xs text-[var(--muted-text)] text-center">
              Missing a token? Use the Token Manager to add custom tokens
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper function to get token info by key or address
export function getTokenInfo(tokenKeyOrAddress: string, customTokens: CustomToken[]): ExtendedToken | null {
  // Check built-in tokens first
  if (TOKENS[tokenKeyOrAddress as TokenKey]) {
    const token = TOKENS[tokenKeyOrAddress as TokenKey];
    return {
      address: token.address,
      name: token.name,
      symbol: token.symbol,
      decimals: token.decimals,
      icon: token.icon,
      color: token.color
    };
  }

  // Check custom tokens
  const customToken = customTokens.find(token => 
    token.address.toLowerCase() === tokenKeyOrAddress.toLowerCase()
  );
  
  if (customToken) {
    return {
      address: customToken.address,
      name: customToken.name,
      symbol: customToken.symbol,
      decimals: customToken.decimals,
      icon: customToken.icon || customToken.symbol.charAt(0).toUpperCase(),
      color: customToken.color
    };
  }

  return null;
}
