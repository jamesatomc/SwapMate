// Contract addresses from latest deployment
export const CONTRACTS = {
  // Token addresses
  USDC: "0xcC11f370fe6126b36D634FC1D2CCbC1F72599199" as const,
  KANARI: "0xcefB699Cf39C5462CaD926920f869a252FDE09EC" as const,

  // DEX Infrastructure
  DEX_FACTORY: "0xb24361e65059537C684014FC9aa903d60B3290dc" as const,
  KANARI_NATIVE_POOL: "0xeD415A516A0F83e27314Ddc8fb12bB3fd572D260" as const,
  FARMING: "0xEA4054041b1c65308a0D2F2d88DEa0f107A0c85A" as const,

} as const;

// Pool configurations for different trading pairs
export const POOLS = {
  'KANARI-NATIVE': {
    address: CONTRACTS.KANARI_NATIVE_POOL,
    tokenA: 'NATIVE' as TokenKey,
    tokenB: 'KANARI' as TokenKey,
    name: 'sBTC/KANARI',
    description: 'KANARI paired with native sBTC (Dev fee: 0.1%)',
    hasFeeCollection: true,
    devFee: '0.1%',
    tradingFee: '0.3%'
  }
} as const;


export type PoolKey = keyof typeof POOLS;

// Token definitions
export const TOKENS = {
  NATIVE: {
    address: "0x0000000000000000000000000000000000000000" as const,
    name: "sBTC",
    symbol: "sBTC",
    decimals: 18,
    icon: "₿",
    color: "bg-orange-500"
  },
  USDC: {
    address: CONTRACTS.USDC,
    name: "USD Coin",
    symbol: "USDC",
    decimals: 18,
    icon: "U",
    color: "bg-blue-500"
  },
  KANARI: {
    address: CONTRACTS.KANARI,
    name: "Kanari Token",
    symbol: "KANARI", 
    decimals: 18,
    icon: "K",
    color: "bg-orange-400"
  }
} as const;

export type TokenKey = keyof typeof TOKENS;

