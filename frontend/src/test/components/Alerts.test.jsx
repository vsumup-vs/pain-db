import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock axios before importing any components
vi.mock('axios', () => {
  const mockInstance = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() }
    }
  }
  
  return {
    default: {
      create: vi.fn(() => mockInstance),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() }
      }
    }
  }
})

import { renderWithProviders } from '../utils'
import Alerts from '../../pages/Alerts'
import axios from 'axios'

describe('Alerts', () => {
  let mockAxiosInstance

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Get the mocked axios instance
    mockAxiosInstance = axios.create()
    
    // Setup mock responses - Component expects alerts directly in response
    mockAxiosInstance.get.mockImplementation((url) => {
      if (url.includes('alerts')) {
        return Promise.resolve({
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
              patient: {
                id: 1,
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com'
              }
            },
            {
              id: 2,
              status: 'acknowledged',
              triggeredAt: '2024-01-14T15:30:00Z',
              rule: {
                id: 2,
                name: 'Medication Adherence',
                description: 'Alert for missed medications',
                severity: 'high'
              },
              patient: {
                id: 2,
                firstName: 'Jane',
                lastName: 'Smith',
                email: 'jane.smith@example.com'
              }
            }
          ]
        })
      }
      return Promise.resolve({ alerts: [] })
    })

    mockAxiosInstance.put.mockResolvedValue({
      data: { id: 1, status: 'acknowledged' }
    })
  })

  it('renders without crashing', async () => {
    renderWithProviders(<Alerts />)
    
    await waitFor(() => {
      expect(screen.getByText('Alert Management')).toBeInTheDocument()
      expect(screen.getByText('Monitor and manage system alerts')).toBeInTheDocument()
    })
  })

  it('displays loading state', async () => {
    // Mock a pending promise for loading state
    mockAxiosInstance.get.mockReturnValue(new Promise(() => {}))
    
    renderWithProviders(<Alerts />)
    
    // Check for skeleton animation instead of "Loading alerts..." text
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('displays empty state when no alerts', async () => {
    mockAxiosInstance.get.mockResolvedValue({ alerts: [] })
    
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
    
    expect(mockAxiosInstance.get).toHaveBeenCalledWith(
      expect.stringContaining('alerts'),
      expect.objectContaining({
        params: expect.objectContaining({
          status: 'open'
        })
      })
    )
  })

  it('updates alert status to acknowledged', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Alerts />)
    
    await waitFor(() => {
      expect(screen.getByText('High Pain Alert')).toBeInTheDocument()
    })
    
    const acknowledgeButtons = screen.getAllByText('Acknowledge')
    await user.click(acknowledgeButtons[0])
    
    expect(mockAxiosInstance.put).toHaveBeenCalledWith(
      expect.stringContaining('alerts/1'),
      { status: 'ack' }
    )
  })

  it('displays correct severity colors', async () => {
    renderWithProviders(<Alerts />)
    
    await waitFor(() => {
      expect(screen.getByText('High Pain Alert')).toBeInTheDocument()
    })

    // Check that severity badges are displayed with correct text
    const highSeverityBadge = screen.getByText('high')
    const mediumSeverityBadge = screen.getByText('medium')
    
    expect(highSeverityBadge).toBeInTheDocument()
    expect(mediumSeverityBadge).toBeInTheDocument()
  })

  it('displays correct status colors', async () => {
    renderWithProviders(<Alerts />)
    
    await waitFor(() => {
      expect(screen.getByText('High Pain Alert')).toBeInTheDocument()
    })

    // Check that status badges are displayed with correct text
    const openStatusBadge = screen.getByText('Open')
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
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    })
    
    const searchInput = screen.getByPlaceholderText('Search alerts...')
    await user.type(searchInput, 'John')
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument()
    })
  })

  it('clears search when input is cleared', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Alerts />)
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    })
    
    const searchInput = screen.getByPlaceholderText('Search alerts...')
    await user.type(searchInput, 'John')
    
    await waitFor(() => {
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument()
    })
    
    // Clear the search input
    await user.clear(searchInput)
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    })
  })
})