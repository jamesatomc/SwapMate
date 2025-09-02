// Contract addresses from latest deployment
export const CONTRACTS = {
  // From DeployDEX deployment
  USDK: "0x8bd0eED7fBF4520F14FA70B35cDe45D83D4e13b6" as const,
  KANARI: "0x08ce40815dE4EbE10DbC06A71A967eF9D12e8645" as const,
  // Multiple DEX pools for different pairs
  SWAP: "0x9224A59e8CE52bd7A43dB38a7049CDdeAD535f63" as const, // Legacy - KANARI/USDK pool
  KANARI_USDK_POOL: "0x9224A59e8CE52bd7A43dB38a7049CDdeAD535f63" as const,
  KANARI_NATIVE_POOL: "0x6852F22199064a6caa463372B43320cE9bA6970C" as const,
  USDK_NATIVE_POOL: "0x38DB72fA85823d17E4C878FF6901931EA16ca95b" as const,
} as const;

// Pool configurations for different trading pairs
export const POOLS = {
  'KANARI-USDK': {
    address: CONTRACTS.KANARI_USDK_POOL,
    tokenA: 'KANARI' as TokenKey,
    tokenB: 'USDK' as TokenKey,
    name: 'KANARI/USDK',
    description: 'Main trading pair between KANARI and USDK'
  },
  'KANARI-NATIVE': {
    address: CONTRACTS.KANARI_NATIVE_POOL,
    tokenA: 'KANARI' as TokenKey,
    tokenB: 'NATIVE' as TokenKey,
    name: 'KANARI/sBTC',
    description: 'KANARI paired with native sBTC'
  },
  'USDK-NATIVE': {
    address: CONTRACTS.USDK_NATIVE_POOL,
    tokenA: 'USDK' as TokenKey,
    tokenB: 'NATIVE' as TokenKey,
    name: 'USDK/sBTC',
    description: 'USDK stablecoin paired with native sBTC'
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
  USDK: {
    address: CONTRACTS.USDK,
    name: "USD Kanari",
    symbol: "USDK",
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
export const USDK_ABI = [
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
