const request = require('supertest');
const app = require('./server-noir-zk');

describe('DVote Noir ZK Backend API Tests', () => {

  // Health check test
  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Noir ZK Backend');
    });
  });

  // KYC commitment test
  describe('POST /kyc/commitment', () => {
    it('should generate KYC commitment', async () => {
      const kycData = {
        userId: 'test-user-123',
        birthDate: '1990-01-01',
        documentType: 'passport',
        documentNumber: 'ABC123456',
        countryCode: 'US'
      };

      const response = await request(app)
        .post('/kyc/commitment')
        .send(kycData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.commitment).toBeDefined();
      expect(response.body.metadata.userId).toBe(kycData.userId);
    });

    it('should reject invalid KYC data', async () => {
      const invalidData = {
        userId: 'test-user',
        // Missing required fields
      };

      await request(app)
        .post('/kyc/commitment')
        .send(invalidData)
        .expect(400);
    });
  });

  // Age proof test
  describe('POST /zk/age', () => {
    it('should generate age proof', async () => {
      const proofData = {
        birthDate: '1990-01-01',
        minAge: 18,
        salt: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
      };

      const response = await request(app)
        .post('/zk/age')
        .send(proofData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.proof).toBeDefined();
      expect(response.body.publicInputs).toBeDefined();
      expect(response.body.proofHash).toBeDefined();
      expect(response.body.circuitType).toBe('age_proof');
    });
  });

  // Citizenship proof test
  describe('POST /zk/citizenship', () => {
    it('should generate citizenship proof', async () => {
      const proofData = {
        countryCode: 'US',
        documentType: 'passport',
        documentHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        salt: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
      };

      const response = await request(app)
        .post('/zk/citizenship')
        .send(proofData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.circuitType).toBe('citizenship_proof');
    });
  });

  // Attribute proof test
  describe('POST /zk/attribute', () => {
    it('should generate attribute proof', async () => {
      const proofData = {
        attributeType: 'age',
        attributeValue: 25,
        constraintType: 'min',
        constraintValue: 18,
        salt: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
      };

      const response = await request(app)
        .post('/zk/attribute')
        .send(proofData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.circuitType).toBe('attribute_proof');
    });
  });

  // DAO integration test
  describe('POST /dao/submit-proof', () => {
    it('should submit proof to DAO', async () => {
      const submissionData = {
        userAddress: '0x1234567890123456789012345678901234567890',
        kycCommitment: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        proof: { mock: 'proof_data' },
        publicInputs: ['input1', 'input2'],
        circuitType: 'age_proof'
      };

      const response = await request(app)
        .post('/dao/submit-proof')
        .send(submissionData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.userAddress).toBe(submissionData.userAddress);
      expect(response.body.proofHash).toBeDefined();
    });

    it('should reject invalid Ethereum address', async () => {
      const invalidData = {
        userAddress: 'invalid-address',
        kycCommitment: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        proof: { mock: 'proof_data' },
        publicInputs: ['input1'],
        circuitType: 'age_proof'
      };

      await request(app)
        .post('/dao/submit-proof')
        .send(invalidData)
        .expect(400);
    });
  });

  // Verification status test
  describe('GET /dao/verification-status/:address', () => {
    it('should return verification status', async () => {
      const testAddress = '0x1234567890123456789012345678901234567890';

      const response = await request(app)
        .get(`/dao/verification-status/${testAddress}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.userAddress).toBe(testAddress);
      expect(response.body.isVerified).toBeDefined();
      expect(response.body.kycStatus).toBeDefined();
    });

    it('should reject invalid address format', async () => {
      await request(app)
        .get('/dao/verification-status/invalid-address')
        .expect(400);
    });
  });

  // Circuit status test
  describe('GET /circuits/status', () => {
    it('should return circuit status', async () => {
      const response = await request(app)
        .get('/circuits/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.circuits).toBeDefined();
      expect(response.body.circuits.age_proof).toBeDefined();
      expect(response.body.circuits.citizenship_proof).toBeDefined();
      expect(response.body.circuits.attribute_proof).toBeDefined();
    });
  });

  // Proof verification test
  describe('POST /verify-proof', () => {
    it('should verify a proof', async () => {
      const verificationData = {
        circuitType: 'age_proof',
        proof: { mock: 'proof_data' },
        publicInputs: ['input1', 'input2']
      };

      const response = await request(app)
        .post('/verify-proof')
        .send(verificationData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.isValid).toBeDefined();
      expect(response.body.circuitType).toBe('age_proof');
    });
  });

  // 404 test
  describe('Unknown endpoints', () => {
    it('should return 404 for unknown endpoints', async () => {
      await request(app)
        .get('/unknown-endpoint')
        .expect(404);
    });
  });

});