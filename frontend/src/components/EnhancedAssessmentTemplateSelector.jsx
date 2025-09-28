import React, { useState, useEffect } from 'react';
import { 
  MagnifyingGlassIcon, 
  FunnelIcon, 
  CheckCircleIcon, 
  CircleStackIcon,
  TagIcon,
  ClipboardDocumentListIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

const EnhancedAssessmentTemplateSelector = ({ onSelect, selectedTemplateId, onPreview }) => {
  const [templates, setTemplates] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    fetchTemplates();
    fetchCategories();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/assessment-templates-v2');
      const data = await response.json();
      setTemplates(data.data || data.templates || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/assessment-templates-v2/categories');
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (template.description && template.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = !selectedCategory || template.category === selectedCategory;
    
    const matchesTab = activeTab === 'all' || 
                      (activeTab === 'standardized' && template.isStandardized) ||
                      (activeTab === 'custom' && !template.isStandardized);
    
    return matchesSearch && matchesCategory && matchesTab;
  });

  const getCategoryBadgeColor = (category) => {
    const colors = {
      'pain_assessment': 'bg-red-100 text-red-800 border-red-200',
      'mental_health': 'bg-blue-100 text-blue-800 border-blue-200',
      'functional_assessment': 'bg-green-100 text-green-800 border-green-200',
      'quality_of_life': 'bg-purple-100 text-purple-800 border-purple-200',
      'custom': 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colors[category] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const formatCategoryName = (category) => {
    return category?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Custom';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <span className="ml-3 text-gray-600">Loading templates...</span>
      </div>
    );
  }

  const handlePreview = (e, template) => {
    e.stopPropagation(); // Prevent template selection when clicking preview
    if (onPreview) {
      onPreview(template);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and Filter Controls */}
      <div className="flex flex-col space-y-4">
        <div className="flex items-center space-x-4">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search templates by name or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>
                  {formatCategoryName(category)}
                </option>
              ))}
            </select>
            <FunnelIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 pointer-events-none" />
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: 'all', label: 'All Templates', icon: ClipboardDocumentListIcon },
              { key: 'standardized', label: 'Standardized', icon: CheckCircleIcon },
              { key: 'custom', label: 'Custom', icon: CircleStackIcon }
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === key
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid gap-4">
        {filteredTemplates.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <ClipboardDocumentListIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No templates found matching your criteria.</p>
          </div>
        ) : (
          filteredTemplates.map(template => (
            <div
              key={template.id}
              className={`bg-white rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                selectedTemplateId === template.id 
                  ? 'ring-2 ring-indigo-500 bg-indigo-50 border-indigo-200' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => onSelect && onSelect(template)}
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
                      {selectedTemplateId === template.id && (
                        <CheckCircleIcon className="h-5 w-5 text-indigo-600" />
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      {template.isStandardized ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                          Standardized
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                          Custom
                        </span>
                      )}
                      {template.category && (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getCategoryBadgeColor(template.category)}`}>
                          <TagIcon className="h-3 w-3 mr-1" />
                          {formatCategoryName(template.category)}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  {onPreview && (
                    <div className="flex space-x-1 ml-4">
                      <button
                        onClick={(e) => handlePreview(e, template)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Preview template"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Description */}
                {template.description && (
                  <p className="text-gray-600 text-sm mb-4">{template.description}</p>
                )}

                {/* Clinical Information for Standardized Templates */}
                {template.isStandardized && template.validationInfo && (
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <h4 className="font-medium text-sm text-gray-900 mb-2">Clinical Information</h4>
                    <div className="text-xs text-gray-600 space-y-1">
                      {template.validationInfo.developer && (
                        <p><strong>Developer:</strong> {template.validationInfo.developer}</p>
                      )}
                      {template.validationInfo.validation && (
                        <p><strong>Validation:</strong> {template.validationInfo.validation}</p>
                      )}
                      {template.clinicalUse && (
                        <p><strong>Clinical Use:</strong> {template.clinicalUse}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span className="flex items-center space-x-1">
                    <ClipboardDocumentListIcon className="h-4 w-4" />
                    <span>{template.items?.length || 0} items</span>
                  </span>
                  <span>Version {template.version}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default EnhancedAssessmentTemplateSelector;