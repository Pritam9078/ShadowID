const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const router = express.Router();

// Configure multer for file uploads
const upload = multer({ 
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    // Allow specific file types
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'text/plain',
      'application/json'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'), false);
    }
  }
});

/**
 * Upload JSON metadata to IPFS
 */
router.post('/upload', async (req, res) => {
  try {
    const metadata = req.body;
    
    const formData = new FormData();
    formData.append('pinataContent', JSON.stringify(metadata));
    formData.append('pinataMetadata', JSON.stringify({
      name: `proposal-metadata-${Date.now()}.json`
    }));
    
    const response = await axios.post('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      pinataContent: metadata,
      pinataMetadata: {
        name: `proposal-metadata-${Date.now()}.json`
      }
    }, {
      headers: {
        'pinata_api_key': process.env.PINATA_API_KEY,
        'pinata_secret_api_key': process.env.PINATA_SECRET_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    res.json({
      success: true,
      hash: response.data.IpfsHash,
      url: `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`
    });
    
  } catch (error) {
    console.error('IPFS JSON upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload to IPFS',
      message: error.message
    });
  }
});

/**
 * Upload file to IPFS
 */
router.post('/upload-file', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file provided'
      });
    }
    
    const formData = new FormData();
    formData.append('file', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype
    });
    formData.append('pinataMetadata', JSON.stringify({
      name: req.file.originalname
    }));
    
    const response = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
      headers: {
        ...formData.getHeaders(),
        'pinata_api_key': process.env.PINATA_API_KEY,
        'pinata_secret_api_key': process.env.PINATA_SECRET_API_KEY
      }
    });
    
    res.json({
      success: true,
      hash: response.data.IpfsHash,
      url: `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`,
      size: req.file.size,
      name: req.file.originalname,
      type: req.file.mimetype
    });
    
  } catch (error) {
    console.error('IPFS file upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload file to IPFS',
      message: error.message
    });
  }
});

/**
 * Get content from IPFS
 */
router.get('/get/:hash', async (req, res) => {
  try {
    const { hash } = req.params;
    
    const response = await axios.get(`https://gateway.pinata.cloud/ipfs/${hash}`);
    
    res.json({
      success: true,
      data: response.data
    });
    
  } catch (error) {
    console.error('IPFS get error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve from IPFS',
      message: error.message
    });
  }
});

module.exports = router;
