const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Deploy GovernanceToken
  console.log("\n🪙 Deploying GovernanceToken...");
  const GovernanceToken = await ethers.getContractFactory("GovernanceToken");
  const governanceToken = await GovernanceToken.deploy(
    "DVote Token",        // name
    "DVOTE",             // symbol  
    deployer.address,    // admin
    ethers.parseEther("950000") // initialMint (950K tokens, leaving room for test distribution)
  );
  await governanceToken.waitForDeployment();
  const tokenAddress = await governanceToken.getAddress();
  console.log("✅ GovernanceToken deployed to:", tokenAddress);

  // Deploy Treasury
  console.log("\n💰 Deploying Treasury...");
  const Treasury = await ethers.getContractFactory("Treasury");
  // We'll set the DAO address later
  const treasury = await Treasury.deploy(deployer.address);
  await treasury.waitForDeployment();
  const treasuryAddress = await treasury.getAddress();
  console.log("✅ Treasury deployed to:", treasuryAddress);

  // Deploy DAO
  console.log("\n🏛️ Deploying DAO...");
  const DAO = await ethers.getContractFactory("DAO");
  const dao = await DAO.deploy(tokenAddress, treasuryAddress, deployer.address);
  await dao.waitForDeployment();
  const daoAddress = await dao.getAddress();
  console.log("✅ DAO deployed to:", daoAddress);

  // Transfer Treasury ownership to DAO
  console.log("\n🔄 Transferring Treasury ownership to DAO...");
  await treasury.transferOwnership(daoAddress);
  console.log("✅ Treasury ownership transferred to DAO");

  // Distribute some tokens for testing
  console.log("\n🎁 Distributing tokens for testing...");
  const distributionAmount = ethers.parseEther("10000"); // 10,000 tokens
  
  // Get some test accounts
  const accounts = await ethers.getSigners();
  const recipients = accounts.slice(1, 6); // 5 test accounts
  
  if (recipients.length > 0) {
    for (let i = 0; i < recipients.length; i++) {
      await governanceToken.transfer(recipients[i].address, distributionAmount);
    }
    console.log(`✅ Distributed ${ethers.formatEther(distributionAmount)} tokens to ${recipients.length} accounts`);
  }

  // Fund treasury with some ETH for testing
  console.log("\n💰 Funding Treasury with test ETH...");
  const fundAmount = ethers.parseEther("10"); // 10 ETH
  await deployer.sendTransaction({
    to: treasuryAddress,
    value: fundAmount
  });
  console.log(`✅ Treasury funded with ${ethers.formatEther(fundAmount)} ETH`);

  console.log("\n📋 Deployment Summary:");
  console.log("====================");
  console.log("GovernanceToken:", tokenAddress);
  console.log("Treasury:", treasuryAddress);
  console.log("DAO:", daoAddress);
  console.log("Deployer:", deployer.address);
  
  // Save deployment addresses to a file
  const fs = require('fs');
  const deploymentInfo = {
    network: await ethers.provider.getNetwork(),
    contracts: {
      GovernanceToken: tokenAddress,
      Treasury: treasuryAddress,
      DAO: daoAddress
    },
    deployer: deployer.address,
    timestamp: new Date().toISOString()
  };
  
  fs.writeFileSync(
    './deployment-info.json', 
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("\n💾 Deployment info saved to deployment-info.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
