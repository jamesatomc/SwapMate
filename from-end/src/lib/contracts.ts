// Contract addresses from latest deployment
export const CONTRACTS = {
  // From InteractSystem deployment
  USDK: "0xCF64854FB0C8a50A1a096fc48bC59843bdEb688e" as const,
  KANARI: "0x1d1D334E3fe1c22B12D68af6B4Ffd8DFd4c1a5e7" as const,
  POOL_MANAGER: "0xd987b74317D396B89fF722997EbDC0B587eCC5E4" as const,
  POOL_ID: "0x1a91ae7761a8388babf7703093896d2af9c6b3bb8bdd6bba9b15edafc38b3fde" as const,
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

export const POOL_MANAGER_ABI = [
  {
    "type": "function",
    "name": "poolIdFor",
    "inputs": [
      {"type": "address", "name": "a"},
      {"type": "address", "name": "b"}
    ],
    "outputs": [{"type": "bytes32", "name": ""}],
    "stateMutability": "pure"
  },
  {
    "type": "function",
    "name": "getPool",
    "inputs": [{"type": "bytes32", "name": "id"}],
    "outputs": [
      {"type": "address", "name": "tokenA"},
      {"type": "address", "name": "tokenB"},
      {"type": "uint256", "name": "freeValue"},
      {"type": "bool", "name": "exists"}
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "addPool",
    "inputs": [
      {"type": "address", "name": "a"},
      {"type": "address", "name": "b"}
    ],
    "outputs": [{"type": "bytes32", "name": ""}],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setFreeValue",
    "inputs": [
      {"type": "bytes32", "name": "id"},
      {"type": "uint256", "name": "value"}
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "freeValueOf",
    "inputs": [
      {"type": "address", "name": "a"},
      {"type": "address", "name": "b"}
    ],
    "outputs": [{"type": "uint256", "name": ""}],
    "stateMutability": "view"
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
