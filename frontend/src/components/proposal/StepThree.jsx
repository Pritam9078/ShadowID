import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Clock, 
  Users, 
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Info,
  Eye,
  Share2,
  Send,
  ArrowLeft,
  Loader2,
  Calendar,
  Hash
} from 'lucide-react';
import { parseEther, formatEther, isAddress } from 'viem';
import { useVotingPower } from '../../hooks/useVotingPower';
import { useProposalService } from '../../hooks/useProposalService';

/**
 * Step Three: Review and Submit
 * Final validation, preview, and submission interface
 */
const StepThree = ({ 
  formData, 
  validationResults, 
  onSubmit, 
  isSubmitting,
  onBack,
  onDraft 
}) => {
  const [submitType, setSubmitType] = useState('submit'); // 'submit' | 'draft'
  const [showPreview, setShowPreview] = useState(false);
  const [estimatedCosts, setEstimatedCosts] = useState(null);
  
  const { votingPower, delegatedPower, totalSupply } = useVotingPower();
  const { estimateExecutionCost } = useProposalService();

  // Calculate estimated execution costs for executable proposals
  useEffect(() => {
    if (formData.proposalType === 'executable' && formData.target && isAddress(formData.target)) {
      estimateExecutionCost(formData.target, formData.calldata, formData.value)
        .then(setEstimatedCosts)
        .catch(console.error);
    }
  }, [formData.target, formData.calldata, formData.value, estimateExecutionCost]);

  const handleSubmit = useCallback(async (type) => {
    setSubmitType(type);
    try {
      await onSubmit({
        ...formData,
        isDraft: type === 'draft'
      });
    } catch (error) {
      console.error('Submission error:', error);
    }
  }, [formData, onSubmit]);

  // Calculate voting power percentages
  const votingPowerPercentage = totalSupply > 0 ? (votingPower / totalSupply) * 100 : 0;
  const delegatedPowerPercentage = totalSupply > 0 ? (delegatedPower / totalSupply) * 100 : 0;

  // Validation summary
  const hasErrors = validationResults?.errors?.length > 0;
  const hasWarnings = validationResults?.warnings?.length > 0;
  const isExecutable = formData.proposalType === 'executable';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Review & Submit</h2>
        <p className="text-gray-600">
          Review your proposal details and submit to the DAO for voting
        </p>
      </div>

      {/* Validation Results */}
      {(hasErrors || hasWarnings) && (
        <div className="space-y-4">
          {/* Errors */}
          {hasErrors && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertTriangle className="w-5 h-5 text-red-600 mr-3 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-medium text-red-900 mb-2">
                    Please fix the following issues:
                  </h3>
                  <ul className="space-y-1">
                    {validationResults.errors.map((error, index) => (
                      <li key={index} className="text-sm text-red-800">
                        • {error}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Warnings */}
          {hasWarnings && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start">
                <Info className="w-5 h-5 text-yellow-600 mr-3 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-medium text-yellow-900 mb-2">
                    Consider the following suggestions:
                  </h3>
                  <ul className="space-y-1">
                    {validationResults.warnings.map((warning, index) => (
                      <li key={index} className="text-sm text-yellow-800">
                        • {warning}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Proposal Summary */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Proposal Summary</h3>
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center text-sm text-indigo-600 hover:text-indigo-800"
          >
            <Eye className="w-4 h-4 mr-1" />
            {showPreview ? 'Hide' : 'Show'} Preview
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Title</h4>
              <p className="text-gray-600">{formData.title}</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Type</h4>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                isExecutable 
                  ? 'bg-purple-100 text-purple-800'
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {isExecutable ? 'Executable' : 'Governance'}
              </span>
            </div>
          </div>

          {/* Description Preview */}
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Description</h4>
            <div className="text-gray-600 text-sm max-h-20 overflow-hidden">
              {formData.description.substring(0, 200)}
              {formData.description.length > 200 && '...'}
            </div>
          </div>

          {/* Execution Details (for executable proposals) */}
          {isExecutable && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">Execution Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Target:</span>
                  <p className="font-mono text-gray-900 break-all">
                    {formData.target || 'Not specified'}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Value:</span>
                  <p className="font-mono text-gray-900">
                    {formData.value ? `${formData.value} ETH` : '0 ETH'}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Call Data:</span>
                  <p className="font-mono text-gray-900 break-all">
                    {formData.calldata ? `${formData.calldata.substring(0, 20)}...` : '0x (empty)'}
                  </p>
                </div>
              </div>

              {/* Estimated Costs */}
              {estimatedCosts && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h5 className="font-medium text-gray-900 mb-2">Estimated Execution Costs</h5>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Gas Estimate:</span>
                      <p className="text-gray-900">{estimatedCosts.gasEstimate?.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Total Cost:</span>
                      <p className="text-gray-900">
                        ~{formatEther(estimatedCosts.totalCost || '0')} ETH
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Attachments */}
          {formData.attachments && formData.attachments.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">
                Supporting Documents ({formData.attachments.length})
              </h4>
              <div className="space-y-2">
                {formData.attachments.map((file, index) => (
                  <div key={index} className="flex items-center text-sm text-gray-600">
                    <Hash className="w-4 h-4 mr-2" />
                    {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Voting Power Information */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Voting Power</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-indigo-600">
              {votingPower.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Direct Voting Power</div>
            <div className="text-xs text-gray-500">
              {votingPowerPercentage.toFixed(2)}% of total supply
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {delegatedPower.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Delegated to You</div>
            <div className="text-xs text-gray-500">
              {delegatedPowerPercentage.toFixed(2)}% of total supply
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {(votingPower + delegatedPower).toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Total Influence</div>
            <div className="text-xs text-gray-500">
              {((votingPower + delegatedPower) / totalSupply * 100).toFixed(2)}% of total
            </div>
          </div>
        </div>
      </div>

      {/* Full Preview Modal */}
      {showPreview && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowPreview(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-lg max-w-4xl max-h-screen overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Proposal Preview</h3>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            
            {/* Full proposal preview content */}
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-4">{formData.title}</h1>
                <div className="prose max-w-none">
                  <p className="whitespace-pre-wrap text-gray-700">{formData.description}</p>
                </div>
              </div>

              {isExecutable && (
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Smart Contract Execution
                  </h3>
                  {/* Full execution details */}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Submission Timeline */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">What happens next?</h3>
        <div className="space-y-4">
          <div className="flex items-start">
            <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center mr-4">
              <span className="text-sm font-medium text-indigo-600">1</span>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Proposal Submitted</h4>
              <p className="text-sm text-gray-600">
                Your proposal will be uploaded to IPFS and submitted to the DAO contract
              </p>
            </div>
          </div>
          <div className="flex items-start">
            <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mr-4">
              <span className="text-sm font-medium text-gray-600">2</span>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Voting Period Begins</h4>
              <p className="text-sm text-gray-600">
                Community members can vote on your proposal for the next 3 days
              </p>
            </div>
          </div>
          <div className="flex items-start">
            <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mr-4">
              <span className="text-sm font-medium text-gray-600">3</span>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">
                {isExecutable ? 'Execution (if passed)' : 'Results Published'}
              </h4>
              <p className="text-sm text-gray-600">
                {isExecutable 
                  ? 'If the proposal passes, the smart contract execution will be triggered automatically'
                  : 'Final voting results will be published and archived'
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </button>

        <div className="flex items-center space-x-4">
          {/* Save as Draft */}
          <button
            type="button"
            onClick={() => handleSubmit('draft')}
            disabled={isSubmitting}
            className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting && submitType === 'draft' ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Share2 className="w-4 h-4 mr-2" />
            )}
            Save as Draft
          </button>

          {/* Submit Proposal */}
          <button
            type="button"
            onClick={() => handleSubmit('submit')}
            disabled={hasErrors || isSubmitting}
            className="flex items-center px-6 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-lg hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting && submitType === 'submit' ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Submit Proposal
          </button>
        </div>
      </div>

      {/* Cost Warning for Executable Proposals */}
      {isExecutable && formData.value && parseFloat(formData.value) > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mr-3 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-900 mb-1">
                High-Value Execution Warning
              </h4>
              <p className="text-sm text-yellow-800">
                This proposal will transfer {formData.value} ETH from the DAO treasury if executed. 
                Please ensure the community understands the financial impact and that all 
                execution parameters are correct.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StepThree;
