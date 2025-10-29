import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'

/**
 * Custom hook to fetch and apply default saved view for a specific view type
 *
 * @param {string} viewType - The view type (TASK_LIST, PATIENT_LIST, TRIAGE_QUEUE, etc.)
 * @param {boolean} enabled - Whether to fetch the default view (default: true)
 * @returns {object} - { defaultView, isLoading, error, hasDefaultView, appliedFilters }
 */
export function useDefaultView(viewType, enabled = true) {
  const { data: defaultView, isLoading, error } = useQuery({
    queryKey: ['default-view', viewType],
    queryFn: async () => {
      console.log(`[useDefaultView] Fetching default view for viewType: ${viewType}`)
      try {
        const result = await api.getDefaultView(viewType)
        console.log(`[useDefaultView] Received result:`, result)
        return result
      } catch (err) {
        console.error(`[useDefaultView] Error fetching default view:`, err)
        throw err
      }
    },
    enabled: enabled && !!viewType,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 1
  })

  if (error) {
    console.error(`[useDefaultView] Query error for ${viewType}:`, error)
  }

  return {
    defaultView,
    isLoading,
    error,
    hasDefaultView: !!defaultView,
    appliedFilters: defaultView?.filters || {}
  }
}
