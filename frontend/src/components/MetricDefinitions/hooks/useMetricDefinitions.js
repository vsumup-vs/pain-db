import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { api } from '../../../services/api'

export const useMetricDefinitions = () => {
  const queryClient = useQueryClient()

  // Fetch metric definitions
  const {
    data: metricDefinitions = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['metricDefinitions'],
    queryFn: async () => {
      const response = await api.getMetricDefinitions()
      return response.data || []
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  })

  // Create metric definition
  const createMetricMutation = useMutation({
    mutationFn: async (metricData) => {
      const response = await api.createMetricDefinition(metricData)
      return response.data || response
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['metricDefinitions'])
      toast.success('Metric definition created successfully!')
    },
    onError: (error) => {
      toast.error(`Failed to create metric definition: ${error.message}`)
    }
  })

  // Update metric definition
  const updateMetricMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.updateMetricDefinition(id, data)
      return response.data || response
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['metricDefinitions'])
      toast.success('Metric definition updated successfully!')
    },
    onError: (error) => {
      toast.error(`Failed to update metric definition: ${error.message}`)
    }
  })

  // Delete metric definition
  const deleteMetricMutation = useMutation({
    mutationFn: async (id) => {
      const response = await api.deleteMetricDefinition(id)
      return response.data || response
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['metricDefinitions'])
      toast.success('Metric definition deleted successfully!')
    },
    onError: (error) => {
      toast.error(`Failed to delete metric definition: ${error.message}`)
    }
  })

  return {
    metricDefinitions,
    isLoading,
    error,
    refetch,
    createMetric: createMetricMutation.mutate,
    updateMetric: updateMetricMutation.mutate,
    deleteMetric: deleteMetricMutation.mutate,
    isCreating: createMetricMutation.isLoading,
    isUpdating: updateMetricMutation.isLoading,
    isDeleting: deleteMetricMutation.isLoading
  }
}