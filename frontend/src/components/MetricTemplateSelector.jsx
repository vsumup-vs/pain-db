import React, { useState } from 'react';
import { 
  BeakerIcon, 
  PlusIcon, 
  SparklesIcon,
  DocumentTextIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

export default function MetricTemplateSelector({ onSelectType, onClose }) {
  const [selectedType, setSelectedType] = useState(null);

  const metricTypes = [
    {
      id: 'standardized',
      title: 'Standardized Metric',
      description: 'Use a pre-configured metric with medical coding standards (LOINC, SNOMED CT, ICD-10)',
      icon: SparklesIcon,
      color: 'bg-gradient-to-br from-blue-500 to-indigo-600',
      benefits: [
        'EHR integration ready',
        'Quality reporting enabled',
        'Research-grade data',
        'Regulatory compliance'
      ],
      recommended: true
    },
    {
      id: 'custom',
      title: 'Custom Metric',
      description: 'Create a fully customizable metric tailored to your specific clinic requirements',
      icon: DocumentTextIcon,
      color: 'bg-gradient-to-br from-gray-500 to-gray-600',
      benefits: [
        'Complete customization',
        'Clinic-specific needs',
        'Flexible configuration',
        'No coding restrictions'
      ],
      recommended: false
    }
  ];

  const handleSelect = (type) => {
    setSelectedType(type);
  };

  const handleContinue = () => {
    if (selectedType) {
      onSelectType(selectedType);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <BeakerIcon className="h-12 w-12 text-indigo-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900">Choose Metric Type</h2>
        <p className="text-gray-600 mt-2">
          Select how you'd like to create your new metric definition
        </p>
      </div>

      {/* Type Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {metricTypes.map((type) => {
          const Icon = type.icon;
          const isSelected = selectedType === type.id;
          
          return (
            <div
              key={type.id}
              onClick={() => handleSelect(type.id)}
              className={`relative cursor-pointer rounded-xl border-2 transition-all duration-200 ${
                isSelected 
                  ? 'border-indigo-500 bg-indigo-50 shadow-lg scale-105' 
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
              }`}
            >
              {/* Recommended Badge */}
              {type.recommended && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-green-500 text-white text-xs font-medium px-3 py-1 rounded-full">
                    Recommended
                  </span>
                </div>
              )}

              <div className="p-6">
                {/* Icon and Title */}
                <div className="flex items-center mb-4">
                  <div className={`p-3 rounded-lg ${type.color} mr-4`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{type.title}</h3>
                  </div>
                </div>

                {/* Description */}
                <p className="text-gray-600 mb-4 text-sm leading-relaxed">
                  {type.description}
                </p>

                {/* Benefits */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">Key Benefits:</h4>
                  <ul className="space-y-1">
                    {type.benefits.map((benefit, index) => (
                      <li key={index} className="flex items-center text-xs text-gray-600">
                        <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full mr-2 flex-shrink-0"></div>
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Selection Indicator */}
                {isSelected && (
                  <div className="mt-4 flex items-center text-indigo-600">
                    <div className="w-2 h-2 bg-indigo-600 rounded-full mr-2"></div>
                    <span className="text-sm font-medium">Selected</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Information Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <InformationCircleIcon className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-medium text-blue-900">Need Help Choosing?</h4>
            <p className="text-sm text-blue-700 mt-1">
              <strong>Standardized metrics</strong> are recommended for most clinical use cases as they ensure 
              data compatibility with EHR systems and enable quality reporting. Choose <strong>custom metrics</strong> 
              only when you need specific configurations not available in standardized options.
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center pt-4 border-t border-gray-200">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
        >
          Cancel
        </button>
        
        <button
          onClick={handleContinue}
          disabled={!selectedType}
          className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
        >
          <span>Continue</span>
          <PlusIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}