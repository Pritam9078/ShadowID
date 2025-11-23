import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Code, 
  Target, 
  DollarSign,
  Upload,
  X,
  FileText,
  AlertCircle,
  Info,
  CheckCircle
} from 'lucide-react';
import { parseEther, isAddress } from 'viem';

/**
 * Step Two: Execution Parameters and Attachments
 * Complete execution data architecture
 */
const StepTwo = ({ formData, onChange, onAttachmentUpload, validationResults }) => {
  const [dragActive, setDragActive] = useState(false);

  // Predefined smart contract functions for common operations
  const commonFunctions = [
    {
      name: 'Transfer ETH',
      description: 'Send ETH from treasury to an address',
      signature: 'transfer(address,uint256)',
      example: 'Transfer 1 ETH to 0x742d35Cc6639C0532fCE9eb1b15b0eEa6b7FBB64'
    },
    {
      name: 'Transfer ERC20',
      description: 'Send ERC20 tokens to an address',
      signature: 'transfer(address,uint256)',
      example: 'Transfer 1000 USDC tokens'
    },
    {
      name: 'Mint Tokens',
      description: 'Mint new governance tokens',
      signature: 'mint(address,uint256)',
      example: 'Mint 500 tokens to development team'
    }
  ];

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  }, []);

  const handleFiles = useCallback((files) => {
    Array.from(files).forEach(file => {
      // Validate file type and size
      const maxSize = 10 * 1024 * 1024; // 10MB
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'text/plain', 'application/json'];
      
      if (file.size > maxSize) {
        alert('File size must be less than 10MB');
        return;
      }
      
      if (!allowedTypes.includes(file.type)) {
        alert('File type not supported. Please use PDF, images, or text files.');
        return;
      }
      
      onAttachmentUpload(file);
    });
  }, [onAttachmentUpload]);

  const removeAttachment = useCallback((index) => {
    const newAttachments = formData.attachments.filter((_, i) => i !== index);
    onChange('attachments', newAttachments);
  }, [formData.attachments, onChange]);

  const generateCalldata = useCallback((functionSig, params) => {
    // This is a simplified example - in production, use proper ABI encoding
    try {
      // Mock calldata generation
      const mockCalldata = '0x' + Math.random().toString(16).substring(2, 66);
      onChange('calldata', mockCalldata);
    } catch (error) {
      console.error('Error generating calldata:', error);
    }
  }, [onChange]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Execution Parameters</h2>
        <p className="text-gray-600">
          {formData.proposalType === 'executable' 
            ? 'Configure the smart contract execution details'
            : 'Add supporting documents and additional information'
          }
        </p>
      </div>

      {/* Executable Proposal Configuration */}
      {formData.proposalType === 'executable' && (
        <div className="space-y-6">
          {/* Target Contract Address */}
          <div>
            <label htmlFor="target" className="block text-sm font-medium text-gray-700 mb-2">
              Target Contract Address *
            </label>
            <input
              type="text"
              id="target"
              value={formData.target}
              onChange={(e) => onChange('target', e.target.value)}
              placeholder="0x742d35Cc6639C0532fCE9eb1b15b0eEa6b7FBB64"
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm ${
                validationResults?.errors.some(e => e.includes('target'))
                  ? 'border-red-300 bg-red-50'
                  : formData.target && isAddress(formData.target)
                  ? 'border-green-300 bg-green-50'
                  : 'border-gray-300'
              }`}
            />
            <div className="flex justify-between mt-1">
              <div className="text-sm text-gray-500">
                The smart contract address to execute the function on
              </div>
              {formData.target && (
                <div className="text-sm flex items-center">
                  {isAddress(formData.target) ? (
                    <span className="text-green-600 flex items-center">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Valid address
                    </span>
                  ) : (
                    <span className="text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      Invalid address
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Value (ETH Amount) */}
          <div>
            <label htmlFor="value" className="block text-sm font-medium text-gray-700 mb-2">
              ETH Value (Optional)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.001"
                min="0"
                id="value"
                value={formData.value}
                onChange={(e) => onChange('value', e.target.value)}
                placeholder="0.0"
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <span className="text-gray-500 text-sm">ETH</span>
              </div>
            </div>
            <div className="text-sm text-gray-500 mt-1">
              Amount of ETH to send with the transaction (leave empty or 0 for no ETH transfer)
            </div>
          </div>

          {/* Common Functions Helper */}
          <div className="bg-blue-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Common Functions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {commonFunctions.map((func, index) => (
                <div
                  key={index}
                  className="bg-white p-4 rounded-lg border border-blue-200 cursor-pointer hover:border-blue-400 transition-colors"
                  onClick={() => {
                    // Auto-fill based on function type
                    if (func.name === 'Transfer ETH') {
                      onChange('target', '0x0000000000000000000000000000000000000000'); // Treasury contract
                      onChange('value', '1.0');
                    }
                  }}
                >
                  <h4 className="font-medium text-gray-900 mb-2">{func.name}</h4>
                  <p className="text-sm text-gray-600 mb-2">{func.description}</p>
                  <p className="text-xs text-gray-500 font-mono">{func.signature}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Function Calldata */}
          <div>
            <label htmlFor="calldata" className="block text-sm font-medium text-gray-700 mb-2">
              Function Call Data (Optional)
            </label>
            <textarea
              id="calldata"
              value={formData.calldata}
              onChange={(e) => onChange('calldata', e.target.value)}
              placeholder="0x a9059cbb000000000000000000000000742d35cc6639c0532fce9eb1b15b0eea6b7fbb640000000000000000000000000000000000000000000000000de0b6b3a7640000"
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
            />
            <div className="flex justify-between mt-1">
              <div className="text-sm text-gray-500">
                Encoded function call data (leave empty for simple ETH transfer)
              </div>
              <button
                type="button"
                onClick={() => generateCalldata()}
                className="text-sm text-indigo-600 hover:text-indigo-800"
              >
                Generate Example
              </button>
            </div>
          </div>

          {/* Execution Preview */}
          {(formData.target || formData.value || formData.calldata) && (
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Execution Preview</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Target:</span>
                  <span className="font-mono text-gray-900">
                    {formData.target || 'Not specified'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Value:</span>
                  <span className="font-mono text-gray-900">
                    {formData.value ? `${formData.value} ETH` : '0 ETH'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Calldata:</span>
                  <span className="font-mono text-gray-900 truncate max-w-xs">
                    {formData.calldata || '0x (empty)'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* File Attachments */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-4">
          Supporting Documents (Optional)
        </label>
        
        {/* Upload Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive
              ? 'border-indigo-400 bg-indigo-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Upload Supporting Files
          </h3>
          <p className="text-gray-600 mb-4">
            Drag and drop files here, or click to browse
          </p>
          <label className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
            <Upload className="w-4 h-4 mr-2" />
            Browse Files
            <input
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.txt,.json"
              onChange={(e) => handleFiles(e.target.files)}
              className="hidden"
            />
          </label>
          <p className="text-xs text-gray-500 mt-2">
            PDF, Images, Text files up to 10MB each
          </p>
        </div>

        {/* Uploaded Files List */}
        {formData.attachments && formData.attachments.length > 0 && (
          <div className="mt-6">
            <h4 className="font-medium text-gray-900 mb-3">Uploaded Files</h4>
            <div className="space-y-2">
              {formData.attachments.map((file, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center">
                    <FileText className="w-5 h-5 text-gray-400 mr-3" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {file.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB • IPFS: {file.ipfsHash?.substring(0, 12)}...
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAttachment(index)}
                    className="text-red-600 hover:text-red-800 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Advanced Options */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Advanced Options</h3>
        
        <div className="space-y-4">
          {/* Custom Voting Period */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Custom Voting Period
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              defaultValue="default"
            >
              <option value="default">Default (3 days)</option>
              <option value="1">1 day</option>
              <option value="3">3 days</option>
              <option value="7">7 days</option>
              <option value="14">14 days</option>
            </select>
            <div className="text-sm text-gray-500 mt-1">
              How long should voting remain open for this proposal?
            </div>
          </div>

          {/* Quorum Requirement */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Minimum Quorum
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              defaultValue="default"
            >
              <option value="default">Default (10%)</option>
              <option value="5">5% of total supply</option>
              <option value="10">10% of total supply</option>
              <option value="15">15% of total supply</option>
              <option value="20">20% of total supply</option>
            </select>
            <div className="text-sm text-gray-500 mt-1">
              Minimum participation required for the proposal to be valid
            </div>
          </div>
        </div>
      </div>

      {/* Information Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <Info className="w-5 h-5 text-blue-600 mr-3 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900 mb-1">
              Smart Contract Security
            </h4>
            <p className="text-sm text-blue-800">
              All executable proposals will be thoroughly validated before execution. 
              The DAO community will review the target contract and function calls for security.
              Make sure to provide clear documentation about what your proposal will do.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StepTwo;
