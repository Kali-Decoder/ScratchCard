import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

const SCRATCH_CARD_ABI = [
  "function scratchPrice() view returns(uint256)",
  "function scratchCard() payable",
  "function claimRewards(uint256 amount)",
  "function pendingRewards(address) view returns(uint256)",
  "function totalPendingRewards() view returns(uint256)",
  "function getPlayerStats(address) view returns(uint256,uint256,uint256,uint256)",
  "event ScratchRequested(address indexed player,uint256 scratchId,uint256 playerNonce)",
  "event ScratchResolved(address indexed player,uint256 scratchId,uint256 reward,uint256 randomWord)"
];

async function waitNext(provider: any, last: number) {
  while ((await provider.getBlockNumber()) <= last) {
    await new Promise(r => setTimeout(r, 2000));
  }
}

async function main() {
  const contract =
    process.env.SCRATCH_CARD_CONTRACT ??
    "0x14c1386e45401Fbbed5af46E67E7B602C519E972";

  console.log("\n🎮 Scratch Reactive Test");
  console.log("Contract:", contract);

  const [signer] = await ethers.getSigners();
  const game = new ethers.Contract(contract, SCRATCH_CARD_ABI, signer);

  const price = await game.scratchPrice();
  console.log("Scratch Price:", price.toString());
  console.log("Scratch Price (ETH):", ethers.formatEther(price));

  const pendingBefore = await game.pendingRewards(signer.address);
  console.log("Pending BEFORE:", pendingBefore.toString());

  // --- Scratch ---
  console.log("\n🎟 Sending scratch tx...");
  const tx = await game.scratchCard({ value: price });
  console.log("Tx:", tx.hash);

  const receipt = await tx.wait();
  console.log("Confirmed block:", receipt.blockNumber);

  // --- Wait for reactivity ---
  let reacted = false;
  let resolvedReward = 0n;
  let last = await ethers.provider.getBlockNumber();

  for (let i = 0; i < 20; i++) {
    console.log(`⛓ Waiting block ${i + 1}/20`);
    await waitNext(ethers.provider, last);
    last = await ethers.provider.getBlockNumber();

    const pendingAfter = await game.pendingRewards(signer.address);
    console.log("Pending now:", pendingAfter.toString());

    if (pendingAfter > pendingBefore) {
      resolvedReward = pendingAfter - pendingBefore;
      console.log("⚡ ScratchResolved detected!");
      reacted = true;
      break;
    }
  }

  if (!reacted) {
    console.log("❌ No reactivity detected");
    return;
  }
  console.log("Resolved Reward:", resolvedReward.toString());
  console.log("Resolved Reward (ETH):", ethers.formatEther(resolvedReward));

  // --- Claim rewards ---
  const pending = await game.pendingRewards(signer.address);
  if (pending > 0n) {
    console.log("\n💰 Claiming rewards:", pending.toString());
    const claimTx = await game.claimRewards(pending);
    await claimTx.wait();
    console.log("✅ Rewards claimed!");
  }

  // --- Player Stats ---
  const stats = await game.getPlayerStats(signer.address);
  console.log("\n📊 Player Stats");
  console.log("Pending:", stats[0].toString());
  console.log("Claimed:", stats[1].toString());
  console.log("Total Won:", stats[2].toString());
  console.log("Total Scratches:", stats[3].toString());
  console.log("Contract totalPendingRewards:", (await game.totalPendingRewards()).toString());

  console.log("\n🔍 Explorer:");
  console.log(`https://shannon-explorer.somnia.network/tx/${tx.hash}`);
}

main().catch(console.error);
