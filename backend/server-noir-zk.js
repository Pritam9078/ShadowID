const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
require('dotenv').config();

// Import services
const NoirService = require('./zk/noir.js');
const KYCService = require('./kyc.js');
const DAOService = require('./dao.js');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Initialize services
const noirService = new NoirService();
const kycService = new KYCService();
const daoService = new DAOService();

// =============================================================================
// MIDDLEWARE CONFIGURATION
// =============================================================================

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        }
    }
}));

// CORS configuration
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: 15 * 60 // 15 minutes
    }
});

const strictLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes  
    max: 10, // Limit proof generation to 10 per 15 minutes
    message: {
        error: 'Proof generation rate limit exceeded, please try again later.',
        retryAfter: 15 * 60
    }
});

app.use(limiter);
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// =============================================================================
// KYC COMMITMENT ENDPOINT
// =============================================================================

/**
 * POST /kyc/commitment
 * Generate KYC commitment using Noir circuit
 */
app.post('/kyc/commitment', async (req, res) => {
    try {
        const { userId, birthDate, documentType, documentNumber, countryCode, citizenship } = req.body;

        // Validate required fields
        if (!userId || !birthDate || !documentType || !documentNumber) {
            return res.status(400).json({
                error: 'Missing required fields: userId, birthDate, documentType, documentNumber'
            });
        }

        // Process KYC data and generate commitment
        const result = await kycService.processKYCSubmission({
            userId,
            birthDate,
            documentType,
            documentNumber,
            countryCode,
            citizenship
        });

        res.json({
            success: true,
            commitment: result.commitment,
            message: 'KYC commitment generated successfully',
            metadata: {
                timestamp: Date.now(),
                userId: userId
            }
        });

    } catch (error) {
        console.error('KYC commitment generation error:', error);
        res.status(500).json({
            error: 'Failed to generate KYC commitment',
            details: error.message
        });
    }
});

// =============================================================================
// ZK PROOF GENERATION ENDPOINTS
// =============================================================================

/**
 * POST /zk/age
 * Generate age verification proof using Noir
 */
app.post('/zk/age', strictLimiter, async (req, res) => {
    try {
        const { birthDate, minAge, salt } = req.body;

        // Validate input
        if (!birthDate || !minAge || !salt) {
            return res.status(400).json({
                error: 'Missing required fields: birthDate, minAge, salt'
            });
        }

        // Prepare age proof data
        const birthDateObj = new Date(birthDate);
        const currentDate = new Date();

        const proofData = {
            birth_year: birthDateObj.getFullYear(),
            birth_month: birthDateObj.getMonth() + 1,
            birth_day: birthDateObj.getDate(),
            min_age: parseInt(minAge),
            current_year: currentDate.getFullYear(),
            current_month: currentDate.getMonth() + 1,
            current_day: currentDate.getDate(),
            salt: salt
        };

        // Generate ZK proof
        const result = await noirService.generateAgeProof(proofData);

        res.json({
            success: true,
            proof: result.proof,
            publicInputs: result.publicInputs,
            proofHash: result.proofHash,
            circuitType: result.circuitType,
            metadata: {
                timestamp: Date.now(),
                minAge: minAge,
                proofType: 'age_verification'
            }
        });

    } catch (error) {
        console.error('Age proof generation error:', error);
        res.status(500).json({
            error: 'Failed to generate age proof',
            details: error.message
        });
    }
});

/**
 * POST /zk/citizenship
 * Generate citizenship verification proof using Noir
 */
app.post('/zk/citizenship', strictLimiter, async (req, res) => {
    try {
        const { countryCode, documentType, documentHash, salt } = req.body;

        // Validate input
        if (!countryCode || !documentType || !documentHash || !salt) {
            return res.status(400).json({
                error: 'Missing required fields: countryCode, documentType, documentHash, salt'
            });
        }

        const proofData = {
            country_code: countryCode,
            document_type: documentType.toLowerCase(),
            document_hash: documentHash,
            salt: salt
        };

        // Generate ZK proof
        const result = await noirService.generateCitizenshipProof(proofData);

        res.json({
            success: true,
            proof: result.proof,
            publicInputs: result.publicInputs,
            proofHash: result.proofHash,
            circuitType: result.circuitType,
            metadata: {
                timestamp: Date.now(),
                countryCode: countryCode,
                proofType: 'citizenship_verification'
            }
        });

    } catch (error) {
        console.error('Citizenship proof generation error:', error);
        res.status(500).json({
            error: 'Failed to generate citizenship proof',
            details: error.message
        });
    }
});

