const NoirService = require('./zk/noir.js');
const crypto = require('crypto');

/**
 * KYC Service
 * Handles KYC data processing and commitment generation
 */
class KYCService {
    constructor() {
        this.noirService = new NoirService();
    }

    /**
     * Process KYC documents and generate commitment
     * @param {Object} kycData - Raw KYC data from frontend
     * @returns {Promise<Object>} - KYC commitment and metadata
     */
    async processKYCSubmission(kycData) {
        try {
            // Validate KYC data structure
            this.validateKYCData(kycData);

            // Process and normalize KYC data
            const processedData = await this.processKYCDocuments(kycData);

            // Generate KYC commitment using Noir circuit
            const commitmentResult = await this.noirService.generateKycCommitment(processedData);

            // Store commitment metadata (not the raw data)
            const metadata = {
                commitment: commitmentResult.commitment,
                salt: commitmentResult.salt,
                timestamp: Date.now(),
                dataHash: this.generateDataHash(processedData),
                userId: kycData.userId
            };

            return {
                success: true,
                commitment: commitmentResult.commitment,
                salt: commitmentResult.salt,
                metadata,
                message: 'KYC commitment generated successfully'
            };

        } catch (error) {
            console.error('KYC processing error:', error);
            throw new Error(`KYC processing failed: ${error.message}`);
        }
    }

    /**
     * Validate KYC data structure
     * @param {Object} kycData - KYC data to validate
     */
    validateKYCData(kycData) {
        const requiredFields = ['userId', 'birthDate', 'documentType', 'documentNumber'];
        
        for (const field of requiredFields) {
            if (!kycData[field]) {
                throw new Error(`Missing required KYC field: ${field}`);
            }
        }

        // Validate birth date format
        if (!this.isValidDate(kycData.birthDate)) {
            throw new Error('Invalid birth date format. Use YYYY-MM-DD');
        }

        // Validate document type
        const validDocTypes = ['passport', 'driver_license', 'national_id', 'birth_certificate'];
        if (!validDocTypes.includes(kycData.documentType.toLowerCase())) {
            throw new Error('Invalid document type');
        }

        // Validate document number format
        if (!kycData.documentNumber || kycData.documentNumber.length < 5) {
            throw new Error('Document number must be at least 5 characters');
        }
    }

    /**
     * Process KYC documents into standardized format
     * @param {Object} kycData - Raw KYC data
     * @returns {Promise<Object>} - Processed KYC data
     */
    async processKYCDocuments(kycData) {
        try {
            // Parse birth date
            const birthDate = new Date(kycData.birthDate);
            
            // Generate document hash
            const documentHash = this.generateDocumentHash(kycData);

            // Generate salt for privacy
            const salt = crypto.randomBytes(32).toString('hex');

            return {
                birth_year: birthDate.getFullYear(),
                birth_month: birthDate.getMonth() + 1,
                birth_day: birthDate.getDate(),
                document_hash: documentHash,
                salt: salt,
                // Additional fields for different proof types
                country_code: kycData.countryCode || 'US',
                document_type: kycData.documentType.toLowerCase(),
                citizenship: kycData.citizenship || kycData.countryCode || 'US'
            };

        } catch (error) {
            throw new Error(`Document processing failed: ${error.message}`);
        }
    }

    /**
     * Generate secure hash of document data
     * @param {Object} kycData - KYC document data
     * @returns {string} - Document hash
     */
    generateDocumentHash(kycData) {
        // Create hash of sensitive document data
        const documentString = `${kycData.documentType}:${kycData.documentNumber}:${kycData.issuingAuthority || ''}`;
        const hash = crypto.createHash('sha256');
        hash.update(documentString);
        return '0x' + hash.digest('hex');
    }

    /**
     * Generate hash of processed KYC data for verification
     * @param {Object} processedData - Processed KYC data
     * @returns {string} - Data hash
     */
    generateDataHash(processedData) {
        const dataString = JSON.stringify({
            birth_year: processedData.birth_year,
            birth_month: processedData.birth_month,
            birth_day: processedData.birth_day,
            document_hash: processedData.document_hash
        });
        
        const hash = crypto.createHash('sha256');
        hash.update(dataString);
        return '0x' + hash.digest('hex');
    }

