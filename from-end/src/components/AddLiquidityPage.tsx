"use client";

import React, { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';
import { CONTRACTS, USDK_ABI, KANARI_ABI, SWAP_ABI } from '@/lib/contracts';

export default function AddLiquidityPage() {
  const { address, isConnected } = useAccount();

  const [amountA, setAmountA] = useState(''); // token A
  const [amountB, setAmountB] = useState(''); // token B

  // allow user to provide custom token addresses
  const [tokenAAddr, setTokenAAddr] = useState<string>(CONTRACTS.USDK);
  const [tokenBAddr, setTokenBAddr] = useState<string>(CONTRACTS.KANARI);

  const [tokenASymbol, setTokenASymbol] = useState('USDK');
  const [tokenBSymbol, setTokenBSymbol] = useState('KANARI');
  const [tokenADecimals, setTokenADecimals] = useState<number>(6);
  const [tokenBDecimals, setTokenBDecimals] = useState<number>(18);

  // UI states
  const [isLoadingTokenA, setIsLoadingTokenA] = useState(false);
  const [isLoadingTokenB, setIsLoadingTokenB] = useState(false);
  const [showCustomTokenA, setShowCustomTokenA] = useState(false);
  const [showCustomTokenB, setShowCustomTokenB] = useState(false);
  const [customTokenAInput, setCustomTokenAInput] = useState('');
  const [customTokenBInput, setCustomTokenBInput] = useState('');
  const [tokenAError, setTokenAError] = useState('');
  const [tokenBError, setTokenBError] = useState('');

  const PRESET_TOKENS = [
  { label: 'USDK', addr: CONTRACTS.USDK, symbol: 'USDK', decimals: 6 },
  { label: 'KANARI', addr: CONTRACTS.KANARI, symbol: 'KANARI', decimals: 18 },
  // native chain token (no contract)
  { label: 'sBTC', addr: 'NATIVE', symbol: 'sBTC', decimals: 18, isNative: true },
  ];


  const [balanceA, setBalanceA] = useState<string | null>(null);
  const [balanceB, setBalanceB] = useState<string | null>(null);

  const [allowanceA, setAllowanceA] = useState<string | null>(null);
  const [allowanceB, setAllowanceB] = useState<string | null>(null);

  const [reserveA, setReserveA] = useState<string | null>(null);
  const [reserveB, setReserveB] = useState<string | null>(null);
  const [totalSupply, setTotalSupply] = useState<string | null>(null);
  const [lpEstimate, setLpEstimate] = useState<string | null>(null);
  const [poolShare, setPoolShare] = useState<string | null>(null);
  const [autoSync, setAutoSync] = useState<boolean>(true);
  const [lastEdited, setLastEdited] = useState<'A' | 'B' | null>(null);
  // ...existing code...

  useEffect(() => {
    if (address && isConnected) loadAll();
  }, [address, isConnected]);

  async function loadAll() {
    if (!address) return;
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const swap = new ethers.Contract(CONTRACTS.SWAP, SWAP_ABI as any, provider);

      // Determine decimals for token A/B (if native use existing state or preset)
      const isNativeA = tokenAAddr === 'NATIVE';
      const isNativeB = tokenBAddr === 'NATIVE';

      const decAPromise = isNativeA ? Promise.resolve(tokenADecimals) : (new ethers.Contract(tokenAAddr, USDK_ABI as any, provider)).decimals();
      const decBPromise = isNativeB ? Promise.resolve(tokenBDecimals) : (new ethers.Contract(tokenBAddr, USDK_ABI as any, provider)).decimals();

      const [decA, decB] = await Promise.all([decAPromise, decBPromise]);

      // Fetch balances/allowances/reserves
      const aBalPromise = isNativeA ? provider.getBalance(address) : (new ethers.Contract(tokenAAddr, USDK_ABI as any, provider)).balanceOf(address);
      const bBalPromise = isNativeB ? provider.getBalance(address) : (new ethers.Contract(tokenBAddr, USDK_ABI as any, provider)).balanceOf(address);

      const allowanceAPromise = isNativeA ? Promise.resolve(0) : (new ethers.Contract(tokenAAddr, USDK_ABI as any, provider)).allowance(address, CONTRACTS.SWAP);
      const allowanceBPromise = isNativeB ? Promise.resolve(0) : (new ethers.Contract(tokenBAddr, USDK_ABI as any, provider)).allowance(address, CONTRACTS.SWAP);

      const [aBal, bBal, allowanceARes, allowanceBRes, reserves, tSupply] = await Promise.all([
        aBalPromise,
        bBalPromise,
        allowanceAPromise,
        allowanceBPromise,
        swap.getReserves(),
        swap.totalSupply(),
      ]);

      const decA_n = Number(decA);
      const decB_n = Number(decB);
      setTokenADecimals(decA_n);
      setTokenBDecimals(decB_n);

      // try to read symbol but ignore errors
      try {
        if (isNativeA) {
          const presetA = PRESET_TOKENS.find(t => t.addr === 'NATIVE');
          if (presetA) setTokenASymbol(presetA.symbol || presetA.label || 'NATIVE');
        } else {
          const tokenA = new ethers.Contract(tokenAAddr, USDK_ABI as any, provider);
          try { setTokenASymbol(await tokenA.symbol()); } catch (_) {}
        }
      } catch (_) {}

      try {
        if (isNativeB) {
          const presetB = PRESET_TOKENS.find(t => t.addr === 'NATIVE');
          if (presetB) setTokenBSymbol(presetB.symbol || presetB.label || 'NATIVE');
        } else {
          const tokenB = new ethers.Contract(tokenBAddr, USDK_ABI as any, provider);
          try { setTokenBSymbol(await tokenB.symbol()); } catch (_) {}
        }
      } catch (_) {}

  setBalanceA(ethers.formatUnits(aBal, decA_n));
  setBalanceB(ethers.formatUnits(bBal, decB_n));
  setAllowanceA(isNativeA ? null : ethers.formatUnits(allowanceARes, decA_n));
  setAllowanceB(isNativeB ? null : ethers.formatUnits(allowanceBRes, decB_n));

      // reserves correspond to tokenA/tokenB order in contract
      setReserveA(ethers.formatUnits(reserves.reserveA, decA_n));
      setReserveB(ethers.formatUnits(reserves.reserveB, decB_n));
      setTotalSupply(ethers.formatUnits(tSupply, 18));

      recalcEstimate(ethers.formatUnits(reserves.reserveA, decA_n), ethers.formatUnits(reserves.reserveB, decB_n), ethers.formatUnits(tSupply, 18), amountA, amountB);
    } catch (err) {
      console.error('loadAll failed', err);
    }
  }

  async function loadTokenMeta(addr: string, setSymbol: (s: string) => void, setDecimals: (n: number) => void, setBalance: (s: string|null) => void, setAllowance: (s: string|null) => void, setError: (s: string) => void, setLoading: (b: boolean) => void) {
    if (!address) return;
    // allow special 'NATIVE' token id for chain native currency
    if (addr !== 'NATIVE' && !isValidAddress(addr)) {
      setError('Invalid token address');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      if (addr === 'NATIVE') {
        // use preset info
        const preset = PRESET_TOKENS.find(t => t.addr === 'NATIVE');
        const dec_n = preset?.decimals ?? 18;
        setDecimals(dec_n);
        setSymbol(preset?.symbol || preset?.label || 'NATIVE');
        const bal = await provider.getBalance(address);
        setBalance(ethers.formatUnits(bal, dec_n));
        setAllowance(null);
      } else {
        const token = new ethers.Contract(addr, USDK_ABI as any, provider);
        const [dec, sym, bal, allowance] = await Promise.all([
          token.decimals(), 
          token.symbol(), 
          token.balanceOf(address), 
          token.allowance(address, CONTRACTS.SWAP)
        ]);
        const dec_n = Number(dec);
        setDecimals(dec_n);
        setSymbol(sym || 'TKN');
        setBalance(ethers.formatUnits(bal, dec_n));
        setAllowance(ethers.formatUnits(allowance, dec_n));
      }
    } catch (err) {
      console.error('loadTokenMeta failed', err);
      setError('Failed to load token data');
      setBalance(null);
      setAllowance(null);
    } finally {
      setLoading(false);
    }
  }

  function isValidAddress(addr: string) {
    try {
      return !!addr && ethers.isAddress(addr);
    } catch { return false; }
  }

  // Token selection helpers
  function selectPresetTokenA(tokenInfo: typeof PRESET_TOKENS[0]) {
    setTokenAAddr(tokenInfo.addr);
    setTokenASymbol(tokenInfo.symbol);
    setTokenADecimals(tokenInfo.decimals);
    setShowCustomTokenA(false);
    setTokenAError('');
    // Reload token data
    loadTokenMeta(tokenInfo.addr, setTokenASymbol, setTokenADecimals, setBalanceA, setAllowanceA, setTokenAError, setIsLoadingTokenA);
  }

  function selectPresetTokenB(tokenInfo: typeof PRESET_TOKENS[0]) {
    setTokenBAddr(tokenInfo.addr);
    setTokenBSymbol(tokenInfo.symbol);
    setTokenBDecimals(tokenInfo.decimals);
    setShowCustomTokenB(false);
    setTokenBError('');
    // Reload token data
    loadTokenMeta(tokenInfo.addr, setTokenBSymbol, setTokenBDecimals, setBalanceB, setAllowanceB, setTokenBError, setIsLoadingTokenB);
  }

  function handleCustomTokenA() {
    if (isValidAddress(customTokenAInput)) {
      setTokenAAddr(customTokenAInput);
      loadTokenMeta(customTokenAInput, setTokenASymbol, setTokenADecimals, setBalanceA, setAllowanceA, setTokenAError, setIsLoadingTokenA);
    } else {
      setTokenAError('Invalid token address');
    }
  }

  function handleCustomTokenB() {
    if (isValidAddress(customTokenBInput)) {
      setTokenBAddr(customTokenBInput);
      loadTokenMeta(customTokenBInput, setTokenBSymbol, setTokenBDecimals, setBalanceB, setAllowanceB, setTokenBError, setIsLoadingTokenB);
    } else {
      setTokenBError('Invalid token address');
    }
  }

  function recalcEstimate(rA: string | null, rB: string | null, tS: string | null, aA: string, aB: string) {
    try {
      if (!aA || !aB) {
        setLpEstimate(null);
        return;
      }
      const aA_f = parseFloat(aA);
      const aB_f = parseFloat(aB);
      const rA_f = rA ? parseFloat(rA) : 0;
      const rB_f = rB ? parseFloat(rB) : 0;
      const tS_f = tS ? parseFloat(tS) : 0;

      if (tS_f > 0 && rA_f > 0) {
        // proportional LP minted based on token A
        const minted = (tS_f * aA_f) / rA_f;
        setLpEstimate(minted.toFixed(6));
        const share = (minted) / (tS_f + minted) * 100;
        setPoolShare(share > 0 ? share.toFixed(4) + '%' : '0%');
      } else {
        // initial pool: use geometric mean (approximate)
        const minted = Math.sqrt(aA_f * aB_f);
        setLpEstimate(minted.toFixed(6));
        setPoolShare(null);
      }
    } catch (err) {
      setLpEstimate(null);
    }
  }

  // sync helper: when user edits A, calculate B from reserves (price)
  function syncFromA(val: string) {
    setAmountA(val);
    setLastEdited('A');
    if (!autoSync) return;
    if (!val) { setAmountB(''); return; }
    const a = parseFloat(val);
    const rA = reserveA ? parseFloat(reserveA) : 0;
    const rB = reserveB ? parseFloat(reserveB) : 0;
    if (rA > 0) {
      const b = (a * rB) / rA;
      setAmountB(isFinite(b) ? b.toString() : '');
    }
  }

  function syncFromB(val: string) {
    setAmountB(val);
    setLastEdited('B');
    if (!autoSync) return;
    if (!val) { setAmountA(''); return; }
    const b = parseFloat(val);
    const rA = reserveA ? parseFloat(reserveA) : 0;
    const rB = reserveB ? parseFloat(reserveB) : 0;
    if (rB > 0) {
      const a = (b * rA) / rB;
      setAmountA(isFinite(a) ? a.toString() : '');
    }
  }

  useEffect(() => {
    recalcEstimate(reserveA, reserveB, totalSupply, amountA, amountB);
  }, [amountA, amountB, reserveA, reserveB, totalSupply]);

  async function handleApproveA() {
    if (!isConnected || !address) return;
  if (tokenAAddr === 'NATIVE') return alert('Native token does not require approval');
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
  const usdk = new ethers.Contract(tokenAAddr, USDK_ABI as any, signer);
  const tx = await usdk.approve(CONTRACTS.SWAP, ethers.MaxUint256);
      await tx.wait();
      await loadAll();
      alert('USDK approved');
    } catch (err) {
      console.error('approve A failed', err);
      alert(`Approve failed: ${err}`);
    }
  }

  async function handleApproveB() {
    if (!isConnected || !address) return;
  if (tokenBAddr === 'NATIVE') return alert('Native token does not require approval');
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
  const kanari = new ethers.Contract(tokenBAddr, KANARI_ABI as any, signer);
  const tx = await kanari.approve(CONTRACTS.SWAP, ethers.MaxUint256);
      await tx.wait();
      await loadAll();
      alert('KANARI approved');
    } catch (err) {
      console.error('approve B failed', err);
      alert(`Approve failed: ${err}`);
    }
  }

  async function handleAddLiquidity() {
    if (!isConnected || !address) return;
    if (!amountA || !amountB) return alert('Enter both token amounts');
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
  const swap = new ethers.Contract(CONTRACTS.SWAP, SWAP_ABI as any, signer);

  const aA = ethers.parseUnits(amountA, tokenADecimals);
  const aB = ethers.parseUnits(amountB, tokenBDecimals);

  // NOTE: swap.addLiquidity expects amounts in token order used by the pair (A then B)
  let tx;
  if (tokenAAddr === 'NATIVE') {
    tx = await swap.addLiquidity(aA, aB, { value: aA });
  } else if (tokenBAddr === 'NATIVE') {
    tx = await swap.addLiquidity(aA, aB, { value: aB });
  } else {
    tx = await swap.addLiquidity(aA, aB);
  }
      await tx.wait();
      alert('Liquidity added');
      setAmountA('');
      setAmountB('');
      await loadAll();
    } catch (err) {
      console.error('addLiquidity failed', err);
      alert(`Add liquidity failed: ${err}`);
    }
  }

  return (
    <div className="bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Add Liquidity</h1>
        <button className="text-gray-400 hover:text-white transition-colors">⚙️</button>
      </div>

      {!isConnected ? (
        <div className="text-center py-8">
          <p className="text-gray-400">Please connect your wallet to add liquidity</p>
        </div>
      ) : (
        <>
          <div className="mb-4 text-sm text-gray-400 text-center">
            Choose tokens and amounts to provide liquidity
          </div>

          {/* Token A Selection */}
          <div className="bg-slate-700 rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full ${
                  isLoadingTokenA ? 'bg-gray-500 animate-pulse' : 'bg-gradient-to-r from-blue-400 to-blue-600'
                }`}></div>
                <div>
                  <div className="text-white font-medium">
                    {isLoadingTokenA ? 'Loading...' : tokenASymbol}
                  </div>
                  <div className="text-xs text-gray-400">Token A</div>
                </div>
              </div>
              <input
                className="bg-transparent text-white text-right text-2xl font-semibold placeholder-gray-500 focus:outline-none w-32"
                placeholder="0.0"
                value={amountA}
                onChange={(e) => syncFromA(e.target.value)}
                disabled={isLoadingTokenA}
              />
            </div>

            <div className="mb-3">
              <div className="flex items-center gap-2 mb-3">
                <select
                  value={PRESET_TOKENS.find(t => t.addr === tokenAAddr) ? tokenAAddr : 'custom'}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'custom') {
                      setShowCustomTokenA(true);
                    } else {
                      const t = PRESET_TOKENS.find(p => p.addr === val);
                      if (t) selectPresetTokenA(t);
                    }
                  }}
                  className="bg-slate-600 text-white px-3 py-2 rounded-md text-sm focus:outline-none"
                >
                  {PRESET_TOKENS.map(t => (
                    <option key={t.addr} value={t.addr}>{t.label}</option>
                  ))}
                  <option value="custom">Custom...</option>
                </select>
                <button
                  onClick={() => setShowCustomTokenA(!showCustomTokenA)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    showCustomTokenA 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-slate-600 text-gray-300 hover:bg-slate-500'
                  }`}
                >
                  {showCustomTokenA ? 'Cancel' : '+ Custom'}
                </button>
              </div>
              
              {showCustomTokenA && (
                <div className="bg-slate-600 rounded-lg p-3 mb-3">
                  <div className="flex gap-2">
                    <input
                      value={customTokenAInput}
                      onChange={(e) => setCustomTokenAInput(e.target.value)}
                      placeholder="Enter token contract address"
                      className="bg-slate-700 px-3 py-2 rounded-md text-sm text-white flex-1 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={handleCustomTokenA}
                      disabled={isLoadingTokenA}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-4 py-2 rounded-md text-sm text-white font-medium transition-colors"
                    >
                      {isLoadingTokenA ? '...' : 'Add'}
                    </button>
                  </div>
                  {tokenAError && (
                    <p className="text-red-400 text-xs mt-2">{tokenAError}</p>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Balance: {balanceA || '0.00'}</span>
              <div className="flex gap-2">
                <button 
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-3 py-1 rounded-md text-xs font-medium transition-colors" 
                  onClick={() => setAmountA(balanceA || '0')}
                  disabled={!balanceA || isLoadingTokenA}
                >
                  MAX
                </button>
                <button 
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 text-white px-3 py-1 rounded-md text-xs font-medium transition-colors" 
                  onClick={handleApproveA}
                  disabled={isLoadingTokenA || tokenAAddr === 'NATIVE'}
                >
                  Approve
                </button>
              </div>
            </div>
            {tokenAAddr && (
              <div className="mt-2 text-xs text-gray-400 break-all">
                Address: {tokenAAddr}
              </div>
            )}
          </div>

          {/* Plus icon */}
          <div className="flex justify-center mb-4">
            <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center">
              <span className="text-gray-300">+</span>
            </div>
          </div>

          {/* Token B Selection */}
          <div className="bg-slate-700 rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full ${
                  isLoadingTokenB ? 'bg-gray-500 animate-pulse' : 'bg-gradient-to-r from-purple-400 to-purple-600'
                }`}></div>
                <div>
                  <div className="text-white font-medium">
                    {isLoadingTokenB ? 'Loading...' : tokenBSymbol}
                  </div>
                  <div className="text-xs text-gray-400">Token B</div>
                </div>
              </div>
              <input
                className="bg-transparent text-white text-right text-2xl font-semibold placeholder-gray-500 focus:outline-none w-32"
                placeholder="0.0"
                value={amountB}
                onChange={(e) => syncFromB(e.target.value)}
                disabled={isLoadingTokenB}
              />
            </div>

            <div className="mb-3">
              <div className="flex items-center gap-2 mb-3">
                <select
                  value={PRESET_TOKENS.find(t => t.addr === tokenBAddr) ? tokenBAddr : 'custom'}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'custom') {
                      setShowCustomTokenB(true);
                    } else {
                      const t = PRESET_TOKENS.find(p => p.addr === val);
                      if (t) selectPresetTokenB(t);
                    }
                  }}
                  className="bg-slate-600 text-white px-3 py-2 rounded-md text-sm focus:outline-none"
                >
                  {PRESET_TOKENS.map(t => (
                    <option key={t.addr} value={t.addr}>{t.label}</option>
                  ))}
                  <option value="custom">Custom...</option>
                </select>
                <button
                  onClick={() => setShowCustomTokenB(!showCustomTokenB)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    showCustomTokenB 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-slate-600 text-gray-300 hover:bg-slate-500'
                  }`}
                >
                  {showCustomTokenB ? 'Cancel' : '+ Custom'}
                </button>
              </div>
              
              {showCustomTokenB && (
                <div className="bg-slate-600 rounded-lg p-3 mb-3">
                  <div className="flex gap-2">
                    <input
                      value={customTokenBInput}
                      onChange={(e) => setCustomTokenBInput(e.target.value)}
                      placeholder="Enter token contract address"
                      className="bg-slate-700 px-3 py-2 rounded-md text-sm text-white flex-1 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                      onClick={handleCustomTokenB}
                      disabled={isLoadingTokenB}
                      className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 px-4 py-2 rounded-md text-sm text-white font-medium transition-colors"
                    >
                      {isLoadingTokenB ? '...' : 'Add'}
                    </button>
                  </div>
                  {tokenBError && (
                    <p className="text-red-400 text-xs mt-2">{tokenBError}</p>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Balance: {balanceB || '0.00'}</span>
              <div className="flex gap-2">
                <button 
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-3 py-1 rounded-md text-xs font-medium transition-colors" 
                  onClick={() => setAmountB(balanceB || '0')}
                  disabled={!balanceB || isLoadingTokenB}
                >
                  MAX
                </button>
                <button 
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 text-white px-3 py-1 rounded-md text-xs font-medium transition-colors" 
                  onClick={handleApproveB}
                  disabled={isLoadingTokenB || tokenBAddr === 'NATIVE'}
                >
                  Approve
                </button>
              </div>
            </div>
            {tokenBAddr && (
              <div className="mt-2 text-xs text-gray-400 break-all">
                Address: {tokenBAddr}
              </div>
            )}
          </div>

          {/* Pool Information */}
          <div className="bg-slate-700 rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-white">Pool Information</h3>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-300">Auto-sync</label>
                <input 
                  type="checkbox" 
                  checked={autoSync} 
                  onChange={(e) => setAutoSync(e.target.checked)} 
                  className="w-4 h-4 text-blue-600 bg-slate-600 rounded focus:ring-blue-500 focus:ring-2"
                />
              </div>
            </div>
            
            <div className="space-y-3 text-sm">
              <div className="bg-slate-600 rounded-lg p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-300">Pool Reserves</span>
                  <span className="text-white font-medium">
                    {reserveA || '0'} {tokenASymbol} / {reserveB || '0'} {tokenBSymbol}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Exchange Rate</span>
                  <span className="text-white font-medium">
                    {(reserveA && reserveB) ? 
                      `1 ${tokenASymbol} = ${(parseFloat(reserveB)/parseFloat(reserveA)).toFixed(6)} ${tokenBSymbol}` : 
                      'No liquidity'
                    }
                  </span>
                </div>
              </div>

              <div className="bg-slate-600 rounded-lg p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-300">Your Pool Share</span>
                  <span className="text-white font-medium">{poolShare ?? 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-300">Total LP Supply</span>
                  <span className="text-white font-medium">{totalSupply || '0'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">LP Tokens to Receive</span>
                  <span className="text-green-400 font-medium">{lpEstimate ?? 'Enter amounts'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Add Liquidity Button */}
          <button 
            className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
              !amountA || !amountB || isLoadingTokenA || isLoadingTokenB
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-green-500 to-blue-600 text-white hover:shadow-lg hover:scale-[1.02]'
            }`}
            onClick={handleAddLiquidity}
            disabled={!amountA || !amountB || isLoadingTokenA || isLoadingTokenB}
          >
            {isLoadingTokenA || isLoadingTokenB ? 
              'Loading tokens...' : 
              !amountA || !amountB ? 
                'Enter amounts' : 
                'Add Liquidity'
            }
          </button>
        </>
      )}
    </div>
  );
}
