import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

const MAGIC_CHEST_ABI = [
  "function openChest(uint256 chestType) external",
  "function coins(address player) external view returns (uint256)",
  "function hasLegendarySword(address player) external view returns (bool)",
  "event ChestOpened(address indexed player, uint256 chestType)",
  "event Reacted(address player, uint256 chestType)"
];

const CHEST_TYPES = {
  COMMON: 1,
  RARE: 2,
  LEGENDARY: 3
};

async function waitForNextBlock(provider: any, lastBlock: number) {
  while ((await provider.getBlockNumber()) <= lastBlock) {
    await new Promise(r => setTimeout(r, 2000));
  }
}

async function main() {
  const contractAddress = "0x5053B01B20DAc571fF7d011f41c27E068A5c5D8e";

  console.log("🎮 Testing MagicChestReactiveGame");
  console.log("=".repeat(50));
  console.log("Contract:", contractAddress);
  console.log("Network:", "somniaTestnet");
  
  const currentBlock = await ethers.provider.getBlockNumber();
  console.log("Current Block:", currentBlock);

  const [signer] = await ethers.getSigners();
  console.log("👤 Player:", signer.address);
  
  const balance = await ethers.provider.getBalance(signer.address);
  console.log("💰 Player Balance:", ethers.formatEther(balance), "STT");

  const game = new ethers.Contract(
    contractAddress,
    MAGIC_CHEST_ABI,
    signer
  );

  const chestTypeArg = (process.env.CHEST_TYPE || "COMMON").toUpperCase();
  const chestType =
    CHEST_TYPES[chestTypeArg as keyof typeof CHEST_TYPES] ??
    CHEST_TYPES.COMMON;

  console.log(`\n📦 Opening ${chestTypeArg} chest (type=${chestType})`);
  console.log("=".repeat(50));

  // ---------------- BEFORE ----------------
  const coinsBefore = await game.coins(signer.address);
  const swordBefore = await game.hasLegendarySword(signer.address);

  console.log("\n🔍 BEFORE");
  console.log("Coins:", coinsBefore.toString());
  console.log("Sword:", swordBefore);

  // ---------------- OPEN CHEST ----------------
  console.log("\n🔓 Sending openChest tx...");
  const tx = await game.openChest(chestType);
  console.log("Tx:", tx.hash);

  const receipt = await tx.wait();
  console.log("✅ openChest confirmed in block", receipt.blockNumber);
  console.log("📝 Receipt details:");
  console.log("  - Gas used:", receipt.gasUsed.toString());
  console.log("  - Status:", receipt.status);
  console.log("  - Logs count:", receipt.logs.length);

  console.log("\n📋 All logs in receipt:");
  receipt.logs.forEach((log: any, index: number) => {
    console.log(`  Log ${index}:`, {
      address: log.address,
      topics: log.topics,
      data: log.data
    });
  });

  const chestEvent = receipt.logs.find((log: any) => {
    try {
      return game.interface.parseLog(log)?.name === "ChestOpened";
    } catch {
      return false;
    }
  });

  if (chestEvent) {
    const parsed = game.interface.parseLog(chestEvent);
    if (parsed) {
      console.log(
        `\n🎉 ChestOpened Event Found → player=${parsed.args[0]}, type=${parsed.args[1]}`
      );
      console.log("  Full event args:", parsed.args);
    }
  } else {
    console.log("\n⚠️  No ChestOpened event found in logs!");
  }

  // ---------------- WAIT FOR REACTIVITY ----------------
  console.log("\n⏳ Waiting for reactivity (validator tx from 0x0000000000000000000000000000000000000100)…");
  console.log(`   Starting from block: ${receipt.blockNumber}`);

  let coinsAfter = coinsBefore;
  let swordAfter = swordBefore;
  let reacted = false;

  let lastBlock = await ethers.provider.getBlockNumber();

  for (let i = 0; i < 15; i++) {
    console.log(`\n⛓ Waiting block ${i + 1}/15...`);
    await waitForNextBlock(ethers.provider, lastBlock);
    lastBlock = await ethers.provider.getBlockNumber();
    console.log(`   Current block: ${lastBlock}`);

    // Check for validator transactions in this block
    const block = await ethers.provider.getBlock(lastBlock, true);
    if (block) {
      console.log(`   Block transactions count: ${block.transactions.length}`);
      
      const validatorTxs = block.transactions.filter((tx: any) => 
        tx.from && tx.from.toLowerCase() === "0x0000000000000000000000000000000000000100"
      );
      
      if (validatorTxs.length > 0) {
        console.log(`   🔍 Found ${validatorTxs.length} validator tx(s) in this block!`);
        validatorTxs.forEach((tx: any) => {
          console.log(`      → Validator tx to: ${tx.to}, hash: ${tx.hash}`);
        });
      }
    } else {
      console.log(`   ⚠️  Could not fetch block ${lastBlock}`);
    }

    coinsAfter = await game.coins(signer.address);
    swordAfter = await game.hasLegendarySword(signer.address);
    
    console.log(`   Coins now: ${coinsAfter.toString()} (was ${coinsBefore.toString()})`);
    console.log(`   Sword now: ${swordAfter} (was ${swordBefore})`);

    if (coinsAfter > coinsBefore || swordAfter !== swordBefore) {
      reacted = true;
      console.log("\n⚡ REACTIVITY EXECUTED! State changed!");
      break;
    }
  }

  // ---------------- AFTER ----------------
  console.log("\n🔍 AFTER (Final State)");
  console.log("Coins:", coinsAfter.toString());
  console.log("Sword:", swordAfter);

  console.log("\n📈 RESULT");
  console.log("=".repeat(50));
  
  const coinsDelta = coinsAfter - coinsBefore;
  const swordChanged = swordBefore !== swordAfter;
  
  console.log(`Coins BEFORE: ${coinsBefore.toString()}`);
  console.log(`Coins AFTER:  ${coinsAfter.toString()}`);
  console.log(`Change:       ${coinsDelta > 0 ? '+' : ''}${coinsDelta.toString()}`);
  console.log();
  console.log(`Sword BEFORE: ${swordBefore}`);
  console.log(`Sword AFTER:  ${swordAfter}`);
  console.log(`Changed:      ${swordChanged ? 'YES' : 'NO'}`);
  console.log("=".repeat(50));

  if (coinsAfter > coinsBefore) {
    console.log(`\n✅ Coins gained: ${coinsDelta.toString()}`);
  }

  if (!swordBefore && swordAfter) {
    console.log("⚔️ Legendary Sword obtained!");
  }

  if (!reacted) {
    console.log("\n❌ NO REACTIVITY DETECTED");
    console.log("\n🔍 Possible Issues:");
    console.log("1. Validator system is not running (0x0000000000000000000000000000000000000100 address not active)");
    console.log("2. Subscription may not exist or be misconfigured");
    console.log("3. Subscription event topics don't match");
    console.log("4. Insufficient STT balance in subscription");
    console.log("5. Network/testnet reactivity infrastructure is down");
    console.log("\n💡 Debug Steps:");
    console.log("• Check validator activity: npm run check-validator");
    console.log("• Run diagnostics: npm run diagnose");
    console.log("• Check explorer for tx from 0x0000000000000000000000000000000000000100");
  } else {
    console.log("\n✅ REACTIVITY SUCCESS!");
  }

  console.log("\n🔍 Explorer:");
  console.log(`https://shannon-explorer.somnia.network/tx/${tx.hash}`);

  console.log("\n💡 Reminder:");
  console.log("Reactivity is a SEPARATE tx triggered by validators.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\n❌ TEST FAILED");
    console.error("=".repeat(50));
    console.error("Error Type:", err.name);
    console.error("Error Message:", err.message);
    console.error("\nFull Error:");
    console.error(err);
    
    if (err.code) {
      console.error("\nError Code:", err.code);
    }
    
    if (err.data) {
      console.error("Error Data:", err.data);
    }
    
    if (err.transaction) {
      console.error("\nFailed Transaction:", err.transaction);
    }
    
    process.exit(1);
  });