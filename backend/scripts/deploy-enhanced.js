const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  
  console.log(`\n🚀 Deploying DAO Governance Platform to ${network.name}...`);
  console.log(`📍 Deployer address: ${deployer.address}`);
  console.log(`💰 Deployer balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH\n`);

  // Deploy GovernanceToken
  console.log("📄 Deploying GovernanceToken...");
  const GovernanceToken = await ethers.getContractFactory("GovernanceToken");
  const initialMint = ethers.parseEther("10000"); // 10,000 tokens
  const governanceToken = await GovernanceToken.deploy(
    "DVote Token", 
    "DVT", 
    deployer.address, 
    initialMint
  );
  await governanceToken.waitForDeployment();
  const tokenAddress = await governanceToken.getAddress();
  console.log(`✅ GovernanceToken deployed to: ${tokenAddress}`);

  // Deploy Treasury first with deployer as temporary owner
  console.log("\n📄 Deploying Treasury (temporary)...");
  const Treasury = await ethers.getContractFactory("Treasury");
  const treasury = await Treasury.deploy(deployer.address);
  await treasury.waitForDeployment();
  const treasuryAddress = await treasury.getAddress();
  console.log(`✅ Treasury deployed to: ${treasuryAddress}`);

  // Deploy DAO
  console.log("\n📄 Deploying DAO...");
  const DAO = await ethers.getContractFactory("DAO");
  const dao = await DAO.deploy(tokenAddress, treasuryAddress, deployer.address);
  await dao.waitForDeployment();
  const daoAddress = await dao.getAddress();
  console.log(`✅ DAO deployed to: ${daoAddress}`);

  // Transfer Treasury ownership to DAO
  console.log("\n⚙️  Transferring Treasury ownership to DAO...");
  await treasury.transferOwnership(daoAddress);
  console.log("✅ Treasury ownership transferred to DAO");

  // Initial token distribution (only for development)
  if (network.name === "localhost" || network.name === "hardhat") {
    console.log("\n🪙 Initial tokens already distributed to deployer during construction");
    console.log(`   💰 Deployer has ${ethers.formatEther(initialMint)} DVT tokens`);
    
    // Transfer some tokens to other accounts for testing
    const accounts = await ethers.getSigners();
    const transferAmount = ethers.parseEther("1000");
    
    for (let i = 1; i < Math.min(5, accounts.length); i++) {
      await governanceToken.transfer(accounts[i].address, transferAmount);
      console.log(`   💰 Transferred ${ethers.formatEther(transferAmount)} tokens to ${accounts[i].address}`);
    }
  }

  // Fund treasury (only for development)
  if (network.name === "localhost" || network.name === "hardhat") {
    console.log("\n💰 Funding treasury with ETH...");
    const fundAmount = ethers.parseEther("10");
    await deployer.sendTransaction({
      to: treasuryAddress,
      value: fundAmount
    });
    console.log(`✅ Treasury funded with ${ethers.formatEther(fundAmount)} ETH`);
  }

  // Save deployment info
  const deploymentInfo = {
    network: network.name,
    chainId: network.chainId.toString(),
    deployer: deployer.address,
    deploymentDate: new Date().toISOString(),
    contracts: {
      GovernanceToken: {
        address: tokenAddress,
        name: "GovernanceToken"
      },
      DAO: {
        address: daoAddress,
        name: "DAO"
      },
      Treasury: {
        address: treasuryAddress,
        name: "Treasury"
      }
    },
    rpcUrls: {
      localhost: "http://127.0.0.1:8545",
      sepolia: `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
      mainnet: `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
      polygon: `https://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
    },
    explorerUrls: {
      localhost: "http://localhost:8545",
      sepolia: "https://sepolia.etherscan.io",
      mainnet: "https://etherscan.io",
      polygon: "https://polygonscan.com"
    }
  };

  // Save to multiple locations
  const deploymentsDir = path.join(__dirname, '../deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  // Save network-specific deployment
  const networkDeploymentPath = path.join(deploymentsDir, `${network.name}.json`);
  fs.writeFileSync(networkDeploymentPath, JSON.stringify(deploymentInfo, null, 2));

  // Update frontend config
  const frontendConfigPath = path.join(__dirname, '../../frontend/src/config/contracts.js');
  const frontendConfig = `export const CONTRACTS = {
  GovernanceToken: {
    address: "${tokenAddress}",
    abi: [], // Will be populated by build process
  },
  DAO: {
    address: "${daoAddress}",
    abi: [], // Will be populated by build process
  },
  Treasury: {
    address: "${treasuryAddress}",
    abi: [], // Will be populated by build process
  },
};

export const NETWORK_CONFIG = {
  chainId: ${network.chainId},
  name: "${network.name}",
  rpcUrl: "${deploymentInfo.rpcUrls[network.name] || 'http://127.0.0.1:8545'}",
  explorerUrl: "${deploymentInfo.explorerUrls[network.name] || 'http://localhost:8545'}",
};

export const CONTRACT_ADDRESSES = {
  GOVERNANCE_TOKEN: "${tokenAddress}",
  DAO: "${daoAddress}",
  TREASURY: "${treasuryAddress}",
};
`;

  fs.writeFileSync(frontendConfigPath, frontendConfig);

  console.log("\n📋 Deployment Summary:");
  console.log("========================");
  console.log(`Network: ${network.name} (Chain ID: ${network.chainId})`);
  console.log(`GovernanceToken: ${tokenAddress}`);
  console.log(`DAO: ${daoAddress}`);
  console.log(`Treasury: ${treasuryAddress}`);
  console.log(`\n📁 Deployment info saved to: ${networkDeploymentPath}`);
  console.log(`📁 Frontend config updated: ${frontendConfigPath}`);

  // Verification instructions
  if (network.name !== "localhost" && network.name !== "hardhat") {
    console.log("\n🔍 Contract Verification:");
    console.log("========================");
    console.log("To verify contracts on Etherscan, run:");
    console.log(`npx hardhat verify --network ${network.name} ${tokenAddress}`);
    console.log(`npx hardhat verify --network ${network.name} ${daoAddress} "${tokenAddress}"`);
    console.log(`npx hardhat verify --network ${network.name} ${treasuryAddress} "${daoAddress}"`);
  }

  console.log("\n✅ Deployment completed successfully! 🎉");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  });
