"use client";

import React, { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';
import { CONTRACTS, USDK_ABI, KANARI_ABI, SWAP_ABI } from '@/lib/contracts';

export default function RemoveLiquidityPage() {
  const { address, isConnected } = useAccount();

  const [lpBalance, setLpBalance] = useState<string | null>(null);
  const [totalSupply, setTotalSupply] = useState<string | null>(null);
  const [reserveA, setReserveA] = useState<string | null>(null);
  const [reserveB, setReserveB] = useState<string | null>(null);
  const [tokenASymbol, setTokenASymbol] = useState('USDK');
  const [tokenBSymbol, setTokenBSymbol] = useState('KANARI');
  const [tokenADecimals, setTokenADecimals] = useState<number>(6);
  const [tokenBDecimals, setTokenBDecimals] = useState<number>(18);
  const [tokenAAddr, setTokenAAddr] = useState<string>(CONTRACTS.USDK);
  const [tokenBAddr, setTokenBAddr] = useState<string>(CONTRACTS.KANARI);
  const [showCustomA, setShowCustomA] = useState(false);
  const [showCustomB, setShowCustomB] = useState(false);
  const [customA, setCustomA] = useState('');
  const [customB, setCustomB] = useState('');
  const [estimateAvailable, setEstimateAvailable] = useState(true);

  const PRESET_TOKENS = [
    { label: 'USDK', addr: CONTRACTS.USDK, symbol: 'USDK', decimals: 6 },
    { label: 'KANARI', addr: CONTRACTS.KANARI, symbol: 'KANARI', decimals: 18 },
    { label: 'sBTC', addr: 'NATIVE', symbol: 'sBTC', decimals: 18, isNative: true },
  ];

  const [lpToBurn, setLpToBurn] = useState('');
  const [estimatedA, setEstimatedA] = useState<string | null>(null);
  const [estimatedB, setEstimatedB] = useState<string | null>(null);
  const [rawReserveA, setRawReserveA] = useState<string | null>(null);
  const [rawReserveB, setRawReserveB] = useState<string | null>(null);
  const [rawTotalSupply, setRawTotalSupply] = useState<string | null>(null);

  useEffect(() => { if (address && isConnected) loadAll(); }, [address, isConnected]);

  async function loadAll() {
    if (!address) return;
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const swap = new ethers.Contract(CONTRACTS.SWAP, SWAP_ABI as any, provider);

      // read reserves, totalSupply, user LP
      const [reserves, tSupply, lpBal] = await Promise.all([
        swap.getReserves(),
        swap.totalSupply(),
        swap.balanceOf(address),
      ]);

      // determine selected token decimals/symbols
      let decA_n = tokenADecimals;
      let decB_n = tokenBDecimals;
      try {
        if (tokenAAddr === 'NATIVE') {
          const preset = PRESET_TOKENS.find(t => t.addr === 'NATIVE');
          decA_n = preset?.decimals ?? 18;
          setTokenASymbol(preset?.symbol || 'NATIVE');
        } else {
          const tA = new ethers.Contract(tokenAAddr, USDK_ABI as any, provider);
          decA_n = Number(await tA.decimals());
          try { setTokenASymbol(await tA.symbol()); } catch { /* ignore */ }
        }
      } catch (e) { console.warn('failed to read token A metadata', e); }

      try {
        if (tokenBAddr === 'NATIVE') {
          const preset = PRESET_TOKENS.find(t => t.addr === 'NATIVE');
          decB_n = preset?.decimals ?? 18;
          setTokenBSymbol(preset?.symbol || 'NATIVE');
        } else {
          const tB = new ethers.Contract(tokenBAddr, USDK_ABI as any, provider);
          decB_n = Number(await tB.decimals());
          try { setTokenBSymbol(await tB.symbol()); } catch { /* ignore */ }
        }
      } catch (e) { console.warn('failed to read token B metadata', e); }

      setTokenADecimals(decA_n);
      setTokenBDecimals(decB_n);

      // store raw bigints as strings for precise math
      setRawReserveA(reserves.reserveA.toString());
      setRawReserveB(reserves.reserveB.toString());
      setRawTotalSupply(tSupply.toString());

      // contract reserves are reserveA/reserveB in the pair's token order (USDK/KANARI expected)
      // map them to the tokens the user selected when possible
      if (tokenAAddr === CONTRACTS.USDK && tokenBAddr === CONTRACTS.KANARI) {
        // normal order
        setReserveA(ethers.formatUnits(reserves.reserveA, decA_n));
        setReserveB(ethers.formatUnits(reserves.reserveB, decB_n));
        setEstimateAvailable(true);
      } else if (tokenAAddr === CONTRACTS.KANARI && tokenBAddr === CONTRACTS.USDK) {
        // reversed order
        setReserveA(ethers.formatUnits(reserves.reserveB, decA_n));
        setReserveB(ethers.formatUnits(reserves.reserveA, decB_n));
        setEstimateAvailable(true);
      } else {
        // unknown mapping - still show raw reserves but mark estimates unavailable
        setReserveA(ethers.formatUnits(reserves.reserveA, decA_n));
        setReserveB(ethers.formatUnits(reserves.reserveB, decB_n));
        setEstimateAvailable(false);
      }

      setTotalSupply(ethers.formatUnits(tSupply, 18));
      setLpBalance(ethers.formatUnits(lpBal, 18));

      // reset estimates
      setEstimatedA(null);
      setEstimatedB(null);
    } catch (err) {
      console.error('loadAll removeLiquidity failed', err);
    }
  }

  function recalcEstimates(lpStr: string) {
    try {
      if (!lpStr || !rawTotalSupply) {
        setEstimatedA(null);
        setEstimatedB(null);
        return;
      }
      // Prefer exact bigint math using on-chain raw values
      if (rawTotalSupply && rawReserveA && rawReserveB) {
        try {
          const lpUnits = ethers.parseUnits(lpStr, 18); // user enters LP in human units
          const totalUnits = BigInt(rawTotalSupply);
          const rA_units = BigInt(rawReserveA);
          const rB_units = BigInt(rawReserveB);
          if (totalUnits === BigInt(0) || lpUnits === BigInt(0)) {
            setEstimatedA(null);
            setEstimatedB(null);
            return;
          }
          const a_units = (rA_units * lpUnits) / totalUnits;
          const b_units = (rB_units * lpUnits) / totalUnits;
          setEstimatedA(ethers.formatUnits(a_units, tokenADecimals));
          setEstimatedB(ethers.formatUnits(b_units, tokenBDecimals));
          return;
        } catch (err) {
          // fall back to float approximation below
        }
      }

      // fallback: use floats (less accurate)
      const lp = parseFloat(lpStr);
      const t = parseFloat(totalSupply || '0');
      const rA = parseFloat(reserveA || '0');
      const rB = parseFloat(reserveB || '0');
      if (t <= 0 || lp <= 0) {
        setEstimatedA(null);
        setEstimatedB(null);
        return;
      }
      const portion = lp / t;
      const a = portion * rA;
      const b = portion * rB;
      setEstimatedA(isFinite(a) ? a.toFixed(Math.min(6, tokenADecimals)) : null);
      setEstimatedB(isFinite(b) ? b.toFixed(Math.min(6, tokenBDecimals)) : null);
    } catch (err) {
      setEstimatedA(null);
      setEstimatedB(null);
    }
  }

  function onLpChange(v: string) {
    setLpToBurn(v);
    recalcEstimates(v);
  }

  async function handleRemove() {
    if (!isConnected || !address) return;
    if (!lpToBurn) return alert('Enter LP amount to remove');
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const swap = new ethers.Contract(CONTRACTS.SWAP, SWAP_ABI as any, signer);

      const lpUnits = ethers.parseUnits(lpToBurn, 18);
      const tx = await swap.removeLiquidity(lpUnits);
      await tx.wait();
      alert('Liquidity removed');
      setLpToBurn('');
      await loadAll();
    } catch (err) {
      console.error('removeLiquidity failed', err);
      alert(`Remove liquidity failed: ${err}`);
    }
  }

  return (
    <div className="bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Remove Liquidity</h1>
        <button className="text-gray-400 hover:text-white transition-colors">⚙️</button>
      </div>

      {!isConnected ? (
        <div className="text-center py-8"><p className="text-gray-400">Connect wallet to remove liquidity</p></div>
      ) : (
        <>
          <div className="mb-4 text-sm text-gray-400 text-center">Choose pair and amount of LP to burn</div>

          <div className="bg-slate-700 rounded-xl p-4 mb-4">
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-xs text-gray-300">Token A</label>
                <div className="flex items-center gap-2 mt-2">
                  <select value={PRESET_TOKENS.find(t => t.addr === tokenAAddr) ? tokenAAddr : 'custom'} onChange={(e) => { const v = e.target.value; if (v === 'custom') setShowCustomA(true); else { setTokenAAddr(v); setShowCustomA(false); } }} className="bg-slate-600 text-white px-3 py-2 rounded-md text-sm w-full">
                    {PRESET_TOKENS.map(t => (<option key={t.addr} value={t.addr}>{t.label}</option>))}
                    <option value="custom">Custom...</option>
                  </select>
                </div>
                {showCustomA && (
                  <div className="mt-2 flex gap-2">
                    <input value={customA} onChange={(e) => setCustomA(e.target.value)} placeholder="Token address or NATIVE" className="bg-slate-600 px-3 py-2 rounded-md text-sm text-white flex-1" />
                    <button onClick={() => { if (customA) { setTokenAAddr(customA); setShowCustomA(false); loadAll(); } }} className="bg-blue-600 px-3 py-2 rounded-md text-white text-sm">Add</button>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs text-gray-300">Token B</label>
                <div className="flex items-center gap-2 mt-2">
                  <select value={PRESET_TOKENS.find(t => t.addr === tokenBAddr) ? tokenBAddr : 'custom'} onChange={(e) => { const v = e.target.value; if (v === 'custom') setShowCustomB(true); else { setTokenBAddr(v); setShowCustomB(false); } }} className="bg-slate-600 text-white px-3 py-2 rounded-md text-sm w-full">
                    {PRESET_TOKENS.map(t => (<option key={t.addr} value={t.addr}>{t.label}</option>))}
                    <option value="custom">Custom...</option>
                  </select>
                </div>
                {showCustomB && (
                  <div className="mt-2 flex gap-2">
                    <input value={customB} onChange={(e) => setCustomB(e.target.value)} placeholder="Token address or NATIVE" className="bg-slate-600 px-3 py-2 rounded-md text-sm text-white flex-1" />
                    <button onClick={() => { if (customB) { setTokenBAddr(customB); setShowCustomB(false); loadAll(); } }} className="bg-blue-600 px-3 py-2 rounded-md text-white text-sm">Add</button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between items-center mb-3">
              <div className="text-sm text-gray-300">Your LP Balance</div>
              <div className="text-white font-medium">{lpBalance ?? '0'}</div>
            </div>

            <div className="mb-3">
              <input value={lpToBurn} onChange={(e) => onLpChange(e.target.value)} placeholder="LP amount to burn" className="w-full bg-slate-600 px-3 py-2 rounded-md text-white" />
              <div className="flex justify-between items-center mt-2 text-sm text-gray-400">
                <button className="bg-blue-600 px-3 py-1 rounded-md text-white text-xs" onClick={() => { if (lpBalance) { setLpToBurn(lpBalance); recalcEstimates(lpBalance); } }}>MAX</button>
                <div>Total Supply: <span className="text-white">{totalSupply ?? '0'}</span></div>
              </div>
            </div>

            <div className="bg-slate-600 rounded-lg p-3 text-sm text-gray-300">
              {!estimateAvailable && <div className="text-yellow-300 mb-2">Estimate unavailable for this token pair — results might be inaccurate.</div>}
              <div className="flex justify-between mb-2"><span>Estimated {tokenASymbol}</span><span className="text-white">{estimatedA ?? '0'}</span></div>
              <div className="flex justify-between"><span>Estimated {tokenBSymbol}</span><span className="text-white">{estimatedB ?? '0'}</span></div>
            </div>
          </div>

          <button onClick={handleRemove} disabled={!lpToBurn} className={`w-full py-3 rounded-xl font-semibold text-lg ${!lpToBurn ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-red-500 to-orange-500 text-white'}`}>Remove Liquidity</button>
        </>
      )}
    </div>
  );
}
