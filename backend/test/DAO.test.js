const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DVote DAO Governance", function () {
  let governanceToken, treasury, dao;
  let owner, addr1, addr2, addr3;
  
  beforeEach(async function () {
    [owner, addr1, addr2, addr3] = await ethers.getSigners();
    
    // Deploy GovernanceToken with enhanced constructor
    const GovernanceToken = await ethers.getContractFactory("GovernanceToken");
    governanceToken = await GovernanceToken.deploy(
      "DVote Token",        // name
      "DVOTE",             // symbol  
      owner.address,       // admin
      ethers.parseEther("1000000") // initialMint (1M tokens)
    );
    
    // Deploy Treasury
    const Treasury = await ethers.getContractFactory("Treasury");
    treasury = await Treasury.deploy(owner.address);
    
    // Deploy DAO
    const DAO = await ethers.getContractFactory("DAO");
    dao = await DAO.deploy(
      await governanceToken.getAddress(),
      await treasury.getAddress(),
      owner.address
    );
    
    // Transfer treasury ownership to DAO
    await treasury.transferOwnership(await dao.getAddress());
    
    // Allow treasury as a target for proposals
    await dao.setAllowedTarget(await treasury.getAddress(), true);
    
    // Manually delegate first, then distribute tokens
    await governanceToken.connect(addr1).delegate(addr1.address);
    await governanceToken.connect(addr2).delegate(addr2.address);
    await governanceToken.connect(addr3).delegate(addr3.address);
    
    // Mine a block to record the delegation
    await ethers.provider.send("evm_mine");
    
    // Now distribute tokens - this should trigger auto-delegation but we've already set it up
    const amount = ethers.parseEther("50000"); // 50,000 tokens each
    await governanceToken.transfer(addr1.address, amount);
    await governanceToken.transfer(addr2.address, amount);
    await governanceToken.transfer(addr3.address, amount);
    
    // Mine several blocks to ensure voting power is recorded for past votes
    await ethers.provider.send("evm_mine");
    await ethers.provider.send("evm_mine");
    await ethers.provider.send("evm_mine");
    
    // Fund treasury
    await owner.sendTransaction({
      to: await treasury.getAddress(),
      value: ethers.parseEther("100")
    });
  });

  describe("GovernanceToken", function () {
    it("Should have correct initial supply", async function () {
      const totalSupply = await governanceToken.totalSupply();
      expect(totalSupply).to.equal(ethers.parseEther("1000000"));
    });

    it("Should allow token distribution", async function () {
      const balance = await governanceToken.balanceOf(addr1.address);
      expect(balance).to.equal(ethers.parseEther("50000"));
    });

    it("Should track voting power after delegation", async function () {
      const votingPower = await governanceToken.getVotes(addr1.address);
      expect(votingPower).to.equal(ethers.parseEther("50000"));
    });
  });

  describe("Treasury", function () {
    it("Should receive ETH deposits", async function () {
      const balance = await ethers.provider.getBalance(await treasury.getAddress());
      expect(balance).to.equal(ethers.parseEther("100"));
    });

    it("Should only allow DAO to withdraw", async function () {
      await expect(
        treasury.connect(addr1).withdrawETH(addr1.address, ethers.parseEther("1"))
      ).to.be.revertedWithCustomError(treasury, "OwnableUnauthorizedAccount");
    });
  });

  describe("DAO Governance", function () {
    it("Should allow proposal creation with sufficient voting power", async function () {
      await dao.createProposal(
        "Test Proposal",
        "QmTestDescriptionCID",
        ethers.ZeroAddress,
        0
      );
      
      expect(await dao.proposalCount()).to.equal(1);
    });

    it("Should reject proposal creation with insufficient voting power", async function () {
      // Transfer away all tokens from addr1 to get below 1 token threshold
      const balance = await governanceToken.balanceOf(addr1.address);
      await governanceToken.connect(addr1).transfer(owner.address, balance);
      
      await expect(
        dao.connect(addr1).createProposal(
          "Test Proposal",
          "QmTestDescriptionCID",
          ethers.ZeroAddress,
          0
        )
      ).to.be.revertedWith("Insufficient tokens to propose");
    });

    it("Should allow voting on active proposals", async function () {
      // Create proposal
      await dao.connect(addr1).createProposal(
        "Fund Community Event", 
        "QmTestDescriptionCID",
        await treasury.getAddress(),
        ethers.parseEther("2")
      );

      // Wait for voting period to start and mine blocks to ensure past votes are available
      await ethers.provider.send("evm_increaseTime", [3601]); // 1 hour + 1 second
      await ethers.provider.send("evm_mine");
      await ethers.provider.send("evm_mine");
      await ethers.provider.send("evm_mine");

      // Vote
      await expect(dao.connect(addr1).vote(1, 1)) // Vote "For"
        .to.emit(dao, "Voted");
      
      await expect(dao.connect(addr2).vote(1, 1)) // Vote "For"
        .to.emit(dao, "Voted");
    });

    it("Should execute successful proposals", async function () {
      // Create proposal to withdraw ETH from treasury
      await dao.connect(addr1).createProposal(
        "Fund Community Event",
        "QmTestDescriptionCID", 
        await treasury.getAddress(),
        ethers.parseEther("2")
      );

      // Wait for voting period to start and mine blocks to ensure past votes are available
      await ethers.provider.send("evm_increaseTime", [3601]);
      await ethers.provider.send("evm_mine");
      await ethers.provider.send("evm_mine");
      await ethers.provider.send("evm_mine");

      // Vote with majority
      await dao.connect(addr1).vote(1, 0); // For (0=For)
      await dao.connect(addr2).vote(1, 0); // For (0=For)
      await dao.connect(addr3).vote(1, 0); // For (0=For)

      // Wait for voting period to end
      await ethers.provider.send("evm_increaseTime", [259201]); // 3 days + 1 second
      await ethers.provider.send("evm_mine");

      // Finalize the proposal
      await dao.finalizeProposal(1);

      // Check proposal state
      const [, , , , , , , state] = await dao.getProposal(1);
      expect(state).to.equal(1); // Passed (ProposalState.Passed = 1)

      // Wait for execution delay (1 day by default)
      await ethers.provider.send("evm_increaseTime", [86401]); // 1 day + 1 second
      await ethers.provider.send("evm_mine");

      // Execute proposal
      await expect(dao.executeProposal(1))
        .to.emit(dao, "ProposalExecuted");

      // Verify proposal is now executed
      const [, , , , , , , , , , , executed] = await dao.getProposal(1);
      expect(executed).to.be.true;
    });

    it("Should reject execution of failed proposals", async function () {
      // Create proposal
      await dao.connect(addr1).createProposal(
        "Test Proposal",
        "QmTestDescriptionCID", 
        ethers.ZeroAddress,
        0
      );

      // Wait for voting period to start and mine blocks to ensure past votes are available
      await ethers.provider.send("evm_increaseTime", [3601]);
      await ethers.provider.send("evm_mine");
      await ethers.provider.send("evm_mine");
      await ethers.provider.send("evm_mine");

      // Vote against
      await dao.connect(addr1).vote(1, 1); // Against (1=Against)
      await dao.connect(addr2).vote(1, 1); // Against (1=Against)

      // Wait for voting period to end
      await ethers.provider.send("evm_increaseTime", [259201]);
      await ethers.provider.send("evm_mine");

      // Finalize the proposal
      await dao.finalizeProposal(1);

      // Check proposal state
      const [, , , , , , , state] = await dao.getProposal(1);
      expect(state).to.equal(2); // Rejected (ProposalState.Rejected = 2)

      // Try to execute - should fail
      await expect(dao.executeProposal(1))
        .to.be.revertedWith("Not passed");
    });
  });
});
