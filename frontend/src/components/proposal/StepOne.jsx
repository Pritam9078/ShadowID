import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, 
  Tag, 
  Clock, 
  DollarSign,
  AlertCircle,
  CheckCircle,
  Info,
  Target
} from 'lucide-react';

/**
 * Step One: Basic Information and Proposal Type
 * Complete data architecture with validation
 */
const StepOne = ({ formData, onChange, onMetadataChange, validationResults, votingPower, powerLoading }) => {
  const [selectedTags, setSelectedTags] = useState(formData.tags || []);

  const proposalTypes = [
    {
      id: 'simple',
      name: 'Simple Proposal',
      description: 'Basic governance decision without on-chain execution',
      icon: FileText,
      example: 'Should we change the DAO logo?'
    },
    {
      id: 'executable',
      name: 'Executable Proposal',
      description: 'Proposal that executes smart contract functions when passed',
      icon: Target,
      example: 'Transfer 1000 USDC from treasury to development team'
    },
    {
      id: 'treasury',
      name: 'Treasury Proposal',
      description: 'Manage treasury funds and allocations',
      icon: DollarSign,
      example: 'Allocate 50 ETH for marketing budget'
    }
  ];

  const categories = [
    'General', 'Development', 'Marketing', 'Treasury', 'Operations', 'Community', 'Technical'
  ];

  const priorities = [
    { value: 'low', label: 'Low Priority', color: 'text-gray-600' },
    { value: 'medium', label: 'Medium Priority', color: 'text-yellow-600' },
    { value: 'high', label: 'High Priority', color: 'text-red-600' },
    { value: 'urgent', label: 'Urgent', color: 'text-red-800' }
  ];

  const availableTags = [
    'Community', 'Development', 'Marketing', 'Treasury', 'Governance', 
    'Technical', 'Partnership', 'Research', 'Security', 'Legal'
  ];

  const handleTagToggle = (tag) => {
    const newTags = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag];
    
    setSelectedTags(newTags);
    onChange('tags', newTags);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Proposal Details</h2>
        <p className="text-gray-600">
          Provide the basic information for your governance proposal
        </p>
      </div>

      {/* Voting Power Status */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">Your Voting Power</h3>
            <p className="text-sm text-gray-600">
              You need 1,000 DVT tokens to create proposals
            </p>
          </div>
          <div className="text-right">
            {powerLoading ? (
              <div className="animate-pulse bg-gray-200 h-6 w-20 rounded" />
            ) : (
              <div className="text-2xl font-bold text-indigo-600">
                {votingPower ? (Number(votingPower) / 1e18).toLocaleString() : '0'} DVT
              </div>
            )}
            <div className="text-sm text-gray-500">
              {votingPower && Number(votingPower) >= 1000e18 ? (
                <span className="text-green-600 flex items-center">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Eligible to propose
                </span>
              ) : (
                <span className="text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  Insufficient voting power
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Proposal Type Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-4">
          Proposal Type
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {proposalTypes.map((type) => {
            const Icon = type.icon;
            const isSelected = formData.proposalType === type.id;
            
            return (
              <motion.div
                key={type.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => onChange('proposalType', type.id)}
              >
                <div className="flex items-center mb-3">
                  <Icon className={`w-5 h-5 mr-2 ${isSelected ? 'text-indigo-600' : 'text-gray-400'}`} />
                  <h4 className={`font-medium ${isSelected ? 'text-indigo-900' : 'text-gray-900'}`}>
                    {type.name}
                  </h4>
                </div>
                <p className="text-sm text-gray-600 mb-2">{type.description}</p>
                <p className="text-xs text-gray-500 italic">e.g., {type.example}</p>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Title Input */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
          Proposal Title *
        </label>
        <input
          type="text"
          id="title"
          value={formData.title}
          onChange={(e) => onChange('title', e.target.value)}
          placeholder="Enter a clear, concise title for your proposal"
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
            validationResults?.errors.some(e => e.includes('Title'))
              ? 'border-red-300 bg-red-50'
              : 'border-gray-300'
          }`}
          maxLength={200}
        />
        <div className="flex justify-between mt-1">
          <div className="text-sm text-gray-500">
            {formData.title.length}/200 characters
          </div>
          {validationResults?.errors.some(e => e.includes('Title')) && (
            <div className="text-sm text-red-600 flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              Title is required
            </div>
          )}
        </div>
      </div>

      {/* Description Input */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
          Proposal Description *
        </label>
        <textarea
          id="description"
          value={formData.description}
          onChange={(e) => onChange('description', e.target.value)}
          placeholder="Provide a detailed description of your proposal, including rationale, expected outcomes, and any relevant background information..."
          rows={8}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
            validationResults?.errors.some(e => e.includes('Description'))
              ? 'border-red-300 bg-red-50'
              : 'border-gray-300'
          }`}
          maxLength={10000}
        />
        <div className="flex justify-between mt-1">
          <div className="text-sm text-gray-500">
            {formData.description.length}/10,000 characters
          </div>
          {validationResults?.warnings.some(w => w.includes('description')) && (
            <div className="text-sm text-yellow-600 flex items-center">
              <Info className="w-4 h-4 mr-1" />
              Consider adding more detail
            </div>
          )}
        </div>
      </div>

      {/* Metadata Section */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <select
              value={formData.metadata.category}
              onChange={(e) => onMetadataChange('category', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {categories.map(category => (
                <option key={category} value={category.toLowerCase()}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Priority
            </label>
            <select
              value={formData.metadata.priority}
              onChange={(e) => onMetadataChange('priority', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {priorities.map(priority => (
                <option key={priority.value} value={priority.value}>
                  {priority.label}
                </option>
              ))}
            </select>
          </div>

          {/* Estimated Cost */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estimated Cost (ETH)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.metadata.estimatedCost}
              onChange={(e) => onMetadataChange('estimatedCost', e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Timeline */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Expected Timeline
            </label>
            <input
              type="text"
              value={formData.metadata.timeline}
              onChange={(e) => onMetadataChange('timeline', e.target.value)}
              placeholder="e.g., 2 weeks, 1 month"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Tags Section */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-4">
          Tags (Optional)
        </label>
        <div className="flex flex-wrap gap-2">
          {availableTags.map(tag => (
            <button
              key={tag}
              type="button"
              onClick={() => handleTagToggle(tag)}
              className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                selectedTags.includes(tag)
                  ? 'bg-indigo-100 border-indigo-300 text-indigo-800'
                  : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Tag className="w-3 h-3 inline mr-1" />
              {tag}
            </button>
          ))}
        </div>
        {validationResults?.warnings.some(w => w.includes('tags')) && (
          <div className="text-sm text-yellow-600 flex items-center mt-2">
            <Info className="w-4 h-4 mr-1" />
            Adding tags will help users discover your proposal
          </div>
        )}
      </div>

      {/* Validation Summary */}
      {validationResults && (
        <div className="bg-white border rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">Validation Status</h4>
          <div className="space-y-2">
            {Object.entries(validationResults.requirements).map(([key, met]) => (
              <div key={key} className="flex items-center text-sm">
                {met ? (
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
                )}
                <span className={met ? 'text-green-700' : 'text-red-700'}>
                  {key === 'votingPower' && 'Sufficient voting power'}
                  {key === 'dataComplete' && 'Required fields complete'}
                  {key === 'timeValid' && 'Valid timing'}
                  {key === 'networkConnected' && 'Network connected'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StepOne;
