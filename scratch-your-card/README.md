# Scratch Card Game Frontend (Somnia Reactivity)

Next.js frontend for the Somnia reactive scratch-card game.

## Features
- Wallet connect + Somnia Testnet switch
- Scratch card purchase flow (`scratchCard`)
- Scratch reveal shown in a modal after tx signature
- Reveal reward only after user scratches card (20% threshold)
- Claim rewards flow (`claimRewards`)
- Live player stats and liquidity metrics
- Transaction logging + leaderboard API (MongoDB)

## Contract
Default frontend contract address:
- `0x14c1386e45401Fbbed5af46E67E7B602C519E972`

Override with env:
- `NEXT_PUBLIC_SCRATCH_CARD_CONTRACT`

## Setup
```bash
npm install
npm run dev
```

## Environment Variables
Create `.env`:
```env
NEXT_PUBLIC_SCRATCH_CARD_CONTRACT=0x14c1386e45401Fbbed5af46E67E7B602C519E972
MONGODB_URI=your_mongodb_connection_string
MONGODB_DB=scratch_game
```

## API Endpoints

### `POST /api/transactions`
Stores/upserts transaction records for leaderboard.

Request body:
```json
{
  "walletAddress": "0x...",
  "txHash": "0x...",
  "action": "scratch_reward",
  "amountWei": "100000000000000000",
  "chainId": 50312,
  "contractAddress": "0x...",
  "occurredAt": "2026-02-20T00:00:00.000Z"
}
```

- `action`: `scratch_reward` or `claim`

### `GET /api/leaderboard?limit=10`
Returns aggregated leaderboard by total won amount.

## Main Frontend Files
- `app/page.tsx`: main game flow + modal reveal + claim + leaderboard UI
- `app/components/ScratchSurface.tsx`: scratch canvas interaction
- `app/config/scratch_game_config.ts`: contract address + ABI
- `app/api/transactions/route.ts`: tx logging API
- `app/api/leaderboard/route.ts`: leaderboard API
- `lib/models/Transaction.ts`: Mongo model

## Notes
- Network: Somnia Testnet (`50312`)
- Explorer: `https://shannon-explorer.somnia.network`
- If lint/type tooling fails, verify Node version compatibility with your local Next.js version.