/**
 * POST /zk/attribute
 * Generate generic attribute verification proof using Noir
 */
app.post('/zk/attribute', strictLimiter, async (req, res) => {
    try {
        const { attributeType, attributeValue, constraintType, constraintValue, salt } = req.body;

        // Validate input
        if (!attributeType || attributeValue === undefined || !constraintType || constraintValue === undefined || !salt) {
            return res.status(400).json({
                error: 'Missing required fields: attributeType, attributeValue, constraintType, constraintValue, salt'
            });
        }

        const proofData = {
            attribute_type: attributeType,
            attribute_value: attributeValue,
            constraint_type: constraintType,
            constraint_value: constraintValue,
            salt: salt
        };

        // Generate ZK proof
        const result = await noirService.generateAttributeProof(proofData);

        res.json({
            success: true,
            proof: result.proof,
            publicInputs: result.publicInputs,
            proofHash: result.proofHash,
            circuitType: result.circuitType,
            metadata: {
                timestamp: Date.now(),
                attributeType: attributeType,
                constraintType: constraintType,
                proofType: 'attribute_verification'
            }
        });

    } catch (error) {
        console.error('Attribute proof generation error:', error);
        res.status(500).json({
            error: 'Failed to generate attribute proof',
            details: error.message
        });
    }
});

// =============================================================================
// DAO INTEGRATION ENDPOINTS  
// =============================================================================

/**
 * POST /dao/submit-proof
 * Submit ZK proof hash to DAO and ShadowID contracts
 */
app.post('/dao/submit-proof', async (req, res) => {
    try {
        const { userAddress, kycCommitment, proof, publicInputs, circuitType } = req.body;

        // Validate input
        if (!userAddress || !kycCommitment || !proof || !publicInputs || !circuitType) {
            return res.status(400).json({
                error: 'Missing required fields: userAddress, kycCommitment, proof, publicInputs, circuitType'
            });
        }

        // Validate Ethereum address format
        if (!/^0x[a-fA-F0-9]{40}$/.test(userAddress)) {
            return res.status(400).json({
                error: 'Invalid Ethereum address format'
            });
        }

        // Prepare proof data
        const proofData = {
            proof: proof,
            publicInputs: publicInputs,
            circuitType: circuitType,
            proofHash: daoService.generateProofHash(proof)
        };

        // Validate proof data
        await daoService.validateProofData(proofData);

        // Submit proof to both DAO and ShadowID contracts
        const result = await daoService.processProofSubmission(userAddress, kycCommitment, proofData);

        if (result.overallSuccess) {
            res.json({
                success: true,
                message: 'Proof submitted successfully to both contracts',
                userAddress: result.userAddress,
                kycCommitment: result.kycCommitment,
                proofHash: result.proofHash,
                transactions: {
                    dao: result.daoSubmission,
                    shadowid: result.shadowidSubmission
                },
                metadata: {
                    timestamp: Date.now(),
                    circuitType: circuitType
                }
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Partial proof submission failure',
                userAddress: result.userAddress,
                proofHash: result.proofHash,
                transactions: {
                    dao: result.daoSubmission,
                    shadowid: result.shadowidSubmission
                },
                error: 'One or more contract submissions failed'
            });
        }

    } catch (error) {
        console.error('DAO proof submission error:', error);
        res.status(500).json({
            error: 'Failed to submit proof to DAO',
            details: error.message
        });
    }
});

/**
 * GET /dao/verification-status/:address
 * Check user verification status in DAO
 */
