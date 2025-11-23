#!/usr/bin/env node
/**
 * Proof generation helper for Windows
 * Handles JSON input properly and generates proofs
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Input templates for each circuit
const inputTemplates = {
    age_proof: {
        birth_year: 1995,
        birth_month: 6,
        birth_day: 15,
        current_year: 2024,
        current_month: 11,
        current_day: 22,
        min_age: 18,
        salt: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
    },
    citizenship_proof: {
        country_code: 356,
        document_hash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
        allowed_countries: [356, 840, 826, 276],
        salt: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
    },
    attribute_proof: {
        attributes: [
            "0x1111111111111111111111111111111111111111111111111111111111111111",
            "0x2222222222222222222222222222222222222222222222222222222222222222",
            "0x3333333333333333333333333333333333333333333333333333333333333333",
            "0x4444444444444444444444444444444444444444444444444444444444444444",
            "0x5555555555555555555555555555555555555555555555555555555555555555",
            "0x6666666666666666666666666666666666666666666666666666666666666666",
            "0x7777777777777777777777777777777777777777777777777777777777777777",
            "0x8888888888888888888888888888888888888888888888888888888888888888",
            "0x9999999999999999999999999999999999999999999999999999999999999999",
            "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
        ],
        reveal_flags: [1, 0, 1, 0, 0, 1, 0, 0, 0, 0],
        salt: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
    }
};

async function generateProof() {
    const circuitName = process.argv[2];
    const inputFile = process.argv[3];
    
    if (!circuitName) {
        console.error('❌ Circuit name required');
        process.exit(1);
    }
    
    console.log(`🔐 Generating proof for ${circuitName}...`);
    
    try {
        // Determine inputs
        let inputs;
        if (inputFile && fs.existsSync(inputFile)) {
            console.log(`📋 Using input file: ${inputFile}`);
            inputs = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
        } else {
            console.log(`📋 Using default inputs for ${circuitName}`);
            inputs = inputTemplates[circuitName];
            
            if (!inputs) {
                throw new Error(`Unknown circuit: ${circuitName}`);
            }
        }
        
        console.log('✅ Input data loaded:', Object.keys(inputs).join(', '));
        
        // Mock proof generation
        const mockProof = {
            circuit_name: circuitName,
            proof: Array(32).fill().map(() => Math.floor(Math.random() * 256)),
            public_inputs: [`0x${crypto.randomBytes(32).toString('hex')}`],
            generated_at: new Date().toISOString(),
            mock: true,
            inputs: inputs,
            metadata: {
                generator: 'shadowid-proof-helper',
                platform: 'Windows',
                node_version: process.version
            }
        };
        
        // Create output directories
        const proofsDir = path.join('zk', 'proofs', circuitName);
        fs.mkdirSync(proofsDir, { recursive: true });
        
        // Save proof.json
        const proofPath = path.join(proofsDir, 'proof.json');
        fs.writeFileSync(proofPath, JSON.stringify(mockProof, null, 2));
        
        // Save public_inputs.json
        const publicInputsData = {
            circuit_name: circuitName,
            public_inputs: mockProof.public_inputs,
            generated_at: mockProof.generated_at,
            metadata: mockProof.metadata
        };
        
        const publicInputsPath = path.join(proofsDir, 'public_inputs.json');
        fs.writeFileSync(publicInputsPath, JSON.stringify(publicInputsData, null, 2));
        
        console.log('✅ Proof generated successfully');
        console.log(`📄 Proof saved to: ${proofPath}`);
        console.log(`📄 Public inputs saved to: ${publicInputsPath}`);
        
        // Display proof summary
        console.log('\n📊 Proof Summary:');
        console.log(`   Circuit: ${circuitName}`);
        console.log(`   Proof bytes: ${mockProof.proof.length}`);
        console.log(`   Public inputs: ${mockProof.public_inputs.length}`);
        console.log(`   Generated at: ${mockProof.generated_at}`);
        
        return mockProof;
        
    } catch (error) {
        console.error('❌ Proof generation failed:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    generateProof().catch(console.error);
}

module.exports = { generateProof, inputTemplates };