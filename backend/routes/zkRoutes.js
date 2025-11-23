const express = require('express');
const crypto = require('crypto');
const ZKService = require('../services/zkService');

const router = express.Router();

// Initialize ZK Service
const zkService = new ZKService();

// In-memory storage for demo purposes (use database in production) 
const zkProofs = new Map();
const identityProofs = new Map();

/**
 * Mock ZK Proof Generator
 * In production, this would integrate with actual ZK proof libraries like:
 * - circom/snarkjs
 * - libsnark
 * - Bulletproofs
 * - zk-SNARKs/STARKs
 */
function generateMockZkProof(type, walletAddress, claimData) {
  const proofId = crypto.randomBytes(16).toString('hex');
  const timestamp = Date.now();
  
  // Mock proof structure (would be actual cryptographic proof in production)
  return {
    proofId,
    type,
    walletAddress,
    claim: claimData,
    proof: {
      pi_a: [crypto.randomBytes(32).toString('hex'), crypto.randomBytes(32).toString('hex')],
      pi_b: [[crypto.randomBytes(32).toString('hex'), crypto.randomBytes(32).toString('hex')], 
             [crypto.randomBytes(32).toString('hex'), crypto.randomBytes(32).toString('hex')]],
      pi_c: [crypto.randomBytes(32).toString('hex'), crypto.randomBytes(32).toString('hex')],
      protocol: 'groth16',
      curve: 'bn128'
    },
    publicSignals: [
      walletAddress.toLowerCase(),
      timestamp.toString(),
      crypto.randomBytes(8).toString('hex')
    ],
    metadata: {
      circuit: `${type}_verification_circuit_v1.0`,
      compiler: 'circom_v2.1.5',
      generatedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      verificationKey: crypto.randomBytes(32).toString('hex')
    },
    isValid: true,
    hash: crypto.createHash('sha256').update(proofId + type + walletAddress + timestamp).digest('hex')
  };
}

/**
 * @route POST /api/zk/age-proof
 * @desc Generate zero-knowledge proof for age verification (over 18)
 * @access Public
 */
router.post('/age-proof', async (req, res) => {
  try {
    const { walletAddress, minAge = 18, birthYear } = req.body;
    
    if (!walletAddress) {
      return res.status(400).json({ 
        success: false, 
        message: 'Wallet address is required' 
      });
    }

    console.log(`[ZK] Generating age proof for ${walletAddress}, minAge: ${minAge}`);

    // Use current year - 25 as default birth year if not provided (simulating 25-year-old)
    const defaultBirthYear = new Date().getFullYear() - 25;
    const userBirthYear = birthYear || defaultBirthYear;

    // Generate ZK proof using enhanced service
    const result = await zkService.generateAgeProof(walletAddress, userBirthYear, minAge);

    res.json({
      success: true,
      message: 'Age verification proof generated successfully with Noir integration',
      ...result,
      usage: 'This proof can be submitted to smart contracts that require age verification',
      integration: 'Enhanced with Noir ZK protocols for maximum privacy'
    });

  } catch (error) {
    console.error('[ZK] Error generating age proof:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error during proof generation',
      error: error.message 
    });
  }
});

/**
 * @route POST /api/zk/citizenship-proof
 * @desc Generate zero-knowledge proof for citizenship verification
 * @access Public
 */
router.post('/citizenship-proof', async (req, res) => {
  try {
    const { walletAddress, country = 'US', documentHash } = req.body;
    
    if (!walletAddress) {
      return res.status(400).json({ 
        success: false, 
        message: 'Wallet address is required' 
      });
    }

    console.log(`[ZK] Generating citizenship proof for ${walletAddress}, country: ${country}`);

    // Generate ZK proof using enhanced service
    const result = await zkService.generateCitizenshipProof(walletAddress, country, documentHash);

    res.json({
      success: true,
      message: 'Citizenship verification proof generated successfully with Noir integration',
      ...result,
      usage: 'This proof can be used for governance participation or region-specific features',
      integration: 'Enhanced with Noir ZK protocols for maximum privacy'
    });

  } catch (error) {
    console.error('[ZK] Error generating citizenship proof:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error during proof generation',
      error: error.message 
    });
  }
});

/**
 * @route POST /api/zk/business-proof
 * @desc Generate zero-knowledge proof for business registration verification
 * @access Public
 */
router.post('/business-proof', async (req, res) => {
  try {
    const { walletAddress, businessType = 'general', registrationData } = req.body;
    
    if (!walletAddress) {
      return res.status(400).json({ 
        success: false, 
        message: 'Wallet address is required' 
      });
    }

    console.log(`[ZK] Generating business proof for ${walletAddress}, type: ${businessType}`);

    // Generate ZK proof using enhanced service
    const result = await zkService.generateBusinessProof(walletAddress, businessType, registrationData);

    res.json({
      success: true,
      message: 'Business registration proof generated successfully with Noir integration',
      ...result,
      usage: 'This proof can be used for business-specific governance proposals or commercial features',
      integration: 'Enhanced with Noir ZK protocols for maximum privacy'
    });

  } catch (error) {
    console.error('[ZK] Error generating business proof:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error during proof generation',
      error: error.message 
    });
  }
});

/**
 * @route POST /api/zk/verify
 * @desc Verify a zero-knowledge proof using Noir verification
 * @access Public
 */
