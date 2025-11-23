const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Starting Sepolia deployment...");
  
  // Check environment variables
  if (!process.env.PRIVATE_KEY) {
    throw new Error("❌ PRIVATE_KEY not found in .env file. Please add your private key.");
  }
  
  if (!process.env.SEPOLIA_URL || process.env.SEPOLIA_URL.includes("YOUR-PROJECT-ID")) {
    throw new Error("❌ SEPOLIA_URL not properly configured in .env file. Please add your Alchemy API URL.");
  }
  
  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  
  if (!deployer) {
    throw new Error("❌ No deployer account found. Check your private key configuration.");
  }
  
  console.log("Deploying contracts with account:", deployer.address);
  
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");
  
  if (balance < hre.ethers.parseEther("0.1")) {
    console.log("⚠️  Warning: Low balance. You may need more Sepolia ETH from faucets.");
  }

  console.log("\n📄 Deploying contracts...");
  
  // Deploy GovernanceToken
  console.log("1. Deploying GovernanceToken...");
  const GovernanceToken = await hre.ethers.getContractFactory("GovernanceToken");
  const governanceToken = await GovernanceToken.deploy(
    "DVote Token", // name
    "DVT", // symbol
    deployer.address, // admin
    hre.ethers.parseEther("1000000") // initial mint (1M tokens)
  );
  await governanceToken.waitForDeployment();
  const governanceTokenAddress = await governanceToken.getAddress();
  console.log("✅ GovernanceToken deployed to:", governanceTokenAddress);

  // Deploy DAO
  console.log("2. Deploying DAO...");
  const DAO = await hre.ethers.getContractFactory("DAO");
  const dao = await DAO.deploy(
    governanceTokenAddress, // _govToken
    "0x0000000000000000000000000000000000000000", // _treasury (will set later)
    deployer.address // initialOwner
  );
  await dao.waitForDeployment();
  const daoAddress = await dao.getAddress();
  console.log("✅ DAO deployed to:", daoAddress);

  // Deploy Treasury
  console.log("3. Deploying Treasury...");
  const Treasury = await hre.ethers.getContractFactory("Treasury");
  const treasury = await Treasury.deploy(daoAddress);
  await treasury.waitForDeployment();
  const treasuryAddress = await treasury.getAddress();
  console.log("✅ Treasury deployed to:", treasuryAddress);

  // Link Treasury to DAO
  console.log("4. Linking Treasury to DAO...");
  await dao.linkTreasury(treasuryAddress);
  console.log("✅ Treasury linked to DAO");

  // Setup initial tokens are already minted in constructor
  console.log("\n🪙 Tokens already minted in constructor...");
  const mintAmount = hre.ethers.parseEther("1000000"); // 1M tokens
  console.log("✅ Initial supply:", hre.ethers.formatEther(mintAmount), "tokens minted to deployer");

  // Store deployment info
  const deploymentInfo = {
    network: "sepolia",
    chainId: 11155111,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      GovernanceToken: governanceTokenAddress,
      DAO: daoAddress,
      Treasury: treasuryAddress
    },
    constructor_args: {
      GovernanceToken: {
        name: "DVote Token",
        symbol: "DVT", 
        admin: deployer.address,
        initialMint: "1000000000000000000000000" // 1M tokens in wei
      },
      DAO: {
        govToken: governanceTokenAddress,
        treasury: "0x0000000000000000000000000000000000000000", // Initially null, linked after
        initialOwner: deployer.address
      },
      Treasury: {
        owner: daoAddress
      }
    },
    block_numbers: {
      GovernanceToken: await governanceToken.deploymentTransaction()?.blockNumber,
      DAO: await dao.deploymentTransaction()?.blockNumber,
      Treasury: await treasury.deploymentTransaction()?.blockNumber
    }
  };

  // Save deployment info to file
  const deploymentPath = path.join(__dirname, "..", "deployment-info.json");
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("\n📋 Deployment info saved to deployment-info.json");

  // Update frontend contracts config
  console.log("\n🔧 Updating frontend configuration...");
  
  const contractsConfigPath = path.join(__dirname, "..", "frontend", "src", "config", "contracts.js");
  if (fs.existsSync(contractsConfigPath)) {
    let contractsConfig = fs.readFileSync(contractsConfigPath, "utf8");
    
    // Update Sepolia addresses
    contractsConfig = contractsConfig.replace(
      /const SEPOLIA_ADDRESSES = \{[\s\S]*?\};/,
      `const SEPOLIA_ADDRESSES = {
  GovernanceToken: "${governanceTokenAddress}",
  DAO: "${daoAddress}",
  Treasury: "${treasuryAddress}"
};`
    );
    
    fs.writeFileSync(contractsConfigPath, contractsConfig);
    console.log("✅ Updated frontend/src/config/contracts.js with new addresses");
  }

  // Create ABI files for frontend
  console.log("\n📁 Creating ABI files for frontend...");
  const frontendAbiPath = path.join(__dirname, "..", "frontend", "src", "abi");
  
  if (!fs.existsSync(frontendAbiPath)) {
    fs.mkdirSync(frontendAbiPath, { recursive: true });
  }

  // Copy ABI files
  const artifactsPath = path.join(__dirname, "..", "artifacts", "contracts");
  const contracts = ["GovernanceToken", "DAO", "Treasury"];
  
  for (const contractName of contracts) {
    const artifactPath = path.join(artifactsPath, `${contractName}.sol`, `${contractName}.json`);
    const targetPath = path.join(frontendAbiPath, `${contractName}.json`);
    
    if (fs.existsSync(artifactPath)) {
      const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
      const abiOnly = {
        abi: artifact.abi,
        contractName: contractName,
        address: deploymentInfo.contracts[contractName]
      };
      fs.writeFileSync(targetPath, JSON.stringify(abiOnly, null, 2));
      console.log(`✅ Created ${contractName}.json ABI file`);
    }
  }

  console.log("\n🎉 Sepolia deployment completed successfully!");
  console.log("\n📋 Summary:");
  console.log("Network: Sepolia (Chain ID: 11155111)");
  console.log("GovernanceToken:", governanceTokenAddress);
  console.log("DAO:", daoAddress);
  console.log("Treasury:", treasuryAddress);
  console.log("Deployer:", deployer.address);
  console.log("Initial tokens minted:", hre.ethers.formatEther(mintAmount));
  
  console.log("\n🔗 Etherscan Links:");
  console.log("GovernanceToken:", `https://sepolia.etherscan.io/address/${governanceTokenAddress}`);
  console.log("DAO:", `https://sepolia.etherscan.io/address/${daoAddress}`);
  console.log("Treasury:", `https://sepolia.etherscan.io/address/${treasuryAddress}`);
  
  console.log("\n📱 Next Steps:");
  console.log("1. Switch your MetaMask to Sepolia network");
  console.log("2. Start your frontend: cd frontend && npm run dev");
  console.log("3. Connect your wallet and start creating proposals!");
  
  console.log("\n💡 Your deployed DVote is ready on Sepolia!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
