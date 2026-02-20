# Scratch Card Reactive Game (Hardhat)

Hardhat project for the Somnia reactive scratch-card contract.

## Contract
- `contracts/ScratchCardReactiveGame.sol`

Core flow:
1. User calls `scratchCard()` and pays `scratchPrice`
2. Contract emits `ScratchRequested`
3. Somnia reactivity triggers `_onEvent(...)`
4. Reward is computed and added to `pendingRewards`
5. User claims with `claimRewards(amount)`

## Current Reward Model
- 55% -> `0`
- 20% -> `scratchPrice`
- 10% -> `scratchPrice * 2`
- 7% -> `scratchPrice * 3`
- 5% -> `scratchPrice * 4`
- 3% -> `scratchPrice * 5`

## Prerequisites
Create `.env`:
```env
PRIVATE_KEY=0x...
SOMNIA_TESTNET_RPC_URL=https://dream-rpc.somnia.network/
SCRATCH_CARD_CONTRACT=0x14c1386e45401Fbbed5af46E67E7B602C519E972
SCRATCH_PRICE_WEI=100000000000000000
```

## Install
```bash
npm install
```

## Useful Scripts
```bash
npm run scratch-deploy
npm run scratach-subscribe
npm run test-scratch
npm run scratch-manage -- events
```

## Script Notes
- `scratch-deploy`: deploys with single constructor arg `scratchPrice`
- `scratch-subscribe`: creates Somnia reactivity subscription for `ScratchRequested`
- `test-scratch`: sends scratch tx, waits for reactive settlement, claims pending
- `scratch-manage`: inspect/cancel subscriptions + check key events

## Explorer
- Address: `https://shannon-explorer.somnia.network/address/<contract>`
- Tx: `https://shannon-explorer.somnia.network/tx/<txHash>`
