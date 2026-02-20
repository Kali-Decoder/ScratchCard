import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
import "@nomicfoundation/hardhat-verify";
dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.30",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
      metadata: {
        bytecodeHash: "none",
        useLiteralContent: true,
      },
    },
  },
  networks: {
    somniaMainnet: {
      url: process.env.SOMNIA_MAINNET_RPC_URL || "https://api.infra.mainnet.somnia.network/",
      chainId: 5031,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      timeout: 120000, // 120 seconds timeout
      gasPrice: "auto",
    },
    somniaTestnet: {
      url: process.env.SOMNIA_TESTNET_RPC_URL || "https://dream-rpc.somnia.network/",
      chainId: 50312,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      timeout: 120000, // 120 seconds timeout
      gasPrice: "auto",
    },
  },
  etherscan: {
    enabled: false, // Disable Etherscan verification for custom chains
    apiKey: process.env.ETHERSCAN_API_KEY || "",
    customChains: [
      {
        network: "somniaMainnet",
        chainId: 5031,
        urls: {
          apiURL: "https://explorer.somnia.network/api",
          browserURL: "https://explorer.somnia.network",
        },
      },
      {
        network: "somniaTestnet",
        chainId: 50312,
        urls: {
          apiURL: "https://shannon-explorer.somnia.network/api",
          browserURL: "https://shannon-explorer.somnia.network/",
        },
      },
    ],
  },
  sourcify: {
    enabled: true
  }
};

export default config;
