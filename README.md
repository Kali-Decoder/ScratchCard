# Reactivity Somnia - Scratch Card Game

This repository contains a complete Somnia on-chain reactivity scratch-card game:

- `onchain-reactivity/`: Hardhat contracts + scripts
- `reactivity-somnia-open-chest/`: Next.js frontend (scratch modal + leaderboard)

## Active Contract (Somnia Testnet)
- `0x14c1386e45401Fbbed5af46E67E7B602C519E972`

## Quick Start

### 1. Contract side
```bash
cd onchain-reactivity
npm install
npm run scratch-deploy
npm run scratach-subscribe
npm run test-scratch
```

### 2. Frontend side
```bash
cd reactivity-somnia-open-chest
npm install
npm run dev
```

Create `.env` in frontend:
```env
NEXT_PUBLIC_SCRATCH_CARD_CONTRACT=0x14c1386e45401Fbbed5af46E67E7B602C519E972
MONGODB_URI=your_mongodb_connection_string
MONGODB_DB=scratch_game
```

Open `http://localhost:3000`.
