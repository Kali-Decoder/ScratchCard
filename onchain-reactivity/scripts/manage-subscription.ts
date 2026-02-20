import { SDK } from '@somnia-chain/reactivity';
import { somniaTestnet } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbiItem
} from 'viem';
import * as dotenv from "dotenv";

dotenv.config();

const GAME_CONTRACT =
  '0x5053B01B20DAc571fF7d011f41c27E068A5c5D8e';

const ChestOpenedABI = parseAbiItem(
  'event ChestOpened(address indexed player, uint256 chestType)'
);

const ReactedABI = parseAbiItem(
  'event Reacted(address player, uint256 chestType)'
);

async function main() {
  const command = process.argv[2] || 'help';
  const arg = process.argv[3];

  const publicClient = createPublicClient({
    chain: somniaTestnet,
    transport: http()
  });

  // Events command doesn't need private key
  if (command === 'events') {
    await checkRecentEvents(publicClient);
    return;
  }

  if (command === 'help') {
    printHelp();
    return;
  }

  // Other commands need SDK
  if (!process.env.PRIVATE_KEY) {
    throw new Error('PRIVATE_KEY not found');
  }

  const account = privateKeyToAccount(
    process.env.PRIVATE_KEY as `0x${string}`
  );

  const sdk = new SDK({
    public: publicClient,
    wallet: createWalletClient({
      account,
      chain: somniaTestnet,
      transport: http()
    })
  });

  switch (command) {
    case 'check':
      await checkSubscription(sdk, BigInt(arg));
      break;

    case 'cancel':
      await cancelSubscription(sdk, BigInt(arg));
      break;

    default:
      printHelp();
  }
}

/* ---------------- SUBSCRIPTION ---------------- */

async function checkSubscription(sdk: SDK, subId: bigint) {
  console.log(`🔍 Checking subscription ${subId}`);
  const info = await sdk.getSubscriptionInfo(subId);

  if (info instanceof Error) {
    console.error('❌ Subscription not found');
    return;
  }

  console.log('✅ Subscription ACTIVE');
  console.log(
    JSON.stringify(info, (_, v) =>
      typeof v === 'bigint' ? v.toString() : v,
      2
    )
  );
}

async function cancelSubscription(sdk: SDK, subId: bigint) {
  console.log(`🗑️ Canceling subscription ${subId}`);
  const tx = await sdk.cancelSoliditySubscription(subId);

  if (tx instanceof Error) {
    console.error('❌ Cancel failed:', tx.message);
    return;
  }

  console.log('✅ Subscription canceled');
  console.log(
    `Explorer: https://shannon-explorer.somnia.network/tx/${tx}`
  );
}

/* ---------------- EVENT DEBUGGING ---------------- */

async function checkRecentEvents(publicClient: any) {
  console.log('🔎 Checking recent game events…');

  const latestBlock = await publicClient.getBlockNumber();
  const fromBlock = latestBlock - 100n;

  console.log(`📦 Scanning blocks ${fromBlock} → ${latestBlock}`);

  const chestEvents = await publicClient.getLogs({
    address: GAME_CONTRACT,
    event: ChestOpenedABI,
    fromBlock,
    toBlock: latestBlock
  });

  const reactedEvents = await publicClient.getLogs({
    address: GAME_CONTRACT,
    event: ReactedABI,
    fromBlock,
    toBlock: latestBlock
  });

  console.log('\n🎯 ChestOpened Events:');
  if (chestEvents.length === 0) {
    console.log('  ❌ None found');
  } else {
    chestEvents.forEach((e: any, i: number) => {
      console.log(
        `  ${i + 1}. Player=${e.args.player}, Type=${e.args.chestType}`
      );
    });
  }

  console.log('\n⚡ Reacted Events (PROOF OF REACTIVITY):');
  if (reactedEvents.length === 0) {
    console.log('  ❌ No Reacted events → reactivity DID NOT run');
  } else {
    reactedEvents.forEach((e: any, i: number) => {
      console.log(
        `  ${i + 1}. Player=${e.args.player}, Type=${e.args.chestType}`
      );
    });
    console.log('\n✅ Reactivity EXECUTED successfully!');
  }
}

/* ---------------- HELP ---------------- */

function printHelp() {
  console.log('\nAvailable commands:');
  console.log('  check <id>    → Check subscription');
  console.log('  cancel <id>   → Cancel subscription');
  console.log('  events        → Check ChestOpened & Reacted events');
  console.log('\nExamples:');
  console.log('  npm run manage-subscription events');
  console.log('  npm run manage-subscription check <id>');
  console.log('  npm run manage-subscription cancel <id>');
}

main().catch(console.error);
