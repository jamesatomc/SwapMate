"use client";

import React, { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import SwapPage from './SwapPage';
import AddLiquidityPage from './AddLiquidityPage';
import RemoveLiquidityPage from './RemoveLiquidityPage';
import MintPage from './MintPage';



type Page = 'swap' | 'add' | 'remove' | 'mint';

export default function MainDEX() {
  const [currentPage, setCurrentPage] = useState<Page>('swap');

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Navigation Bar */}
      <nav className="bg-slate-800 border-b border-slate-700 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="text-2xl font-bold text-white flex items-center gap-2">
            🦄 <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">SwapMate</span>
          </div>
          
          <ul className="flex items-center space-x-1">
            <li>
              <button 
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  currentPage === 'swap' 
                    ? 'bg-blue-600 text-white shadow-lg' 
                    : 'text-gray-300 hover:text-white hover:bg-slate-700'
                }`}
                onClick={() => setCurrentPage('swap')}
              >
                <span className="text-lg">🔄</span>
                Swap
              </button>
            </li>
            <li>
              <button 
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  currentPage === 'add' 
                    ? 'bg-blue-600 text-white shadow-lg' 
                    : 'text-gray-300 hover:text-white hover:bg-slate-700'
                }`}
                onClick={() => setCurrentPage('add')}
              >
                <span className="text-lg">➕</span>
                Add Liquidity
              </button>
            </li>
            <li>
              <button 
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  currentPage === 'remove' 
                    ? 'bg-blue-600 text-white shadow-lg' 
                    : 'text-gray-300 hover:text-white hover:bg-slate-700'
                }`}
                onClick={() => setCurrentPage('remove')}
              >
                <span className="text-lg">➖</span>
                Remove Liquidity
              </button>
            </li>
            <li>
              <button 
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  currentPage === 'mint' 
                    ? 'bg-blue-600 text-white shadow-lg' 
                    : 'text-gray-300 hover:text-white hover:bg-slate-700'
                }`}
                onClick={() => setCurrentPage('mint')}
              >
                <span className="text-lg">💰</span>
                Mint
              </button>
            </li>
          </ul>
          
          <div className="ml-4">
            <ConnectButton />
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
