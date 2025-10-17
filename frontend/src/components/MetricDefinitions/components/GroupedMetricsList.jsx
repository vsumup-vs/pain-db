import React, { useState, useMemo } from 'react'
import {
  ChevronDownIcon,
  ChevronRightIcon,
  PlusIcon,
  HeartIcon,
  BeakerIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  BoltIcon,
  UserGroupIcon,
  MoonIcon,
  LifebuoyIcon,
  ScaleIcon,
  TagIcon,
  EyeIcon
} from '@heroicons/react/24/outline'

// Helper function to get category from metric key
const getCategoryFromKey = (key) => {
  if (!key) return 'General'
  
  const keyLower = key.toLowerCase()
  
  if (keyLower.includes('pain') || keyLower.includes('analgesic') || keyLower.includes('opioid')) {
    return 'Pain Management'
  }
  if (keyLower.includes('phq') || keyLower.includes('gad') || keyLower.includes('depression') || keyLower.includes('anxiety') || keyLower.includes('mental')) {
    return 'Mental Health'
  }
  if (keyLower.includes('medication') || keyLower.includes('drug') || keyLower.includes('adherence') || keyLower.includes('dose')) {
    return 'Medication Management'
  }
  if (keyLower.includes('blood_pressure') || keyLower.includes('heart_rate') || keyLower.includes('temperature') || keyLower.includes('oxygen')) {
    return 'Vital Signs'
  }
  if (keyLower.includes('glucose') || keyLower.includes('diabetes') || keyLower.includes('insulin')) {
    return 'Endocrine'
  }
  if (keyLower.includes('mobility') || keyLower.includes('functional') || keyLower.includes('rehabilitation')) {
    return 'Functional Status'
  }
  if (keyLower.includes('sleep') || keyLower.includes('fatigue') || keyLower.includes('energy')) {
    return 'Sleep & Energy'
  }
  if (keyLower.includes('respiratory') || keyLower.includes('breathing') || keyLower.includes('copd') || keyLower.includes('asthma')) {
    return 'Respiratory'
  }
  if (keyLower.includes('nutrition') || keyLower.includes('diet') || keyLower.includes('weight')) {
    return 'Nutrition'
  }
  
  return 'General'
}

// Category configuration with icons and colors
const categoryConfig = {
  'Pain Management': {
    icon: HeartIcon,
    color: 'red',
    description: 'Pain assessment and management metrics'
  },
  'Mental Health': {
    icon: BeakerIcon,
    color: 'purple',
    description: 'Mental health and psychological assessments'
  },
  'Medication Management': {
    icon: ShieldCheckIcon,
    color: 'blue',
    description: 'Medication adherence and effectiveness'
  },
  'Vital Signs': {
    icon: ChartBarIcon,
    color: 'green',
    description: 'Basic physiological measurements'
  },
  'Endocrine': {
    icon: BoltIcon,
    color: 'yellow',
    description: 'Hormonal and metabolic measurements'
  },
  'Functional Status': {
    icon: UserGroupIcon,
    color: 'indigo',
    description: 'Physical function and mobility assessments'
  },
  'Sleep & Energy': {
    icon: MoonIcon,
    color: 'gray',
    description: 'Sleep quality and energy level metrics'
  },
  'Respiratory': {
    icon: LifebuoyIcon,
    color: 'cyan',
    description: 'Breathing and lung function metrics'
  },
  'Nutrition': {
    icon: ScaleIcon,
    color: 'orange',
    description: 'Nutritional and dietary assessments'
  },
  'General': {
    icon: TagIcon,
    color: 'gray',
    description: 'General health metrics'
  }
}

