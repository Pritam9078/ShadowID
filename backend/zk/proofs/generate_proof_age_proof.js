const fs = require('fs'); 
const path = require('path'); 
 
console.log('🔐 Generating proof for age_proof...'); 
 
const circuitName = 'age_proof'; 
const inputs = {\"birth_year\": 1995, \"birth_month\": 6, \"birth_day\": 15, \"current_year\": 2024, \"current_month\": 11, \"current_day\": 22, \"min_age\": 18, \"salt\": \"0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef\"}; 
 
console.log('📋 Using inputs:', inputs); 
 
// Mock proof generation for development 
const mockProof = { 
  circuit_name: circuitName, 
  proof: Array(32).fill().map(() => Math.floor(Math.random() * 256)), 
  public_inputs: ['0x' + Math.random().toString(16).substr(2, 64)], 
  generated_at: new Date().toISOString(), 
  mock: true, 
  inputs: inputs 
}; 
 
const proofPath = path.join('zk', 'proofs', circuitName, 'proof.json'); 
fs.mkdirSync(path.dirname(proofPath), { recursive: true }); 
fs.writeFileSync(proofPath, JSON.stringify(mockProof, null, 2)); 
 
const publicInputsPath = path.join('zk', 'proofs', circuitName, 'public_inputs.json'); 
fs.writeFileSync(publicInputsPath, JSON.stringify({ 
  circuit_name: circuitName, 
  public_inputs: mockProof.public_inputs, 
  generated_at: mockProof.generated_at 
}, null, 2)); 
 
console.log('✅ Proof generated successfully'); 
console.log('📄 Proof saved to:', proofPath); 
console.log('📄 Public inputs saved to:', publicInputsPath); 
