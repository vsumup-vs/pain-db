import { useState, useMemo } from 'react'

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

export const useMetricFilters = (metricDefinitions) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [viewMode, setViewMode] = useState('list') // 'list' or 'grouped'

  // Ensure metricDefinitions is always an array
  const safeMetricDefinitions = Array.isArray(metricDefinitions) ? metricDefinitions : []

  // Get unique metric types for filter options
  const uniqueTypes = useMemo(() => {
    const types = [...new Set(safeMetricDefinitions.map(metric => metric.valueType))]
    return types.sort()
  }, [safeMetricDefinitions])

  // Get unique categories for filter options
  const uniqueCategories = useMemo(() => {
    const categories = [...new Set(safeMetricDefinitions.map(metric => 
      metric.category || getCategoryFromKey(metric.key)
    ))]
    return categories.sort()
  }, [safeMetricDefinitions])

  // Filter metrics based on search term, type, and category
  const filteredMetrics = useMemo(() => {
    return safeMetricDefinitions.filter(metric => {
      const matchesSearch = !searchTerm || 
        metric.key?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        metric.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        metric.description?.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesType = filterType === 'all' || metric.valueType === filterType
      
      const metricCategory = metric.category || getCategoryFromKey(metric.key)
      const matchesCategory = filterCategory === 'all' || metricCategory === filterCategory
      
      return matchesSearch && matchesType && matchesCategory
    })
  }, [safeMetricDefinitions, searchTerm, filterType, filterCategory])

  return {
    searchTerm,
    setSearchTerm,
    filterType,
    setFilterType,
    filterCategory,
    setFilterCategory,
    viewMode,
    setViewMode,
    uniqueTypes,
    uniqueCategories,
    filteredMetrics
  }
}