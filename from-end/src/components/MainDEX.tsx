"use client";

import React, { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import SwapPage from './SwapPage';
import AddLiquidityPage from './AddLiquidityPage';
import RemoveLiquidityPage from './RemoveLiquidityPage';
import MintPage from './MintPage';
import FarmingPage from './FarmingPage';

type Page = 'swap' | 'add' | 'remove' | 'mint' | 'farm';

export default function MainDEX() {
  const [currentPage, setCurrentPage] = useState<Page>('swap');

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header + hero */}
      <header className="px-4 py-6">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start md:items-center gap-3 w-full md:w-auto">
            <div className="w-10 h-10 rounded-full bg-orange-400 flex items-center justify-center text-white font-bold shadow">K</div>
            <div className="flex-1">
              <div className="flex items-center justify-between gap-3">
                <div className="text-lg font-semibold text-[var(--text-color)]">Kanari</div>
                {/* on small screens place connect to the right inside same row */}
                <div className="md:hidden">
                  <div className="rounded-lg bg-[var(--surface)] p-1 border border-white/6 shadow-sm">
                    <ConnectButton />
                  </div>
                </div>
              </div>
              <p className="mt-1 text-sm text-[var(--muted-text,#9ca3af)]">Swap tokens, provide liquidity, or mint — fast and simple.</p>
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

            <div>
              {currentPage === 'swap' && <SwapPage />}
              {currentPage === 'add' && <AddLiquidityPage />}
              {currentPage === 'remove' && <RemoveLiquidityPage />}
              {currentPage === 'mint' && <MintPage />}
              {currentPage === 'farm' && <FarmingPage />}
            </div>
          </div>
        </main>
      </header>
    </div>
  );
}
