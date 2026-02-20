/**
 * @title Complete Reactivity Demo
 * @notice This script demonstrates the full Somnia on-chain reactivity flow:
 * 1. Deploys handler and emitter contracts
 * 2. Creates a subscription
 * 3. Triggers events
 * 4. Verifies reactivity execution
 */

import hre from "hardhat";
import { SDK } from '@somnia-chain/reactivity';
import { somniaTestnet } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { createPublicClient, createWalletClient, http, parseGwei, keccak256, toBytes, parseAbiItem } from 'viem';
import * as dotenv from "dotenv";

dotenv.config();

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(60));
  log(title, colors.bright + colors.cyan);
  console.log('='.repeat(60));
}

async function waitForNextBlock(provider: any, lastBlock: number) {
  while ((await provider.getBlockNumber()) <= lastBlock) {
    await new Promise(r => setTimeout(r, 2000));
  }
}

async function main() {
  if (!process.env.PRIVATE_KEY) {
    throw new Error('PRIVATE_KEY not found in .env');
  }

  logSection('🎯 SOMNIA ON-CHAIN REACTIVITY DEMO');
  log('This demo will show you how on-chain reactivity works on Somnia', colors.blue);
  log('The handler contract will automatically react to events emitted by the emitter', colors.blue);

  // Initialize account and clients
  const account = privateKeyToAccount(
    process.env.PRIVATE_KEY as `0x${string}`
  );

  const publicClient = createPublicClient({
    chain: somniaTestnet,
    transport: http()
  });

  const walletClient = createWalletClient({
    account,
    chain: somniaTestnet,
    transport: http(),
  });

  const sdk = new SDK({
    public: publicClient,
    wallet: walletClient
  });

  // @ts-expect-error - Hardhat ethers helpers are available at runtime
  const [signer] = await hre.ethers.getSigners();
  // @ts-expect-error - Hardhat ethers helpers are available at runtime
  const provider = hre.ethers.provider;

  logSection('👤 Account Information');
  log(`Address: ${account.address}`, colors.cyan);
  
  const balance = await publicClient.getBalance({ address: account.address });
  const balanceSTT = Number(balance) / 1e18;
  log(`Balance: ${balanceSTT.toFixed(4)} STT`, colors.cyan);

  if (balanceSTT < 32) {
    log('\n❌ ERROR: Minimum 32 STT required to own a subscription', colors.red);
    log('   Get testnet tokens from: https://faucet.somnia.network/', colors.yellow);
    process.exit(1);
  }

  // Step 1: Deploy contracts
  logSection('📦 Step 1: Deploying Contracts');

  log('Deploying MyEventHandler...', colors.yellow);
  const Handler = await hre.ethers.getContractFactory("MyEventHandler");
  const handler = await Handler.deploy();
  await handler.waitForDeployment();
  // @ts-expect-error - Hardhat adds getAddress() method to deployed contracts
  const handlerAddress = await handler.getAddress();
  log(`✅ Handler deployed: ${handlerAddress}`, colors.green);
  log(`   Explorer: https://shannon-explorer.somnia.network/address/${handlerAddress}`, colors.blue);

  log('\nDeploying TestEmitter...', colors.yellow);
  const Emitter = await hre.ethers.getContractFactory("TestEmitter");
  const emitter = await Emitter.deploy();
  await emitter.waitForDeployment();
  // @ts-expect-error - Hardhat adds getAddress() method to deployed contracts
  const emitterAddress = await emitter.getAddress();
  log(`✅ Emitter deployed: ${emitterAddress}`, colors.green);
  log(`   Explorer: https://shannon-explorer.somnia.network/address/${emitterAddress}`, colors.blue);

  // Step 2: Create subscription
  logSection('📝 Step 2: Creating Subscription');

  // Calculate TestEvent signature
  const TEST_EVENT_SIG = keccak256(toBytes("TestEvent(bytes32)"));

  log(`Event Signature: ${TEST_EVENT_SIG}`, colors.cyan);
  log('This subscription will listen for TestEvent from the emitter contract', colors.blue);

  const subData = {
    handlerContractAddress: handlerAddress as `0x${string}`,
    emitter: emitterAddress as `0x${string}`,
    eventTopics: [TEST_EVENT_SIG],
    priorityFeePerGas: parseGwei('2'),
    maxFeePerGas: parseGwei('10'),
    gasLimit: 3_000_000n, // Increased for reactivity execution
    isGuaranteed: true,
    isCoalesced: false,
  };

  log('\nSubscription Configuration:', colors.yellow);
  log(`  Handler: ${subData.handlerContractAddress}`);
  log(`  Emitter: ${subData.emitter}`);
  log(`  Event Topic: ${subData.eventTopics[0]}`);
  log(`  Gas Limit: ${subData.gasLimit.toString()}`);
  log(`  Guaranteed: ${subData.isGuaranteed}`);

  log('\nCreating subscription...', colors.yellow);
  const txHash = await sdk.createSoliditySubscription(subData);

  if (txHash instanceof Error) {
    log(`❌ Subscription creation failed: ${txHash.message}`, colors.red);
    process.exit(1);
  }

  log(`✅ Subscription created! Tx: ${txHash}`, colors.green);
  log(`   Explorer: https://shannon-explorer.somnia.network/tx/${txHash}`, colors.blue);

  // Wait for confirmation
  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
    confirmations: 1
  });

  log(`✅ Confirmed in block: ${receipt.blockNumber}`, colors.green);

  // Extract subscription ID
  let subscriptionId: bigint | null = null;
  const log_entry = receipt.logs[0];
  if (log_entry.topics[2]) {
    subscriptionId = BigInt(log_entry.topics[2]);
    log(`\n📌 SUBSCRIPTION ID: ${subscriptionId.toString()}`, colors.bright + colors.green);

    // Get subscription info
    const info = await sdk.getSubscriptionInfo(subscriptionId);
    if (!(info instanceof Error)) {
      log('\n📋 Subscription Info:', colors.cyan);
      console.log(
        JSON.stringify(info, (_, v) =>
          typeof v === 'bigint' ? v.toString() : v,
          2
        )
      );
    }
  }

  // Step 3: Check initial state
  logSection('🔍 Step 3: Checking Initial State');

  const handlerContract = new hre.ethers.Contract(
    handlerAddress,
    [
      "function reactionCount() external view returns (uint256)",
      "function reactionsByEmitter(address) external view returns (uint256)",
    ],
    signer
  );

  const initialReactionCount = await handlerContract.reactionCount();
  const initialReactionsByEmitter = await handlerContract.reactionsByEmitter(emitterAddress);

  log(`Reaction Count: ${initialReactionCount.toString()}`, colors.cyan);
  log(`Reactions by Emitter: ${initialReactionsByEmitter.toString()}`, colors.cyan);

  // Step 4: Trigger event
  logSection('📤 Step 4: Triggering Event');

  const testTopic = keccak256(toBytes("DemoTest"));
  log(`Emitting TestEvent with topic: ${testTopic}`, colors.yellow);

  const emitTx = await emitter.emitTestEvent(testTopic);
  log(`Transaction Hash: ${emitTx.hash}`, colors.cyan);
  log(`   Explorer: https://shannon-explorer.somnia.network/tx/${emitTx.hash}`, colors.blue);

  const emitReceipt = await emitTx.wait();
  log(`✅ Event emitted in block: ${emitReceipt.blockNumber}`, colors.green);

  // Step 5: Wait for reactivity
  logSection('⏳ Step 5: Waiting for Reactivity Execution');

  log('The Somnia validators will now automatically call your handler contract', colors.blue);
  log('This happens on-chain without any off-chain watchers!', colors.blue);
  log(`\nWatching for validator transactions from block ${emitReceipt.blockNumber}...`, colors.yellow);

  let reactionCountAfter = initialReactionCount;
  let reactionsByEmitterAfter = initialReactionsByEmitter;
  let reacted = false;
  let lastBlock = Number(emitReceipt.blockNumber);
  const startBlock = BigInt(emitReceipt.blockNumber);

  // Wait up to 20 blocks for reactivity
  for (let i = 0; i < 20; i++) {
    log(`\n⛓ Block ${i + 1}/20 (current: ${lastBlock})...`, colors.yellow);
    
    await waitForNextBlock(provider, lastBlock);
    lastBlock = await provider.getBlockNumber();
    const currentBlockBigInt = BigInt(lastBlock);

    // Check for validator transactions
    const block = await provider.getBlock(lastBlock, true);
    if (block && block.transactions) {
      const validatorTxs = block.transactions.filter((tx: any) =>
        tx.from && tx.from.toLowerCase() === "0x0000000000000000000000000000000000000100"
      );

      if (validatorTxs.length > 0) {
        log(`   🔍 Found ${validatorTxs.length} validator tx(s)!`, colors.green);
        validatorTxs.forEach((tx: any) => {
          if (tx.to?.toLowerCase() === handlerAddress.toLowerCase()) {
            log(`      ⚡ Validator called handler! Hash: ${tx.hash}`, colors.bright + colors.green);
          }
        });
      }
    }

    // Check storage
    try {
      reactionCountAfter = await handlerContract.reactionCount();
      reactionsByEmitterAfter = await handlerContract.reactionsByEmitter(emitterAddress);

      if (reactionCountAfter > initialReactionCount || reactionsByEmitterAfter > initialReactionsByEmitter) {
        reacted = true;
        log(`\n⚡ REACTIVITY EXECUTED!`, colors.bright + colors.green);
        log(`   Reaction Count: ${initialReactionCount.toString()} → ${reactionCountAfter.toString()}`, colors.green);
        log(`   Reactions by Emitter: ${initialReactionsByEmitter.toString()} → ${reactionsByEmitterAfter.toString()}`, colors.green);
        break;
      }
    } catch (error) {
      // Continue checking
    }

    // Check for ReactedToEvent
    try {
      const reactedEventAbi = parseAbiItem("event ReactedToEvent(address emitter, bytes32 topic)");
      const reactedLogs = await publicClient.getLogs({
        address: handlerAddress as `0x${string}`,
        event: reactedEventAbi,
        fromBlock: startBlock,
        toBlock: currentBlockBigInt
      });

      if (reactedLogs.length > 0 && !reacted) {
        reacted = true;
        log(`\n⚡ REACTIVITY EXECUTED! ReactedToEvent found!`, colors.bright + colors.green);
        reactedLogs.forEach((eventLog, idx) => {
          log(`   Event ${idx + 1}:`, colors.cyan);
          log(`     Emitter: ${eventLog.args.emitter}`, colors.cyan);
          log(`     Topic: ${eventLog.args.topic}`, colors.cyan);
        });
        break;
      }
    } catch (error) {
      // Continue checking
    }
  }

  // Final results
  logSection('📊 Final Results');

  log('\n🔍 Storage State:', colors.cyan);
  log(`Reaction Count: ${initialReactionCount.toString()} → ${reactionCountAfter.toString()}`, colors.cyan);
  log(`Reactions by Emitter: ${initialReactionsByEmitter.toString()} → ${reactionsByEmitterAfter.toString()}`, colors.cyan);

  // Check for ReactedToEvent events
  log('\n🔍 Checking for ReactedToEvent logs...', colors.cyan);
  try {
    const reactedEventAbi = parseAbiItem("event ReactedToEvent(address emitter, bytes32 topic)");
    const finalLogs = await publicClient.getLogs({
      address: handlerAddress as `0x${string}`,
      event: reactedEventAbi,
      fromBlock: startBlock,
      toBlock: BigInt(lastBlock)
    });

    if (finalLogs.length > 0) {
      log(`✅ Found ${finalLogs.length} ReactedToEvent(s):`, colors.green);
      finalLogs.forEach((eventLog, idx) => {
        log(`   ${idx + 1}. Emitter: ${eventLog.args.emitter}`, colors.cyan);
        log(`      Topic: ${eventLog.args.topic}`, colors.cyan);
      });
    } else {
      log('❌ No ReactedToEvent found', colors.yellow);
    }
  } catch (error) {
    log(`⚠️  Could not check for ReactedToEvent: ${error}`, colors.yellow);
  }

  logSection('🏁 Demo Complete');

  if (reacted) {
    log('\n✅ REACTIVITY DEMO SUCCESSFUL!', colors.bright + colors.green);
    log('   The handler successfully reacted to the event on-chain', colors.green);
    log('   Storage was updated automatically by validators', colors.green);
    log('\n🎉 This demonstrates true on-chain reactivity:', colors.blue);
    log('   • No off-chain watchers needed', colors.blue);
    log('   • Automatic execution by validators', colors.blue);
    log('   • Instant reaction to events', colors.blue);
  } else {
    log('\n❌ REACTIVITY NOT DETECTED', colors.red);
    log('\n🔍 Possible Issues:', colors.yellow);
    log('1. Validator system may need more time (wait a few more blocks)', colors.yellow);
    log('2. Subscription may need to be verified', colors.yellow);
    log('3. Network/testnet reactivity infrastructure status', colors.yellow);
    log('\n💡 Debug Steps:', colors.cyan);
    if (subscriptionId) {
      log(`• Check subscription: npm run manage-subscription check ${subscriptionId}`, colors.cyan);
    }
    log(`• Check handler: https://shannon-explorer.somnia.network/address/${handlerAddress}`, colors.cyan);
    log(`• Check emitter: https://shannon-explorer.somnia.network/address/${emitterAddress}`, colors.cyan);
  }

  log('\n📋 Contract Addresses:', colors.cyan);
  log(`Handler: ${handlerAddress}`, colors.cyan);
  log(`Emitter: ${emitterAddress}`, colors.cyan);
  if (subscriptionId) {
    log(`Subscription ID: ${subscriptionId.toString()}`, colors.cyan);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    log('\n❌ DEMO FAILED', colors.red);
    console.error('='.repeat(60));
    console.error(err);
    process.exit(1);
  });
