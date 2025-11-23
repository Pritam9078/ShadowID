const express = require('express');
const router = express.Router();

// In-memory storage for demo purposes
// In a real application, you would use a database
let campaigns = [
  {
    id: 1,
    title: "Revolutionary DeFi Protocol",
    description: "Building the next generation of decentralized finance protocols with advanced yield farming mechanisms and cross-chain compatibility.",
    goalAmount: "50.0",
    raisedAmount: "23.5",
    contributorsCount: 47,
    creator: "0x742d35Cc6574C0532925a3b8D75C9c0C1f6a8dC0",
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
    endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
    status: "active",
    contributions: []
  },
  {
    id: 2,
    title: "NFT Marketplace for Digital Artists",
    description: "A specialized marketplace for digital artists to mint, showcase, and sell their NFTs with low fees and high-quality curation.",
    goalAmount: "25.0",
    raisedAmount: "18.2",
    contributorsCount: 32,
    creator: "0x8ba1f109551bD432803012645Hac136c9",
    createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
    endDate: new Date(Date.now() + 22 * 24 * 60 * 60 * 1000), // 22 days from now
    status: "active",
    contributions: []
  },
  {
    id: 3,
    title: "Sustainable Energy Blockchain",
    description: "Developing a blockchain solution for tracking and trading renewable energy certificates with smart contract automation.",
    goalAmount: "75.0",
    raisedAmount: "12.8",
    contributorsCount: 19,
    creator: "0x1234567890123456789012345678901234567890",
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    endDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000), // 25 days from now
    status: "active",
    contributions: []
  }
];

let nextCampaignId = 4;

// Get all campaigns
router.get('/list', (req, res) => {
  try {
    // Filter active campaigns and add computed fields
    const activeCampaigns = campaigns
      .filter(campaign => campaign.status === 'active')
      .map(campaign => ({
        ...campaign,
        isExpired: new Date() > new Date(campaign.endDate),
        daysRemaining: Math.max(0, Math.ceil((new Date(campaign.endDate) - new Date()) / (1000 * 60 * 60 * 24)))
      }));

    res.json({
      success: true,
      campaigns: activeCampaigns,
      total: activeCampaigns.length
    });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch campaigns'
    });
  }
});

// Get single campaign by ID
router.get('/:id', (req, res) => {
  try {
    const campaignId = parseInt(req.params.id);
    const campaign = campaigns.find(c => c.id === campaignId);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    res.json({
      success: true,
      campaign: {
        ...campaign,
        isExpired: new Date() > new Date(campaign.endDate),
        daysRemaining: Math.max(0, Math.ceil((new Date(campaign.endDate) - new Date()) / (1000 * 60 * 60 * 24)))
      }
    });
  } catch (error) {
    console.error('Error fetching campaign:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch campaign'
    });
  }
});

// Create new campaign
router.post('/create', (req, res) => {
  try {
    const { title, description, goalAmount, duration, creator } = req.body;

    // Validation
    if (!title || !description || !goalAmount || !duration || !creator) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    if (parseFloat(goalAmount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Goal amount must be greater than 0'
      });
    }

    if (parseInt(duration) <= 0 || parseInt(duration) > 365) {
      return res.status(400).json({
        success: false,
        message: 'Duration must be between 1 and 365 days'
      });
    }

    // Create new campaign
    const newCampaign = {
      id: nextCampaignId++,
      title: title.trim(),
      description: description.trim(),
      goalAmount: parseFloat(goalAmount).toString(),
      raisedAmount: "0.0",
      contributorsCount: 0,
      creator: creator,
      createdAt: new Date(),
      endDate: new Date(Date.now() + parseInt(duration) * 24 * 60 * 60 * 1000),
      status: "active",
      contributions: []
    };

    campaigns.push(newCampaign);

    res.status(201).json({
      success: true,
      message: 'Campaign created successfully',
      campaign: newCampaign
    });
  } catch (error) {
    console.error('Error creating campaign:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create campaign'
    });
  }
});

