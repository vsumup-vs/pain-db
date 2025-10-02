import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock axios before any imports that might use it
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
import Enrollments from '../../pages/Enrollments'
import axios from 'axios'

describe('Enrollments', () => {
  let mockAxiosInstance

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Get the mocked axios instance
    mockAxiosInstance = axios.create()
    
    // Setup mock responses
    mockAxiosInstance.get.mockImplementation((url) => {
      if (url.includes('enrollments')) {
        return Promise.resolve({
          data: {
            data: [
              {
                id: 1,
                status: 'active',
                startDate: '2024-01-01',
                endDate: '2024-12-31',
                patient: {
                  id: 1,
                  firstName: 'John',
                  lastName: 'Doe',
                  email: 'john.doe@example.com'
                },
                clinician: {
                  id: 1,
                  firstName: 'Dr. Sarah',
                  lastName: 'Johnson'
                }
              },
              {
                id: 2,
                status: 'paused',
                startDate: '2024-01-15',
                endDate: '2024-06-15',
                patient: {
                  id: 2,
                  firstName: 'Jane',
                  lastName: 'Wilson',
                  email: 'jane.wilson@example.com'
                },
                clinician: {
                  id: 2,
                  firstName: 'Dr. Michael',
                  lastName: 'Brown'
                }
              }
            ]
          }
        })
      }
      
      if (url.includes('patients')) {
        return Promise.resolve({
          data: {
            data: [
              { id: 1, firstName: 'John', lastName: 'Doe', email: 'john.doe@example.com' },
              { id: 2, firstName: 'Jane', lastName: 'Wilson', email: 'jane.wilson@example.com' }
            ]
          }
        })
      }
      
      if (url.includes('clinicians')) {
        return Promise.resolve({
          data: {
            data: [
              { id: 1, firstName: 'Dr. Sarah', lastName: 'Johnson' },
              { id: 2, firstName: 'Dr. Michael', lastName: 'Brown' }
            ]
          }
        })
      }
      
      if (url.includes('condition-presets')) {
        return Promise.resolve({
          data: {
            data: [
              { id: 1, name: 'Chronic Pain Management', description: 'Standard chronic pain protocol' }
            ]
          }
        })
      }
      
      return Promise.resolve({ data: { data: [] } })
    })

    mockAxiosInstance.post.mockResolvedValue({
      data: { id: 3, status: 'active' }
    })

    mockAxiosInstance.put.mockResolvedValue({
      data: { id: 1, status: 'paused' }
    })
  })

  it('renders enrollments page with correct title', async () => {
    renderWithProviders(<Enrollments />)
    
    expect(screen.getByText('Enrollments')).toBeInTheDocument()
    expect(screen.getByText('Manage patient enrollments and care programs')).toBeInTheDocument()
  })

  it('displays enrollments list', async () => {
    renderWithProviders(<Enrollments />)
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Jane Wilson')).toBeInTheDocument()
    })
  })

  it('opens create enrollment modal when New Enrollment button is clicked', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Enrollments />)
    
    const newButton = screen.getByText('New Enrollment')
    await user.click(newButton)
    
    await waitFor(() => {
      expect(screen.getByText('Create New Enrollment')).toBeInTheDocument()
    })
  })

  it('opens bulk upload modal when Bulk Upload button is clicked', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Enrollments />)
    
    const bulkButton = screen.getByText('Bulk Upload')
    await user.click(bulkButton)
    
    await waitFor(() => {
      expect(screen.getByText('Bulk Upload Enrollments')).toBeInTheDocument()
    })
  })

  it('filters enrollments by search term', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Enrollments />)
    
    // Wait for initial data to load
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Jane Wilson')).toBeInTheDocument()
    })
    
    // Search for "John"
    const searchInput = screen.getByPlaceholderText('Search enrollments...')
    await user.type(searchInput, 'John')
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.queryByText('Jane Wilson')).not.toBeInTheDocument()
    })
  })

  it('filters enrollments by status', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Enrollments />)
    
    // Wait for initial data to load
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Jane Wilson')).toBeInTheDocument()
    })
    
    // Filter by active status
    const statusSelect = screen.getByDisplayValue('All Status')
    await user.selectOptions(statusSelect, 'active')
    
    await waitFor(() => {
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        expect.stringContaining('enrollments'),
        expect.objectContaining({
          params: expect.objectContaining({
            status: 'active'
          })
        })
      )
    })
  })

  it('shows loading state', () => {
    // Mock loading state
    mockAxiosInstance.get.mockImplementation(() => new Promise(() => {}))
    
    renderWithProviders(<Enrollments />)
    
    expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument()
  })

  it('shows empty state when no enrollments', async () => {
    mockAxiosInstance.get.mockResolvedValue({
      data: { data: [] }
    })
    
    renderWithProviders(<Enrollments />)
    
    await waitFor(() => {
      expect(screen.getByText('No enrollments found')).toBeInTheDocument()
      expect(screen.getByText('Get started by creating your first enrollment.')).toBeInTheDocument()
    })
  })
})