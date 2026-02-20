import { ethers } from "hardhat";

async function main() {
  console.log("Starting deployment of MagicChestReactiveGame...");

  // Get the contract factory
  const MagicChestReactiveGame = await ethers.getContractFactory("MagicChestReactiveGame");
  
  // Deploy the contract
  console.log("Deploying contract...");
  const game = await MagicChestReactiveGame.deploy();
  
  // Wait for deployment to complete
  await game.waitForDeployment();
  
  const address = await game.getAddress();
  console.log("✅ MagicChestReactiveGame deployed to:", address);
  
  // Log deployment details
  console.log("\nDeployment Details:");
  console.log("-------------------");
  console.log("Contract Address:", address);
  console.log("Network:", (await ethers.provider.getNetwork()).name);
  console.log("Chain ID:", (await ethers.provider.getNetwork()).chainId);
  console.log("Deployer:", (await ethers.getSigners())[0].address);
  
  console.log("\nVerify contract with:");
  console.log(`npx hardhat verify --network <network-name> ${address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:");
    console.error(error);
    process.exitCode = 1;
  });


  // Deployment Details:
  // -------------------
  // Contract Address: 0xa4D7312A3e178C34079678f47070a6f5027A2Fdf
  // Network: somniaTestnet
  // Chain ID: 50312n
  // Deployer: 0xdAF0182De86F904918Db8d07c7340A1EfcDF8244