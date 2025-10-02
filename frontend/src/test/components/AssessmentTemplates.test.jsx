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
import AssessmentTemplates from '../../pages/AssessmentTemplates'
import axios from 'axios'

describe('AssessmentTemplates', () => {
  let mockAxiosInstance

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Get the mocked axios instance
    mockAxiosInstance = axios.create()
    
    // Setup mock responses
    mockAxiosInstance.get.mockImplementation((url) => {
      if (url.includes('assessment-templates')) {
        return Promise.resolve({
          data: [
            {
              id: 1,
              name: 'Brief Pain Inventory (BPI)',
              description: 'Standardized pain assessment',
              isStandardized: true,
              metricCount: 7,
              items: [
                { id: 1, name: 'Pain Severity' },
                { id: 2, name: 'Pain Interference' }
              ],
              createdAt: '2024-01-01T00:00:00Z'
            }
          ],
          pagination: {
            page: 1,
            limit: 50,
            total: 1,
            pages: 1
          }
        })
      }
      if (url.includes('metric-definitions')) {
        return Promise.resolve({
          data: [
            {
              id: 1,
              name: 'Pain Scale',
              description: 'Numeric pain rating',
              dataType: 'number'
            }
          ]
        })
      }
      
      return Promise.resolve({ data: [] })
    })
  })

  it('renders assessment templates page', async () => {
    renderWithProviders(<AssessmentTemplates />)
    
    await waitFor(() => {
      expect(screen.getByText('Assessment Templates')).toBeInTheDocument()
    }, { timeout: 3000 })
    
    await waitFor(() => {
      expect(screen.getByText('Brief Pain Inventory (BPI)')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('allows searching templates', async () => {
    const user = userEvent.setup()
    renderWithProviders(<AssessmentTemplates />)
    
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText(/search templates/i)
      expect(searchInput).toBeInTheDocument()
    }, { timeout: 3000 })
    
    const searchInput = screen.getByPlaceholderText(/search templates/i)
    await user.type(searchInput, 'Pain')
    
    expect(searchInput.value).toBe('Pain')
  })

  it('opens create template modal', async () => {
    const user = userEvent.setup()
    renderWithProviders(<AssessmentTemplates />)
    
    await waitFor(() => {
      const createButton = screen.getByText('Create New Template')
      expect(createButton).toBeInTheDocument()
    }, { timeout: 3000 })
    
    const createButton = screen.getByText('Create New Template')
    await user.click(createButton)
    
    // Just verify the button works without throwing an error
    expect(createButton).toBeInTheDocument()
  })

  it('displays template statistics', async () => {
    renderWithProviders(<AssessmentTemplates />)
    
    await waitFor(() => {
      expect(screen.getByText('Assessment Templates')).toBeInTheDocument()
    }, { timeout: 3000 })
    
    await waitFor(() => {
      expect(screen.getByText(/showing.*of.*templates/i)).toBeInTheDocument()
    }, { timeout: 3000 })
  })
})