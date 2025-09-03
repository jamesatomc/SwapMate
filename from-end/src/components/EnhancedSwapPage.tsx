"use client";

import React, { useEffect, useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useBalance } from 'wagmi';
import { parseEther, formatEther, formatUnits, parseUnits, Address } from 'viem';
import { CONTRACTS, USDK_ABI, KANARI_ABI, SWAP_ABI, TOKENS, TokenKey } from '@/lib/contracts';
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

export default function EnhancedSwapPage() {
  const { address, isConnected } = useAccount();
  
  // State for swap
  const [tokenIn, setTokenIn] = useState<TokenKey | CustomToken>('USDK');
  const [tokenOut, setTokenOut] = useState<TokenKey | CustomToken>('KANARI');
  const [amountIn, setAmountIn] = useState('');
  const [amountOut, setAmountOut] = useState('');
  const [slippage, setSlippage] = useState('0.5');
  const [isSwapping, setIsSwapping] = useState(false);
  const [showTokenSelectIn, setShowTokenSelectIn] = useState(false);
  const [showTokenSelectOut, setShowTokenSelectOut] = useState(false);
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

  const getTokenABI = (token: TokenKey | CustomToken) => {
    if (typeof token === 'string') {
      switch (token) {
        case 'KANARI': return KANARI_ABI;
        case 'USDK': return USDK_ABI;
        case 'NATIVE': return null; // Native token doesn't need ABI
        default: return ERC20_ABI;
      }
    }
    return ERC20_ABI;
  };

  // Check if pool exists for selected tokens
  useEffect(() => {
    const checkPoolExists = async () => {
      const addrIn = getTokenAddress(tokenIn);
      const addrOut = getTokenAddress(tokenOut);
      
      if (addrIn && addrOut && addrIn !== addrOut) {
        // Check if this is one of our existing pools
        const existingPools = [
          { a: TOKENS.KANARI.address, b: TOKENS.USDK.address, pool: CONTRACTS.KANARI_USDK_POOL },
          { a: TOKENS.KANARI.address, b: '0x0000000000000000000000000000000000000000', pool: CONTRACTS.KANARI_NATIVE_POOL },
          { a: TOKENS.USDK.address, b: '0x0000000000000000000000000000000000000000', pool: CONTRACTS.USDK_NATIVE_POOL }
        ];
        
        const existingPool = existingPools.find(p => 
          (p.a === addrIn && p.b === addrOut) || (p.a === addrOut && p.b === addrIn)
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
  }, [tokenIn, tokenOut]);

  // Read balances for selected tokens
  const { data: balanceIn } = useBalance({
    address: address,
    token: getTokenAddress(tokenIn) === '0x0000000000000000000000000000000000000000' ? undefined : getTokenAddress(tokenIn) as Address,
    query: { enabled: !!address }
  });

  const { data: balanceOut } = useBalance({
    address: address,
    token: getTokenAddress(tokenOut) === '0x0000000000000000000000000000000000000000' ? undefined : getTokenAddress(tokenOut) as Address,
    query: { enabled: !!address }
  });

  // Read custom token balances
  const { data: customBalanceIn } = useReadContract({
    address: typeof tokenIn !== 'string' ? tokenIn.address as Address : undefined,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address && typeof tokenIn !== 'string' }
  });

  const { data: customBalanceOut } = useReadContract({
    address: typeof tokenOut !== 'string' ? tokenOut.address as Address : undefined,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address && typeof tokenOut !== 'string' }
  });

  // Get formatted balance for display
  const getFormattedBalance = (token: TokenKey | CustomToken, isTokenIn: boolean): string => {
    let balance: bigint | undefined;
    if (typeof token === 'string' && (token === 'NATIVE' || getTokenAddress(token) === '0x0000000000000000000000000000000000000000')) {
      balance = isTokenIn ? balanceIn?.value : balanceOut?.value;
    } else if (typeof token !== 'string') {
      balance = isTokenIn ? customBalanceIn as bigint : customBalanceOut as bigint;
    } else {
      balance = isTokenIn ? balanceIn?.value : balanceOut?.value;
    }
    
    if (!balance) return '0';
    return formatUnits(balance, getTokenDecimals(token));
  };

  // Handle token approval
  const handleApprove = async () => {
    if (!amountIn || !poolAddress) return;
    
    const tokenAddress = getTokenAddress(tokenIn);
    const tokenABI = getTokenABI(tokenIn);
    
    if (tokenAddress === '0x0000000000000000000000000000000000000000' || !tokenABI) {
      // Native token doesn't need approval
      return;
    }

    writeContract({
      address: tokenAddress as Address,
      abi: tokenABI,
      functionName: 'approve',
      args: [poolAddress as Address, parseUnits(amountIn, getTokenDecimals(tokenIn))],
    });
  };

  // Handle swap
  const handleSwap = async () => {
    if (!amountIn || !poolAddress || !poolExists) return;
    
    setIsSwapping(true);
    
    try {
      const tokenInAddress = getTokenAddress(tokenIn);
      const minAmountOut = parseUnits(
        (parseFloat(amountOut) * (1 - parseFloat(slippage) / 100)).toString(),
        getTokenDecimals(tokenOut)
      );
      const deadline = Math.floor(Date.now() / 1000) + 1800; // 30 minutes
      
      const isNativeIn = tokenInAddress === '0x0000000000000000000000000000000000000000';
      
      if (isNativeIn) {
        // Swapping native token - send as value
        writeContract({
          address: poolAddress as Address,
          abi: SWAP_ABI,
          functionName: 'swap',
          args: [
            tokenInAddress as Address,
            parseUnits(amountIn, getTokenDecimals(tokenIn)),
            minAmountOut,
            BigInt(deadline)
          ],
          value: parseUnits(amountIn, 18),
        });
      } else {
        // Swapping ERC20 token
        writeContract({
          address: poolAddress as Address,
          abi: SWAP_ABI,
          functionName: 'swap',
          args: [
            tokenInAddress as Address,
            parseUnits(amountIn, getTokenDecimals(tokenIn)),
            minAmountOut,
            BigInt(deadline)
          ],
        });
      }
    } catch (error) {
      console.error('Swap failed:', error);
    } finally {
      setIsSwapping(false);
    }
  };

  // Swap tokens
  const handleSwapTokens = () => {
    const tempToken = tokenIn;
    const tempAmount = amountIn;
    setTokenIn(tokenOut);
    setTokenOut(tempToken);
    setAmountIn(amountOut);
    setAmountOut(tempAmount);
  };

  const isNativeToken = (token: TokenKey | CustomToken): boolean => {
    return typeof token === 'string' && token === 'NATIVE';
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg p-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Swap Tokens</h2>
        <p className="text-gray-600 mt-1">Trade tokens instantly</p>
      </div>

      {/* Pool Status */}
      {poolExists === false && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <span className="text-red-600 mr-2">❌</span>
            <div>
              <p className="text-sm font-medium text-red-800">No liquidity pool</p>
              <p className="text-xs text-red-700">No pool exists for this token pair</p>
            </div>
          </div>
        </div>
      )}

      {poolExists === true && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center">
            <span className="text-green-600 mr-2">✅</span>
            <div>
              <p className="text-sm font-medium text-green-800">Pool available</p>
              <p className="text-xs text-green-700 font-mono">{poolAddress}</p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* Token In */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">From</label>
          <div className="relative">
            <input
              type="number"
              value={amountIn}
              onChange={(e) => setAmountIn(e.target.value)}
              placeholder="0.0"
              className="w-full p-4 pr-32 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
            <button
              onClick={() => setShowTokenSelectIn(true)}
              className="absolute right-2 top-2 bottom-2 px-3 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <span className="font-medium">{getTokenSymbol(tokenIn)}</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>Balance: {parseFloat(getFormattedBalance(tokenIn, true)).toFixed(6)}</span>
            <button
              onClick={() => setAmountIn(getFormattedBalance(tokenIn, true))}
              className="text-orange-600 hover:text-orange-800 font-medium"
            >
              MAX
            </button>
          </div>
        </div>

        {/* Swap Button */}
        <div className="flex justify-center">
          <button
            onClick={handleSwapTokens}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </button>
        </div>

        {/* Token Out */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">To</label>
          <div className="relative">
            <input
              type="number"
              value={amountOut}
              onChange={(e) => setAmountOut(e.target.value)}
              placeholder="0.0"
              className="w-full p-4 pr-32 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
            <button
              onClick={() => setShowTokenSelectOut(true)}
              className="absolute right-2 top-2 bottom-2 px-3 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <span className="font-medium">{getTokenSymbol(tokenOut)}</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>Balance: {parseFloat(getFormattedBalance(tokenOut, false)).toFixed(6)}</span>
          </div>
        </div>

        {/* Slippage Settings */}
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

        {/* Action Buttons */}
        <div className="space-y-3">
          {!isNativeToken(tokenIn) && (
            <button
              onClick={handleApprove}
              disabled={!amountIn || isPending || isConfirming || !poolExists}
              className="w-full bg-orange-100 text-orange-700 py-3 px-4 rounded-lg font-medium hover:bg-orange-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending || isConfirming ? 'Approving...' : `Approve ${getTokenSymbol(tokenIn)}`}
            </button>
          )}
          
          <button
            onClick={handleSwap}
            disabled={!amountIn || !amountOut || isPending || isConfirming || isSwapping || !poolExists}
            className="w-full bg-orange-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending || isConfirming || isSwapping ? 'Swapping...' : 'Swap Tokens'}
          </button>
        </div>

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
      {showTokenSelectIn && (
        <TokenSelector
          selectedToken={tokenIn}
          onTokenSelect={setTokenIn}
          onClose={() => setShowTokenSelectIn(false)}
          excludeToken={tokenOut}
          title="Select Token to Swap From"
        />
      )}

      {showTokenSelectOut && (
        <TokenSelector
          selectedToken={tokenOut}
          onTokenSelect={setTokenOut}
          onClose={() => setShowTokenSelectOut(false)}
          excludeToken={tokenIn}
          title="Select Token to Swap To"
        />
      )}
    </div>
  );
}
