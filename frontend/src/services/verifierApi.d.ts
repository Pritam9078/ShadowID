/**
 * @fileoverview TypeScript definitions for Verifier API Service
 * Provides type definitions for KYC/KYB and ZK Proof functionality
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface KYCData {
  walletAddress: string;
  fullName: string;
  dateOfBirth: string;
  nationality: string;
  idDocument: File;
  selfie: File;
  email?: string;
  phoneNumber?: string;
}

export interface KYBData {
  walletAddress: string;
  businessName: string;
  registrationNumber: string;
  businessType: string;
  jurisdiction: string;
  businessDocs: File;
  businessAddress?: string;
  contactEmail?: string;
  website?: string;
}

export interface ZKProof {
  proofId: string;
  proof: any;
  publicInputs: any[];
  proofHash: string;
  circuit: string;
  timestamp: number;
  cached?: boolean;
  expires?: number;
}

export interface VerificationStatus {
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  verifiedAt?: string;
  expiresAt?: string;
  documents?: string[];
  rejectionReason?: string;
}

export interface IdentityStatus {
  walletAddress: string;
  kycStatus: VerificationStatus;
  kybStatus: VerificationStatus;
  zkProofs: {
    age?: ZKProof;
    citizenship?: ZKProof;
    business?: ZKProof;
    aggregated?: ZKProof;
  };
  lastUpdated: string;
}

export interface ServiceStats {
  kyc: {
    totalSubmissions: number;
    approved: number;
    pending: number;
    rejected: number;
  };
  kyb: {
    totalSubmissions: number;
    approved: number;
    pending: number;
    rejected: number;
  };
  zk: {
    totalProofs: number;
    verifiedProofs: number;
    activeCircuits: number;
  };
  timestamp: number;
}

export declare class VerifierApiService {
  constructor();
  
  getZkHeaders(): Record<string, string>;
  
  // KYC Methods
  startKyc(formData: FormData | KYCData): Promise<ApiResponse>;
  getKycStatus(walletAddress: string): Promise<ApiResponse<VerificationStatus>>;
  updateKyc(walletAddress: string, updateData: FormData): Promise<ApiResponse>;
  deleteKyc(walletAddress: string): Promise<ApiResponse>;
  
  // KYB Methods
  startKyb(formData: FormData | KYBData): Promise<ApiResponse>;
  getKybStatus(walletAddress: string): Promise<ApiResponse<VerificationStatus>>;
  updateKyb(walletAddress: string, updateData: FormData): Promise<ApiResponse>;
  deleteKyb(walletAddress: string): Promise<ApiResponse>;
  
  // ZK Proof Methods
  generateAgeProof(walletAddress: string, minAge?: number): Promise<ApiResponse<ZKProof>>;
  generateCitizenshipProof(walletAddress: string, country?: string): Promise<ApiResponse<ZKProof>>;
  generateBusinessProof(walletAddress: string): Promise<ApiResponse<ZKProof>>;
  
  // ZK Verification Methods
  verifyProof(proof: any): Promise<ApiResponse>;
  getProofStatus(proofHash: string): Promise<ApiResponse>;
  
  // Identity Registry
  getIdentityStatus(walletAddress: string): Promise<ApiResponse<IdentityStatus>>;
  submitIdentityProof(walletAddress: string, proof: any): Promise<ApiResponse>;
  
  // Enhanced ZK Integration
  aggregateIdentityProofs(walletAddress: string, proofIds: string[]): Promise<ApiResponse>;
  getKycZkIdentity(walletAddress: string): Promise<ApiResponse>;
  getZkStats(): Promise<ApiResponse>;
  
  // Utility Methods
  getCachedProof(type: string, walletAddress: string): ZKProof | null;
  clearCache(walletAddress: string): void;
  healthCheck(): Promise<boolean>;
  getServiceStats(): Promise<ServiceStats>;
}

export declare const verifierApi: VerifierApiService;
export declare const backendApi: {
  post: (url: string, data?: any, config?: any) => Promise<any>;
  get: (url: string, config?: any) => Promise<any>;
  put: (url: string, data?: any, config?: any) => Promise<any>;
  delete: (url: string, config?: any) => Promise<any>;
};

export declare const axiosInstance: any;

export default verifierApi;