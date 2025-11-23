const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const ZKService = require('../services/zkService');

const router = express.Router();

// Initialize ZK Service for KYB integration
const zkService = new ZKService();

// Configure multer for business document uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/kyb');
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
    fileSize: 20 * 1024 * 1024, // 20MB limit for business documents
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype) || 
                     file.mimetype === 'application/msword' ||
                     file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, PDF, DOC, and DOCX files are allowed'));
    }
  }
});

// In-memory storage for demo purposes (use database in production)
const kybRecords = new Map();

/**
 * @route POST /api/kyb/start
 * @desc Start KYB (Know Your Business) verification process
 * @access Public
 */
router.post('/start', upload.fields([
  { name: 'businessDocs', maxCount: 5 }
]), async (req, res) => {
  try {
    const { walletAddress, businessName, businessType, registrationNumber, country } = req.body;
    
    if (!walletAddress) {
      return res.status(400).json({ 
        success: false, 
        message: 'Wallet address is required' 
      });
    }

    if (!req.files || !req.files.businessDocs || req.files.businessDocs.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Business registration documents are required' 
      });
    }

    // Generate reference ID
    const referenceId = `KYB_${crypto.randomBytes(8).toString('hex').toUpperCase()}`;

    // Store KYB record
    const kybRecord = {
      referenceId,
      walletAddress,
      businessDetails: {
        name: businessName || 'Not provided',
        type: businessType || 'Not specified',
        registrationNumber: registrationNumber || 'Not provided',
        country: country || 'Not specified'
      },
      status: 'submitted',
      submittedAt: new Date().toISOString(),
      documents: req.files.businessDocs.map(file => ({
        filename: file.filename,
        originalName: file.originalname,
        size: file.size
      })),
      verificationLevel: 'pending',
      estimatedCompletion: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString() // 48 hours
    };

    kybRecords.set(walletAddress, kybRecord);

    // Simulate verification process with ZK proof generation
    setTimeout(async () => {
      const record = kybRecords.get(walletAddress);
      if (record) {
        record.status = 'verified';
        record.verificationLevel = 'business_verified';
        record.verifiedAt = new Date().toISOString();
        
        // Generate business verification ZK proof automatically after KYB completion
        try {
          const businessType = record.businessDetails?.type || 'general';
          const zkProof = await zkService.generateBusinessProof(walletAddress, businessType);
          record.zkProofId = zkProof.proof.proofId;
          record.zkProofGenerated = true;
          console.log(`[KYB] ZK business proof generated for ${walletAddress}: ${zkProof.proof.proofId}`);
        } catch (error) {
          console.error(`[KYB] Failed to generate ZK proof for ${walletAddress}:`, error);
          record.zkProofGenerated = false;
        }
        
        kybRecords.set(walletAddress, record);
        console.log(`[KYB] Business verification completed for ${walletAddress}`);
      }
    }, 8000); // Simulate 8 second processing

    res.json({
      success: true,
      message: 'KYB verification started successfully',
      referenceId,
      status: 'submitted',
      estimatedCompletion: kybRecord.estimatedCompletion,
      documentsReceived: req.files.businessDocs.length
    });

  } catch (error) {
    console.error('[KYB] Error starting verification:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error during KYB processing',
      error: error.message 
    });
  }
});

/**
 * @route GET /api/kyb/status/:walletAddress
 * @desc Get KYB verification status
 * @access Public
 */