// Contribute to campaign
router.post('/contribute', (req, res) => {
  try {
    const { campaignId, contributor, amount } = req.body;

    // Validation
    if (!campaignId || !contributor || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Campaign ID, contributor address, and amount are required'
      });
    }

    const contributionAmount = parseFloat(amount);
    if (contributionAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Contribution amount must be greater than 0'
      });
    }

    // Find campaign
    const campaignIndex = campaigns.findIndex(c => c.id === parseInt(campaignId));
    if (campaignIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    const campaign = campaigns[campaignIndex];

    // Check if campaign is still active
    if (new Date() > new Date(campaign.endDate)) {
      return res.status(400).json({
        success: false,
        message: 'Campaign has ended'
      });
    }

    // Check if campaign is not already fully funded
    if (parseFloat(campaign.raisedAmount) >= parseFloat(campaign.goalAmount)) {
      return res.status(400).json({
        success: false,
        message: 'Campaign has already reached its goal'
      });
    }

    // Create contribution record
    const contribution = {
      id: Date.now(),
      contributor: contributor,
      amount: contributionAmount.toString(),
      timestamp: new Date(),
      txHash: null // Would be filled after blockchain transaction
    };

    // Update campaign
    campaign.contributions.push(contribution);
    campaign.raisedAmount = (parseFloat(campaign.raisedAmount) + contributionAmount).toString();
    
    // Update contributors count (unique contributors)
    const uniqueContributors = new Set(campaign.contributions.map(c => c.contributor));
    campaign.contributorsCount = uniqueContributors.size;

    campaigns[campaignIndex] = campaign;

    res.json({
      success: true,
      message: 'Contribution recorded successfully',
      contribution: contribution,
      campaign: {
        id: campaign.id,
        raisedAmount: campaign.raisedAmount,
        contributorsCount: campaign.contributorsCount,
        progress: (parseFloat(campaign.raisedAmount) / parseFloat(campaign.goalAmount)) * 100
      }
    });
  } catch (error) {
    console.error('Error processing contribution:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process contribution'
    });
  }
});

// Get campaign contributions
router.get('/:id/contributions', (req, res) => {
  try {
    const campaignId = parseInt(req.params.id);
    const campaign = campaigns.find(c => c.id === campaignId);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    res.json({
      success: true,
      contributions: campaign.contributions.map(contribution => ({
        ...contribution,
        contributorShort: `${contribution.contributor.slice(0, 6)}...${contribution.contributor.slice(-4)}`
      }))
    });
  } catch (error) {
    console.error('Error fetching contributions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch contributions'
    });
  }
});

// Get user's campaigns (created by user)
router.get('/user/:address', (req, res) => {
  try {
    const userAddress = req.params.address.toLowerCase();
    const userCampaigns = campaigns.filter(c => 
      c.creator.toLowerCase() === userAddress
    );

    res.json({
      success: true,
      campaigns: userCampaigns,
      total: userCampaigns.length
    });
  } catch (error) {
    console.error('Error fetching user campaigns:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user campaigns'
    });
  }
});

// Get user's contributions (contributed by user)
router.get('/contributions/:address', (req, res) => {
  try {
    const userAddress = req.params.address.toLowerCase();
    const userContributions = [];

    campaigns.forEach(campaign => {
      const contributions = campaign.contributions.filter(c => 
        c.contributor.toLowerCase() === userAddress
      );
      
      contributions.forEach(contribution => {
        userContributions.push({
          ...contribution,
          campaignId: campaign.id,
          campaignTitle: campaign.title,
          campaignStatus: campaign.status
        });
      });
    });

    res.json({
      success: true,
      contributions: userContributions,
      total: userContributions.length,
      totalAmount: userContributions.reduce((sum, c) => sum + parseFloat(c.amount), 0).toString()
    });
  } catch (error) {
    console.error('Error fetching user contributions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user contributions'
    });
  }
});

// Update campaign status (admin only)
router.patch('/:id/status', (req, res) => {
  try {
    const { status } = req.body;
    const campaignId = parseInt(req.params.id);
    
    if (!['active', 'paused', 'cancelled', 'completed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const campaignIndex = campaigns.findIndex(c => c.id === campaignId);
    if (campaignIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    campaigns[campaignIndex].status = status;

    res.json({
      success: true,
      message: 'Campaign status updated successfully',
      campaign: campaigns[campaignIndex]
    });
  } catch (error) {
    console.error('Error updating campaign status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update campaign status'
    });
  }
});

module.exports = router;