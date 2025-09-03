// Contract addresses from latest deployment
export const CONTRACTS = {
  // Token addresses
  USDC: "0xcC11f370fe6126b36D634FC1D2CCbC1F72599199" as const,
  KANARI: "0x70C79817a33b764BC04F1c423C61d484fAE38624" as const,
  
  // DEX Infrastructure
  DEX_FACTORY: "0x84d549dD7006c96C8559b4b373A7653AEC9cD67e" as const,
  KANARI_USDC_POOL: "0xD1bF50a5a67466c2000b3Bbe6dbF762C795CA8a5" as const,
  KANARI_NATIVE_POOL: "0x1e953FbFca405F46aa8EF3C4079F1200b4d0634b" as const,
  USDC_NATIVE_POOL: "0x5139292E4EA267fce9F60c046eB12Eb7533144E8" as const,
  FARMING: "0x2e57223CDA40497e6D792ffFDB7879dD7894845d" as const,
  
} as const;

// Pool configurations for different trading pairs
export const POOLS = {
  'KANARI-USDC': {
    address: CONTRACTS.KANARI_USDC_POOL,
    tokenA: 'KANARI' as TokenKey,
    tokenB: 'USDC' as TokenKey,
    name: 'KANARI/USDC',
    description: 'Main trading pair with fee collection (Dev fee: 0.1%)',
    hasFeeCollection: true,
    devFee: '0.1%',
    tradingFee: '0.3%'
  },
  'KANARI-NATIVE': {
    address: CONTRACTS.KANARI_NATIVE_POOL,
    tokenA: 'KANARI' as TokenKey,
    tokenB: 'NATIVE' as TokenKey,
    name: 'KANARI/sBTC',
    description: 'KANARI paired with native sBTC (Dev fee: 0.1%)',
    hasFeeCollection: true,
    devFee: '0.1%',
    tradingFee: '0.3%'
  },
  'USDC-NATIVE': {
    address: CONTRACTS.USDC_NATIVE_POOL,
    tokenA: 'USDC' as TokenKey,
    tokenB: 'NATIVE' as TokenKey,
    name: 'USDC/sBTC',
    description: 'USDC stablecoin paired with native sBTC (Dev fee: 0.1%)',
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

export const SWAP_ABI = [
  // ERC20 LP Token functions
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
    "inputs": [{"type": "address", "name": "who"}],
    "outputs": [{"type": "uint256", "name": ""}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "allowance",
    "inputs": [
      {"type": "address", "name": "owner_"},
      {"type": "address", "name": "spender"}
    ],
    "outputs": [{"type": "uint256", "name": ""}],
    "stateMutability": "view"
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
    "name": "transferFrom",
    "inputs": [
      {"type": "address", "name": "from"},
      {"type": "address", "name": "to"},
      {"type": "uint256", "name": "amount"}
    ],
    "outputs": [{"type": "bool", "name": ""}],
    "stateMutability": "nonpayable"
  },
  // AMM Core functions
  {
    "type": "function",
    "name": "owner",
    "inputs": [],
    "outputs": [{"type": "address", "name": ""}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "tokenA",
    "inputs": [],
    "outputs": [{"type": "address", "name": ""}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "tokenB",
    "inputs": [],
    "outputs": [{"type": "address", "name": ""}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "feeBps",
    "inputs": [],
    "outputs": [{"type": "uint256", "name": ""}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getReserves",
    "inputs": [],
    "outputs": [
      {"type": "uint256", "name": "reserveA"},
      {"type": "uint256", "name": "reserveB"}
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "addLiquidity",
    "inputs": [
      {"type": "uint256", "name": "amountA"},
      {"type": "uint256", "name": "amountB"},
      {"type": "uint256", "name": "minAmountA"},
      {"type": "uint256", "name": "minAmountB"},
      {"type": "uint256", "name": "deadline"}
    ],
    "outputs": [{"type": "uint256", "name": "lpMinted"}],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "removeLiquidity",
    "inputs": [
      {"type": "uint256", "name": "lpAmount"},
      {"type": "uint256", "name": "minAmountA"},
      {"type": "uint256", "name": "minAmountB"},
      {"type": "uint256", "name": "deadline"}
    ],
    "outputs": [
      {"type": "uint256", "name": "amountA"},
      {"type": "uint256", "name": "amountB"}
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "swap",
    "inputs": [
      {"type": "address", "name": "tokenIn"},
      {"type": "uint256", "name": "amountIn"},
      {"type": "uint256", "name": "minAmountOut"},
      {"type": "uint256", "name": "deadline"}
    ],
    "outputs": [{"type": "uint256", "name": "amountOut"}],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "getAmountOut",
    "inputs": [
      {"type": "uint256", "name": "amountIn"},
      {"type": "address", "name": "tokenIn"}
    ],
    "outputs": [{"type": "uint256", "name": "amountOut"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getPriceImpact",
    "inputs": [
      {"type": "uint256", "name": "amountIn"},
      {"type": "address", "name": "tokenIn"}
    ],
    "outputs": [{"type": "uint256", "name": "impactBps"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "setFeeBps",
    "inputs": [{"type": "uint256", "name": "newFee"}],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  // Fee Collection Functions (NEW)
  {
    "type": "function",
    "name": "feeRecipient",
    "inputs": [],
    "outputs": [{"type": "address", "name": ""}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "devFeeBps",
    "inputs": [],
    "outputs": [{"type": "uint256", "name": ""}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "setFeeRecipient",
    "inputs": [{"type": "address", "name": "recipient"}],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setDevFeeBps",
    "inputs": [{"type": "uint256", "name": "newDevFee"}],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "withdrawFees",
    "inputs": [
      {"type": "address", "name": "token"},
      {"type": "uint256", "name": "amount"}
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  // Events
  {
    "type": "event",
    "name": "Transfer",
    "inputs": [
      {"type": "address", "name": "from", "indexed": true},
      {"type": "address", "name": "to", "indexed": true},
      {"type": "uint256", "name": "value", "indexed": false}
    ]
  },
  {
    "type": "event",
    "name": "Approval",
    "inputs": [
      {"type": "address", "name": "owner", "indexed": true},
      {"type": "address", "name": "spender", "indexed": true},
      {"type": "uint256", "name": "value", "indexed": false}
    ]
  },
  {
    "type": "event",
    "name": "LiquidityAdded",
    "inputs": [
      {"type": "address", "name": "provider", "indexed": true},
      {"type": "uint256", "name": "amountA", "indexed": false},
      {"type": "uint256", "name": "amountB", "indexed": false},
      {"type": "uint256", "name": "lpMinted", "indexed": false}
    ]
  },
  {
    "type": "event",
    "name": "LiquidityRemoved",
    "inputs": [
      {"type": "address", "name": "provider", "indexed": true},
      {"type": "uint256", "name": "amountA", "indexed": false},
      {"type": "uint256", "name": "amountB", "indexed": false},
      {"type": "uint256", "name": "lpBurned", "indexed": false}
    ]
  },
  {
    "type": "event",
    "name": "Swap",
    "inputs": [
      {"type": "address", "name": "trader", "indexed": true},
      {"type": "address", "name": "tokenIn", "indexed": false},
      {"type": "uint256", "name": "amountIn", "indexed": false},
      {"type": "address", "name": "tokenOut", "indexed": false},
      {"type": "uint256", "name": "amountOut", "indexed": false},
      {"type": "uint256", "name": "fee", "indexed": false}
    ]
  },
  {
    "type": "event",
    "name": "FeeUpdated",
    "inputs": [
      {"type": "uint256", "name": "newFeeBps", "indexed": false}
    ]
  },
  // Fee Collection Events (NEW)
  {
    "type": "event",
    "name": "FeesCollected",
    "inputs": [
      {"type": "address", "name": "recipient", "indexed": true},
      {"type": "uint256", "name": "amount", "indexed": false},
      {"type": "address", "name": "token", "indexed": false}
    ]
  },
  {
    "type": "event",
    "name": "DevFeeUpdated",
    "inputs": [
      {"type": "uint256", "name": "newDevFeeBps", "indexed": false}
    ]
  },
  {
    "type": "event",
    "name": "FeeRecipientUpdated",
    "inputs": [
      {"type": "address", "name": "newRecipient", "indexed": true}
    ]
  }
] as const;

// Farming Contract ABI (NEW)
export const FARMING_ABI = [
  // View functions
  {
    "type": "function",
    "name": "lpToken",
    "inputs": [],
    "outputs": [{"type": "address", "name": ""}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "rewardToken",
    "inputs": [],
    "outputs": [{"type": "address", "name": ""}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "totalStaked",
    "inputs": [],
    "outputs": [{"type": "uint256", "name": ""}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "rewardRate",
    "inputs": [],
    "outputs": [{"type": "uint256", "name": ""}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "periodFinish",
    "inputs": [],
    "outputs": [{"type": "uint256", "name": ""}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "paused",
    "inputs": [],
    "outputs": [{"type": "bool", "name": ""}],
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
    "name": "earned",
    "inputs": [{"type": "address", "name": "account"}],
    "outputs": [{"type": "uint256", "name": ""}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getRewardForDuration",
    "inputs": [],
    "outputs": [{"type": "uint256", "name": ""}],
    "stateMutability": "view"
  },
  // State-changing functions
  {
    "type": "function",
    "name": "stake",
    "inputs": [{"type": "uint256", "name": "amount"}],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "withdraw",
    "inputs": [{"type": "uint256", "name": "amount"}],
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
  // Owner functions
  {
    "type": "function",
    "name": "fundRewards",
    "inputs": [
      {"type": "uint256", "name": "amount"},
      {"type": "uint256", "name": "duration"}
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
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
      {"type": "address", "name": "user", "indexed": true},
      {"type": "uint256", "name": "amount", "indexed": false}
    ]
  },
  {
    "type": "event",
    "name": "Withdrawn",
    "inputs": [
      {"type": "address", "name": "user", "indexed": true},
      {"type": "uint256", "name": "amount", "indexed": false}
    ]
  },
  {
    "type": "event",
    "name": "RewardPaid",
    "inputs": [
      {"type": "address", "name": "user", "indexed": true},
      {"type": "uint256", "name": "reward", "indexed": false}
    ]
  },
  {
    "type": "event",
    "name": "RewardAdded",
    "inputs": [
      {"type": "uint256", "name": "reward", "indexed": false}
    ]
  }
] as const;

// Chain configuration for Alpen Labs testnet
export const ALPEN_TESTNET = {
  id: 2892,
  name: 'Alpen Labs Testnet',
  network: 'alpenlabs-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'sBTC',
    symbol: 'sBTC',
  },
  rpcUrls: {
    public: { http: ['https://rpc.testnet.alpenlabs.io'] },
    default: { http: ['https://rpc.testnet.alpenlabs.io'] },
  },
  blockExplorers: {
    default: { name: 'Explorer', url: 'https://explorer.testnet.alpenlabs.io' },
  },
} as const;
