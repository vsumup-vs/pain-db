// Mock the API service directly instead of axios
vi.mock('../../../services/api', () => ({
  api: {
    getMetricDefinitions: vi.fn(),
    getAssessmentTemplates: vi.fn(),
    createMetricDefinition: vi.fn(),
    updateMetricDefinition: vi.fn(),
    deleteMetricDefinition: vi.fn(),
  }
}))

import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../utils'
import MetricDefinitions from '../../pages/MetricDefinitions'
import { api } from '../../../services/api'

describe('MetricDefinitions', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()
    
    // Configure API mocks to return data directly (simulating the response interceptor)
    api.getMetricDefinitions.mockResolvedValue([
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
    ])

    api.getAssessmentTemplates.mockResolvedValue([
      {
        id: 1,
        name: 'Pain Assessment',
        description: 'Standard pain assessment template'
      }
    ])

    api.createMetricDefinition.mockResolvedValue({
      id: 3, key: 'new_metric', displayName: 'New Metric'
    })

    api.updateMetricDefinition.mockResolvedValue({
      id: 1, key: 'pain_scale', displayName: 'Updated Pain Scale'
    })

    api.deleteMetricDefinition.mockResolvedValue({
      success: true
    })
  })

  it('renders metric definitions page', async () => {
    renderWithProviders(<MetricDefinitions />)
    
    expect(screen.getByText('Metric Definitions')).toBeInTheDocument()
    expect(screen.getByText('Manage and configure metric definitions for patient monitoring')).toBeInTheDocument()
    
    await waitFor(() => {
      expect(screen.getByText('Pain Scale 0-10')).toBeInTheDocument()
      expect(screen.getByText('Medication Adherence')).toBeInTheDocument()
    })
  })

  it('displays search and filter controls', async () => {
    renderWithProviders(<MetricDefinitions />)
    
    expect(screen.getByPlaceholderText('Search metrics by key, name, or description...')).toBeInTheDocument()
    expect(screen.getByDisplayValue('All Types')).toBeInTheDocument()
  })

  it('filters metrics by search term', async () => {
    const user = userEvent.setup()
    renderWithProviders(<MetricDefinitions />)
    
    await waitFor(() => {
      expect(screen.getByText('Pain Scale 0-10')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText('Search metrics by key, name, or description...')
    
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
    
    const addButton = screen.getByText('Create Metric')
    
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
    
    expect(api.deleteMetricDefinition).toHaveBeenCalledWith(1)
    
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
    expect(screen.getByText('0 - 10')).toBeInTheDocument()
  })

  it('shows empty state when no metrics exist', async () => {
    // Override mock to return empty array
    api.getMetricDefinitions.mockResolvedValue([])

    renderWithProviders(<MetricDefinitions />)
    
    await waitFor(() => {
      expect(screen.getByText('No metric definitions')).toBeInTheDocument()
    })

    expect(screen.getByText('Get started by creating your first metric definition.')).toBeInTheDocument()
    expect(screen.getByText('Create First Metric')).toBeInTheDocument()
  })

  it('shows no results message when search has no matches', async () => {
    const user = userEvent.setup()
    renderWithProviders(<MetricDefinitions />)
    
    await waitFor(() => {
      expect(screen.getByText('Pain Scale 0-10')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText('Search metrics by key, name, or description...')
    
    await act(async () => {
      await user.type(searchInput, 'nonexistent')
    })
    
    await waitFor(() => {
      expect(screen.getByText('No matching metrics found')).toBeInTheDocument()
    })

    expect(screen.getByText('Try adjusting your search or filter criteria')).toBeInTheDocument()
  })
})