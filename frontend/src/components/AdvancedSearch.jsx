import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  X,
  Calendar,
  User,
  Tag,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  SortAsc,
  SortDesc
} from 'lucide-react';
import { backendAPI } from '../services/backendApi';

const AdvancedSearch = ({ onResults, onFiltersChange }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: [],
    category: [],
    author: '',
    dateRange: { start: '', end: '' },
    sortBy: 'createdAt',
    sortOrder: 'desc',
    minVotes: '',
    hasComments: null
  });
  const [showFilters, setShowFilters] = useState(false);
  const [searching, setSearching] = useState(false);
  const [categories, setCategories] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);

  const statusOptions = [
    { value: 'pending', label: 'Pending', icon: Clock, color: 'blue' },
    { value: 'active', label: 'Active', icon: TrendingUp, color: 'green' },
    { value: 'executed', label: 'Executed', icon: CheckCircle, color: 'green' },
    { value: 'defeated', label: 'Defeated', icon: XCircle, color: 'red' },
    { value: 'canceled', label: 'Canceled', icon: AlertCircle, color: 'gray' }
  ];

  const sortOptions = [
    { value: 'createdAt', label: 'Date Created' },
    { value: 'votes', label: 'Vote Count' },
    { value: 'deadline', label: 'Deadline' },
    { value: 'title', label: 'Title' },
    { value: 'comments', label: 'Comments' }
  ];

  useEffect(() => {
    loadCategories();
    loadRecentSearches();
  }, []);

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchTerm || Object.values(filters).some(f => 
        Array.isArray(f) ? f.length > 0 : f !== '' && f !== null
      )) {
        performSearch();
      } else {
        onResults([]);
      }
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm, filters]);

  const loadCategories = async () => {
    try {
      const cats = await backendAPI.getProposalCategories();
      setCategories(cats);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadRecentSearches = () => {
    const saved = localStorage.getItem('daoRecentSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  };

  const saveRecentSearch = (term) => {
    if (!term.trim()) return;
    
    const updated = [term, ...recentSearches.filter(s => s !== term)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('daoRecentSearches', JSON.stringify(updated));
  };

  const performSearch = async () => {
    setSearching(true);
    
    try {
      const searchParams = {
        query: searchTerm,
        ...filters,
        status: filters.status.length > 0 ? filters.status : undefined,
        category: filters.category.length > 0 ? filters.category : undefined
      };

      const results = await backendAPI.searchProposals(searchParams);
      onResults(results);

      if (searchTerm) {
        saveRecentSearch(searchTerm);
      }

      if (onFiltersChange) {
        onFiltersChange({ searchTerm, filters });
      }

    } catch (error) {
      console.error('Search failed:', error);
      onResults([]);
    } finally {
      setSearching(false);
    }
  };

  const updateFilter = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const toggleArrayFilter = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter(v => v !== value)
        : [...prev[key], value]
    }));
  };

  const clearFilters = () => {
    setFilters({
      status: [],
      category: [],
      author: '',
      dateRange: { start: '', end: '' },
      sortBy: 'createdAt',
      sortOrder: 'desc',
      minVotes: '',
      hasComments: null
    });
    setSearchTerm('');
  };

  const activeFiltersCount = useMemo(() => {
    return Object.entries(filters).reduce((count, [key, value]) => {
      if (key === 'sortBy' || key === 'sortOrder') return count;
      if (Array.isArray(value)) return count + value.length;
      if (key === 'dateRange') return count + (value.start || value.end ? 1 : 0);
      return count + (value ? 1 : 0);
    }, 0) + (searchTerm ? 1 : 0);
  }, [filters, searchTerm]);

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
      {/* Search Bar */}
      <div className="relative mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search proposals by title, description, or author..."
            className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dao-500 focus:border-dao-500"
          />
          {searching && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-dao-600"></div>
            </div>
          )}
        </div>

        {/* Recent Searches */}
        {recentSearches.length > 0 && searchTerm === '' && (
          <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg mt-1 shadow-lg z-10">
            <div className="p-3 border-b border-gray-100">
              <span className="text-sm font-medium text-gray-700">Recent Searches</span>
            </div>
            {recentSearches.map((search, index) => (
              <button
                key={index}
                onClick={() => setSearchTerm(search)}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm text-gray-700"
              >
                {search}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Filter Toggle */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-2 text-dao-600 hover:text-dao-700 border border-dao-600 rounded-lg hover:bg-dao-50"
        >
          <Filter className="w-4 h-4" />
          Advanced Filters
          {activeFiltersCount > 0 && (
            <span className="bg-dao-600 text-white text-xs px-2 py-1 rounded-full">
              {activeFiltersCount}
            </span>
          )}
        </button>

        {activeFiltersCount > 0 && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            <X className="w-4 h-4" />
            Clear All
          </button>
        )}
      </div>

      {/* Advanced Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            className="border-t pt-4"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <div className="space-y-2">
                  {statusOptions.map((status) => {
                    const Icon = status.icon;
                    return (
                      <label key={status.value} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filters.status.includes(status.value)}
                          onChange={() => toggleArrayFilter('status', status.value)}
                          className="w-4 h-4 text-dao-600 border-gray-300 rounded focus:ring-dao-500"
                        />
                        <Icon className={`w-4 h-4 text-${status.color}-500`} />
                        <span className="text-sm text-gray-700">{status.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {categories.map((category) => (
                    <label key={category.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.category.includes(category.id)}
                        onChange={() => toggleArrayFilter('category', category.id)}
                        className="w-4 h-4 text-dao-600 border-gray-300 rounded focus:ring-dao-500"
                      />
                      <Tag className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-700">{category.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Author Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Author</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    value={filters.author}
                    onChange={(e) => updateFilter('author', e.target.value)}
                    placeholder="Author address or name..."
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dao-500 focus:border-dao-500 text-sm"
                  />
                </div>
              </div>

              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                <div className="space-y-2">
                  <input
                    type="date"
                    value={filters.dateRange.start}
                    onChange={(e) => updateFilter('dateRange', { ...filters.dateRange, start: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dao-500 focus:border-dao-500 text-sm"
                  />
                  <input
                    type="date"
                    value={filters.dateRange.end}
                    onChange={(e) => updateFilter('dateRange', { ...filters.dateRange, end: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dao-500 focus:border-dao-500 text-sm"
                  />
                </div>
              </div>

              {/* Sort Options */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                <div className="space-y-2">
                  <select
                    value={filters.sortBy}
                    onChange={(e) => updateFilter('sortBy', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dao-500 focus:border-dao-500 text-sm"
                  >
                    {sortOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateFilter('sortOrder', 'asc')}
                      className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-sm ${
                        filters.sortOrder === 'asc'
                          ? 'bg-dao-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <SortAsc className="w-4 h-4" />
                      Asc
                    </button>
                    <button
                      onClick={() => updateFilter('sortOrder', 'desc')}
                      className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-sm ${
                        filters.sortOrder === 'desc'
                          ? 'bg-dao-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <SortDesc className="w-4 h-4" />
                      Desc
                    </button>
                  </div>
                </div>
              </div>

              {/* Additional Filters */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Additional</label>
                <div className="space-y-2">
                  <input
                    type="number"
                    value={filters.minVotes}
                    onChange={(e) => updateFilter('minVotes', e.target.value)}
                    placeholder="Min votes..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dao-500 focus:border-dao-500 text-sm"
                  />
                  <select
                    value={filters.hasComments === null ? '' : filters.hasComments.toString()}
                    onChange={(e) => updateFilter('hasComments', e.target.value === '' ? null : e.target.value === 'true')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dao-500 focus:border-dao-500 text-sm"
                  >
                    <option value="">Any comments</option>
                    <option value="true">Has comments</option>
                    <option value="false">No comments</option>
                  </select>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdvancedSearch;
