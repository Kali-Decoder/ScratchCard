import hre from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const { ethers } = hre;
  const scratchPrice = (
    process.env.SCRATCH_PRICE_WEI
      ? BigInt(process.env.SCRATCH_PRICE_WEI)
      : ethers.parseEther("0.1")
  ).toString();

  console.log("Starting deployment of ScratchCardReactiveGame...");
  console.log("scratchPrice (wei):", scratchPrice);

  const ScratchCardReactiveGame = await ethers.getContractFactory("ScratchCardReactiveGame");
  console.log("Deploying contract...");
  const game = await ScratchCardReactiveGame.deploy(scratchPrice);
  await game.waitForDeployment();

  const address = await game.getAddress();
  console.log("✅ ScratchCardReactiveGame deployed to:", address);

  console.log("\nDeployment Details:");
  console.log("-------------------");
  console.log("Contract Address:", address);
  console.log("Network:", (await hre.ethers.provider.getNetwork()).name);
  console.log("Chain ID:", (await hre.ethers.provider.getNetwork()).chainId);
  console.log("Deployer:", (await hre.ethers.getSigners())[0].address);
  console.log("Suggested .env values:");
  console.log(`SCRATCH_CARD_CONTRACT=${address}`);
  console.log(`SCRATCH_PRICE_WEI=${scratchPrice}`);

  console.log("\nVerify contract with:");
  console.log(`npx hardhat verify --network <network-name> ${address} ${scratchPrice}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:");
    console.error(error);
    process.exitCode = 1;
  });
