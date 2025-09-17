'use client';

import { http } from 'wagmi';
import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { defineChain } from 'viem';

// Define Ethereum Sepolia testnet as a custom chain
const ethSepolia = defineChain({
  id: 11155111,
  name: 'Ethereum Sepolia',
  network: 'sepolia',
  nativeCurrency: {
    decimals: 18,
    name: 'Ethereum',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { http: ['https://ethereum-sepolia-rpc.publicnode.com'] },
    public: { http: ['https://ethereum-sepolia-rpc.publicnode.com'] },
  },
  blockExplorers: {
    default: { name: 'Explorer', url: 'https://sepolia.etherscan.io' },
  },
});

// Create Wagmi config
const config = getDefaultConfig({
  appName: 'SM Token Interface',
  projectId: 'your-project-id', // Get from WalletConnect Cloud
  chains: [ethSepolia],
  transports: {
    [ethSepolia.id]: http('https://ethereum-sepolia-rpc.publicnode.com'),
  },
  ssr: true,
});

const queryClient = new QueryClient();

export function Web3Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
