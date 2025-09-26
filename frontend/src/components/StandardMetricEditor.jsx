import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  LockClosedIcon,
  PencilIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import { api } from '../services/api';

export default function StandardMetricEditor({ template, onSubmit, onBack, isLoading }) {
  const [formData, setFormData] = useState({
    displayName: '',
    description: '',
    defaultFrequency: '',
    requiredDefault: false
  });

  // Fetch template details
  const { data: templateDetails, isLoading: templateLoading } = useQuery({
    queryKey: ['template-details', template.key],
    queryFn: () => api.get(`/metric-definitions/templates/${template.key}`),
    enabled: !!template.key
  });

  const details = templateDetails?.data;

  useEffect(() => {
    if (details) {
      setFormData({
        displayName: `${details.displayName} (Custom)`,
        description: details.description || '',
        defaultFrequency: details.defaultFrequency || '',
        requiredDefault: details.requiredDefault || false
      });
    }
  }, [details]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      templateKey: template.key,
      customizations: formData
    });
  };

  if (templateLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading template details...</p>
        </div>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">Error loading template details</div>
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
        <h2 className="text-2xl font-bold text-gray-900">Customize Standardized Metric</h2>
        <p className="text-gray-600 mt-2">
          Configure your metric based on the standardized template
        </p>
      </div>

      {/* Template Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <ShieldCheckIcon className="h-8 w-8 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              {details.displayName}
            </h3>
            <p className="text-blue-700 text-sm mb-3">
              Category: {details.category}
            </p>
            
            {/* Standardization Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {details.standardization?.loinc?.code && (
                <div className="bg-white rounded p-3">
                  <div className="font-medium text-blue-900 mb-1">LOINC Code</div>
                  <div className="font-mono text-blue-700">{details.standardization.loinc.code}</div>
                  <div className="text-blue-600 mt-1">{details.standardization.loinc.display}</div>
                </div>
              )}
              
              {details.standardization?.snomed?.length > 0 && (
                <div className="bg-white rounded p-3">
                  <div className="font-medium text-green-900 mb-1">SNOMED CT</div>
                  <div className="font-mono text-green-700">{details.standardization.snomed[0].code}</div>
                  <div className="text-green-600 mt-1">{details.standardization.snomed[0].display}</div>
                </div>
              )}
              
              {details.standardization?.icd10?.code && (
                <div className="bg-white rounded p-3">
                  <div className="font-medium text-purple-900 mb-1">ICD-10</div>
                  <div className="font-mono text-purple-700">{details.standardization.icd10.code}</div>
                  <div className="text-purple-600 mt-1">{details.standardization.icd10.description}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Editable Fields */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <PencilIcon className="h-5 w-5 text-green-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Customizable Settings</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Display Name *
              </label>
              <input
                type="text"
                name="displayName"
                value={formData.displayName}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter a custom display name"
              />
              <p className="text-xs text-gray-500 mt-1">
                This name will be shown to patients and clinicians
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Describe how this metric should be used..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Collection Frequency
                </label>
                <select
                  name="defaultFrequency"
                  value={formData.defaultFrequency}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Select frequency...</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="as_needed">As Needed</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              <div className="flex items-center">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    name="requiredDefault"
                    checked={formData.requiredDefault}
                    onChange={handleChange}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">Required by Default</span>
                    <p className="text-xs text-gray-500">Patients must provide this metric</p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Protected Fields */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <LockClosedIcon className="h-5 w-5 text-gray-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Protected Settings</h3>
            <span className="ml-2 text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">Read-only</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <label className="block font-medium text-gray-700 mb-1">Value Type</label>
              <div className="text-gray-600 bg-white p-2 rounded border">{details.valueType}</div>
            </div>
            
            {details.unit && (
              <div>
                <label className="block font-medium text-gray-700 mb-1">Unit</label>
                <div className="text-gray-600 bg-white p-2 rounded border">{details.unit}</div>
              </div>
            )}
            
            {details.scaleMin !== null && details.scaleMax !== null && (
              <div>
                <label className="block font-medium text-gray-700 mb-1">Scale Range</label>
                <div className="text-gray-600 bg-white p-2 rounded border">
                  {details.scaleMin} - {details.scaleMax}
                </div>
              </div>
            )}
            
            {details.options && details.options.length > 0 && (
              <div>
                <label className="block font-medium text-gray-700 mb-1">Options</label>
                <div className="text-gray-600 bg-white p-2 rounded border">
                  {details.options.slice(0, 3).join(', ')}
                  {details.options.length > 3 && ` (+${details.options.length - 3} more)`}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Information Box */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start">
            <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-amber-900">Important Notes</h4>
              <ul className="text-sm text-amber-700 mt-1 space-y-1">
                <li>• Medical coding standards (LOINC, SNOMED CT, ICD-10) are preserved</li>
                <li>• Core metric properties cannot be modified to maintain standardization</li>
                <li>• This metric will be compatible with EHR systems and quality reporting</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
          >
            Back
          </button>
          
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Creating...</span>
              </>
            ) : (
              <>
                <CheckCircleIcon className="w-4 h-4" />
                <span>Create Standardized Metric</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}