app.get('/dao/verification-status/:address', async (req, res) => {
    try {
        const { address } = req.params;

        // Validate Ethereum address format
        if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
            return res.status(400).json({
                error: 'Invalid Ethereum address format'
            });
        }

        // Get verification status
        const [isVerified, kycStatus] = await Promise.all([
            daoService.isUserVerified(address),
            daoService.getKYCStatus(address)
        ]);

        res.json({
            success: true,
            userAddress: address,
            isVerified: isVerified,
            kycStatus: kycStatus,
            timestamp: Date.now()
        });

    } catch (error) {
        console.error('Verification status check error:', error);
        res.status(500).json({
            error: 'Failed to check verification status',
            details: error.message
        });
    }
});

/**
 * GET /dao/transaction-status/:hash
 * Get transaction status and confirmation details
 */
app.get('/dao/transaction-status/:hash', async (req, res) => {
    try {
        const { hash } = req.params;

        // Validate transaction hash format
        if (!/^0x[a-fA-F0-9]{64}$/.test(hash)) {
            return res.status(400).json({
                error: 'Invalid transaction hash format'
            });
        }

        const status = await daoService.getTransactionStatus(hash);

        res.json({
            success: true,
            transactionHash: hash,
            status: status,
            timestamp: Date.now()
        });

    } catch (error) {
        console.error('Transaction status check error:', error);
        res.status(500).json({
            error: 'Failed to check transaction status',
            details: error.message
        });
    }
});

// =============================================================================
// UTILITY ENDPOINTS
// =============================================================================

/**
 * GET /health
 * Health check endpoint
 */
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Noir ZK Backend is running',
        timestamp: Date.now(),
        version: process.env.npm_package_version || '1.0.0'
    });
});

/**
 * POST /verify-proof
 * Verify a ZK proof
 */
app.post('/verify-proof', async (req, res) => {
    try {
        const { circuitType, proof, publicInputs } = req.body;

        if (!circuitType || !proof || !publicInputs) {
            return res.status(400).json({
                error: 'Missing required fields: circuitType, proof, publicInputs'
            });
        }

        // Verify proof using Noir
        const isValid = await noirService.verifyProof(circuitType, proof, publicInputs);

        res.json({
            success: true,
            isValid: isValid,
            circuitType: circuitType,
            timestamp: Date.now()
        });

    } catch (error) {
        console.error('Proof verification error:', error);
        res.status(500).json({
            error: 'Failed to verify proof',
            details: error.message
        });
    }
});

/**
 * GET /circuits/status
 * Get status of available Noir circuits
 */
app.get('/circuits/status', async (req, res) => {
    try {
        const circuits = ['age_proof', 'citizenship_proof', 'attribute_proof'];
        const status = {};

        for (const circuit of circuits) {
            try {
                const needsCompilation = await noirService.needsCompilation(circuit);
                status[circuit] = {
                    available: true,
                    needsCompilation: needsCompilation,
                    path: noirService.circuitPaths[circuit]
                };
            } catch (error) {
                status[circuit] = {
                    available: false,
                    error: error.message
                };
            }
        }

        res.json({
            success: true,
            circuits: status,
            timestamp: Date.now()
        });

    } catch (error) {
        console.error('Circuit status check error:', error);
        res.status(500).json({
            error: 'Failed to check circuit status',
            details: error.message
        });
    }
});

// =============================================================================
// ERROR HANDLING MIDDLEWARE
// =============================================================================

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        path: req.path,
        method: req.method
    });
});

// Global error handler
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    
    res.status(500).json({
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
});

// =============================================================================
// SERVER STARTUP
// =============================================================================

const server = app.listen(PORT, () => {
    console.log(`🚀 Noir ZK Backend server running on port ${PORT}`);
    console.log(`📋 Health check: http://localhost:${PORT}/health`);
    console.log(`🔐 KYC commitment: POST http://localhost:${PORT}/kyc/commitment`);
    console.log(`🎯 Age proof: POST http://localhost:${PORT}/zk/age`);
    console.log(`🌍 Citizenship proof: POST http://localhost:${PORT}/zk/citizenship`);
    console.log(`📊 Attribute proof: POST http://localhost:${PORT}/zk/attribute`);
    console.log(`⚖️ DAO submission: POST http://localhost:${PORT}/dao/submit-proof`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('Process terminated');
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    server.close(() => {
        console.log('Process terminated');
    });
});

module.exports = app;