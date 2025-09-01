"use client";

import React, { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
// import SwapPage from './SwapPage';
import SwapPage from './SwapPage';
import AddLiquidityPage from './AddLiquidityPage';
// import RemoveLiquidityPage from './RemoveLiquidityPage';
import MintPage from './MintPage';
import RemoveLiquidityPage from './RemoveLiquidityPage';



type Page = 'swap' | 'add' | 'remove' | 'mint';

export default function MainDEX() {
  const [currentPage, setCurrentPage] = useState<Page>('swap');

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Navigation Bar */}
      <nav className="bg-[var(--surface)] border-b border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="text-2xl font-bold text-[var(--text-color)] flex items-center gap-2">
            🦄 <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-600">SwapMate</span>
          </div>

          <ul className="flex items-center space-x-1">
            <li>
              <button
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${currentPage === 'swap'
                    ? 'bg-[var(--primary-color)] text-white shadow'
                    : 'text-[var(--text-color)] hover:text-[var(--text-color)] hover:bg-[var(--surface-hover)]'
                  }`}
                onClick={() => setCurrentPage('swap')}
              >
                <span className="text-lg">🔄</span>
                Swap
              </button>
            </li>
            <li>
              <button
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${currentPage === 'add'
                    ? 'bg-[var(--primary-color)] text-white shadow'
                    : 'text-[var(--text-color)] hover:text-[var(--text-color)] hover:bg-[var(--surface-hover)]'
                  }`}
                onClick={() => setCurrentPage('add')}
              >
                <span className="text-lg">➕</span>
                Add Liquidity
              </button>
            </li>
            <li>
              <button
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${currentPage === 'remove'
                    ? 'bg-[var(--primary-color)] text-white shadow'
                    : 'text-[var(--text-color)] hover:text-[var(--text-color)] hover:bg-[var(--surface-hover)]'
                  }`}
                onClick={() => setCurrentPage('remove')}
              >
                <span className="text-lg">➖</span>
                Remove Liquidity
              </button>
            </li>
            <li>
              <button
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${currentPage === 'mint'
                    ? 'bg-[var(--primary-color)] text-white shadow'
                    : 'text-[var(--text-color)] hover:text-[var(--text-color)] hover:bg-[var(--surface-hover)]'
                  }`}
                onClick={() => setCurrentPage('mint')}
              >
                <span className="text-lg">💰</span>
                Mint
              </button>
            </li>
          </ul>

          <div className="ml-4">
            <div className="rounded-md bg-[var(--surface)] p-1">
              <ConnectButton />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
  <main className="max-w-4xl mx-auto px-4 py-8">
        {currentPage === 'swap' && <SwapPage />}
        {currentPage === 'add' && <AddLiquidityPage />}
  {currentPage === 'remove' && <RemoveLiquidityPage />}
        {currentPage === 'mint' && <MintPage />}
      </main>
    </div>
  );
}
