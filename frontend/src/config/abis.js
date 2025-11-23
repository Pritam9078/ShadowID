// Import ABIs from compiled artifacts
import daoArtifact from '../abi/DAO.json';
import governanceTokenAbi from '../abi/GovernanceToken.json';
import treasuryAbi from '../abi/Treasury.json';

// Handle different ABI formats (some are artifacts, some are raw ABIs)
export const DAO_ABI = Array.isArray(daoArtifact) ? daoArtifact : daoArtifact.abi;
export const GOVERNANCE_TOKEN_ABI = Array.isArray(governanceTokenAbi) ? governanceTokenAbi : governanceTokenAbi.abi;
export const TREASURY_ABI = Array.isArray(treasuryAbi) ? treasuryAbi : treasuryAbi.abi;

// Validation
console.log('[DVote] ABI Validation:', {
  DAO_ABI: { isArray: Array.isArray(DAO_ABI), length: DAO_ABI?.length },
  GOVERNANCE_TOKEN_ABI: { isArray: Array.isArray(GOVERNANCE_TOKEN_ABI), length: GOVERNANCE_TOKEN_ABI?.length },
  TREASURY_ABI: { isArray: Array.isArray(TREASURY_ABI), length: TREASURY_ABI?.length }
});
