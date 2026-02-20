import { SDK } from "@somnia-chain/reactivity";
import { somniaTestnet } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { createPublicClient, createWalletClient, http, parseAbiItem } from "viem";
import * as dotenv from "dotenv";

dotenv.config();

const contractAddress = process.env.SCRATCH_CARD_CONTRACT as `0x${string}` | undefined;

const ScratchRequestedABI = parseAbiItem(
  "event ScratchRequested(address indexed player, uint256 scratchId, uint256 playerNonce)"
);
const ScratchResolvedABI = parseAbiItem(
  "event ScratchResolved(address indexed player, uint256 scratchId, uint256 reward, uint256 randomWord)"
);
const RewardsClaimedABI = parseAbiItem(
  "event RewardsClaimed(address indexed player, uint256 amount)"
);
const OwnerWithdrawABI = parseAbiItem(
  "event OwnerWithdraw(address indexed owner, uint256 amount)"
);

async function main() {
  const command = process.argv[2] || "help";
  const arg = process.argv[3];

  if (!contractAddress && command !== "help") {
    throw new Error("SCRATCH_CARD_CONTRACT not found in .env");
  }

  const publicClient = createPublicClient({
    chain: somniaTestnet,
    transport: http()
  });

  if (command === "events") {
    await checkRecentEvents(publicClient, contractAddress!);
    return;
  }

  if (command === "help") {
    printHelp();
    return;
  }

  if (!process.env.PRIVATE_KEY) {
    throw new Error("PRIVATE_KEY not found");
  }

  const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);

  const sdk = new SDK({
    public: publicClient,
    wallet: createWalletClient({
      account,
      chain: somniaTestnet,
      transport: http()
    })
  });

  switch (command) {
    case "check":
      await checkSubscription(sdk, BigInt(arg));
      break;
    case "cancel":
      await cancelSubscription(sdk, BigInt(arg));
      break;
    default:
      printHelp();
  }
}

async function checkSubscription(sdk: SDK, subId: bigint) {
  console.log(`🔍 Checking subscription ${subId}`);
  const info = await sdk.getSubscriptionInfo(subId);

  if (info instanceof Error) {
    console.error("❌ Subscription not found");
    return;
  }

  console.log("✅ Subscription ACTIVE");
  console.log(
    JSON.stringify(
      info,
      (_, v) => (typeof v === "bigint" ? v.toString() : v),
      2
    )
  );
}

async function cancelSubscription(sdk: SDK, subId: bigint) {
  console.log(`🗑️ Canceling subscription ${subId}`);
  const tx = await sdk.cancelSoliditySubscription(subId);

  if (tx instanceof Error) {
    console.error("❌ Cancel failed:", tx.message);
    return;
  }

  console.log("✅ Subscription canceled");
  console.log(`Explorer: https://shannon-explorer.somnia.network/tx/${tx}`);
}

async function checkRecentEvents(
  publicClient: ReturnType<typeof createPublicClient>,
  gameAddress: `0x${string}`
) {
  console.log("🔎 Checking recent scratch-card events...");

  const latestBlock = await publicClient.getBlockNumber();
  const fromBlock = latestBlock > 200n ? latestBlock - 200n : 0n;

  console.log(`📦 Scanning blocks ${fromBlock} -> ${latestBlock}`);

  const requestedEvents = await publicClient.getLogs({
    address: gameAddress,
    event: ScratchRequestedABI,
    fromBlock,
    toBlock: latestBlock
  });

  const resolvedEvents = await publicClient.getLogs({
    address: gameAddress,
    event: ScratchResolvedABI,
    fromBlock,
    toBlock: latestBlock
  });

  const claimedEvents = await publicClient.getLogs({
    address: gameAddress,
    event: RewardsClaimedABI,
    fromBlock,
    toBlock: latestBlock
  });
  const ownerWithdrawEvents = await publicClient.getLogs({
    address: gameAddress,
    event: OwnerWithdrawABI,
    fromBlock,
    toBlock: latestBlock
  });

  console.log("\n🎟️ ScratchRequested:");
  if (requestedEvents.length === 0) {
    console.log("  ❌ None found");
  } else {
    requestedEvents.forEach((e, i) => {
      console.log(
        `  ${i + 1}. player=${e.args.player}, scratchId=${e.args.scratchId?.toString()}, nonce=${e.args.playerNonce?.toString()}`
      );
    });
  }

  console.log("\n⚡ ScratchResolved (reactivity proof):");
  if (resolvedEvents.length === 0) {
    console.log("  ❌ No ScratchResolved events -> reactivity did not run");
  } else {
    resolvedEvents.forEach((e, i) => {
      console.log(
        `  ${i + 1}. player=${e.args.player}, scratchId=${e.args.scratchId?.toString()}, reward=${e.args.reward?.toString()}`
      );
    });
    console.log("\n✅ Reactivity executed successfully");
  }

  console.log("\n💸 RewardsClaimed:");
  if (claimedEvents.length === 0) {
    console.log("  (none)");
  } else {
    claimedEvents.forEach((e, i) => {
      console.log(`  ${i + 1}. player=${e.args.player}, amount=${e.args.amount?.toString()}`);
    });
  }

  console.log("\n🏦 OwnerWithdraw:");
  if (ownerWithdrawEvents.length === 0) {
    console.log("  (none)");
  } else {
    ownerWithdrawEvents.forEach((e, i) => {
      console.log(`  ${i + 1}. owner=${e.args.owner}, amount=${e.args.amount?.toString()}`);
    });
  }
}

function printHelp() {
  console.log("\nAvailable commands:");
  console.log("  check <id>    -> Check subscription");
  console.log("  cancel <id>   -> Cancel subscription");
  console.log("  events        -> Check ScratchRequested/ScratchResolved/RewardsClaimed/OwnerWithdraw");
  console.log("\nExamples:");
  console.log("  npm run scratch-manage -- events");
  console.log("  npm run scratch-manage -- check <id>");
  console.log("  npm run scratch-manage -- cancel <id>");
}

main().catch(console.error);
