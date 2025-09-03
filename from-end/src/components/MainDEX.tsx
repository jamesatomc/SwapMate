"use client";

import React, { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import SwapPage from './SwapPage';
import AddLiquidityPage from './AddLiquidityPage';
import RemoveLiquidityPage from './RemoveLiquidityPage';
import MintPage from './MintPage';
import FarmingPage from './FarmingPage';
import EnhancedSwapPage from './EnhancedSwapPage';
import EnhancedAddLiquidityPage from './EnhancedAddLiquidityPage';
import EnhancedRemoveLiquidityPage from './EnhancedRemoveLiquidityPage';

type Page = 'swap' | 'add' | 'remove' | 'mint' | 'farm';

export default function MainDEX() {
  const [currentPage, setCurrentPage] = useState<Page>('swap');
  const [enhancedMode, setEnhancedMode] = useState(true); // Default to enhanced mode
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header + hero */}
      <header className="px-4 py-4 sticky top-0 z-40 backdrop-blur bg-[var(--background)]/60 border-b border-white/5">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-start md:items-center gap-3 w-full md:w-auto">
            <div className="w-10 h-10 rounded-full bg-orange-400 flex items-center justify-center text-white font-bold shadow">K</div>
            <div className="flex-1">
              <div className="flex items-center justify-between gap-3">
                <div className="text-lg font-semibold text-[var(--text-color)]">Kanari</div>
                {/* Enhanced Mode Toggle */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Pro</span>
                  <button
                    onClick={() => setEnhancedMode(!enhancedMode)}
                    aria-pressed={enhancedMode}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${enhancedMode ? 'bg-orange-600' : 'bg-gray-300'}`}
                  >
                    <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${enhancedMode ? 'translate-x-5' : 'translate-x-1'}`} />
                  </button>
                </div>
                {/* on small screens place connect and menu toggle to the right inside same row */}
                <div className="md:hidden flex items-center gap-2">
                  <div className="rounded-lg bg-[var(--surface)] p-1 border border-white/6 shadow-sm">
                    <ConnectButton />
                  </div>
                  <button
                    aria-label="Open menu"
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="p-2 rounded-md bg-[var(--surface)]/60 border border-white/6"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none"><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                </div>
              </div>
              
            </div>
          </div>

          <div className="hidden md:flex items-center gap-4 md:ml-auto">
            <div className="text-sm text-[var(--muted-text,#9ca3af)]">Pool TVL</div>
            <div className="text-lg font-semibold">$0</div>
            <div className="rounded-lg bg-[var(--surface)] p-1 border border-white/6 shadow-sm">
              <ConnectButton />
            </div>
          </div>
        </div>

        {/* Mobile slide-down menu (duplicate of tabs for quick access) */}
        {menuOpen && (
          <nav className="md:hidden max-w-4xl mx-auto mt-3 px-4">
            <div className="bg-[var(--surface)] rounded-lg border border-white/6 p-3 shadow-sm space-y-2">
              {(['swap','add','remove','mint','farm'] as Page[]).map((p) => (
                <button
                  key={p}
                  onClick={() => { setCurrentPage(p); setMenuOpen(false); }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium ${currentPage === p ? 'bg-[var(--primary-color)] text-white' : 'text-[var(--text-color)] hover:bg-[var(--surface)]/60'}`}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </nav>
        )}

        <main className="max-w-4xl mx-auto px-4 py-6 w-full">
          {/* Tabs: horizontal scroll on small screens for touch */}
          <div className="mt-4">
            <div className="flex items-center gap-3 mb-4 overflow-x-auto no-scrollbar -mx-4 px-4">
              <button
                className={`min-w-[96px] flex-0 flex items-center justify-center whitespace-nowrap px-4 py-3 rounded-lg text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2 ${currentPage === 'swap' ? 'bg-[var(--primary-color)] text-white shadow' : 'text-[var(--text-color)] bg-[var(--surface)]/40 hover:bg-[var(--surface)]/60'}`}
                onClick={() => setCurrentPage('swap')}
                aria-pressed={currentPage === 'swap'}
              >
                <span className="inline-flex items-center gap-2">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <span className="hidden sm:inline">Swap</span>
                  <span className="sm:hidden">Swap</span>
                </span>
              </button>

              <button
                className={`min-w-[96px] flex-0 flex items-center justify-center whitespace-nowrap px-4 py-3 rounded-lg text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2 ${currentPage === 'add' ? 'bg-[var(--primary-color)] text-white shadow' : 'text-[var(--text-color)] bg-[var(--surface)]/40 hover:bg-[var(--surface)]/60'}`}
                onClick={() => setCurrentPage('add')}
                aria-pressed={currentPage === 'add'}
              >
                <span className="inline-flex items-center gap-2">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <span className="hidden sm:inline">Add</span>
                  <span className="sm:hidden">Add</span>
                </span>
              </button>

              <button
                className={`min-w-[96px] flex-0 flex items-center justify-center whitespace-nowrap px-4 py-3 rounded-lg text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2 ${currentPage === 'remove' ? 'bg-[var(--primary-color)] text-white shadow' : 'text-[var(--text-color)] bg-[var(--surface)]/40 hover:bg-[var(--surface)]/60'}`}
                onClick={() => setCurrentPage('remove')}
                aria-pressed={currentPage === 'remove'}
              >
                <span className="inline-flex items-center gap-2">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 12H4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <span className="hidden sm:inline">Remove</span>
                  <span className="sm:hidden">Remove</span>
                </span>
              </button>

              <button
                className={`min-w-[96px] flex-0 flex items-center justify-center whitespace-nowrap px-4 py-3 rounded-lg text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2 ${currentPage === 'mint' ? 'bg-[var(--primary-color)] text-white shadow' : 'text-[var(--text-color)] bg-[var(--surface)]/40 hover:bg-[var(--surface)]/60'}`}
                onClick={() => setCurrentPage('mint')}
                aria-pressed={currentPage === 'mint'}
              >
                <span className="inline-flex items-center gap-2">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 5v14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <span className="hidden sm:inline">Mint</span>
                  <span className="sm:hidden">Mint</span>
                </span>
              </button>

              <button
                className={`min-w-[96px] flex-0 flex items-center justify-center whitespace-nowrap px-4 py-3 rounded-lg text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2 ${currentPage === 'farm' ? 'bg-[var(--primary-color)] text-white shadow' : 'text-[var(--text-color)] bg-[var(--surface)]/40 hover:bg-[var(--surface)]/60'}`}
                onClick={() => setCurrentPage('farm')}
                aria-pressed={currentPage === 'farm'}
              >
                <span className="inline-flex items-center gap-2">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <span className="hidden sm:inline">Farm</span>
                  <span className="sm:hidden">Farm</span>
                </span>
              </button>
            </div>

            {/* Enhanced Mode Info */}
            {enhancedMode && (
              <div className="mt-4 p-3 bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-orange-600">🚀</span>
                  <div className="text-sm">
                    <p className="font-medium text-orange-800">Enhanced Mode Active</p>
                    <p className="text-orange-700">Add any token by contract address - like Uniswap!</p>
                  </div>
                </div>
              </div>
            )}

            <div>
              {currentPage === 'swap' && (enhancedMode ? <EnhancedSwapPage /> : <SwapPage />)}
              {currentPage === 'add' && (enhancedMode ? <EnhancedAddLiquidityPage /> : <AddLiquidityPage />)}
              {currentPage === 'remove' && (enhancedMode ? <EnhancedRemoveLiquidityPage /> : <RemoveLiquidityPage />)}
              {currentPage === 'mint' && <MintPage />}
              {currentPage === 'farm' && <FarmingPage />}
            </div>
          </div>
        </main>
      </header>
    </div>
  );
}
