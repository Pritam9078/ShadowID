const fs = require('fs'); 
const path = require('path'); 
const crypto = require('crypto'); 
 
console.log('🔍 Verifying proof for age_proof...'); 
 
const proofPath = 'C:\Users\HP\Downloads\DVote-main\DVote-main\scripts\..\zk\proofs\age_proof\proof.json'.replace(/\\/g, '/'); 
 
try { 
  const proofData = JSON.parse(fs.readFileSync(proofPath, 'utf8')); 
  console.log('📋 Loaded proof data'); 
 
  if (proofData.mock) { 
    console.log('⚠️  Warning: Verifying mock proof (development mode)'); 
  } 
 
  // Mock verification logic 
 
  const verificationResult = { 
    circuit_name: 'age_proof', 
    proof_valid: isValid, 
    verified_at: new Date().toISOString(), 
    proof_hash: crypto.createHash('sha256').update(JSON.stringify(proofData.proof)).digest('hex'), 
    public_inputs: proofData.public_inputs, 
  }; 
 
  const resultPath = path.join('zk', 'verifiers', 'age_proof', 'verification_result.json'); 
  fs.mkdirSync(path.dirname(resultPath), { recursive: true }); 
  fs.writeFileSync(resultPath, JSON.stringify(verificationResult, null, 2)); 
 
  if (isValid) { 
    console.log('✅ Proof verification PASSED'); 
  } else { 
    console.log('❌ Proof verification FAILED'); 
  } 
 
  console.log('📄 Verification result saved to:', resultPath); 
 
} catch (error) { 
  console.error('❌ Verification failed:', error.message); 
  process.exit(1); 
} 
