# 🎮 Somnia Reactivity Testing - Complete Demo & Template

A complete project demonstrating **Somnia Network's On-Chain Reactivity** feature with both a **frontend game application** and a **Hardhat smart contract template** for developers.

![Somnia Network](https://img.shields.io/badge/Powered%20by-Somnia%20Network-purple)
![Next.js](https://img.shields.io/badge/Next.js-16.0-black)
![React](https://img.shields.io/badge/React-19.2-blue)
![Hardhat](https://img.shields.io/badge/Hardhat-2.28-yellow)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)

## 📦 What's Inside?

This repository contains **two parts**:

1. **[`reactivity-somnia-open-chest/`](./reactivity-somnia-open-chest)** - Interactive Next.js game showcasing reactivity in action
2. **[`onchain-reactivity/`](./onchain-reactivity)** - Complete Hardhat template for building reactive smart contracts

---

## 🎯 For Users: Play the Game

Want to experience on-chain reactivity? Check out the **Magic Chest Game**!

➡️ **[Go to Game Documentation](./reactivity-somnia-open-chest#readme)**

---

## 👨‍💻 For Developers: Build with Reactivity

Want to build your own reactive dApp? Use our **Hardhat Template**!

➡️ **[Go to Developer Template](./onchain-reactivity#readme)**

## 🌟 What is On-Chain Reactivity?

**On-Chain Reactivity** is Somnia's revolutionary feature that allows smart contracts to automatically respond to blockchain events **without requiring additional transactions**.

### How It Works

```
Traditional Approach ❌:
User → Event → Off-chain Indexer → Backend → New TX → Update State

Somnia Reactivity ✅:
User → Event → Validator Auto-Detects → Reactive Logic Executes → State Updated
```

### Key Benefits

- ✨ **Automatic Execution** - No manual callbacks needed
- 💰 **Cost Efficient** - Users don't pay gas for reactive logic
- 🔒 **Trustless** - All logic executes on-chain via validators
- ⚡ **Fast** - Reactions typically execute within seconds
- 🛠️ **Developer Friendly** - Simple inheritance-based pattern

---

## 🎮 Part 1: Magic Chest Game (Frontend)

**Path:** [`./reactivity-somnia-open-chest/`](./reactivity-somnia-open-chest)

An interactive Next.js game that showcases on-chain reactivity in action. Players open treasure chests and receive rewards automatically through reactive smart contracts.

### Game Features

- 🟢 **Common Chest**: Earn +10 coins
- 🔵 **Rare Chest**: Earn +50 coins  
- 🟣 **Legendary Chest**: Obtain the Legendary Sword ⚔️
- 📊 **Real-time Stats**: Automatic updates via reactivity
- 🔗 **Web3 Integration**: MetaMask and wallet support
- 📜 **Event History**: Track all your actions on-chain

### Quick Start (Game)

```bash
cd reactivity-somnia-open-chest
npm install
npm run dev

# Then visit:
# - http://localhost:3000 - Play the game
# - http://localhost:3000/docs - Interactive documentation
```

**Documentation:**
- 🌐 **[Interactive Web Docs](http://localhost:3000/docs)** - Beautiful web-based documentation (when running locally)
- 📖 **[Technical Deep Dive](./reactivity-somnia-open-chest/docs/HOW-IT-WORKS.md)** - Complete markdown guide
- ⚡ **[Quick Reference](./reactivity-somnia-open-chest/docs/QUICK-REFERENCE.md)** - Developer cheat sheet
- 📚 **[Main README](./reactivity-somnia-open-chest#readme)** - Setup and overview

---

## 👨‍💻 Part 2: Hardhat Template (Smart Contracts)

**Path:** [`./onchain-reactivity/`](./onchain-reactivity)

A complete Hardhat template for developers to build their own reactive smart contracts. Includes example contracts, deployment scripts, subscription management, and testing utilities.

### Template Features

- ✅ **Reactive Contract Example**: `MagicChestReactiveGame.sol`
- 🚀 **Deployment Scripts**: Deploy to Somnia Testnet/Mainnet
- 🔐 **Subscription Management**: Create, check, and cancel subscriptions
- 🧪 **Testing Scripts**: End-to-end testing with detailed logs
- 📝 **Complete Documentation**: Step-by-step guide for developers
- ⚙️ **Pre-configured Hardhat**: Ready for Somnia networks

### Quick Start (Template)

```bash
cd onchain-reactivity
npm install
cp .env.example .env  # Add your PRIVATE_KEY
npm run deploy
npm run create-subscription
npm run test-chest
```

**[→ Full Developer Documentation](./onchain-reactivity#readme)**

---

## 📚 What You'll Learn

### For Players (Game)
- How on-chain reactivity works in a real application
- Interacting with reactive smart contracts
- Seeing automatic state updates without extra transactions

### For Developers (Template)
- How to inherit from `SomniaEventHandler`
- Event signature validation and data decoding
- Creating and managing reactivity subscriptions
- Testing reactive logic end-to-end
- Best practices for event-driven smart contracts

---

## 🏗️ Repository Structure

```
Reactivity-Testing/
├── README.md                          # This file
├── reactivity-somnia-open-chest/      # Next.js Game Application
│   ├── app/
│   │   ├── components/               # React UI components
│   │   ├── config/                   # Chain & contract configs
│   │   ├── game/                     # Main game page
│   │   └── ...
│   ├── package.json
│   └── README.md                     # Game documentation
│
└── onchain-reactivity/                # Hardhat Template
    ├── contracts/
    │   └── MagicChestReactiveGame.sol  # Example reactive contract
    ├── scripts/
    │   ├── deploy.ts                   # Deploy script
    │   ├── create-subscription.ts      # Create reactivity subscription
    │   ├── manage-subscription.ts      # Subscription management
    │   └── test-chest.ts               # End-to-end test
    ├── hardhat.config.ts               # Hardhat configuration
    ├── package.json
    └── README.md                       # Developer documentation
```

---

## 🎯 Use Cases

This project demonstrates patterns for:

- **🎮 Gaming**: Automatic reward distribution, level-ups
- **💱 DeFi**: Automated market making, liquidations
- **🏆 Competitions**: Leaderboard updates, prize distribution
- **🎫 NFTs**: Dynamic metadata updates, breeding mechanics
- **🗳️ DAOs**: Proposal execution, voting results
- **🔔 Notifications**: On-chain alert systems
- **⚡ Triggers**: Automated contract interactions

---

## 🛠️ Tech Stack

### Frontend (Game)
- **Framework**: Next.js 16.0
- **React**: 19.2
- **TypeScript**: 5.x
- **Styling**: TailwindCSS 4.x
- **Blockchain**: Ethers.js 6.14, Wagmi 3.4, Viem 2.41

### Smart Contracts (Template)
- **Framework**: Hardhat 2.28
- **Solidity**: 0.8.30
- **Reactivity SDK**: @somnia-chain/reactivity ^0.1.10
- **Contracts Library**: @somnia-chain/reactivity-contracts ^0.1.6
- **Testing**: Viem 2.21

## 🚀 Getting Started

### Option 1: Try the Game (Users)

```bash
# Clone the repository
git clone <repository-url>
cd Reactivity-Testing/reactivity-somnia-open-chest

# Install and run
npm install
npm run dev

# Open http://localhost:3000
```

**[→ View Game Instructions](./reactivity-somnia-open-chest#readme)**

### Option 2: Use the Template (Developers)

```bash
# Navigate to template
cd Reactivity-Testing/onchain-reactivity

# Setup environment
npm install
cp .env.example .env  # Add your PRIVATE_KEY

# Deploy and test
npm run deploy
npm run create-subscription
npm run test-chest
```

**[→ View Developer Guide](./onchain-reactivity#readme)**

---

## 📖 Resources

### Somnia Network

- **Website**: [somnia.network](https://www.somnia.network/)
- **Documentation**: [docs.somnia.network](https://docs.somnia.network/)
- **Testnet Explorer**: [shannon-explorer.somnia.network](https://shannon-explorer.somnia.network)
- **Testnet Faucet**: [faucet.somnia.network](https://faucet.somnia.network)

### Network Details

| Network | Chain ID | RPC URL |
|---------|----------|---------|
| **Testnet** | 50312 | `https://dream-rpc.somnia.network/` |
| **Mainnet** | 5031 | `https://api.infra.mainnet.somnia.network/` |

### Package Resources

- **Reactivity SDK**: [@somnia-chain/reactivity](https://www.npmjs.com/package/@somnia-chain/reactivity)
- **Reactivity Contracts**: [@somnia-chain/reactivity-contracts](https://www.npmjs.com/package/@somnia-chain/reactivity-contracts)

---
# ScratchCard