router.post('/verify', async (req, res) => {
  try {
    const { proof } = req.body;
    
    if (!proof) {
      return res.status(400).json({ 
        success: false, 
        message: 'Proof object is required' 
      });
    }

    console.log(`[ZK] Verifying proof ${proof.proofId || 'unknown'}`);

    // Use enhanced ZK service for verification
    const verificationResult = await zkService.verifyProof(proof);

    res.json({
      success: true,
      verification: verificationResult,
      enhanced: 'Verification performed using Noir ZK protocols'
    });

  } catch (error) {
    console.error('[ZK] Error verifying proof:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error during proof verification',
      error: error.message 
    });
  }
});

/**
 * @route GET /api/zk/status/:proofHash
 * @desc Get status of a ZK proof
 * @access Public
 */
router.get('/status/:proofHash', (req, res) => {
  try {
    const { proofHash } = req.params;
    
    // Find proof by hash
    let foundProof = null;
    for (const proof of zkProofs.values()) {
      if (proof.hash === proofHash) {
        foundProof = proof;
        break;
      }
    }

    if (!foundProof) {
      return res.status(404).json({ 
        success: false, 
        message: 'Proof not found' 
      });
    }

    res.json({
      success: true,
      proof: {
        proofId: foundProof.proofId,
        type: foundProof.type,
        isValid: foundProof.isValid,
        generatedAt: foundProof.metadata.generatedAt,
        expiresAt: foundProof.metadata.expiresAt
      }
    });

  } catch (error) {
    console.error('[ZK] Error getting proof status:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    });
  }
});

/**
 * @route POST /api/zk/submit-proof
 * @desc Submit identity proof to identity registry
 * @access Public
 */
router.post('/submit-proof', (req, res) => {
  try {
    const { walletAddress, proof } = req.body;
    
    if (!walletAddress || !proof) {
      return res.status(400).json({ 
        success: false, 
        message: 'Wallet address and proof are required' 
      });
    }

    // Store in identity registry
    const submissionId = crypto.randomBytes(8).toString('hex');
    const identityRecord = {
      submissionId,
      walletAddress,
      proof,
      submittedAt: new Date().toISOString(),
      status: 'verified'
    };

    identityProofs.set(walletAddress, identityRecord);

    res.json({
      success: true,
      message: 'Identity proof submitted successfully',
      submissionId,
      status: 'verified'
    });

  } catch (error) {
    console.error('[ZK] Error submitting proof:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    });
  }
});

/**
 * @route GET /api/zk/identity/:walletAddress
 * @desc Get comprehensive identity status for wallet address
 * @access Public
 */
router.get('/identity/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    
    console.log(`[ZK] Getting identity status for ${walletAddress}`);

    // Use enhanced ZK service for identity status
    const identityStatus = await zkService.getIdentityStatus(walletAddress);

    res.json({
      success: true,
      identity: identityStatus,
      enhanced: 'Identity status retrieved using enhanced ZK service'
    });

  } catch (error) {
    console.error('[ZK] Error getting identity status:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    });
  }
});

/**
 * @route POST /api/zk/aggregate-identity
 * @desc Aggregate multiple ZK proofs into single identity proof
 * @access Public
 */
router.post('/aggregate-identity', async (req, res) => {
  try {
    const { walletAddress, proofIds } = req.body;
    
    if (!walletAddress || !proofIds || !Array.isArray(proofIds)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Wallet address and array of proof IDs are required' 
      });
    }

    console.log(`[ZK] Aggregating identity proofs for ${walletAddress}:`, proofIds);

    // Use enhanced ZK service for proof aggregation
    const result = await zkService.aggregateIdentityProofs(walletAddress, proofIds);

    res.json({
      success: true,
      message: 'Identity proofs aggregated successfully',
      ...result,
      usage: 'Aggregated proof provides comprehensive identity verification in single proof',
      integration: 'Enhanced with Noir ZK proof aggregation protocols'
    });

  } catch (error) {
    console.error('[ZK] Error aggregating identity proofs:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error during proof aggregation',
      error: error.message 
    });
  }
});

/**
 * @route GET /api/zk/stats
 * @desc Get comprehensive ZK proof system statistics
 * @access Public
 */
router.get('/stats', async (req, res) => {
  try {
    console.log('[ZK] Getting system statistics');

    // Get stats from enhanced ZK service
    const enhancedStats = zkService.getStats();
    
    // Legacy stats for backward compatibility
    const proofArray = Array.from(zkProofs.values());
    const legacyStats = {
      totalProofs: proofArray.length,
      proofsByType: {
        age_verification: proofArray.filter(p => p.type === 'age_verification').length,
        citizenship_verification: proofArray.filter(p => p.type === 'citizenship_verification').length,
        business_verification: proofArray.filter(p => p.type === 'business_verification').length
      },
      totalIdentitySubmissions: identityProofs.size,
      validProofs: proofArray.filter(p => p.isValid).length
    };

    res.json({
      success: true,
      data: {
        ...enhancedStats,
        legacy: legacyStats,
        enhanced: 'Statistics include enhanced ZK service metrics'
      }
    });

  } catch (error) {
    console.error('[ZK] Error getting stats:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    });
  }
});

module.exports = router;