// ABI definitions for contracts
export const USDC_ABI = [
  {
    "type": "function",
    "name": "name",
    "inputs": [],
    "outputs": [{"type": "string", "name": ""}],
    "stateMutability": "view"
  },
  {
    "type": "function", 
    "name": "symbol",
    "inputs": [],
    "outputs": [{"type": "string", "name": ""}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "decimals", 
    "inputs": [],
    "outputs": [{"type": "uint8", "name": ""}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "totalSupply",
    "inputs": [],
    "outputs": [{"type": "uint256", "name": ""}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "balanceOf",
    "inputs": [{"type": "address", "name": "account"}],
    "outputs": [{"type": "uint256", "name": ""}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "transfer",
    "inputs": [
      {"type": "address", "name": "to"},
      {"type": "uint256", "name": "amount"}
    ],
    "outputs": [{"type": "bool", "name": ""}],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "approve",
    "inputs": [
      {"type": "address", "name": "spender"},
      {"type": "uint256", "name": "amount"}
    ],
    "outputs": [{"type": "bool", "name": ""}],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "allowance",
    "inputs": [
      {"type": "address", "name": "owner"},
      {"type": "address", "name": "spender"}
    ],
    "outputs": [{"type": "uint256", "name": ""}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "mint",
    "inputs": [
      {"type": "address", "name": "to"},
      {"type": "uint256", "name": "amount"}
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  }
] as const;

export const KANARI_ABI = [
  {
    "type": "function",
    "name": "name",
    "inputs": [],
    "outputs": [{ "type": "string", "name": "" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "symbol",
    "inputs": [],
    "outputs": [{ "type": "string", "name": "" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "decimals",
    "inputs": [],
    "outputs": [{ "type": "uint8", "name": "" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "totalSupply",
    "inputs": [],
    "outputs": [{ "type": "uint256", "name": "" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "balanceOf",
    "inputs": [{ "type": "address", "name": "account" }],
    "outputs": [{ "type": "uint256", "name": "" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "transfer",
    "inputs": [
      { "type": "address", "name": "to" },
      { "type": "uint256", "name": "amount" }
    ],
    "outputs": [{ "type": "bool", "name": "" }],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "approve",
    "inputs": [
      { "type": "address", "name": "spender" },
      { "type": "uint256", "name": "amount" }
    ],
    "outputs": [{ "type": "bool", "name": "" }],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "allowance",
    "inputs": [
      { "type": "address", "name": "owner" },
      { "type": "address", "name": "spender" }
    ],
    "outputs": [{ "type": "uint256", "name": "" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "mint",
    "inputs": [
      { "type": "address", "name": "to" },
      { "type": "uint256", "name": "amount" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  }
] as const;

export const SWAP_ABI = [
  // ERC20 LP Token functions
  {
    "type": "function",
    "name": "name",
    "inputs": [],
    "outputs": [{ "type": "string", "name": "" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "symbol",
    "inputs": [],
    "outputs": [{ "type": "string", "name": "" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "decimals",
    "inputs": [],
    "outputs": [{ "type": "uint8", "name": "" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "totalSupply",
    "inputs": [],
    "outputs": [{ "type": "uint256", "name": "" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "balanceOf",
    "inputs": [{ "type": "address", "name": "who" }],
    "outputs": [{ "type": "uint256", "name": "" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "allowance",
    "inputs": [
      { "type": "address", "name": "owner_" },
      { "type": "address", "name": "spender" }
    ],
    "outputs": [{ "type": "uint256", "name": "" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "approve",
    "inputs": [
      { "type": "address", "name": "spender" },
      { "type": "uint256", "name": "amount" }
    ],
    "outputs": [{ "type": "bool", "name": "" }],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "transfer",
    "inputs": [
      { "type": "address", "name": "to" },
      { "type": "uint256", "name": "amount" }
    ],
    "outputs": [{ "type": "bool", "name": "" }],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "transferFrom",
    "inputs": [
      { "type": "address", "name": "from" },
      { "type": "address", "name": "to" },
      { "type": "uint256", "name": "amount" }
    ],
    "outputs": [{ "type": "bool", "name": "" }],
    "stateMutability": "nonpayable"
  },
  // AMM Core functions
  {
    "type": "function",
    "name": "owner",
    "inputs": [],
    "outputs": [{ "type": "address", "name": "" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "tokenA",
    "inputs": [],
    "outputs": [{ "type": "address", "name": "" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "tokenB",
    "inputs": [],
    "outputs": [{ "type": "address", "name": "" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "feeBps",
    "inputs": [],
    "outputs": [{ "type": "uint256", "name": "" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getReserves",
    "inputs": [],
    "outputs": [
      { "type": "uint256", "name": "reserveA" },
      { "type": "uint256", "name": "reserveB" }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "addLiquidity",
    "inputs": [
      { "type": "uint256", "name": "amountA" },
      { "type": "uint256", "name": "amountB" },
      { "type": "uint256", "name": "minAmountA" },
      { "type": "uint256", "name": "minAmountB" },
      { "type": "uint256", "name": "deadline" }
    ],
    "outputs": [{ "type": "uint256", "name": "lpMinted" }],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "removeLiquidity",
    "inputs": [
      { "type": "uint256", "name": "lpAmount" },
      { "type": "uint256", "name": "minAmountA" },
      { "type": "uint256", "name": "minAmountB" },
      { "type": "uint256", "name": "deadline" }
    ],
    "outputs": [
      { "type": "uint256", "name": "amountA" },
      { "type": "uint256", "name": "amountB" }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "swap",
    "inputs": [
      { "type": "address", "name": "tokenIn" },
      { "type": "uint256", "name": "amountIn" },
      { "type": "uint256", "name": "minAmountOut" },
      { "type": "uint256", "name": "deadline" }
    ],
    "outputs": [{ "type": "uint256", "name": "amountOut" }],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "getAmountOut",
    "inputs": [
      { "type": "uint256", "name": "amountIn" },
      { "type": "address", "name": "tokenIn" }
    ],
    "outputs": [{ "type": "uint256", "name": "amountOut" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getPriceImpact",
    "inputs": [
      { "type": "uint256", "name": "amountIn" },
      { "type": "address", "name": "tokenIn" }
    ],
    "outputs": [{ "type": "uint256", "name": "impactBps" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "setFeeBps",
    "inputs": [{ "type": "uint256", "name": "newFee" }],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  // Fee Collection Functions (NEW)
  {
    "type": "function",
    "name": "feeRecipient",
    "inputs": [],
    "outputs": [{ "type": "address", "name": "" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "devFeeBps",
    "inputs": [],
    "outputs": [{ "type": "uint256", "name": "" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "setFeeRecipient",
    "inputs": [{ "type": "address", "name": "recipient" }],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setDevFeeBps",
    "inputs": [{ "type": "uint256", "name": "newDevFee" }],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "withdrawFees",
    "inputs": [
      { "type": "address", "name": "token" },
      { "type": "uint256", "name": "amount" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  // Events
  {
    "type": "event",
    "name": "Transfer",
    "inputs": [
      { "type": "address", "name": "from", "indexed": true },
      { "type": "address", "name": "to", "indexed": true },
      { "type": "uint256", "name": "value", "indexed": false }
    ]
  },
  {
    "type": "event",
    "name": "Approval",
    "inputs": [
      { "type": "address", "name": "owner", "indexed": true },
      { "type": "address", "name": "spender", "indexed": true },
      { "type": "uint256", "name": "value", "indexed": false }
    ]
  },
  {
    "type": "event",
    "name": "LiquidityAdded",
    "inputs": [
      { "type": "address", "name": "provider", "indexed": true },
      { "type": "uint256", "name": "amountA", "indexed": false },
      { "type": "uint256", "name": "amountB", "indexed": false },
      { "type": "uint256", "name": "lpMinted", "indexed": false }
    ]
  },
  {
    "type": "event",
    "name": "LiquidityRemoved",
    "inputs": [
      { "type": "address", "name": "provider", "indexed": true },
      { "type": "uint256", "name": "amountA", "indexed": false },
      { "type": "uint256", "name": "amountB", "indexed": false },
      { "type": "uint256", "name": "lpBurned", "indexed": false }
    ]
  },
  {
    "type": "event",
    "name": "Swap",
    "inputs": [
      { "type": "address", "name": "trader", "indexed": true },
      { "type": "address", "name": "tokenIn", "indexed": false },
      { "type": "uint256", "name": "amountIn", "indexed": false },
      { "type": "address", "name": "tokenOut", "indexed": false },
      { "type": "uint256", "name": "amountOut", "indexed": false },
      { "type": "uint256", "name": "fee", "indexed": false }
    ]
  },
  {
    "type": "event",
    "name": "FeeUpdated",
    "inputs": [
      { "type": "uint256", "name": "newFeeBps", "indexed": false }
    ]
  },
  // Fee Collection Events (NEW)
  {
    "type": "event",
    "name": "FeesCollected",
    "inputs": [
      { "type": "address", "name": "recipient", "indexed": true },
      { "type": "uint256", "name": "amount", "indexed": false },
      { "type": "address", "name": "token", "indexed": false }
    ]
  },
  {
    "type": "event",
    "name": "DevFeeUpdated",
    "inputs": [
      { "type": "uint256", "name": "newDevFeeBps", "indexed": false }
    ]
  },
  {
    "type": "event",
    "name": "FeeRecipientUpdated",
    "inputs": [
      { "type": "address", "name": "newRecipient", "indexed": true }
    ]
  }
] as const;

// Farming Contract ABI (NEW)
export const FARMING_ABI = [
  {
    "type": "function",
    "name": "lpToken",
    "inputs": [],
    "outputs": [{ "type": "address", "name": "" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "rewardToken",
    "inputs": [],
    "outputs": [{ "type": "address", "name": "" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "rewardRate",
    "inputs": [],
    "outputs": [{ "type": "uint256", "name": "" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "periodFinish",
    "inputs": [],
    "outputs": [{ "type": "uint256", "name": "" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "lastUpdateTime",
    "inputs": [],
    "outputs": [{ "type": "uint256", "name": "" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "rewardPerTokenStored",
    "inputs": [],
    "outputs": [{ "type": "uint256", "name": "" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "totalSupply",
    "inputs": [],
    "outputs": [{ "type": "uint256", "name": "" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "balanceOf",
    "inputs": [{ "type": "address", "name": "account" }],
    "outputs": [{ "type": "uint256", "name": "" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "lastTimeRewardApplicable",
    "inputs": [],
    "outputs": [{ "type": "uint256", "name": "" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "rewardPerToken",
    "inputs": [],
    "outputs": [{ "type": "uint256", "name": "" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "earned",
    "inputs": [{ "type": "address", "name": "account" }],
    "outputs": [{ "type": "uint256", "name": "" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "stake",
    "inputs": [{ "type": "uint256", "name": "amount" }],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "withdraw",
    "inputs": [{ "type": "uint256", "name": "amount" }],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "claim",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "exit",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "emergencyWithdraw",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "fundRewards",
    "inputs": [
      { "type": "uint256", "name": "rewardAmount" },
      { "type": "uint256", "name": "duration" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "recoverERC20",
    "inputs": [
      { "type": "address", "name": "token" },
      { "type": "uint256", "name": "amount" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getPeriodFinish",
    "inputs": [],
    "outputs": [{ "type": "uint256", "name": "" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getRewardRate",
    "inputs": [],
    "outputs": [{ "type": "uint256", "name": "" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getRewardForDuration",
    "inputs": [],
    "outputs": [{ "type": "uint256", "name": "" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "isPaused",
    "inputs": [],
    "outputs": [{ "type": "bool", "name": "" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "pause",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "unpause",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  // Events
  {
    "type": "event",
    "name": "Staked",
    "inputs": [
      { "type": "address", "name": "user", "indexed": true },
      { "type": "uint256", "name": "amount", "indexed": false }
    ]
  },
  {
    "type": "event",
    "name": "Withdrawn",
    "inputs": [
      { "type": "address", "name": "user", "indexed": true },
      { "type": "uint256", "name": "amount", "indexed": false }
    ]
  },
  {
    "type": "event",
    "name": "RewardPaid",
    "inputs": [
      { "type": "address", "name": "user", "indexed": true },
      { "type": "uint256", "name": "reward", "indexed": false }
    ]
  },
  {
    "type": "event",
    "name": "RewardAdded",
    "inputs": [
      { "type": "uint256", "name": "reward", "indexed": false },
      { "type": "uint256", "name": "duration", "indexed": false }
    ]
  },
  {
    "type": "event",
    "name": "TokenRecovered",
    "inputs": [
      { "type": "address", "name": "token", "indexed": true },
      { "type": "uint256", "name": "amount", "indexed": false }
    ]
  },
  {
    "type": "event",
    "name": "EmergencyWithdraw",
    "inputs": [
      { "type": "address", "name": "user", "indexed": true },
      { "type": "uint256", "name": "amount", "indexed": false }
    ]
  }
] as const;


// DEX Factory ABI for creating new trading pairs
export const DEX_FACTORY_ABI = [
  {
    "type": "function",
    "name": "createPool",
    "inputs": [
      {"type": "address", "name": "tokenA"},
      {"type": "address", "name": "tokenB"}
    ],
    "outputs": [{"type": "address", "name": "pool"}],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getPool",
    "inputs": [
      {"type": "address", "name": "tokenA"},
      {"type": "address", "name": "tokenB"}
    ],
    "outputs": [{"type": "address", "name": "pool"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "allPools",
    "inputs": [{"type": "uint256", "name": "index"}],
    "outputs": [{"type": "address", "name": "pool"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "allPoolsLength",
    "inputs": [],
    "outputs": [{"type": "uint256", "name": "length"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "isPool",
    "inputs": [{"type": "address", "name": "pool"}],
    "outputs": [{"type": "bool", "name": ""}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "feeRecipient",
    "inputs": [],
    "outputs": [{"type": "address", "name": ""}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "defaultDevFeeBps",
    "inputs": [],
    "outputs": [{"type": "uint256", "name": ""}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "defaultFeeBps",
    "inputs": [],
    "outputs": [{"type": "uint256", "name": ""}],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "PoolCreated",
    "inputs": [
      {"type": "address", "name": "token0", "indexed": true},
      {"type": "address", "name": "token1", "indexed": true},
      {"type": "address", "name": "pool", "indexed": false},
      {"type": "uint256", "name": "poolCount", "indexed": false}
    ]
  }
] as const;