router.get('/status/:walletAddress', (req, res) => {
  try {
    const { walletAddress } = req.params;
    
    const kybRecord = kybRecords.get(walletAddress);
    
    if (!kybRecord) {
      return res.status(404).json({ 
        success: false, 
        message: 'No KYB record found for this wallet address' 
      });
    }

    // Return status without sensitive file information
    const publicRecord = {
      referenceId: kybRecord.referenceId,
      walletAddress: kybRecord.walletAddress,
      businessDetails: kybRecord.businessDetails,
      status: kybRecord.status,
      verificationLevel: kybRecord.verificationLevel,
      submittedAt: kybRecord.submittedAt,
      verifiedAt: kybRecord.verifiedAt,
      estimatedCompletion: kybRecord.estimatedCompletion,
      documentsCount: kybRecord.documents ? kybRecord.documents.length : 0,
      zkProofGenerated: kybRecord.zkProofGenerated || false,
      zkProofId: kybRecord.zkProofId || null
    };

    res.json({
      success: true,
      data: publicRecord
    });

  } catch (error) {
    console.error('[KYB] Error getting status:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    });
  }
});

/**
 * @route PUT /api/kyb/:walletAddress
 * @desc Update KYB record with additional business information
 * @access Public
 */
router.put('/:walletAddress', (req, res) => {
  try {
    const { walletAddress } = req.params;
    const updateData = req.body;
    
    const kybRecord = kybRecords.get(walletAddress);
    
    if (!kybRecord) {
      return res.status(404).json({ 
        success: false, 
        message: 'No KYB record found for this wallet address' 
      });
    }

    // Update business details
    if (updateData.businessDetails) {
      kybRecord.businessDetails = {
        ...kybRecord.businessDetails,
        ...updateData.businessDetails
      };
    }

    kybRecord.updatedAt = new Date().toISOString();
    kybRecords.set(walletAddress, kybRecord);

    res.json({
      success: true,
      message: 'KYB record updated successfully',
      referenceId: kybRecord.referenceId
    });

  } catch (error) {
    console.error('[KYB] Error updating record:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    });
  }
});

/**
 * @route DELETE /api/kyb/:walletAddress
 * @desc Delete KYB record and associated files
 * @access Public (should be protected in production)
 */
router.delete('/:walletAddress', (req, res) => {
  try {
    const { walletAddress } = req.params;
    
    const kybRecord = kybRecords.get(walletAddress);
    
    if (!kybRecord) {
      return res.status(404).json({ 
        success: false, 
        message: 'No KYB record found for this wallet address' 
      });
    }

    // Delete files
    const uploadDir = path.join(__dirname, '../uploads/kyb');
    if (kybRecord.documents) {
      kybRecord.documents.forEach(doc => {
        const filePath = path.join(uploadDir, doc.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
    }

    // Delete record
    kybRecords.delete(walletAddress);

    res.json({
      success: true,
      message: 'KYB record deleted successfully'
    });

  } catch (error) {
    console.error('[KYB] Error deleting record:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    });
  }
});

/**
 * @route GET /api/kyb/zk-identity/:walletAddress
 * @desc Get ZK identity status based on KYB verification
 * @access Public
 */
router.get('/zk-identity/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    
    const kybRecord = kybRecords.get(walletAddress);
    
    if (!kybRecord) {
      return res.status(404).json({ 
        success: false, 
        message: 'No KYB record found for this wallet address' 
      });
    }

    // Get ZK identity status from service
    const zkIdentityStatus = await zkService.getIdentityStatus(walletAddress);

    res.json({
      success: true,
      data: {
        kyb: {
          status: kybRecord.status,
          verificationLevel: kybRecord.verificationLevel,
          businessType: kybRecord.businessDetails?.type,
          zkProofGenerated: kybRecord.zkProofGenerated || false
        },
        zkIdentity: zkIdentityStatus,
        integration: 'KYB verification enhanced with ZK identity proofs'
      }
    });

  } catch (error) {
    console.error('[KYB] Error getting ZK identity status:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    });
  }
});

/**
 * @route GET /api/kyb/stats
 * @desc Get KYB statistics with ZK integration metrics
 * @access Public
 */
router.get('/stats', (req, res) => {
  try {
    const kybArray = Array.from(kybRecords.values());
    
    const stats = {
      totalSubmissions: kybRecords.size,
      verified: kybArray.filter(r => r.status === 'verified').length,
      pending: kybArray.filter(r => r.status === 'submitted').length,
      rejected: kybArray.filter(r => r.status === 'rejected').length,
      businessTypes: {},
      zkIntegration: {
        proofsGenerated: kybArray.filter(r => r.zkProofGenerated).length,
        proofsFailedGeneration: kybArray.filter(r => r.zkProofGenerated === false).length
      }
    };

    // Count business types
    kybArray.forEach(record => {
      const type = record.businessDetails?.type || 'Unknown';
      stats.businessTypes[type] = (stats.businessTypes[type] || 0) + 1;
    });

    res.json({
      success: true,
      data: stats,
      enhanced: 'KYB statistics include ZK proof integration metrics'
    });

  } catch (error) {
    console.error('[KYB] Error getting stats:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    });
  }
});

module.exports = router;