import React from 'react'
import { PencilIcon, TrashIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { getMetricTypeInfo } from '../utils/metricTypeUtils'

export const MetricCard = ({ metric, onEdit, onDelete }) => {
  const typeInfo = getMetricTypeInfo(metric.valueType)
  const TypeIcon = typeInfo.icon

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${typeInfo.background} ${typeInfo.border} border`}>
            <TypeIcon className={`h-5 w-5 ${typeInfo.color}`} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{metric.key}</h3>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeInfo.background} ${typeInfo.color}`}>
              {typeInfo.label}
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
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
        
        {metric.valueType === 'numeric' && (metric.minValue !== null || metric.maxValue !== null) && (
          <div>
            <span className="font-medium">Range:</span> {metric.minValue ?? '∞'} - {metric.maxValue ?? '∞'}
          </div>
        )}
        
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