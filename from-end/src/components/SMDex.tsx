'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { CONTRACTS, USDK_ABI, KANARI_ABI, POOL_MANAGER_ABI } from '@/lib/contracts';
import { formatUnits, parseUnits } from 'viem';
import { useState, useEffect } from 'react';

export default function SMDex() {
  const { address, isConnected } = useAccount();
  
  // State management
  const [swapFrom, setSwapFrom] = useState('');
  const [swapTo, setSwapTo] = useState('');
  const [selectedFromToken, setSelectedFromToken] = useState<'USDK' | 'KANARI'>('USDK');
  const [selectedToToken, setSelectedToToken] = useState<'USDK' | 'KANARI'>('KANARI');
  const [liquidityUSDK, setLiquidityUSDK] = useState('');
  const [liquidityKANARI, setLiquidityKANARI] = useState('');
  const [mintAmount, setMintAmount] = useState('');

  // Read balances
  const { data: usdkBalance } = useReadContract({
    address: CONTRACTS.USDK,
    abi: USDK_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address }
  });

  const { data: kanariBalance } = useReadContract({
    address: CONTRACTS.KANARI,
    abi: KANARI_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address }
  });

  // Read pool reserves
  const { data: poolReserves } = useReadContract({
    address: CONTRACTS.POOL_MANAGER,
    abi: POOL_MANAGER_ABI,
    functionName: 'getReserves',
    args: [CONTRACTS.POOL_ID],
  });

  // Read user liquidity position
  const { data: userLiquidity } = useReadContract({
    address: CONTRACTS.POOL_MANAGER,
    abi: POOL_MANAGER_ABI,
    functionName: 'liquidityOf',
    args: [CONTRACTS.POOL_ID, address || '0x0'],
    query: { enabled: !!address }
  });

  // Get swap quote
  const tokenInAddress = selectedFromToken === 'USDK' ? CONTRACTS.USDK : CONTRACTS.KANARI;
  const tokenInDecimals = selectedFromToken === 'USDK' ? 6 : 18;
  
  const { data: swapQuote } = useReadContract({
    address: CONTRACTS.POOL_MANAGER,
    abi: POOL_MANAGER_ABI,
    functionName: 'getSwapQuote',
    args: swapFrom ? [CONTRACTS.POOL_ID, tokenInAddress, parseUnits(swapFrom, tokenInDecimals)] : undefined,
    query: { enabled: !!swapFrom && Number(swapFrom) > 0 }
  });

  // Update swap quote when it changes
  useEffect(() => {
    if (swapQuote) {
      const outDecimals = selectedToToken === 'USDK' ? 6 : 18;
      setSwapTo(formatUnits(swapQuote as bigint, outDecimals));
    }
  }, [swapQuote, selectedToToken]);

  // Write contracts
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Show transaction status
  useEffect(() => {
    if (isSuccess) {
      alert('Transaction successful!');
      // Reset form values
      setMintAmount('');
      setLiquidityUSDK('');
      setLiquidityKANARI('');
      setSwapFrom('');
      setSwapTo('');
    }
    if (error) {
      console.error('Transaction error:', error);
      alert('Transaction failed: ' + error.message);
    }
  }, [isSuccess, error]);

  // Helper functions
  const formatBalance = (balance: bigint | undefined, decimals: number) => {
    if (!balance) return '0';
    return Number(formatUnits(balance, decimals)).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    });
  };

  const handleSwapTokens = () => {
    const newFrom = selectedToToken;
    const newTo = selectedFromToken;
    setSelectedFromToken(newFrom);
    setSelectedToToken(newTo);
    setSwapFrom(swapTo);
    setSwapTo(swapFrom);
  };

  // Transaction handlers
  const handleMintUSDK = async () => {
    if (!mintAmount || !address) {
      alert('กรุณากรอกจำนวนที่ต้องการ mint');
      return;
    }
    
    try {
      await writeContract({
        address: CONTRACTS.USDK,
        abi: USDK_ABI,
        functionName: 'mint',
        args: [address, parseUnits(mintAmount, 6)],
      });
    } catch (err) {
      console.error('Mint USDK error:', err);
      alert('การ mint USDK ไม่สำเร็จ');
    }
  };

  const handleMintKANARI = async () => {
    if (!mintAmount || !address) {
      alert('กรุณากรอกจำนวนที่ต้องการ mint');
      return;
    }
    
    try {
      await writeContract({
        address: CONTRACTS.KANARI,
        abi: KANARI_ABI,
        functionName: 'mint',
        args: [address, parseUnits(mintAmount, 18)],
      });
    } catch (err) {
      console.error('Mint KANARI error:', err);
      alert('การ mint KANARI ไม่สำเร็จ');
    }
  };

  const handleApproveUSDK = () => {
    writeContract({
      address: CONTRACTS.USDK,
      abi: USDK_ABI,
      functionName: 'approve',
      args: [CONTRACTS.POOL_MANAGER, parseUnits('1000000', 6)], // Approve large amount
    });
  };

  const handleApproveKANARI = () => {
    writeContract({
      address: CONTRACTS.KANARI,
      abi: KANARI_ABI,
      functionName: 'approve',
      args: [CONTRACTS.POOL_MANAGER, parseUnits('1000000', 18)], // Approve large amount
    });
  };

  const handleAddLiquidity = () => {
    if (!liquidityUSDK || !liquidityKANARI) return;
    writeContract({
      address: CONTRACTS.POOL_MANAGER,
      abi: POOL_MANAGER_ABI,
      functionName: 'addLiquidity',
      args: [
        CONTRACTS.POOL_ID,
        parseUnits(liquidityUSDK, 6),
        parseUnits(liquidityKANARI, 18)
      ],
    });
  };

  const handleSwap = () => {
    if (!swapFrom) return;
    const tokenIn = selectedFromToken === 'USDK' ? CONTRACTS.USDK : CONTRACTS.KANARI;
    const decimalsIn = selectedFromToken === 'USDK' ? 6 : 18;
    const decimalsOut = selectedToToken === 'USDK' ? 6 : 18;
    const minAmountOut = swapQuote ? (swapQuote as bigint * BigInt(95)) / BigInt(100) : BigInt(0); // 5% slippage

    writeContract({
      address: CONTRACTS.POOL_MANAGER,
      abi: POOL_MANAGER_ABI,
      functionName: 'swap',
      args: [
        CONTRACTS.POOL_ID,
        tokenIn,
        parseUnits(swapFrom, decimalsIn),
        minAmountOut
      ],
    });
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl p-8 text-center max-w-md border border-white/20">
          <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">🔗</span>
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">SM DEX</h2>
          <p className="text-white/80 mb-8 text-lg">Swap, Add Liquidity & Earn</p>
          <ConnectButton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <span className="text-3xl">🔄</span>
            <div>
              <h1 className="text-2xl font-bold text-white">SM DEX</h1>
              <p className="text-white/60 text-sm">Swap, Add Liquidity & Earn</p>
            </div>
          </div>
          <ConnectButton />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Balance Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <span className="text-2xl">💰</span>
              <span className="text-white/60 text-sm">USDK Balance</span>
            </div>
            <p className="text-2xl font-bold text-blue-400">
              {formatBalance(usdkBalance as bigint, 6)}
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <span className="text-2xl">🐦</span>
              <span className="text-white/60 text-sm">KANARI Balance</span>
            </div>
            <p className="text-2xl font-bold text-green-400">
              {formatBalance(kanariBalance as bigint, 18)}
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <span className="text-2xl">🏊‍♂️</span>
              <span className="text-white/60 text-sm">Pool USDK</span>
            </div>
            <p className="text-2xl font-bold text-purple-400">
              {poolReserves ? formatBalance((poolReserves as any)[0], 6) : '0'}
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <span className="text-2xl">🏊‍♂️</span>
              <span className="text-white/60 text-sm">Pool KANARI</span>
            </div>
            <p className="text-2xl font-bold text-pink-400">
              {poolReserves ? formatBalance((poolReserves as any)[1], 18) : '0'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Swap Section */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="flex items-center space-x-3 mb-6">
              <span className="text-2xl">🔄</span>
              <h2 className="text-xl font-bold text-white">Swap Tokens</h2>
            </div>

            {/* From Token */}
            <div className="mb-4">
              <label className="text-white/80 text-sm mb-2 block">From</label>
              <div className="bg-black/20 rounded-xl p-4 border border-white/10">
                <div className="flex justify-between items-center mb-3">
                  <input
                    type="number"
                    placeholder="0.0"
                    value={swapFrom}
                    onChange={(e) => setSwapFrom(e.target.value)}
                    className="bg-transparent text-white text-2xl font-bold placeholder-white/40 outline-none flex-1"
                  />
                  <select
                    value={selectedFromToken}
                    onChange={(e) => setSelectedFromToken(e.target.value as 'USDK' | 'KANARI')}
                    className="bg-white/20 text-white rounded-lg px-3 py-2 outline-none"
                  >
                    <option value="USDK">USDK</option>
                    <option value="KANARI">KANARI</option>
                  </select>
                </div>
                <p className="text-white/60 text-sm">
                  Balance: {selectedFromToken === 'USDK' ? 
                    formatBalance(usdkBalance as bigint, 6) : 
                    formatBalance(kanariBalance as bigint, 18)}
                </p>
              </div>
            </div>

            {/* Swap Button */}
            <div className="flex justify-center my-4">
              <button
                onClick={handleSwapTokens}
                className="bg-white/20 hover:bg-white/30 rounded-full p-3 transition-all duration-200"
              >
                <span className="text-2xl">🔄</span>
              </button>
            </div>

            {/* To Token */}
            <div className="mb-6">
              <label className="text-white/80 text-sm mb-2 block">To</label>
              <div className="bg-black/20 rounded-xl p-4 border border-white/10">
                <div className="flex justify-between items-center mb-3">
                  <input
                    type="number"
                    placeholder="0.0"
                    value={swapTo}
                    readOnly
                    className="bg-transparent text-white text-2xl font-bold placeholder-white/40 outline-none flex-1"
                  />
                  <select
                    value={selectedToToken}
                    onChange={(e) => setSelectedToToken(e.target.value as 'USDK' | 'KANARI')}
                    className="bg-white/20 text-white rounded-lg px-3 py-2 outline-none"
                  >
                    <option value="USDK">USDK</option>
                    <option value="KANARI">KANARI</option>
                  </select>
                </div>
                <p className="text-white/60 text-sm">
                  Balance: {selectedToToken === 'USDK' ? 
                    formatBalance(usdkBalance as bigint, 6) : 
                    formatBalance(kanariBalance as bigint, 18)}
                </p>
              </div>
            </div>

            <button
              onClick={handleSwap}
              disabled={isPending || isConfirming || !swapFrom}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-4 rounded-xl transition-all duration-200 disabled:opacity-50"
            >
              {isPending || isConfirming ? '⏳ Processing...' : '🔄 Swap'}
            </button>
          </div>

          {/* Add Liquidity Section */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="flex items-center space-x-3 mb-6">
              <span className="text-2xl">💧</span>
              <h2 className="text-xl font-bold text-white">Add Liquidity</h2>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="text-white/80 text-sm mb-2 block">USDK Amount</label>
                <input
                  type="number"
                  placeholder="0.0"
                  value={liquidityUSDK}
                  onChange={(e) => setLiquidityUSDK(e.target.value)}
                  className="w-full bg-black/20 text-white rounded-xl p-4 border border-white/10 outline-none placeholder-white/40"
                />
              </div>

              <div>
                <label className="text-white/80 text-sm mb-2 block">KANARI Amount</label>
                <input
                  type="number"
                  placeholder="0.0"
                  value={liquidityKANARI}
                  onChange={(e) => setLiquidityKANARI(e.target.value)}
                  className="w-full bg-black/20 text-white rounded-xl p-4 border border-white/10 outline-none placeholder-white/40"
                />
              </div>
            </div>

            {/* Your Liquidity Position */}
            <div className="bg-black/20 rounded-xl p-4 mb-6 border border-white/10">
              <h3 className="text-white/80 font-medium mb-2">Your Liquidity Position</h3>
              <p className="text-white text-lg">
                {userLiquidity ? formatBalance(userLiquidity as bigint, 18) : '0'} LP Tokens
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                onClick={handleApproveUSDK}
                disabled={isPending || isConfirming}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-50"
              >
                Approve USDK
              </button>
              <button
                onClick={handleApproveKANARI}
                disabled={isPending || isConfirming}
                className="bg-green-600 hover:bg-green-700 text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-50"
              >
                Approve KANARI
              </button>
            </div>

            <button
              onClick={handleAddLiquidity}
              disabled={isPending || isConfirming || !liquidityUSDK || !liquidityKANARI}
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold py-4 rounded-xl transition-all duration-200 disabled:opacity-50"
            >
              {isPending || isConfirming ? '⏳ Processing...' : '💧 Add Liquidity'}
            </button>
          </div>
        </div>

        {/* Mint Section (for testing) */}
        <div className="mt-8 bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
          <div className="flex items-center space-x-3 mb-6">
            <span className="text-2xl">🎭</span>
            <h2 className="text-xl font-bold text-white">Mint Tokens (สำหรับทดสอบ)</h2>
          </div>

          {/* Debug Info */}
          <div className="mb-4 p-4 bg-black/20 rounded-xl text-sm text-white/60">
            <p>Connected Address: {address || 'ไม่ได้เชื่อมต่อ'}</p>
            <p>USDK Contract: {CONTRACTS.USDK}</p>
            <p>KANARI Contract: {CONTRACTS.KANARI}</p>
            <p>Pool Manager: {CONTRACTS.POOL_MANAGER}</p>
            {error && <p className="text-red-400">Error: {error.message}</p>}
            {isPending && <p className="text-yellow-400">Transaction pending...</p>}
            {isConfirming && <p className="text-blue-400">Confirming transaction...</p>}
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <input
              type="number"
              placeholder="จำนวนที่ต้องการ mint"
              value={mintAmount}
              onChange={(e) => setMintAmount(e.target.value)}
              className="flex-1 bg-black/20 text-white rounded-xl p-4 border border-white/10 outline-none placeholder-white/40"
            />
            <div className="flex gap-3">
              <button
                onClick={handleMintUSDK}
                disabled={isPending || isConfirming || !mintAmount}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-xl transition-colors disabled:opacity-50"
              >
                {isPending || isConfirming ? '⏳' : '💰'} Mint USDK
              </button>
              <button
                onClick={handleMintKANARI}
                disabled={isPending || isConfirming || !mintAmount}
                className="bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-xl transition-colors disabled:opacity-50"
              >
                {isPending || isConfirming ? '⏳' : '🐦'} Mint KANARI
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
