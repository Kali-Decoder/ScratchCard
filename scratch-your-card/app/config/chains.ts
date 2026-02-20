import { Chain } from "viem";

// Somnia Testnet - Only supported network
export const somniaTestnet: Chain = {
  id: 50312,
  name: 'Somnia Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Somnia Test Token',
    symbol: 'STT',
  },
  rpcUrls: {
    default: {
      http: ['https://dream-rpc.somnia.network/'],
    },
    public: {
      http: ['https://dream-rpc.somnia.network/'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Somnia Explorer',
      url: 'https://shannon-explorer.somnia.network',
    },
  },
  testnet: true,
};

// Export only Somnia Testnet
export const allChains: Chain[] = [somniaTestnet];
export const mainnetChains: Chain[] = [];
export const testnetChains: Chain[] = [somniaTestnet];
export const popularChains: Chain[] = [somniaTestnet];

// Get chain by ID
export const getChainById = (chainId: number): Chain | undefined => {
  return chainId === somniaTestnet.id ? somniaTestnet : undefined;
};

// Get chain name with network type
export const getChainDisplayName = (chain: Chain): string => {
  return chain.name;
};
