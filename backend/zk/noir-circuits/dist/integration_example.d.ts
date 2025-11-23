/**
 * Integration Example: Connecting Noir Circuits with ShadowIDRegistry
 *
 * This file demonstrates how the Noir ZK proofs integrate with the
 * ShadowIDRegistry smart contract for privacy-preserving verification.
 */
interface NoirProof {
    proof: Uint8Array;
    publicInputs: string[];
}
interface AgeProofInputs {
    birthYear: number;
    birthMonth: number;
    birthDay: number;
    minAge: number;
    currentYear: number;
    currentMonth: number;
    currentDay: number;
}
interface CitizenshipProofInputs {
    citizenCode: number;
    documentId: string;
    salt: string;
    requiredCitizenship: number;
}
interface AttributeProofInputs {
    attributes: string[];
    attributeIndex: number;
    salt: string;
    targetAttributeHash: string;
}
declare function generateAgeProof(inputs: AgeProofInputs): Promise<{
    commitment: string;
    proofHash: string;
    proof: NoirProof;
}>;
/**
 * Generate citizenship proof using Noir circuit
 */
declare function generateCitizenshipProof(inputs: CitizenshipProofInputs): Promise<{
    commitment: string;
    proofHash: string;
    proof: NoirProof;
}>;
/**
 * Generate attribute proof using Noir circuit
 */
declare function generateAttributeProof(inputs: AttributeProofInputs): Promise<{
    commitment: string;
    proofHash: string;
    proof: NoirProof;
}>;
/**
 * Complete KYC verification workflow
 */
declare function performKYCVerification(userAddress: string, shadowIdRegistryContract: any): Promise<{
    ageProof: {
        commitment: string;
        proofHash: string;
        proof: NoirProof;
    };
    citizenshipProof: {
        commitment: string;
        proofHash: string;
        proof: NoirProof;
    };
    attributeProof: {
        commitment: string;
        proofHash: string;
        proof: NoirProof;
    };
    userAddress: string;
}>;
/**
 * Check verification status
 */
declare function checkVerificationStatus(userAddress: string, shadowIdRegistryContract: any): Promise<boolean>;
/**
 * DAO voting with ZK verification
 */
declare function voteOnProposal(proposalId: number, vote: number, // 0 = against, 1 = for, 2 = abstain
daoContract: any, proofs: {
    ageProof: any;
    citizenshipProof: any;
    attributeProof: any;
}): Promise<void>;
export { generateAgeProof, generateCitizenshipProof, generateAttributeProof, performKYCVerification, checkVerificationStatus, voteOnProposal };
//# sourceMappingURL=integration_example.d.ts.map