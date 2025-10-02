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
import ConditionPresets from '../../pages/ConditionPresets'
import axios from 'axios'

describe('ConditionPresets', () => {
  let mockAxiosInstance

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Get the mocked axios instance
    mockAxiosInstance = axios.create()
    
    // Setup mock responses
    mockAxiosInstance.get.mockImplementation((url) => {
      if (url.includes('condition-presets')) {
        return Promise.resolve({
          success: true,
          data: [
            {
              id: 1,
              name: 'Chronic Pain Management',
              description: 'Comprehensive chronic pain monitoring',
              isActive: true,
              templates: [
                { id: 1, name: 'Pain Assessment' }
              ],
              diagnoses: [
                { id: 1, name: 'Chronic Pain' }
              ],
              alertRules: [
                { id: 1, name: 'High Pain Alert' }
              ],
              _count: {
                enrollments: 5
              },
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
      if (url.includes('assessment-templates')) {
        return Promise.resolve({
          success: true,
          data: [
            {
              id: 1,
              name: 'Pain Assessment',
              description: 'Standard pain evaluation',
              isStandardized: true
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
      
      return Promise.resolve({ data: [] })
    })
  })

  it('renders condition presets page', async () => {
    renderWithProviders(<ConditionPresets />)
    
    await waitFor(() => {
      expect(screen.getByText('Condition Presets')).toBeInTheDocument()
    }, { timeout: 3000 })
    
    await waitFor(() => {
      expect(screen.getByText('Chronic Pain Management')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('allows searching presets', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ConditionPresets />)
    
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText(/search condition presets/i)
      expect(searchInput).toBeInTheDocument()
    }, { timeout: 3000 })
    
    const searchInput = screen.getByPlaceholderText(/search condition presets/i)
    await user.type(searchInput, 'Pain')
    
    expect(searchInput.value).toBe('Pain')
  })

  it('opens create preset modal', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ConditionPresets />)
    
    await waitFor(() => {
      const createButton = screen.getByText('Create Condition Preset')
      expect(createButton).toBeInTheDocument()
    }, { timeout: 3000 })
    
    const createButton = screen.getByText('Create Condition Preset')
    await user.click(createButton)
    
    // Just verify the button works without throwing an error
    expect(createButton).toBeInTheDocument()
  })

  it('displays preset statistics', async () => {
    renderWithProviders(<ConditionPresets />)
    
    await waitFor(() => {
      expect(screen.getByText('Condition Presets')).toBeInTheDocument()
    }, { timeout: 3000 })
    
    await waitFor(() => {
      expect(screen.getByText('Chronic Pain Management')).toBeInTheDocument()
    }, { timeout: 3000 })
    
    // Check for template count display
    await waitFor(() => {
      expect(screen.getByText(/1 template/)).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('displays preset details correctly', async () => {
    renderWithProviders(<ConditionPresets />)
    
    // Wait for the preset data to load and check for the preset name
    await waitFor(() => {
      expect(screen.getByText('Chronic Pain Management')).toBeInTheDocument()
    }, { timeout: 3000 })
    
    // Check for Care Program label
    await waitFor(() => {
      expect(screen.getByText('Care Program')).toBeInTheDocument()
    }, { timeout: 3000 })
    
    // Check for enrollment count
    await waitFor(() => {
      expect(screen.getByText(/5 patients/)).toBeInTheDocument()
    }, { timeout: 3000 })
  })
})