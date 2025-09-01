// Contract addresses from latest deployment
export const CONTRACTS = {
  // From InteractSystem deployment
  USDK: "0xd644E59B6D64e5eA67B723BD99Eb7de00417BdDf" as const,
  KANARI: "0x4DF06d3117e4228BBD6Cd76A73896ED4B0c77160" as const,
  SWAP: "0x417F82E4F39893eA70612B774A8aeaEf6E1a1FC7" as const,
} as const;

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
      {"type": "uint256", "name": "amountOut", "indexed": false}
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
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    public: { http: ['https://rpc.testnet.alpenlabs.io'] },
    default: { http: ['https://rpc.testnet.alpenlabs.io'] },
  },
  blockExplorers: {
    default: { name: 'Explorer', url: 'https://explorer.testnet.alpenlabs.io' },
  },
} as const;
