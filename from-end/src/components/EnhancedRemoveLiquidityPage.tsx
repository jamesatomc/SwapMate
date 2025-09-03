"use client";

import React, { useEffect, useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useBalance } from 'wagmi';
import { formatUnits, parseUnits, Address, isAddress } from 'viem';
import { CONTRACTS, SWAP_ABI, TOKENS, TokenKey } from '@/lib/contracts';
import TokenSelector, { CustomToken } from './TokenSelector';

// Generic ERC20 ABI for custom tokens
const ERC20_ABI = [
  {
    "constant": true,
    "inputs": [{"name": "_owner", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"name": "balance", "type": "uint256"}],
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [{"name": "_spender", "type": "address"}, {"name": "_value", "type": "uint256"}],
    "name": "approve",
    "outputs": [{"name": "", "type": "bool"}],
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

export default function EnhancedRemoveLiquidityPage() {
  const { address, isConnected } = useAccount();
  
  // State for tokens and pool
  const [tokenA, setTokenA] = useState<TokenKey | CustomToken>('KANARI');
  const [tokenB, setTokenB] = useState<TokenKey | CustomToken>('USDK');
  const [lpAmount, setLpAmount] = useState('');
  const [percentage, setPercentage] = useState('25');
  const [slippage, setSlippage] = useState('0.5');
  const [isRemovingLiquidity, setIsRemovingLiquidity] = useState(false);
  
  // UI state
  const [showTokenSelectorA, setShowTokenSelectorA] = useState(false);
  const [showTokenSelectorB, setShowTokenSelectorB] = useState(false);
  const [poolAddress, setPoolAddress] = useState<string>('');
  const [poolExists, setPoolExists] = useState<boolean | null>(null);

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // Helper functions to get token info
  const getTokenAddress = (token: TokenKey | CustomToken): string => {
    if (typeof token === 'string') {
      if (token === 'NATIVE') return '0x0000000000000000000000000000000000000000';
      return TOKENS[token].address;
    }
    return token.address;
  };

  const getTokenSymbol = (token: TokenKey | CustomToken): string => {
    if (typeof token === 'string') {
      if (token === 'NATIVE') return 'sBTC';
      return TOKENS[token].symbol;
    }
    return token.symbol;
  };

  const getTokenDecimals = (token: TokenKey | CustomToken): number => {
    if (typeof token === 'string') {
      if (token === 'NATIVE') return 18;
      return TOKENS[token].decimals;
    }
    return token.decimals;
  };

  // Check if pool exists for selected tokens
  useEffect(() => {
    const checkPoolExists = async () => {
      const addrA = getTokenAddress(tokenA);
      const addrB = getTokenAddress(tokenB);
      
      if (addrA && addrB && addrA !== addrB) {
        // Check if this is one of our existing pools
        const existingPools = [
          { a: TOKENS.KANARI.address, b: TOKENS.USDK.address, pool: CONTRACTS.KANARI_USDK_POOL },
          { a: TOKENS.KANARI.address, b: '0x0000000000000000000000000000000000000000', pool: CONTRACTS.KANARI_NATIVE_POOL },
          { a: TOKENS.USDK.address, b: '0x0000000000000000000000000000000000000000', pool: CONTRACTS.USDK_NATIVE_POOL }
        ];
        
        const existingPool = existingPools.find(p => 
          (p.a === addrA && p.b === addrB) || (p.a === addrB && p.b === addrA)
        );
        
        if (existingPool) {
          setPoolAddress(existingPool.pool);
          setPoolExists(true);
        } else {
          setPoolAddress('');
          setPoolExists(false);
        }
      }
    };
    
    checkPoolExists();
  }, [tokenA, tokenB]);

  // Read LP token balance
  const { data: lpBalance, refetch: refetchLpBalance } = useReadContract({
    address: poolAddress ? poolAddress as Address : undefined,
    abi: SWAP_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!poolAddress }
  });

  // Read pool reserves
  const { data: reserves } = useReadContract({
    address: poolAddress ? poolAddress as Address : undefined,
    abi: SWAP_ABI,
    functionName: 'getReserves',
    query: { enabled: !!poolAddress }
  });

  // Read total supply
  const { data: totalSupply } = useReadContract({
    address: poolAddress ? poolAddress as Address : undefined,
    abi: SWAP_ABI,
    functionName: 'totalSupply',
    query: { enabled: !!poolAddress }
  });

  // Calculate expected amounts when removing liquidity
  const calculateExpectedAmounts = (): { amountA: string; amountB: string } => {
    if (!reserves || !totalSupply || !lpAmount || totalSupply === BigInt(0)) {
      return { amountA: '0', amountB: '0' };
    }

    const [reserveA, reserveB] = reserves as [bigint, bigint];
    const lpAmountBigInt = parseUnits(lpAmount, 18);
    
    const amountA = (lpAmountBigInt * reserveA) / totalSupply;
    const amountB = (lpAmountBigInt * reserveB) / totalSupply;
    
    return {
      amountA: formatUnits(amountA, getTokenDecimals(tokenA)),
      amountB: formatUnits(amountB, getTokenDecimals(tokenB))
    };
  };

  const expectedAmounts = calculateExpectedAmounts();

  // Handle percentage selection
  const handlePercentageSelect = (percent: string) => {
    setPercentage(percent);
    if (lpBalance) {
      const amount = (BigInt(percent) * lpBalance) / BigInt(100);
      setLpAmount(formatUnits(amount, 18));
    }
  };

  // Handle remove liquidity
  const handleRemoveLiquidity = async () => {
    if (!lpAmount || !poolAddress || !poolExists) return;
    
    setIsRemovingLiquidity(true);
    
    try {
      const lpAmountBigInt = parseUnits(lpAmount, 18);
      const minAmountA = parseUnits(
        (parseFloat(expectedAmounts.amountA) * (1 - parseFloat(slippage) / 100)).toString(),
        getTokenDecimals(tokenA)
      );
      const minAmountB = parseUnits(
        (parseFloat(expectedAmounts.amountB) * (1 - parseFloat(slippage) / 100)).toString(),
        getTokenDecimals(tokenB)
      );
      const deadline = Math.floor(Date.now() / 1000) + 1800; // 30 minutes

      writeContract({
        address: poolAddress as Address,
        abi: SWAP_ABI,
        functionName: 'removeLiquidity',
        args: [
          lpAmountBigInt,
          minAmountA,
          minAmountB,
          BigInt(deadline)
        ],
      });
    } catch (error) {
      console.error('Remove liquidity failed:', error);
    } finally {
      setIsRemovingLiquidity(false);
    }
  };

  // Swap tokens A and B
  const handleSwapTokens = () => {
    const tempToken = tokenA;
    setTokenA(tokenB);
    setTokenB(tempToken);
  };

  // Get formatted LP balance
  const getFormattedLpBalance = (): string => {
    if (!lpBalance) return '0';
    return formatUnits(lpBalance, 18);
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg p-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Remove Liquidity</h2>
        <p className="text-gray-600 mt-1">Remove tokens from liquidity pools</p>
      </div>

      {/* Pool Status */}
      {poolExists === false && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <span className="text-red-600 mr-2">❌</span>
            <div>
              <p className="text-sm font-medium text-red-800">Pool not found</p>
              <p className="text-xs text-red-700">No liquidity pool exists for this token pair</p>
            </div>
          </div>
        </div>
      )}

      {poolExists === true && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center">
            <span className="text-green-600 mr-2">✅</span>
            <div>
              <p className="text-sm font-medium text-green-800">Pool found</p>
              <p className="text-xs text-green-700 font-mono">{poolAddress}</p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* Token Pair Selection */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <label className="block text-sm font-medium text-gray-700 mb-3">Select Token Pair</label>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowTokenSelectorA(true)}
              className="flex-1 p-3 bg-white border border-gray-300 rounded-lg hover:border-orange-300 transition-colors"
            >
              <div className="text-center">
                <div className="font-medium">{getTokenSymbol(tokenA)}</div>
                <div className="text-xs text-gray-500">{getTokenAddress(tokenA).slice(0, 8)}...</div>
              </div>
            </button>
            
            <button
              onClick={handleSwapTokens}
              className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </button>
            
            <button
              onClick={() => setShowTokenSelectorB(true)}
              className="flex-1 p-3 bg-white border border-gray-300 rounded-lg hover:border-orange-300 transition-colors"
            >
              <div className="text-center">
                <div className="font-medium">{getTokenSymbol(tokenB)}</div>
                <div className="text-xs text-gray-500">{getTokenAddress(tokenB).slice(0, 8)}...</div>
              </div>
            </button>
          </div>
        </div>

        {/* LP Balance Display */}
        {poolExists && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-blue-800">Your LP Tokens</span>
              <span className="text-lg font-bold text-blue-900">{parseFloat(getFormattedLpBalance()).toFixed(6)}</span>
            </div>
          </div>
        )}

        {/* Percentage Selection */}
        {poolExists && (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">Remove Amount</label>
            <div className="grid grid-cols-4 gap-2">
              {['25', '50', '75', '100'].map((percent) => (
                <button
                  key={percent}
                  onClick={() => handlePercentageSelect(percent)}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    percentage === percent
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {percent}%
                </button>
              ))}
            </div>
            
            <div className="space-y-2">
              <input
                type="number"
                value={lpAmount}
                onChange={(e) => setLpAmount(e.target.value)}
                placeholder="LP Amount"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>LP Tokens to Remove</span>
                <button
                  onClick={() => setLpAmount(getFormattedLpBalance())}
                  className="text-orange-600 hover:text-orange-800 font-medium"
                >
                  MAX
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Expected Output */}
        {poolExists && lpAmount && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-3">You will receive</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{getTokenSymbol(tokenA)}</span>
                <span className="font-medium">{parseFloat(expectedAmounts.amountA).toFixed(6)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{getTokenSymbol(tokenB)}</span>
                <span className="font-medium">{parseFloat(expectedAmounts.amountB).toFixed(6)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Slippage Settings */}
        {poolExists && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">Slippage Tolerance</label>
            <div className="flex space-x-2">
              {['0.1', '0.5', '1.0'].map((value) => (
                <button
                  key={value}
                  onClick={() => setSlippage(value)}
                  className={`px-3 py-1 rounded text-sm ${
                    slippage === value
                      ? 'bg-orange-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {value}%
                </button>
              ))}
              <input
                type="number"
                value={slippage}
                onChange={(e) => setSlippage(e.target.value)}
                placeholder="Custom"
                className="flex-1 px-3 py-1 border border-gray-300 rounded text-sm"
              />
            </div>
          </div>
        )}

        {/* Remove Liquidity Button */}
        <button
          onClick={handleRemoveLiquidity}
          disabled={!lpAmount || isPending || isConfirming || isRemovingLiquidity || !poolExists}
          className="w-full bg-red-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending || isConfirming || isRemovingLiquidity ? 'Removing Liquidity...' : 'Remove Liquidity'}
        </button>

        {/* Transaction Status */}
        {hash && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              {isConfirming && 'Waiting for confirmation...'}
              {isConfirmed && 'Transaction confirmed!'}
            </p>
            <p className="text-xs text-blue-600 font-mono break-all mt-1">
              {hash}
            </p>
          </div>
        )}
      </div>

      {/* Token Selectors */}
      {showTokenSelectorA && (
        <TokenSelector
          selectedToken={tokenA}
          onTokenSelect={setTokenA}
          onClose={() => setShowTokenSelectorA(false)}
          excludeToken={tokenB}
          title="Select First Token"
        />
      )}

      {showTokenSelectorB && (
        <TokenSelector
          selectedToken={tokenB}
          onTokenSelect={setTokenB}
          onClose={() => setShowTokenSelectorB(false)}
          excludeToken={tokenA}
          title="Select Second Token"
        />
      )}
    </div>
  );
}
