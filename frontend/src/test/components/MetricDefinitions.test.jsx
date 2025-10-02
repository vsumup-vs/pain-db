// Mock axios before any imports that might use it
vi.mock('axios', () => {
  const mockInstance = {
    get: () => Promise.resolve({ data: [] }),
    post: () => Promise.resolve({ data: {} }),
    put: () => Promise.resolve({ data: {} }),
    delete: () => Promise.resolve({ data: {} }),
    interceptors: {
      request: { 
        use: (successHandler, errorHandler) => {
          // Store the handlers for potential use
          mockInstance._requestInterceptor = { successHandler, errorHandler }
        }
      },
      response: { 
        use: (successHandler, errorHandler) => {
          // Store the handlers and apply the success handler to responses
          mockInstance._responseInterceptor = { successHandler, errorHandler }
        }
      }
    }
  }
  
  return {
    default: {
      create: () => mockInstance,
      interceptors: {
        request: { use: () => {} },
        response: { use: () => {} }
      }
    }
  }
})

import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../utils'
import MetricDefinitions from '../../pages/MetricDefinitions'
import axios from 'axios'

describe('MetricDefinitions', () => {
  let mockAxiosInstance

  beforeEach(() => {
    // Get the mocked instance
    mockAxiosInstance = axios.create()
    
    // Reset and configure mocks using vi.fn() which is now available
    mockAxiosInstance.get = vi.fn()
    mockAxiosInstance.post = vi.fn()
    mockAxiosInstance.put = vi.fn()
    mockAxiosInstance.delete = vi.fn()
    
    // Component expects metricDefinitions.data to be an array
    // The API interceptor extracts response.data, so we need to return the data directly
    // since the interceptor will extract it and React Query will wrap it again
    mockAxiosInstance.get.mockImplementation((url, config) => {
      if (url === '/metric-definitions' || url.includes('metric-definitions')) {
        const response = {
          data: [
            {
              id: 1,
              key: 'pain_scale',
              displayName: 'Pain Scale 0-10',
              description: 'Patient reported pain level on 0-10 scale',
              valueType: 'numeric',
              scaleMin: 0,
              scaleMax: 10,
              unit: 'scale',
              isStandardized: false,
              coding: null
            },
            {
              id: 2,
              key: 'medication_adherence',
              displayName: 'Medication Adherence',
              description: 'Patient medication compliance assessment',
              valueType: 'ordinal',
              ordinalOptions: ['Poor', 'Fair', 'Good', 'Excellent'],
              isStandardized: true,
              coding: {
                primary: { code: 'LA6115-6' },
                secondary: [{ code: '182840001' }],
                mappings: { icd10: 'Z91.14' }
              }
            }
          ]
        }
        
        // Simulate the response interceptor behavior
        if (mockAxiosInstance._responseInterceptor?.successHandler) {
          return Promise.resolve(mockAxiosInstance._responseInterceptor.successHandler(response))
        }
        return Promise.resolve(response)
      }
      
      if (url === '/assessment-templates' || url.includes('assessment-templates')) {
        const response = {
          data: [
            {
              id: 1,
              name: 'Pain Assessment',
              description: 'Standard pain assessment template'
            }
          ]
        }
        
        // Simulate the response interceptor behavior
        if (mockAxiosInstance._responseInterceptor?.successHandler) {
          return Promise.resolve(mockAxiosInstance._responseInterceptor.successHandler(response))
        }
        return Promise.resolve(response)
      }
      
      return Promise.resolve({ data: [] })
    })

    mockAxiosInstance.post.mockResolvedValue({
      data: { id: 3, key: 'new_metric', displayName: 'New Metric' }
    })

    mockAxiosInstance.put.mockResolvedValue({
      data: { id: 1, key: 'pain_scale', displayName: 'Updated Pain Scale' }
    })

    mockAxiosInstance.delete.mockResolvedValue({
      data: { success: true }
    })
  })

  it('renders metric definitions page', async () => {
    renderWithProviders(<MetricDefinitions />)
    
    expect(screen.getByText('Metric Definitions')).toBeInTheDocument()
    expect(screen.getByText('Manage and configure metrics for patient data collection')).toBeInTheDocument()
    
    await waitFor(() => {
      expect(screen.getByText('Pain Scale 0-10')).toBeInTheDocument()
      expect(screen.getByText('Medication Adherence')).toBeInTheDocument()
    })
  })

  it('displays search and filter controls', async () => {
    renderWithProviders(<MetricDefinitions />)
    
    expect(screen.getByPlaceholderText('Search metrics by name, description, or key...')).toBeInTheDocument()
    expect(screen.getByDisplayValue('All Types')).toBeInTheDocument()
  })

  it('filters metrics by search term', async () => {
    const user = userEvent.setup()
    renderWithProviders(<MetricDefinitions />)
    
    await waitFor(() => {
      expect(screen.getByText('Pain Scale 0-10')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText('Search metrics by name, description, or key...')
    
    await act(async () => {
      await user.type(searchInput, 'pain')
    })
    
    await waitFor(() => {
      expect(screen.getByText('Pain Scale 0-10')).toBeInTheDocument()
      expect(screen.queryByText('Medication Adherence')).not.toBeInTheDocument()
    })
  })

  it('filters metrics by type', async () => {
    const user = userEvent.setup()
    renderWithProviders(<MetricDefinitions />)
    
    await waitFor(() => {
      expect(screen.getByText('Pain Scale 0-10')).toBeInTheDocument()
    })

    const filterSelect = screen.getByDisplayValue('All Types')
    
    await act(async () => {
      await user.selectOptions(filterSelect, 'numeric')
    })
    
    await waitFor(() => {
      expect(screen.getByText('Pain Scale 0-10')).toBeInTheDocument()
      expect(screen.queryByText('Medication Adherence')).not.toBeInTheDocument()
    })
  })

  it('opens create modal when add button is clicked', async () => {
    const user = userEvent.setup()
    renderWithProviders(<MetricDefinitions />)
    
    const addButton = screen.getByText('Add New Metric')
    
    await act(async () => {
      await user.click(addButton)
    })
    
    expect(screen.getByText('Edit Metric Definition')).toBeInTheDocument()
  })

  it('handles metric editing', async () => {
    const user = userEvent.setup()
    renderWithProviders(<MetricDefinitions />)
    
    await waitFor(() => {
      expect(screen.getByText('Pain Scale 0-10')).toBeInTheDocument()
    })

    const editButtons = screen.getAllByLabelText('Edit metric')
    
    await act(async () => {
      await user.click(editButtons[0])
    })
    
    expect(screen.getByText('Edit Metric Definition')).toBeInTheDocument()
  })

  it('handles metric deletion', async () => {
    const user = userEvent.setup()
    
    // Mock window.confirm to return true
    const originalConfirm = window.confirm
    window.confirm = vi.fn(() => true)
    
    renderWithProviders(<MetricDefinitions />)
    
    await waitFor(() => {
      expect(screen.getByText('Pain Scale 0-10')).toBeInTheDocument()
    })

    const deleteButtons = screen.getAllByLabelText('Delete metric')
    
    await act(async () => {
      await user.click(deleteButtons[0])
    })
    
    expect(mockAxiosInstance.delete).toHaveBeenCalledWith(
      expect.stringContaining('metric-definitions/1')
    )
    
    // Restore original confirm
    window.confirm = originalConfirm
  })

  it('displays standardized coding information for standardized metrics', async () => {
    renderWithProviders(<MetricDefinitions />)
    
    await waitFor(() => {
      expect(screen.getByText('Medication Adherence')).toBeInTheDocument()
    })

    // Check for standardized codes section
    expect(screen.getByText('Standardized Codes')).toBeInTheDocument()
    expect(screen.getByText('LOINC: LA6115-6')).toBeInTheDocument()
    expect(screen.getByText('SNOMED: 182840001')).toBeInTheDocument()
    expect(screen.getByText('ICD-10: Z91.14')).toBeInTheDocument()
  })

  it('displays metric type badges', async () => {
    renderWithProviders(<MetricDefinitions />)
    
    await waitFor(() => {
      expect(screen.getByText('Pain Scale 0-10')).toBeInTheDocument()
    })

    // Check for type labels (not uppercase)
    expect(screen.getByText('Numeric')).toBeInTheDocument()
    expect(screen.getByText('Ordinal')).toBeInTheDocument()
  })

  it('displays metric ranges for numeric metrics', async () => {
    renderWithProviders(<MetricDefinitions />)
    
    await waitFor(() => {
      expect(screen.getByText('Pain Scale 0-10')).toBeInTheDocument()
    })

    // Check for range display
    expect(screen.getByText('Range')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
  })

  it('shows empty state when no metrics exist', async () => {
    // Override mock to return empty array
    mockAxiosInstance.get.mockImplementation((url) => {
      if (url.includes('metric-definitions')) {
        return Promise.resolve({ data: [] })
      }
      return Promise.resolve({ data: [] })
    })

    renderWithProviders(<MetricDefinitions />)
    
    await waitFor(() => {
      expect(screen.getByText('No metric definitions yet')).toBeInTheDocument()
    })

    expect(screen.getByText('Create your first metric definition to get started')).toBeInTheDocument()
    expect(screen.getByText('Create First Metric')).toBeInTheDocument()
  })

  it('shows no results message when search has no matches', async () => {
    const user = userEvent.setup()
    renderWithProviders(<MetricDefinitions />)
    
    await waitFor(() => {
      expect(screen.getByText('Pain Scale 0-10')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText('Search metrics by name, description, or key...')
    
    await act(async () => {
      await user.type(searchInput, 'nonexistent')
    })
    
    await waitFor(() => {
      expect(screen.getByText('No matching metrics found')).toBeInTheDocument()
    })

    expect(screen.getByText('Try adjusting your search or filter criteria')).toBeInTheDocument()
  })
})