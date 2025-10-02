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
import Patients from '../../pages/Patients'
import axios from 'axios'

describe('Patients', () => {
  let mockAxiosInstance

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Get the mocked axios instance
    mockAxiosInstance = axios.create()
    
    // Setup mock responses
    mockAxiosInstance.get.mockResolvedValue({
      data: {
        data: [
          {
            id: 1,
            firstName: 'John',
            lastName: 'Doe',
            email: 'test.patient@example.com',
            dateOfBirth: '1990-01-01',
            phone: '555-0123',
            mrn: 'MRN001',
            createdAt: '2024-01-01T00:00:00Z'
          }
        ],
        pagination: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1
        }
      }
    })

    mockAxiosInstance.post.mockResolvedValue({
      data: { id: 2, firstName: 'Jane', lastName: 'Smith' }
    })

    mockAxiosInstance.put.mockResolvedValue({
      data: { id: 1, firstName: 'John Updated', lastName: 'Doe' }
    })

    mockAxiosInstance.delete.mockResolvedValue({
      data: { success: true }
    })
  })

  it('renders patients page', async () => {
    renderWithProviders(<Patients />)
    
    await waitFor(() => {
      expect(screen.getByText('Patients')).toBeInTheDocument()
    }, { timeout: 3000 })
    
    await waitFor(() => {
      expect(screen.getByText('Manage patient information and medical records')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('displays loading state', () => {
    // Mock loading state by returning a promise that never resolves
    mockAxiosInstance.get.mockImplementation(() => new Promise(resolve => 
      setTimeout(() => resolve({
        data: [],
        pagination: { total: 0, page: 1, limit: 10 }
      }), 100))
    )
    
    renderWithProviders(<Patients />)
    
    // Check for loading spinner by looking for the animate-spin class
    const loadingElements = screen.getAllByRole('generic')
    const hasSpinner = loadingElements.some(el => el.className.includes('animate-spin'))
    expect(hasSpinner).toBe(true)
  })

  it('allows searching patients', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Patients />)
    
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Search patients by name, email, or MRN...')
      expect(searchInput).toBeInTheDocument()
    }, { timeout: 3000 })
    
    const searchInput = screen.getByPlaceholderText('Search patients by name, email, or MRN...')
    
    // Use a simpler approach for typing
    await user.clear(searchInput)
    await user.type(searchInput, 'John')
    
    // Wait for the value to be set
    await waitFor(() => {
      expect(searchInput).toHaveValue('John')
    }, { timeout: 3000 })
  })

  it('displays patient information', async () => {
    renderWithProviders(<Patients />)
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    }, { timeout: 3000 })
    
    await waitFor(() => {
      expect(screen.getByText('test.patient@example.com')).toBeInTheDocument()
    }, { timeout: 3000 })
  })
})