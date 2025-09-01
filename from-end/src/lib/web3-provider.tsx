'use client';

import { createConfig, http } from 'wagmi';
import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { defineChain } from 'viem';

// Define Alpen Labs testnet as a custom chain
const alpenTestnet = defineChain({
  id: 2892,
  name: 'Alpen Labs Testnet',
  network: 'alpenlabs-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'sBTC',
    symbol: 'BTC',
  },
  rpcUrls: {
    default: { http: ['https://rpc.testnet.alpenlabs.io'] },
    public: { http: ['https://rpc.testnet.alpenlabs.io'] },
  },
  blockExplorers: {
    default: { name: 'Explorer', url: 'https://explorer.testnet.alpenlabs.io' },
  },
});

// Create Wagmi config
const config = getDefaultConfig({
  appName: 'SM Token Interface',
  projectId: 'your-project-id', // Get from WalletConnect Cloud
  chains: [alpenTestnet],
  transports: {
    [alpenTestnet.id]: http('https://rpc.testnet.alpenlabs.io'),
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
