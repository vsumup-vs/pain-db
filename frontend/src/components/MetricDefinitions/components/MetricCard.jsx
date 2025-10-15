import React from 'react'
import { PencilIcon, TrashIcon, CheckCircleIcon, ExclamationTriangleIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline'
import { getMetricTypeInfo } from '../utils/metricTypeUtils'

export const MetricCard = ({ metric, onEdit, onDelete, onCustomize }) => {
  const typeInfo = getMetricTypeInfo(metric.valueType)
  const TypeIcon = typeInfo.icon

  // Helper function to validate range values (same as GroupedMetricsList)
  const isValidRange = (min, max) => {
    // More comprehensive validation
    const isMinValid = min !== null && min !== undefined && 
                      !isNaN(min) && Number.isFinite(Number(min));
    const isMaxValid = max !== null && max !== undefined && 
                      !isNaN(max) && Number.isFinite(Number(max));
    
    return isMinValid && isMaxValid;
  }

  // Helper function to safely format range values (same as GroupedMetricsList)
  const formatRange = (min, max) => {
    if (!isValidRange(min, max)) {
      return null;
    }
    
    // Convert to numbers to ensure proper display
    const minNum = Number(min);
    const maxNum = Number(max);
    
    return `${minNum} - ${maxNum}`;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${typeInfo.background} ${typeInfo.border} border`}>
            <TypeIcon className={`h-5 w-5 ${typeInfo.color}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-900">{metric.key}</h3>
              {metric.isStandardized && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                  ⭐ Standardized
                </span>
              )}
              {metric.isCustomized && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                  🏥 Custom
                </span>
              )}
            </div>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeInfo.background} ${typeInfo.color}`}>
              {typeInfo.label}
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {metric.isStandardized && !metric.isCustomized && onCustomize && (
            <button
              onClick={() => onCustomize(metric)}
              className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
              title="Customize for your organization"
            >
              <DocumentDuplicateIcon className="h-4 w-4" />
            </button>
          )}
          {/* Only show Edit/Delete for customized (org-specific) metrics */}
          {metric.isCustomized && (
            <>
              <button
                onClick={() => onEdit(metric)}
                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Edit metric"
              >
                <PencilIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => onDelete(metric.id)}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete metric"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Description */}
      {metric.description && (
        <p className="text-gray-600 mb-4">{metric.description}</p>
      )}

      {/* Standardization Status */}
      <div className="flex items-center mb-4">
        {metric.isStandardized ? (
          <div className="flex items-center text-green-600">
            <CheckCircleIcon className="h-4 w-4 mr-1" />
            <span className="text-sm font-medium">Standardized</span>
          </div>
        ) : (
          <div className="flex items-center text-yellow-600">
            <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
            <span className="text-sm font-medium">Custom</span>
          </div>
        )}
      </div>

      {/* Type-specific details */}
      <div className="space-y-2 text-sm text-gray-600">
        {metric.unit && (
          <div>
            <span className="font-medium">Unit:</span> {metric.unit}
          </div>
        )}
        
        {metric.valueType === 'numeric' && (() => {
          const rangeText = formatRange(metric.scaleMin, metric.scaleMax);
          return rangeText ? (
            <div>
              <span className="font-medium">Range:</span> {rangeText}
            </div>
          ) : null;
        })()}
        
        {(metric.valueType === 'categorical' || metric.valueType === 'ordinal') && metric.options && (
          <div>
            <span className="font-medium">Options:</span> {
              metric.options.values && Array.isArray(metric.options.values)
                ? metric.options.values.map(option => option.display || option.code || option).join(', ')
                : Array.isArray(metric.options) 
                  ? metric.options.join(', ')
                  : 'No options defined'
            }
          </div>
        )}
      </div>
    </div>
  )
}