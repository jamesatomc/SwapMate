"use client";

import React, { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';
import { CONTRACTS, USDK_ABI, SWAP_ABI } from '@/lib/contracts';

export default function SwapPage() {
    const { address, isConnected } = useAccount();

    const [tokenInAddr, setTokenInAddr] = useState<string>(CONTRACTS.USDK);
    const [tokenOutAddr, setTokenOutAddr] = useState<string>(CONTRACTS.KANARI);
    const [tokenInSymbol, setTokenInSymbol] = useState('USDK');
    const [tokenOutSymbol, setTokenOutSymbol] = useState('KANARI');
    const [tokenInDecimals, setTokenInDecimals] = useState<number>(6);
    const [tokenOutDecimals, setTokenOutDecimals] = useState<number>(18);

    const [customIn, setCustomIn] = useState('');
    const [customOut, setCustomOut] = useState('');
    const [showCustomIn, setShowCustomIn] = useState(false);
    const [showCustomOut, setShowCustomOut] = useState(false);

    const PRESET_TOKENS = [
        { label: 'USDK', addr: CONTRACTS.USDK, symbol: 'USDK', decimals: 6 },
        { label: 'KANARI', addr: CONTRACTS.KANARI, symbol: 'KANARI', decimals: 18 },
        { label: 'sBTC', addr: 'NATIVE', symbol: 'sBTC', decimals: 18, isNative: true },
    ];

    const [balanceIn, setBalanceIn] = useState<string | null>(null);
    const [balanceOut, setBalanceOut] = useState<string | null>(null);
    const [allowanceIn, setAllowanceIn] = useState<string | null>(null);
    const [totalLpSupply, setTotalLpSupply] = useState<string | null>(null);
    const [yourLpBalance, setYourLpBalance] = useState<string | null>(null);
    const [reserveA, setReserveA] = useState<string | null>(null);
    const [reserveB, setReserveB] = useState<string | null>(null);

    const [amountIn, setAmountIn] = useState('');
    const [amountOut, setAmountOut] = useState<string | null>(null);

    useEffect(() => { if (address && isConnected) loadAll(); }, [address, isConnected, tokenInAddr, tokenOutAddr]);

    async function loadAll() {
        if (!address) return;
        try {
            const provider = new ethers.BrowserProvider((window as any).ethereum);
            const swap = new ethers.Contract(CONTRACTS.SWAP, SWAP_ABI as any, provider);

            const isNativeIn = tokenInAddr === 'NATIVE';
            const isNativeOut = tokenOutAddr === 'NATIVE';

            const decInP = isNativeIn ? Promise.resolve(tokenInDecimals) : (new ethers.Contract(tokenInAddr, USDK_ABI as any, provider)).decimals();
            const decOutP = isNativeOut ? Promise.resolve(tokenOutDecimals) : (new ethers.Contract(tokenOutAddr, USDK_ABI as any, provider)).decimals();

            const [decIn, decOut] = await Promise.all([decInP, decOutP]);
            setTokenInDecimals(Number(decIn));
            setTokenOutDecimals(Number(decOut));

            const balInP = isNativeIn ? provider.getBalance(address) : (new ethers.Contract(tokenInAddr, USDK_ABI as any, provider)).balanceOf(address);
            const balOutP = isNativeOut ? provider.getBalance(address) : (new ethers.Contract(tokenOutAddr, USDK_ABI as any, provider)).balanceOf(address);
            const allowanceP = isNativeIn ? Promise.resolve(0) : (new ethers.Contract(tokenInAddr, USDK_ABI as any, provider)).allowance(address, CONTRACTS.SWAP);

            const [balIn, balOut, allowanceRes, reserves, tSupply, lpBal] = await Promise.all([balInP, balOutP, allowanceP, swap.getReserves(), swap.totalSupply(), swap.balanceOf(address)]);

            setBalanceIn(ethers.formatUnits(balIn, Number(decIn)));
            setBalanceOut(ethers.formatUnits(balOut, Number(decOut)));
            setAllowanceIn(isNativeIn ? null : ethers.formatUnits(allowanceRes, Number(decIn)));
            setTotalLpSupply(ethers.formatUnits(tSupply, 18));
            setYourLpBalance(ethers.formatUnits(lpBal, 18));
            setReserveA(ethers.formatUnits(reserves.reserveA, Number(decIn)));
            setReserveB(ethers.formatUnits(reserves.reserveB, Number(decOut)));

            // update token symbols if possible
            try {
                if (!isNativeIn) {
                    const t = new ethers.Contract(tokenInAddr, USDK_ABI as any, provider);
                    setTokenInSymbol(await t.symbol());
                } else {
                    const preset = PRESET_TOKENS.find(p => p.addr === 'NATIVE');
                    if (preset) setTokenInSymbol(preset.symbol || preset.label);
                }
            } catch (_) { }

            try {
                if (!isNativeOut) {
                    const t = new ethers.Contract(tokenOutAddr, USDK_ABI as any, provider);
                    setTokenOutSymbol(await t.symbol());
                } else {
                    const preset = PRESET_TOKENS.find(p => p.addr === 'NATIVE');
                    if (preset) setTokenOutSymbol(preset.symbol || preset.label);
                }
            } catch (_) { }

            // compute simple price: amountOut = amountIn * reserveOut / reserveIn
            if (amountIn) {
                const rA = Number(ethers.formatUnits(reserves.reserveA, Number(decIn)));
                const rB = Number(ethers.formatUnits(reserves.reserveB, Number(decOut)));
                const a = parseFloat(amountIn);
                if (rA > 0) {
                    const out = (a * rB) / rA;
                    setAmountOut(isFinite(out) ? out.toString() : null);
                }
            }

        } catch (err) {
            console.error('loadAll swap failed', err);
        }
    }

    function isValidAddress(addr: string) {
        try { return addr === 'NATIVE' || ethers.isAddress(addr); } catch { return false; }
    }

    async function handleCustomIn() {
        if (isValidAddress(customIn)) {
            setTokenInAddr(customIn);
            setShowCustomIn(false);
            await loadAll();
        }
    }

    async function handleCustomOut() {
        if (isValidAddress(customOut)) {
            setTokenOutAddr(customOut);
            setShowCustomOut(false);
            await loadAll();
        }
    }

    function onAmountInChange(v: string) {
        setAmountIn(v);
        // simple local estimate from reserves by calling loadAll which will update amountOut
        // quick local compute when possible
        try {
            const a = parseFloat(v);
            if (!isNaN(a) && a > 0) {
                // we'll trigger loadAll to recompute against latest reserves
                loadAll();
            } else {
                setAmountOut(null);
            }
        } catch { setAmountOut(null); }
    }

    async function handleApproveIn() {
        if (!isConnected || !address) return;
        if (tokenInAddr === 'NATIVE') return alert('Native token does not require approval');
        try {
            const provider = new ethers.BrowserProvider((window as any).ethereum);
            const signer = await provider.getSigner();
            const token = new ethers.Contract(tokenInAddr, USDK_ABI as any, signer);
            const tx = await token.approve(CONTRACTS.SWAP, ethers.MaxUint256);
            await tx.wait();
            await loadAll();
            alert('Approved');
        } catch (err) {
            console.error('approve failed', err);
            alert(`Approve failed: ${err}`);
        }
    }

    const [slippagePct, setSlippagePct] = useState<number>(1);

    async function handleSwap() {
        if (!isConnected || !address) return;
        if (!amountIn) return alert('Enter amount to swap');
        try {
            const provider = new ethers.BrowserProvider((window as any).ethereum);
            const signer = await provider.getSigner();
            const swap = new ethers.Contract(CONTRACTS.SWAP, SWAP_ABI as any, signer);

            const aIn = ethers.parseUnits(amountIn, tokenInDecimals);
            // compute expected out from local estimate (amountOut) and apply slippage pct to get minOut
            let minOutUnits = BigInt(0);
            if (amountOut) {
                try {
                    const unitsOut = ethers.parseUnits(amountOut, tokenOutDecimals);
                    // support fractional slippage (e.g., 0.1%). Use basis points (1% = 100 bps)
                    const bps = BigInt(Math.max(0, Math.min(10000, Math.round(slippagePct * 100)))); // 10000 bps = 100%
                    const one = BigInt(10000);
                    minOutUnits = (unitsOut * (one - bps)) / one;
                } catch (e) {
                    minOutUnits = BigInt(0);
                }
            }

            let tx;
            if (tokenInAddr === 'NATIVE') {
                tx = await swap.swap(ethers.ZeroAddress, aIn, minOutUnits, { value: aIn });
            } else {
                tx = await swap.swap(tokenInAddr, aIn, minOutUnits);
            }
            await tx.wait();
            alert('Swap executed');
            setAmountIn('');
            setAmountOut(null);
            await loadAll();
        } catch (err) {
            console.error('swap failed', err);
            alert(`Swap failed: ${err}`);
        }
    }

    return (
        <div className="bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700 max-w-md mx-auto">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-white">Swap</h1>
                <button className="text-gray-400 hover:text-white transition-colors">⚙️</button>
            </div>

            {!isConnected ? (
                <div className="text-center py-8">
                    <p className="text-gray-400">Please connect your wallet to swap</p>
                </div>
            ) : (
                <>
                    <div className="mb-4 text-sm text-gray-400 text-center">Choose tokens and amounts to swap</div>

                    {/* Token In */}
                    <div className="bg-slate-700 rounded-xl p-4 mb-4">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full ${tokenInAddr === 'NATIVE' ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' : 'bg-gradient-to-r from-blue-400 to-blue-600'}`}></div>
                                <div>
                                    <div className="text-white font-medium">{tokenInSymbol}</div>
                                    <div className="text-xs text-gray-400">From</div>
                                </div>
                            </div>
                            <input
                                className="bg-transparent text-white text-right text-2xl font-semibold placeholder-gray-500 focus:outline-none w-32"
                                placeholder="0.0"
                                value={amountIn}
                                onChange={(e) => onAmountInChange(e.target.value)}
                            />
                        </div>

                        <div className="mb-3">
                            <div className="flex items-center gap-2 mb-3">
                                <select
                                    value={PRESET_TOKENS.find(t => t.addr === tokenInAddr) ? tokenInAddr : 'custom'}
                                    onChange={(e) => { const val = e.target.value; if (val === 'custom') setShowCustomIn(true); else setTokenInAddr(val); }}
                                    className="bg-slate-600 text-white px-3 py-2 rounded-md text-sm focus:outline-none"
                                >
                                    {PRESET_TOKENS.map(t => (<option key={t.addr} value={t.addr}>{t.label}</option>))}
                                    <option value="custom">Custom...</option>
                                </select>
                                <button onClick={() => setShowCustomIn(!showCustomIn)} className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${showCustomIn ? 'bg-purple-600 text-white' : 'bg-slate-600 text-gray-300 hover:bg-slate-500'}`}>{showCustomIn ? 'Cancel' : '+ Custom'}</button>
                            </div>

                            {showCustomIn && (
                                <div className="bg-slate-600 rounded-lg p-3 mb-3">
                                    <div className="flex gap-2">
                                        <input value={customIn} onChange={(e) => setCustomIn(e.target.value)} placeholder="Enter token contract address or NATIVE" className="bg-slate-700 px-3 py-2 rounded-md text-sm text-white flex-1 placeholder-gray-400 focus:outline-none" />
                                        <button onClick={handleCustomIn} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-md text-sm text-white font-medium">Add</button>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-400">Balance: {balanceIn || '0.00'}</span>
                                <div className="flex gap-2">
                                    <button className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-3 py-1 rounded-md text-xs font-medium" onClick={() => setAmountIn(balanceIn || '0')} disabled={!balanceIn}>MAX</button>
                                    <button className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 text-white px-3 py-1 rounded-md text-xs font-medium" onClick={handleApproveIn} disabled={tokenInAddr === 'NATIVE'}>Approve</button>
                                </div>
                            </div>
                            {tokenInAddr && (<div className="mt-2 text-xs text-gray-400 break-all">Address: {tokenInAddr}</div>)}
                        </div>
                    </div>

                    {/* Swap icon */}
                    <div className="flex justify-center mb-4"><div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center"><span className="text-gray-300">⇅</span></div></div>

                    {/* Token Out */}
                    <div className="bg-slate-700 rounded-xl p-4 mb-4">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full ${tokenOutAddr === 'NATIVE' ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' : 'bg-gradient-to-r from-purple-400 to-purple-600'}`}></div>
                                <div>
                                    <div className="text-white font-medium">{tokenOutSymbol}</div>
                                    <div className="text-xs text-gray-400">To</div>
                                </div>
                            </div>
                            <div className="text-2xl font-semibold text-white">{amountOut ?? '0.0'}</div>
                        </div>

                        <div className="mb-3">
                            <div className="flex items-center gap-2 mb-3">
                                <select value={PRESET_TOKENS.find(t => t.addr === tokenOutAddr) ? tokenOutAddr : 'custom'} onChange={(e) => { const v = e.target.value; if (v === 'custom') setShowCustomOut(true); else setTokenOutAddr(v); }} className="bg-slate-600 text-white px-3 py-2 rounded-md text-sm focus:outline-none">
                                    {PRESET_TOKENS.map(t => (<option key={t.addr} value={t.addr}>{t.label}</option>))}
                                    <option value="custom">Custom...</option>
                                </select>
                                <button onClick={() => setShowCustomOut(!showCustomOut)} className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${showCustomOut ? 'bg-purple-600 text-white' : 'bg-slate-600 text-gray-300 hover:bg-slate-500'}`}>{showCustomOut ? 'Cancel' : '+ Custom'}</button>
                            </div>

                            {showCustomOut && (
                                <div className="bg-slate-600 rounded-lg p-3 mb-3">
                                    <div className="flex gap-2">
                                        <input value={customOut} onChange={(e) => setCustomOut(e.target.value)} placeholder="Enter token contract address or NATIVE" className="bg-slate-700 px-3 py-2 rounded-md text-sm text-white flex-1 placeholder-gray-400 focus:outline-none" />
                                        <button onClick={handleCustomOut} className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-md text-sm text-white font-medium">Add</button>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-400">Balance: {balanceOut || '0.00'}</span>
                                <div className="flex gap-2">
                                    <button className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-3 py-1 rounded-md text-xs font-medium" onClick={() => {/* no max for out */ }} disabled>{' '}</button>
                                </div>
                            </div>
                            {tokenOutAddr && (<div className="mt-2 text-xs text-gray-400 break-all">Address: {tokenOutAddr}</div>)}
                        </div>
                    </div>

                    {/* Pool info */}
                    <div className="bg-slate-700 rounded-xl p-4 mb-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg font-semibold text-white">Pool Information</h3>
                            <div className="text-sm text-gray-300">Slippage</div>
                        </div>
                        <div className="space-y-3 text-sm">
                            <div className="bg-slate-600 rounded-lg p-3">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-gray-300">Pool Reserves</span>
                                    <span className="text-white font-medium">{reserveA || '0'} {tokenInSymbol} / {reserveB || '0'} {tokenOutSymbol}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-300">Exchange Rate</span>
                                    <span className="text-white font-medium">{(reserveA && reserveB) ? `1 ${tokenInSymbol} = ${(parseFloat(reserveB) / parseFloat(reserveA)).toFixed(6)} ${tokenOutSymbol}` : 'No liquidity'}</span>
                                </div>
                            </div>

                            <div className="bg-slate-600 rounded-lg p-3">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-gray-300">Total LP Supply</span>
                                    <span className="text-white font-medium">{totalLpSupply ?? '0'}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-300">Your LP Balance</span>
                                    <span className="text-white font-medium">{yourLpBalance ?? '0'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mb-4">
                        <label className="text-sm text-gray-300">Slippage tolerance (%)</label>
                        <div className="flex items-center gap-2 mt-2">
                            <div className="flex gap-2">
                                <button onClick={() => setSlippagePct(0.1)} className={`px-3 py-1 rounded-md text-sm ${slippagePct === 0.1 ? 'bg-indigo-600 text-white' : 'bg-slate-600 text-gray-200'}`}>0.1%</button>
                                <button onClick={() => setSlippagePct(0.5)} className={`px-3 py-1 rounded-md text-sm ${slippagePct === 0.5 ? 'bg-indigo-600 text-white' : 'bg-slate-600 text-gray-200'}`}>0.5%</button>
                                <button onClick={() => setSlippagePct(1)} className={`px-3 py-1 rounded-md text-sm ${slippagePct === 1 ? 'bg-indigo-600 text-white' : 'bg-slate-600 text-gray-200'}`}>1%</button>
                            </div>
                            <input type="number" step="0.1" value={slippagePct} onChange={(e) => setSlippagePct(Number(e.target.value))} className="ml-auto w-28 bg-slate-700 px-3 py-2 rounded-md text-white text-right" />
                        </div>
                    </div>

                    <button onClick={handleSwap} className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${!amountIn ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-green-500 to-blue-600 text-white hover:shadow-lg hover:scale-[1.02]'}`} disabled={!amountIn}>{!amountIn ? 'Enter amount' : 'Swap'}</button>
                </>
            )}
        </div>
    );
}
