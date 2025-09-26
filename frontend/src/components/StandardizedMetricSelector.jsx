import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  MagnifyingGlassIcon,
  FunnelIcon,
  SparklesIcon,
  InformationCircleIcon,
  ChevronRightIcon,
  BeakerIcon,
  HeartIcon,
  ScaleIcon,
  BoltIcon,
  HandRaisedIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline';
import { api } from '../services/api';

export default function StandardizedMetricSelector({ onSelectTemplate, onBack }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // Fetch standardized templates
  const { data: templatesData, isLoading, error } = useQuery({
    queryKey: ['standardized-templates'],
    queryFn: () => api.get('/metric-definitions/templates/standardized')
  });

  const templates = templatesData?.data || {};
  const categories = Object.keys(templates);

  // Category icons and colors
  const categoryConfig = {
    'Pain Management': { icon: ScaleIcon, color: 'text-red-600', bg: 'bg-red-50' },
    'Cardiovascular': { icon: HeartIcon, color: 'text-pink-600', bg: 'bg-pink-50' },
    'Diabetes': { icon: BeakerIcon, color: 'text-blue-600', bg: 'bg-blue-50' },
    'Fibromyalgia': { icon: BoltIcon, color: 'text-purple-600', bg: 'bg-purple-50' },
    'Arthritis': { icon: HandRaisedIcon, color: 'text-orange-600', bg: 'bg-orange-50' },
    'Medication': { icon: ClipboardDocumentListIcon, color: 'text-green-600', bg: 'bg-green-50' },
    'General': { icon: InformationCircleIcon, color: 'text-gray-600', bg: 'bg-gray-50' }
  };

  // Filter templates based on search and category
  const filteredTemplates = React.useMemo(() => {
    let filtered = {};
    
    Object.entries(templates).forEach(([category, categoryTemplates]) => {
      if (selectedCategory === 'all' || selectedCategory === category) {
        const matchingTemplates = categoryTemplates.filter(template =>
          template.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          template.loincDisplay?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          template.snomedDisplay?.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        if (matchingTemplates.length > 0) {
          filtered[category] = matchingTemplates;
        }
      }
    });
    
    return filtered;
  }, [templates, searchTerm, selectedCategory]);

  const handleSelectTemplate = (template) => {
    setSelectedTemplate(template);
  };

  const handleContinue = () => {
    if (selectedTemplate) {
      onSelectTemplate(selectedTemplate);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading standardized templates...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">Error loading templates: {error.message}</div>
        <button
          onClick={onBack}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <SparklesIcon className="h-12 w-12 text-indigo-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900">Select Standardized Metric</h2>
        <p className="text-gray-600 mt-2">
          Choose from {Object.values(templates).flat().length} pre-configured metrics with medical coding standards
        </p>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by metric name, LOINC, or SNOMED..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Category Filter */}
          <div className="relative">
            <FunnelIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="space-y-6 max-h-96 overflow-y-auto">
        {Object.entries(filteredTemplates).map(([category, categoryTemplates]) => {
          const config = categoryConfig[category] || categoryConfig['General'];
          const Icon = config.icon;

          return (
            <div key={category} className="space-y-3">
              {/* Category Header */}
              <div className="flex items-center space-x-2">
                <div className={`p-2 rounded-lg ${config.bg}`}>
                  <Icon className={`h-5 w-5 ${config.color}`} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{category}</h3>
                <span className="text-sm text-gray-500">({categoryTemplates.length})</span>
              </div>

              {/* Templates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {categoryTemplates.map((template) => {
                  const isSelected = selectedTemplate?.key === template.key;
                  
                  return (
                    <div
                      key={template.key}
                      onClick={() => handleSelectTemplate(template)}
                      className={`cursor-pointer rounded-lg border-2 p-4 transition-all duration-200 ${
                        isSelected 
                          ? 'border-indigo-500 bg-indigo-50 shadow-md' 
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 mb-1">
                            {template.displayName}
                          </h4>
                          
                          {/* Coding Information */}
                          <div className="space-y-1 text-xs">
                            {template.loinc && (
                              <div className="flex items-center text-blue-600">
                                <span className="font-mono bg-blue-100 px-1 rounded mr-2">
                                  LOINC: {template.loinc}
                                </span>
                                <span className="truncate">{template.loincDisplay}</span>
                              </div>
                            )}
                            {template.snomed && (
                              <div className="flex items-center text-green-600">
                                <span className="font-mono bg-green-100 px-1 rounded mr-2">
                                  SNOMED: {template.snomed}
                                </span>
                                <span className="truncate">{template.snomedDisplay}</span>
                              </div>
                            )}
                            {template.icd10 && (
                              <div className="flex items-center text-purple-600">
                                <span className="font-mono bg-purple-100 px-1 rounded mr-2">
                                  ICD-10: {template.icd10}
                                </span>
                                <span className="truncate">{template.icd10Description}</span>
                              </div>
                            )}
                          </div>

                          {/* Metric Details */}
                          <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                            <span>Type: {template.valueType}</span>
                            {template.unit && <span>Unit: {template.unit}</span>}
                            {template.scaleMin !== null && template.scaleMax !== null && (
                              <span>Range: {template.scaleMin}-{template.scaleMax}</span>
                            )}
                          </div>
                        </div>

                        {/* Selection Indicator */}
                        <div className="ml-3">
                          {isSelected ? (
                            <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center">
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                            </div>
                          ) : (
                            <ChevronRightIcon className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* No Results */}
      {Object.keys(filteredTemplates).length === 0 && (
        <div className="text-center py-8">
          <MagnifyingGlassIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
          <p className="text-gray-500">Try adjusting your search or filter criteria</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between items-center pt-4 border-t border-gray-200">
        <button
          onClick={onBack}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
        >
          Back
        </button>
        
        <button
          onClick={handleContinue}
          disabled={!selectedTemplate}
          className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
        >
          <span>Use This Template</span>
          <ChevronRightIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}