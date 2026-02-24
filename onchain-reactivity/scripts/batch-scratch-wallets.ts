import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import { writeFileSync } from "fs";
dotenv.config();
const SCRATCH_CARD_ABI = [
  "function scratchPrice() view returns(uint256)",
  "function scratchCard() payable",
  "function claimRewards(uint256 amount)",
  "function pendingRewards(address) view returns(uint256)",
];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForReactivity(
  game: any,
  player: string,
  pendingBefore: bigint,
  maxPolls: number,
  pollMs: number
) {
  for (let i = 0; i < maxPolls; i++) {
    await sleep(pollMs);
    const pendingNow = await game.pendingRewards(player);
    if (pendingNow > pendingBefore) {
      return pendingNow;
    }
  }

  return game.pendingRewards(player);
}

async function main() {
  const walletCount = Number(process.env.BATCH_WALLET_COUNT ?? "10");
  const fundPerWallet = ethers.parseEther(process.env.BATCH_FUND_PER_WALLET_STT ?? "2");
  const gasReserve = ethers.parseEther(process.env.BATCH_GAS_RESERVE_STT ?? "0.01");
  const maxRoundsPerWallet = Number(process.env.BATCH_MAX_ROUNDS_PER_WALLET ?? "200");
  const reactivityPolls = Number(process.env.BATCH_REACTIVITY_POLLS ?? "20");
  const reactivityPollMs = Number(process.env.BATCH_REACTIVITY_POLL_MS ?? "2000");
  const saveWallets = process.env.BATCH_SAVE_WALLETS === "true";

  if (!Number.isInteger(walletCount) || walletCount <= 0) {
    throw new Error("BATCH_WALLET_COUNT must be a positive integer");
  }

  if (!Number.isInteger(maxRoundsPerWallet) || maxRoundsPerWallet <= 0) {
    throw new Error("BATCH_MAX_ROUNDS_PER_WALLET must be a positive integer");
  }

  if (!Number.isInteger(reactivityPolls) || reactivityPolls <= 0) {
    throw new Error("BATCH_REACTIVITY_POLLS must be a positive integer");
  }

  const contractAddress =
    process.env.SCRATCH_CARD_CONTRACT ??
    "0x14c1386e45401Fbbed5af46E67E7B602C519E972";

  const [mainSigner] = await ethers.getSigners();
  const provider = ethers.provider;
  const code = await provider.getCode(contractAddress);
  if (code === "0x") {
    throw new Error(
      `No contract found at ${contractAddress}. Set SCRATCH_CARD_CONTRACT to your deployed ScratchCardReactiveGame address.`
    );
  }

  const gameFromMain = new ethers.Contract(contractAddress, SCRATCH_CARD_ABI, mainSigner);
  const scratchPrice = (await gameFromMain.scratchPrice()) as bigint;

  console.log("Batch scratch run");
  console.log("Network:", (await provider.getNetwork()).name);
  console.log("Main wallet:", mainSigner.address);
  console.log("Scratch contract:", contractAddress);
  console.log("Wallet count:", walletCount);
  console.log("Fund per wallet:", ethers.formatEther(fundPerWallet), "STT");
  console.log("Scratch price:", ethers.formatEther(scratchPrice), "STT");
  console.log("Gas reserve per wallet:", ethers.formatEther(gasReserve), "STT");
  console.log("Max rounds per wallet:", maxRoundsPerWallet);

  const wallets = Array.from({ length: walletCount }, () =>
    ethers.Wallet.createRandom().connect(provider)
  );

  if (saveWallets) {
    const now = new Date().toISOString().replace(/[:.]/g, "-");
    const outPath = `generated-wallets-${now}.json`;
    writeFileSync(
      outPath,
      JSON.stringify(
        wallets.map((w, i) => ({
          index: i + 1,
          address: w.address,
          privateKey: w.privateKey,
        })),
        null,
        2
      )
    );
    console.log(`Saved generated wallets to ${outPath}`);
  }

  const requiredMainBalance = fundPerWallet * BigInt(walletCount);
  const mainBalance = await provider.getBalance(mainSigner.address);
  if (mainBalance < requiredMainBalance) {
    throw new Error(
      `Insufficient main wallet balance. Need at least ${ethers.formatEther(
        requiredMainBalance
      )} STT for funding (gas not included).`
    );
  }

  console.log("\nFunding generated wallets...");
  for (let i = 0; i < wallets.length; i++) {
    const wallet = wallets[i];
    const tx = await mainSigner.sendTransaction({
      to: wallet.address,
      value: fundPerWallet,
    });
    await tx.wait();
    console.log(`${i + 1}/${wallets.length} funded: ${wallet.address} tx=${tx.hash}`);
  }

  let totalScratches = 0;
  let totalClaims = 0n;
  let totalSpent = 0n;

  console.log("\nRunning scratch/claim loop for each wallet...");
  for (let i = 0; i < wallets.length; i++) {
    const wallet = wallets[i];
    const game = new ethers.Contract(contractAddress, SCRATCH_CARD_ABI, wallet);
    let rounds = 0;
    let walletClaimed = 0n;
    let walletSpent = 0n;

    console.log(`\nWallet ${i + 1}/${wallets.length}: ${wallet.address}`);

    while (rounds < maxRoundsPerWallet) {
      const balance = await provider.getBalance(wallet.address);
      if (balance < scratchPrice + gasReserve) {
        console.log(
          `Stopping wallet ${wallet.address}. Balance ${ethers.formatEther(
            balance
          )} is below scratch+gas reserve (${ethers.formatEther(scratchPrice + gasReserve)}).`
        );
        break;
      }

      const pendingBefore = (await game.pendingRewards(wallet.address)) as bigint;
      const scratchTx = await game.scratchCard({ value: scratchPrice });
      await scratchTx.wait();

      rounds += 1;
      totalScratches += 1;
      walletSpent += scratchPrice;
      totalSpent += scratchPrice;

      const pendingAfter = (await waitForReactivity(
        game,
        wallet.address,
        pendingBefore,
        reactivityPolls,
        reactivityPollMs
      )) as bigint;

      if (pendingAfter > 0n) {
        const claimTx = await game.claimRewards(pendingAfter);
        await claimTx.wait();
        walletClaimed += pendingAfter;
        totalClaims += pendingAfter;
      }

      const newBalance = await provider.getBalance(wallet.address);
      console.log(
        `Round ${rounds}: scratched, pending=${ethers.formatEther(
          pendingAfter
        )}, balance=${ethers.formatEther(newBalance)}`
      );
    }

    if (rounds >= maxRoundsPerWallet) {
      console.log(
        `Reached BATCH_MAX_ROUNDS_PER_WALLET=${maxRoundsPerWallet} for ${wallet.address}.`
      );
    }

    console.log(
      `Wallet summary -> rounds=${rounds}, spent=${ethers.formatEther(
        walletSpent
      )} STT, claimed=${ethers.formatEther(walletClaimed)} STT`
    );
  }

  console.log("\nBatch summary");
  console.log("Total wallets:", wallets.length);
  console.log("Total scratches:", totalScratches);
  console.log("Total spent:", ethers.formatEther(totalSpent), "STT");
  console.log("Total claimed:", ethers.formatEther(totalClaims), "STT");
  console.log("Net (claimed-spent):", ethers.formatEther(totalClaims - totalSpent), "STT");
  console.log(
    "Note: loop stops when each wallet can no longer afford one more scratch plus gas reserve."
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
