/**
 * Pinata IPFS API Routes
 * 
 * Handles IPFS operations using Pinata service
 */

const express = require('express');
const multer = require('multer');
const { pinataService } = require('../services/pinataService');
const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

/**
 * GET /api/pinata/status
 * Get Pinata service status and authentication
 */
router.get('/status', async (req, res) => {
  try {
    const status = await pinataService.getStatus();
    res.json(status);
  } catch (error) {
    console.error('Pinata status error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * POST /api/pinata/upload/file
 * Upload file to IPFS via Pinata
 */
router.post('/upload/file', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file provided'
      });
    }

    const options = {
      filename: req.file.originalname,
      metadata: {
        name: req.body.name || req.file.originalname,
        type: req.body.type || 'document',
        uploadedBy: req.body.uploadedBy || 'shadowid-user',
        keyvalues: req.body.keyvalues ? JSON.parse(req.body.keyvalues) : {}
      }
    };

    const result = await pinataService.pinFile(req.file.buffer, options);
    
    res.json(result);
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * POST /api/pinata/upload/json
 * Upload JSON data to IPFS via Pinata
 */
router.post('/upload/json', async (req, res) => {
  try {
    const { data, metadata } = req.body;

    if (!data) {
      return res.status(400).json({
        success: false,
        error: 'No JSON data provided'
      });
    }

    const result = await pinataService.pinJSON(data, metadata || {});
    
    res.json(result);
  } catch (error) {
    console.error('JSON upload error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * POST /api/pinata/upload/proposal
 * Upload DAO proposal to IPFS
 */
router.post('/upload/proposal', async (req, res) => {
  try {
    const proposalData = req.body;

    if (!proposalData.title || !proposalData.description) {
      return res.status(400).json({
        success: false,
        error: 'Proposal must have title and description'
      });
    }

    const result = await pinataService.pinProposal(proposalData);
    
    res.json({
      ...result,
      proposalId: proposalData.id,
      type: 'dao-proposal'
    });
  } catch (error) {
    console.error('Proposal upload error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * GET /api/pinata/file/:hash
 * Get file from IPFS by hash
 */
router.get('/file/:hash', async (req, res) => {
  try {
    const { hash } = req.params;

    if (!hash) {
      return res.status(400).json({
        success: false,
        error: 'IPFS hash required'
      });
    }

    const result = await pinataService.getFile(hash);
    
    if (result.success) {
      res.set('Content-Type', result.contentType || 'application/octet-stream');
      res.send(result.content);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error('File retrieval error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * GET /api/pinata/pins
 * List pinned files
 */
router.get('/pins', async (req, res) => {
  try {
    const options = {
      status: req.query.status,
      pageLimit: parseInt(req.query.limit) || 20,
      pageOffset: parseInt(req.query.offset) || 0,
      metadata: req.query.metadata ? JSON.parse(req.query.metadata) : undefined
    };

    const result = await pinataService.listPins(options);
    
    res.json(result);
  } catch (error) {
    console.error('List pins error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * DELETE /api/pinata/unpin/:hash
 * Unpin file from IPFS
 */
router.delete('/unpin/:hash', async (req, res) => {
  try {
    const { hash } = req.params;

    if (!hash) {
      return res.status(400).json({
        success: false,
        error: 'IPFS hash required'
      });
    }

    const result = await pinataService.unpinFile(hash);
    
    res.json(result);
  } catch (error) {
    console.error('Unpin error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * POST /api/pinata/upload/zk-proof
 * Upload ZK proof data to IPFS
 */
router.post('/upload/zk-proof', async (req, res) => {
  try {
    const proofData = req.body;

    if (!proofData.proofHash || !proofData.proof) {
      return res.status(400).json({
        success: false,
        error: 'ZK proof must have proofHash and proof data'
      });
    }

    const result = await pinataService.pinZKProof(proofData);
    
    res.json({
      ...result,
      type: 'zk-proof',
      circuit: proofData.circuit
    });
  } catch (error) {
    console.error('ZK proof upload error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * GET /api/pinata/gateway/:hash
 * Get gateway URL for IPFS hash
 */
router.get('/gateway/:hash', (req, res) => {
  try {
    const { hash } = req.params;

    if (!hash) {
      return res.status(400).json({
        success: false,
        error: 'IPFS hash required'
      });
    }

    const gatewayUrl = pinataService.getGatewayUrl(hash);
    
    res.json({
      success: true,
      hash,
      gatewayUrl,
      redirect: req.query.redirect === 'true'
    });

    // Optionally redirect to gateway URL
    if (req.query.redirect === 'true') {
      res.redirect(gatewayUrl);
    }
  } catch (error) {
    console.error('Gateway URL error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;