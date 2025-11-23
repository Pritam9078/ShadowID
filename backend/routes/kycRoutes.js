const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const ZKService = require('../services/zkService');

const router = express.Router();

// Initialize ZK Service for KYC integration
const zkService = new ZKService();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/kyc');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and PDF files are allowed'));
    }
  }
});

// In-memory storage for demo purposes (use database in production)
const kycRecords = new Map();
const kybRecords = new Map();

/**
 * @route POST /api/kyc/start
 * @desc Start KYC verification process
 * @access Public
 */
router.post('/start', upload.fields([
  { name: 'idDocument', maxCount: 1 },
  { name: 'selfie', maxCount: 1 }
]), async (req, res) => {
  try {
    const { walletAddress } = req.body;
    
    if (!walletAddress) {
      return res.status(400).json({ 
        success: false, 
        message: 'Wallet address is required' 
      });
    }

    if (!req.files || !req.files.idDocument || !req.files.selfie) {
      return res.status(400).json({ 
        success: false, 
        message: 'Both ID document and selfie are required' 
      });
    }

    // Generate reference ID
    const referenceId = `KYC_${crypto.randomBytes(8).toString('hex').toUpperCase()}`;

    // Store KYC record
    const kycRecord = {
      referenceId,
      walletAddress,
      status: 'submitted',
      submittedAt: new Date().toISOString(),
      documents: {
        idDocument: req.files.idDocument[0].filename,
        selfie: req.files.selfie[0].filename
      },
      verificationLevel: 'pending',
      estimatedCompletion: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    };

    kycRecords.set(walletAddress, kycRecord);

    // Simulate verification process with ZK proof generation
    setTimeout(async () => {
      const record = kycRecords.get(walletAddress);
      if (record) {
        record.status = 'verified';
        record.verificationLevel = 'level1';
        record.verifiedAt = new Date().toISOString();
        
        // Generate age verification ZK proof automatically after KYC completion
        try {
          const birthYear = new Date().getFullYear() - 25; // Default to 25 years old
          const zkProof = await zkService.generateAgeProof(walletAddress, birthYear, 18);
          record.zkProofId = zkProof.proof.proofId;
          record.zkProofGenerated = true;
          console.log(`[KYC] ZK age proof generated for ${walletAddress}: ${zkProof.proof.proofId}`);
        } catch (error) {
          console.error(`[KYC] Failed to generate ZK proof for ${walletAddress}:`, error);
          record.zkProofGenerated = false;
        }
        
        kycRecords.set(walletAddress, record);
        console.log(`[KYC] Verification completed for ${walletAddress}`);
      }
    }, 5000); // Simulate 5 second processing

    res.json({
      success: true,
      message: 'KYC verification started successfully',
      referenceId,
      status: 'submitted',
      estimatedCompletion: kycRecord.estimatedCompletion
    });

  } catch (error) {
    console.error('[KYC] Error starting verification:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error during KYC processing',
      error: error.message 
    });
  }
});

/**
 * @route GET /api/kyc/status/:walletAddress
 * @desc Get KYC verification status
 * @access Public
 */
router.get('/status/:walletAddress', (req, res) => {
  try {
    const { walletAddress } = req.params;
    
    const kycRecord = kycRecords.get(walletAddress);
    
    if (!kycRecord) {
      return res.status(404).json({ 
        success: false, 
        message: 'No KYC record found for this wallet address' 
      });
    }

    // Return status without sensitive file information
    const publicRecord = {
      referenceId: kycRecord.referenceId,
      walletAddress: kycRecord.walletAddress,
      status: kycRecord.status,
      verificationLevel: kycRecord.verificationLevel,
      submittedAt: kycRecord.submittedAt,
      verifiedAt: kycRecord.verifiedAt,
      estimatedCompletion: kycRecord.estimatedCompletion,
      zkProofGenerated: kycRecord.zkProofGenerated || false,
      zkProofId: kycRecord.zkProofId || null
    };

    res.json({
      success: true,
      data: publicRecord
    });

  } catch (error) {
    console.error('[KYC] Error getting status:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    });
  }
});

/**
 * @route DELETE /api/kyc/:walletAddress
 * @desc Delete KYC record and associated files
 * @access Public (should be protected in production)
 */
router.delete('/:walletAddress', (req, res) => {
  try {
    const { walletAddress } = req.params;
    
    const kycRecord = kycRecords.get(walletAddress);
    
    if (!kycRecord) {
      return res.status(404).json({ 
        success: false, 
        message: 'No KYC record found for this wallet address' 
      });
    }

    // Delete files
    const uploadDir = path.join(__dirname, '../uploads/kyc');
    if (kycRecord.documents) {
      Object.values(kycRecord.documents).forEach(filename => {
        const filePath = path.join(uploadDir, filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
    }

    // Delete record
    kycRecords.delete(walletAddress);

    res.json({
      success: true,
      message: 'KYC record deleted successfully'
    });

  } catch (error) {
    console.error('[KYC] Error deleting record:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    });
  }
});

/**
 * @route GET /api/kyc/zk-identity/:walletAddress
 * @desc Get ZK identity status based on KYC verification
 * @access Public
 */
router.get('/zk-identity/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    
    const kycRecord = kycRecords.get(walletAddress);
    
    if (!kycRecord) {
      return res.status(404).json({ 
        success: false, 
        message: 'No KYC record found for this wallet address' 
      });
    }

    // Get ZK identity status from service
    const zkIdentityStatus = await zkService.getIdentityStatus(walletAddress);

    res.json({
      success: true,
      data: {
        kyc: {
          status: kycRecord.status,
          verificationLevel: kycRecord.verificationLevel,
          zkProofGenerated: kycRecord.zkProofGenerated || false
        },
        zkIdentity: zkIdentityStatus,
        integration: 'KYC verification enhanced with ZK identity proofs'
      }
    });

  } catch (error) {
    console.error('[KYC] Error getting ZK identity status:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    });
  }
});

/**
 * @route GET /api/kyc/stats
 * @desc Get KYC statistics with ZK integration metrics
 * @access Public
 */
router.get('/stats', (req, res) => {
  try {
    const kycArray = Array.from(kycRecords.values());
    
    const stats = {
      totalSubmissions: kycRecords.size,
      verified: kycArray.filter(r => r.status === 'verified').length,
      pending: kycArray.filter(r => r.status === 'submitted').length,
      rejected: kycArray.filter(r => r.status === 'rejected').length,
      zkIntegration: {
        proofsGenerated: kycArray.filter(r => r.zkProofGenerated).length,
        proofsFailedGeneration: kycArray.filter(r => r.zkProofGenerated === false).length
      }
    };

    res.json({
      success: true,
      data: stats,
      enhanced: 'KYC statistics include ZK proof integration metrics'
    });

  } catch (error) {
    console.error('[KYC] Error getting stats:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    });
  }
});

module.exports = router;