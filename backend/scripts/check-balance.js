const hre = require("hardhat");

async function main() {
  console.log("Checking Sepolia account balance...");
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("Account:", deployer.address);
  
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("Balance:", hre.ethers.formatEther(balance), "ETH");
  
  if (balance < hre.ethers.parseEther("0.1")) {
    console.log("⚠️  You need more Sepolia ETH for deployment!");
    console.log("📝 Get Sepolia ETH from these faucets:");
    console.log("   - https://sepoliafaucet.com/");
    console.log("   - https://faucet.quicknode.com/ethereum/sepolia");
    console.log("   - https://faucets.chain.link/sepolia");
  } else {
    console.log("✅ You have enough ETH for deployment!");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
