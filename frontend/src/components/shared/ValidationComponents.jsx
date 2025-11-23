import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, 
  AlertCircle, 
  Info, 
  X,
  ExternalLink,
  Copy,
  Hash
} from 'lucide-react';

/**
 * Enhanced validation component with real-time feedback
 */
export const ValidationFeedback = ({ validationResults, className = '' }) => {
  if (!validationResults) return null;

  const { errors = [], warnings = [], suggestions = [] } = validationResults;

  if (errors.length === 0 && warnings.length === 0 && suggestions.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Errors */}
      {errors.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 rounded-lg p-4"
        >
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-medium text-red-900 mb-2">
                {errors.length === 1 ? 'Error Found' : `${errors.length} Errors Found`}
              </h4>
              <ul className="space-y-1">
                {errors.map((error, index) => (
                  <li key={index} className="text-sm text-red-800 flex items-start">
                    <span className="mr-2">•</span>
                    <span>{error}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-yellow-50 border border-yellow-200 rounded-lg p-4"
        >
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-yellow-600 mr-3 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-medium text-yellow-900 mb-2">
                {warnings.length === 1 ? 'Warning' : `${warnings.length} Warnings`}
              </h4>
              <ul className="space-y-1">
                {warnings.map((warning, index) => (
                  <li key={index} className="text-sm text-yellow-800 flex items-start">
                    <span className="mr-2">•</span>
                    <span>{warning}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 border border-blue-200 rounded-lg p-4"
        >
          <div className="flex items-start">
            <Info className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-medium text-blue-900 mb-2">
                Suggestions for Improvement
              </h4>
              <ul className="space-y-1">
                {suggestions.map((suggestion, index) => (
                  <li key={index} className="text-sm text-blue-800 flex items-start">
                    <span className="mr-2">•</span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

/**
 * Success notification component
 */
export const SuccessNotification = ({ 
  isVisible, 
  onClose, 
  title, 
  message, 
  transactionHash,
  proposalId,
  metadataHash
}) => {
  const [copied, setCopied] = useState(null);

  const copyToClipboard = useCallback(async (text, type) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start mb-4">
              <CheckCircle className="w-8 h-8 text-green-600 mr-3 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {title || 'Proposal Submitted Successfully!'}
                </h3>
                <p className="text-gray-600 text-sm">
                  {message || 'Your proposal has been submitted to the DAO and is now available for voting.'}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 ml-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Transaction Details */}
            <div className="space-y-3 bg-gray-50 rounded-lg p-4">
              {proposalId && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Proposal ID:</span>
                  <div className="flex items-center">
                    <span className="text-sm font-mono text-gray-900 mr-2">#{proposalId}</span>
                    <button
                      onClick={() => copyToClipboard(proposalId.toString(), 'proposalId')}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      {copied === 'proposalId' ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {transactionHash && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Transaction:</span>
                  <div className="flex items-center">
                    <span className="text-sm font-mono text-gray-900 mr-2">
                      {transactionHash.substring(0, 10)}...
                    </span>
                    <button
                      onClick={() => copyToClipboard(transactionHash, 'txHash')}
                      className="text-gray-400 hover:text-gray-600 mr-2"
                    >
                      {copied === 'txHash' ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                    <a
                      href={`https://sepolia.etherscan.io/tx/${transactionHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              )}

              {metadataHash && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">IPFS Hash:</span>
                  <div className="flex items-center">
                    <span className="text-sm font-mono text-gray-900 mr-2">
                      {metadataHash.substring(0, 10)}...
                    </span>
                    <button
                      onClick={() => copyToClipboard(metadataHash, 'ipfsHash')}
                      className="text-gray-400 hover:text-gray-600 mr-2"
                    >
                      {copied === 'ipfsHash' ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                    <a
                      href={`https://gateway.pinata.cloud/ipfs/${metadataHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
              {proposalId && (
                <button
                  onClick={() => {
                    // Navigate to proposal details
                    window.location.href = `/proposals/${proposalId}`;
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  View Proposal
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/**
 * Loading overlay component
 */
export const LoadingOverlay = ({ isVisible, title, subtitle, progress }) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-lg p-8 shadow-xl text-center max-w-sm w-full"
          >
            <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
            
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {title || 'Processing...'}
            </h3>
            
            {subtitle && (
              <p className="text-sm text-gray-600 mb-4">
                {subtitle}
              </p>
            )}

            {progress !== undefined && (
              <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                <motion.div
                  className="bg-indigo-600 h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            )}
            
            <p className="text-xs text-gray-500">
              Please don't close this window
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/**
 * Character counter component
 */
export const CharacterCounter = ({ 
  current, 
  max, 
  className = '', 
  showPercentage = false 
}) => {
  const percentage = (current / max) * 100;
  const isNearLimit = percentage > 80;
  const isOverLimit = current > max;

  return (
    <div className={`text-sm ${className}`}>
      <span className={`
        ${isOverLimit ? 'text-red-600' : isNearLimit ? 'text-yellow-600' : 'text-gray-500'}
      `}>
        {current.toLocaleString()}/{max.toLocaleString()}
        {showPercentage && ` (${percentage.toFixed(1)}%)`}
      </span>
    </div>
  );
};

/**
 * Field validation indicator
 */
export const FieldValidation = ({ isValid, isRequired, isEmpty, message }) => {
  if (isEmpty && !isRequired) return null;

  return (
    <div className="flex items-center mt-1">
      {isValid ? (
        <CheckCircle className="w-4 h-4 text-green-600 mr-1" />
      ) : (
        <AlertCircle className="w-4 h-4 text-red-600 mr-1" />
      )}
      <span className={`text-xs ${isValid ? 'text-green-600' : 'text-red-600'}`}>
        {message}
      </span>
    </div>
  );
};
