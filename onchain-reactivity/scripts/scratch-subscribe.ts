import { SDK } from '@somnia-chain/reactivity';
import { privateKeyToAccount } from 'viem/accounts';
import { somniaTestnet } from 'viem/chains';
import {
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  toBytes,
  parseGwei
} from 'viem';
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log('🔧 Initializing Somnia Reactivity SDK...');

  if (!process.env.PRIVATE_KEY) {
    throw new Error('❌ PRIVATE_KEY not found in .env');
  }

  // ---------------------------
  // Wallet setup
  // ---------------------------
  const account = privateKeyToAccount(
    `0x${process.env.PRIVATE_KEY}` as `0x${string}`
  );

  console.log('👤 Account:', account.address);

  const publicClient = createPublicClient({
    chain: somniaTestnet,
    transport: http()
  });

  const walletClient = createWalletClient({
    account,
    chain: somniaTestnet,
    transport: http()
  });

  const sdk = new SDK({
    public: publicClient,
    wallet: walletClient
  });

  // ---------------------------
  // Balance check (MANDATORY)
  // ---------------------------
  const balance = await publicClient.getBalance({
    address: account.address
  });

  const balanceSTT = Number(balance) / 1e18;
  console.log(`💰 Balance: ${balanceSTT.toFixed(4)} STT`);

  if (balanceSTT < 32) {
    console.error('❌ Minimum 32 STT required to own a subscription');
    process.exit(1);
  }

  // Scratch contract (uses env first, then fallback)
  const CONTRACT =
    (process.env.SCRATCH_CARD_CONTRACT as `0x${string}` | undefined) ??
    ('0x14c1386e45401Fbbed5af46E67E7B602C519E972' as `0x${string}`);

  console.log('🎮 ScratchCardReactiveGame:', CONTRACT);

  // ScratchRequested(address indexed player, uint256 scratchId, uint256 playerNonce)
  const SCRATCH_SIG = keccak256(
    toBytes("ScratchRequested(address,uint256,uint256)")
  );

  console.log('🔔 Event Signature:', SCRATCH_SIG);

  // ---------------------------
  // Subscription data
  // ---------------------------
  const subData = {
    handlerContractAddress: CONTRACT as `0x${string}`,
    priorityFeePerGas: parseGwei('2'),
    maxFeePerGas: parseGwei('10'),
    gasLimit: 3_000_000n, // Increased for reactivity execution
    isGuaranteed: true, // Retry on failure
    isCoalesced: false, // One call per event
    // Event filters
    eventTopics: [SCRATCH_SIG], // Filter by ScratchRequested event signature
    emitter: CONTRACT as `0x${string}`, // Filter by contract address
  };

  console.log('\n🚀 Creating subscription...');
  console.log(subData);

  // ---------------------------
  // Create subscription
  // ---------------------------
  const txHash = await sdk.createSoliditySubscription(subData);

  if (txHash instanceof Error) {
    throw txHash;
  }

  console.log('✅ Subscription TX:', txHash);
  console.log(
    `🔍 Explorer: https://shannon-explorer.somnia.network/tx/${txHash}`
  );

  // ---------------------------
  // Wait for confirmation
  // ---------------------------
  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
    confirmations: 1
  });

  console.log('✅ Confirmed in block:', receipt.blockNumber);

  // ---------------------------
  // Extract subscription ID
  // ---------------------------
  const log = receipt.logs[0];
  // Actual event: SubscriptionCreated(address indexed owner, uint64 indexed subscriptionId, ...)
  // topic[0] = event signature
  // topic[1] = owner
  // topic[2] = subscriptionId
  if (!log.topics[2]) {
    throw new Error('❌ Could not extract subscription ID from logs');
  }
  const subscriptionId = BigInt(log.topics[2]);

  console.log('\n📌 SUBSCRIPTION ID:', subscriptionId.toString());

  // ---------------------------
  // Verify subscription
  // ---------------------------
  const info = await sdk.getSubscriptionInfo(subscriptionId);

  if (!(info instanceof Error)) {
    console.log('\n📋 Subscription Info:');
    console.log(
      JSON.stringify(info, (_, v) =>
        typeof v === 'bigint' ? v.toString() : v,
        2
      )
    );
  }

  console.log('\n🎉 Subscription ACTIVE');
  console.log('Now call scratchCard() and wait for a validator tx from 0x0100');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Script failed');
    console.error(err);
    process.exit(1);
  });