const MetricCard = ({ metric, onEdit, onDelete, onCustomize, onViewDetails }) => {
  const getValueTypeIcon = (valueType) => {
    switch (valueType) {
      case 'numeric':
        return '🔢'
      case 'ordinal':
        return '📊'
      case 'categorical':
        return '🏷️'
      case 'boolean':
        return '✅'
      case 'text':
        return '📝'
      case 'date':
        return '📅'
      default:
        return '❓'
    }
  }

  const getValueTypeColor = (valueType) => {
    switch (valueType) {
      case 'numeric':
        return 'bg-blue-100 text-blue-800'
      case 'ordinal':
        return 'bg-green-100 text-green-800'
      case 'categorical':
        return 'bg-purple-100 text-purple-800'
      case 'boolean':
        return 'bg-yellow-100 text-yellow-800'
      case 'text':
        return 'bg-gray-100 text-gray-800'
      case 'date':
        return 'bg-pink-100 text-pink-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Helper function to check if a value is a valid finite number
  const isValidRange = (min, max) => {
    // More comprehensive validation
    const isMinValid = min !== null && min !== undefined && 
                      !isNaN(min) && Number.isFinite(Number(min));
    const isMaxValid = max !== null && max !== undefined && 
                      !isNaN(max) && Number.isFinite(Number(max));
    
    return isMinValid && isMaxValid;
  }

  // Helper function to safely format range values
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
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-2">
            <h3 className="text-sm font-medium text-gray-900 truncate">
              {metric.displayName || metric.key}
            </h3>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getValueTypeColor(metric.valueType)}`}>
              <span className="mr-1">{getValueTypeIcon(metric.valueType)}</span>
              {metric.valueType}
            </span>
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

          {metric.description && (
            <p className="text-sm text-gray-500 mb-2 line-clamp-2">
              {metric.description}
            </p>
          )}

          <div className="flex items-center space-x-4 text-xs text-gray-500">
            <span>Key: {metric.key}</span>
            {metric.unit && <span>Unit: {metric.unit}</span>}
            {(() => {
              const rangeText = formatRange(metric.scaleMin, metric.scaleMax);
              return rangeText ? <span>Range: {rangeText}</span> : null;
            })()}
          </div>
        </div>

        <div className="flex items-center space-x-2 ml-4">
          {/* View Details button for all metrics */}
          <button
            onClick={() => onViewDetails(metric)}
            className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
            title="View Details"
          >
            <EyeIcon className="h-4 w-4" />
          </button>
          {metric.isStandardized && !metric.isCustomized && onCustomize && (
            <button
              onClick={() => onCustomize(metric)}
              className="text-purple-600 hover:text-purple-800 text-sm font-medium"
              title="Customize for your organization"
            >
              Customize
            </button>
          )}
          {/* Only show Edit/Delete for customized (org-specific) metrics */}
          {metric.isCustomized && (
            <>
              <button
                onClick={() => onEdit(metric)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Edit
              </button>
              <button
                onClick={() => onDelete(metric)}
                className="text-red-600 hover:text-red-800 text-sm font-medium"
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export const GroupedMetricsList = ({ metrics, onEdit, onDelete, onCustomize, onViewDetails, onCreateFirst }) => {
  const [expandedCategories, setExpandedCategories] = useState(new Set(['Pain Management', 'Mental Health', 'Medication Management']))

  // Group metrics by category
  const groupedMetrics = useMemo(() => {
    const groups = {}
    
    metrics.forEach(metric => {
      const category = metric.category || getCategoryFromKey(metric.key)
      if (!groups[category]) {
        groups[category] = []
      }
      groups[category].push(metric)
    })
    
    // Sort categories and metrics within each category
    const sortedGroups = {}
    Object.keys(groups)
      .sort()
      .forEach(category => {
        sortedGroups[category] = groups[category].sort((a, b) => 
          (a.displayName || a.key).localeCompare(b.displayName || b.key)
        )
      })
    
    return sortedGroups
  }, [metrics])

  const toggleCategory = (category) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(category)) {
      newExpanded.delete(category)
    } else {
      newExpanded.add(category)
    }
    setExpandedCategories(newExpanded)
  }

  const totalMetrics = metrics.length
  const categoryCount = Object.keys(groupedMetrics).length

  if (totalMetrics === 0) {
    return (
      <div className="text-center py-12">
        <TagIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No metrics found</h3>
        <p className="mt-1 text-sm text-gray-500">
          Get started by creating your first metric definition.
        </p>
        <div className="mt-6">
          <button
            onClick={onCreateFirst}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Create First Metric
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>{totalMetrics} metrics across {categoryCount} categories</span>
          <button
            onClick={() => {
              if (expandedCategories.size === categoryCount) {
                setExpandedCategories(new Set())
              } else {
                setExpandedCategories(new Set(Object.keys(groupedMetrics)))
              }
            }}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            {expandedCategories.size === categoryCount ? 'Collapse All' : 'Expand All'}
          </button>
        </div>
      </div>

      {/* Grouped Categories */}
      {Object.entries(groupedMetrics).map(([category, categoryMetrics]) => {
        const config = categoryConfig[category] || categoryConfig['General']
        const IconComponent = config.icon
        const isExpanded = expandedCategories.has(category)
        
        return (
          <div key={category} className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Category Header */}
            <button
              onClick={() => toggleCategory(category)}
              className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between transition-colors"
            >
              <div className="flex items-center space-x-3">
                <IconComponent className={`h-5 w-5 text-${config.color}-600`} />
                <div className="text-left">
                  <h3 className="text-sm font-medium text-gray-900">{category}</h3>
                  <p className="text-xs text-gray-500">{config.description}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-${config.color}-100 text-${config.color}-800`}>
                  {categoryMetrics.length} {categoryMetrics.length === 1 ? 'metric' : 'metrics'}
                </span>
                {isExpanded ? (
                  <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronRightIcon className="h-4 w-4 text-gray-500" />
                )}
              </div>
            </button>

            {/* Category Content */}
            {isExpanded && (
              <div className="p-4 space-y-3 bg-white">
                {categoryMetrics.map(metric => (
                  <MetricCard
                    key={metric.id}
                    metric={metric}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onCustomize={onCustomize}
                    onViewDetails={onViewDetails}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}