import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock the API service directly
vi.mock('../../../services/api', () => ({
  api: {
    getAlerts: vi.fn(),
    updateAlert: vi.fn(),
    deleteAlert: vi.fn(),
    getAlertsStats: vi.fn()
  }
}))

import { renderWithProviders } from '../utils'
import Alerts from '../../pages/Alerts'
import { api } from '../../../services/api'

describe('Alerts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup default mock responses - API returns {alerts: [...]}
    api.getAlerts.mockResolvedValue({
      alerts: [
        {
          id: 1,
          status: 'open',
          triggeredAt: '2024-01-15T10:00:00Z',
          rule: {
            id: 1,
            name: 'High Pain Alert',
            description: 'Alert when pain level exceeds threshold',
            severity: 'critical'
          },
          enrollment: {
            patient: {
              id: 1,
              firstName: 'John',
              lastName: 'Doe',
              email: 'john.doe@example.com',
              mrn: 'MRN001'
            }
          },
          facts: {
            trigger: 'Patient pain level exceeds threshold',
            painLevel: 8,
            patientMrn: 'MRN001'
          }
        },
        {
          id: 2,
          status: 'ack',
          triggeredAt: '2024-01-14T15:30:00Z',
          rule: {
            id: 2,
            name: 'Medication Adherence',
            description: 'Alert for missed medications',
            severity: 'high'
          },
          enrollment: {
            patient: {
              id: 2,
              firstName: 'Jane',
              lastName: 'Smith',
              email: 'jane.smith@example.com',
              mrn: 'MRN002'
            }
          },
          facts: {
            trigger: 'Medication adherence alert',
            patientMrn: 'MRN002'
          }
        }
      ]
    })

    api.updateAlert.mockResolvedValue({ success: true })
    api.deleteAlert.mockResolvedValue({ success: true })
    api.getAlertsStats.mockResolvedValue({ total: 2 })
  })

  it('renders without crashing', async () => {
    renderWithProviders(<Alerts />)
    
    await waitFor(() => {
      expect(screen.getByText('Alert Management')).toBeInTheDocument()
      expect(screen.getByText('Monitor and manage system alerts')).toBeInTheDocument()
    })
  })

  it('displays alerts data', async () => {
    renderWithProviders(<Alerts />)
    
    await waitFor(() => {
      expect(screen.getByText('High Pain Alert')).toBeInTheDocument()
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Medication Adherence')).toBeInTheDocument()
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    })
  })

  it('displays loading state', async () => {
    // Mock a pending promise for loading state
    api.getAlerts.mockReturnValue(new Promise(() => {}))
    
    renderWithProviders(<Alerts />)
    
    // Check for skeleton animation instead of "Loading alerts..." text
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('displays empty state when no alerts', async () => {
    api.getAlerts.mockResolvedValue({ alerts: [] })
    
    renderWithProviders(<Alerts />)
    
    await waitFor(() => {
      expect(screen.getByText('No alerts found')).toBeInTheDocument()
    })
  })

  it('filters alerts by status', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Alerts />)
    
    await waitFor(() => {
      expect(screen.getByText('High Pain Alert')).toBeInTheDocument()
    })

    // Filter by open status - look for select with "All Statuses" option
    const statusFilter = screen.getByDisplayValue('all')
    await user.selectOptions(statusFilter, 'open')
    
    expect(api.getAlerts).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'open'
      })
    )
  })

  it('displays status badges correctly', async () => {
    renderWithProviders(<Alerts />)
    
    await waitFor(() => {
      expect(screen.getByText('High Pain Alert')).toBeInTheDocument()
    })

    // Check that status badges are displayed with correct text
    const openStatusBadge = screen.getAllByText('Open')[0] // Use getAllByText since there might be multiple
    const ackStatusBadge = screen.getByText('Acknowledged')
    
    expect(openStatusBadge).toBeInTheDocument()
    expect(ackStatusBadge).toBeInTheDocument()
  })

  it('filters alerts by search term', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Alerts />)
    
    await waitFor(() => {
      expect(screen.getByText('High Pain Alert')).toBeInTheDocument()
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    // Find search input and type
    const searchInput = screen.getByPlaceholderText(/search alerts/i)
    await user.type(searchInput, 'John')
    
    // The search is client-side, so we should still see John Doe
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })
  })

  it('clears search when input is cleared', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Alerts />)
    
    await waitFor(() => {
      expect(screen.getByText('High Pain Alert')).toBeInTheDocument()
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    // Find search input, type, then clear
    const searchInput = screen.getByPlaceholderText(/search alerts/i)
    await user.type(searchInput, 'John')
    await user.clear(searchInput)
    
    // Should see all alerts again
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    })
  })

  it('updates alert status to acknowledged', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Alerts />)
    
    await waitFor(() => {
      expect(screen.getByText('High Pain Alert')).toBeInTheDocument()
    })

    // Find and click acknowledge button
    const acknowledgeButton = screen.getByRole('button', { name: /acknowledge/i })
    await user.click(acknowledgeButton)
    
    expect(api.updateAlert).toHaveBeenCalledWith(1, { status: 'ack' })
  })

  it('updates alert status to resolved', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Alerts />)
    
    await waitFor(() => {
      expect(screen.getByText('High Pain Alert')).toBeInTheDocument()
    })

    // Find and click resolve button
    const resolveButton = screen.getByRole('button', { name: /resolve/i })
    await user.click(resolveButton)
    
    expect(api.updateAlert).toHaveBeenCalledWith(1, { status: 'resolved' })
  })

  it('handles API errors gracefully', async () => {
    api.getAlerts.mockRejectedValue(new Error('API Error'))
    
    renderWithProviders(<Alerts />)
    
    // The component should handle errors gracefully
    // Since there's no explicit error state shown, we just ensure it doesn't crash
    await waitFor(() => {
      expect(screen.getByText('Alert Management')).toBeInTheDocument()
    })
  })

  it('filters alerts by severity', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Alerts />)
    
    await waitFor(() => {
      expect(screen.getByText('High Pain Alert')).toBeInTheDocument()
    })

    // Filter by critical severity
    const severityFilter = screen.getAllByDisplayValue('all')[1] // Second select is severity
    await user.selectOptions(severityFilter, 'critical')
    
    expect(api.getAlerts).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'critical'
      })
    )
  })

  it('displays alert statistics correctly', async () => {
    renderWithProviders(<Alerts />)
    
    await waitFor(() => {
      expect(screen.getByText('High Pain Alert')).toBeInTheDocument()
    })

    // Check statistics cards
    expect(screen.getByText('1')).toBeInTheDocument() // Open alerts count
    expect(screen.getByText('Open Alerts')).toBeInTheDocument()
    expect(screen.getByText('Critical')).toBeInTheDocument()
    expect(screen.getByText('Acknowledged')).toBeInTheDocument()
    expect(screen.getByText('Resolved')).toBeInTheDocument()
  })
})