    /**
     * Validate date format
     * @param {string} dateString - Date string to validate
     * @returns {boolean} - True if valid date
     */
    isValidDate(dateString) {
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date) && dateString.match(/^\d{4}-\d{2}-\d{2}$/);
    }

    /**
     * Calculate age from birth date
     * @param {string} birthDate - Birth date string (YYYY-MM-DD)
     * @returns {number} - Age in years
     */
    calculateAge(birthDate) {
        const birth = new Date(birthDate);
        const today = new Date();
        
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        
        return age;
    }

    /**
     * Prepare age proof data
     * @param {Object} kycData - KYC data
     * @param {number} minAge - Minimum age requirement
     * @returns {Object} - Age proof data
     */
    prepareAgeProofData(kycData, minAge = 18) {
        const processedData = this.processKYCDocuments(kycData);
        const currentDate = new Date();
        
        return {
            birth_year: processedData.birth_year,
            birth_month: processedData.birth_month,
            birth_day: processedData.birth_day,
            min_age: minAge,
            current_year: currentDate.getFullYear(),
            current_month: currentDate.getMonth() + 1,
            current_day: currentDate.getDate(),
            salt: processedData.salt
        };
    }

    /**
     * Prepare citizenship proof data
     * @param {Object} kycData - KYC data
     * @returns {Object} - Citizenship proof data
     */
    prepareCitizenshipProofData(kycData) {
        const processedData = this.processKYCDocuments(kycData);
        
        return {
            country_code: processedData.country_code,
            document_type: processedData.document_type,
            document_hash: processedData.document_hash,
            salt: processedData.salt
        };
    }

    /**
     * Prepare attribute proof data
     * @param {Object} kycData - KYC data
     * @param {string} attributeType - Type of attribute to prove
     * @param {string} constraintType - Type of constraint (min, max, equal, etc.)
     * @param {any} constraintValue - Constraint value
     * @returns {Object} - Attribute proof data
     */
    prepareAttributeProofData(kycData, attributeType, constraintType, constraintValue) {
        let attributeValue;
        
        switch (attributeType) {
            case 'age':
                attributeValue = this.calculateAge(kycData.birthDate);
                break;
            case 'birth_year':
                attributeValue = new Date(kycData.birthDate).getFullYear();
                break;
            case 'citizenship':
                attributeValue = kycData.citizenship || kycData.countryCode || 'US';
                break;
            default:
                throw new Error(`Unsupported attribute type: ${attributeType}`);
        }

        const salt = crypto.randomBytes(32).toString('hex');
        
        return {
            attribute_type: attributeType,
            attribute_value: attributeValue,
            constraint_type: constraintType,
            constraint_value: constraintValue,
            salt: salt
        };
    }

    /**
     * Get KYC status for a user
     * @param {string} userId - User ID
     * @returns {Object} - KYC status information
     */
    async getKYCStatus(userId) {
        // This would typically query a database
        // For now, we'll return a mock status
        return {
            userId: userId,
            hasKYCData: false,
            commitmentGenerated: false,
            proofsGenerated: [],
            verificationStatus: 'pending',
            lastUpdated: Date.now()
        };
    }

    /**
     * Validate KYC commitment
     * @param {string} commitment - KYC commitment hash
     * @param {Object} kycData - Original KYC data
     * @param {string} salt - Salt used in commitment
     * @returns {Promise<boolean>} - True if commitment is valid
     */
    async validateCommitment(commitment, kycData, salt) {
        try {
            const processedData = await this.processKYCDocuments(kycData);
            processedData.salt = salt;
            
            const regeneratedCommitment = await this.noirService.generateKycCommitment(processedData);
            
            return regeneratedCommitment.commitment === commitment;
            
        } catch (error) {
            console.error('Commitment validation error:', error);
            return false;
        }
    }
}

module.exports = KYCService;