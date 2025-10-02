import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'

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
import Dashboard from '../../pages/Dashboard'
import axios from 'axios'

describe('Dashboard', () => {
  let mockAxiosInstance

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Get the mocked axios instance
    mockAxiosInstance = axios.create()
    
    // Setup mock responses - note that the API service extracts response.data automatically
    mockAxiosInstance.get.mockImplementation((url) => {
      if (url.includes('patients/stats')) {
        return Promise.resolve({
          data: {
            total: 150,
            totalObservations: 1250
          }
        })
      }
      if (url.includes('clinicians/stats')) {
        return Promise.resolve({
          data: {
            active: 25
          }
        })
      }
      if (url.includes('alerts/stats')) {
        return Promise.resolve({
          data: {
            active: 8
          }
        })
      }
      if (url.includes('patients/recent')) {
        return Promise.resolve({
          data: [
            {
              id: 1,
              firstName: 'John',
              lastName: 'Doe',
              mrn: 'MRN001',
              createdAt: '2024-01-01T10:00:00Z'
            },
            {
              id: 2,
              firstName: 'Jane',
              lastName: 'Smith',
              mrn: 'MRN002',
              createdAt: '2024-01-02T11:00:00Z'
            }
          ]
        })
      }
      if (url.includes('alerts/recent')) {
        return Promise.resolve({
          alerts: [
            {
              id: 1,
              status: 'open',
              createdAt: '2024-01-01T12:00:00Z',
              triggeredAt: '2024-01-01T12:00:00Z',
              rule: {
                name: 'High Pain Score',
                severity: 'high'
              },
              enrollment: {
                patient: { 
                  firstName: 'John', 
                  lastName: 'Doe',
                  mrn: 'MRN001'
                }
              },
              facts: {
                trigger: 'Patient John Doe reported pain level 9/10',
                painLevel: 9,
                patientMrn: 'MRN001'
              }
            }
          ]
        })
      }
      
      return Promise.resolve({ data: [] })
    })
  })

  it('renders dashboard header', async () => {
    renderWithProviders(<Dashboard />)
    
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
    }, { timeout: 3000 })
    
    expect(screen.getByText('Welcome to ClinMetrics Pro - Precision Healthcare Analytics. Empower your clinical team with data-driven insights and streamlined patient care')).toBeInTheDocument()
  })

  it('displays statistics cards', async () => {
    renderWithProviders(<Dashboard />)
    
    await waitFor(() => {
      expect(screen.getByText('Total Patients')).toBeInTheDocument()
      expect(screen.getByText('150')).toBeInTheDocument()
    }, { timeout: 3000 })
    
    await waitFor(() => {
      expect(screen.getByText('Active Clinicians')).toBeInTheDocument()
      expect(screen.getByText('25')).toBeInTheDocument()
    }, { timeout: 3000 })
    
    await waitFor(() => {
      expect(screen.getByText('Active Alerts')).toBeInTheDocument()
      expect(screen.getByText('8')).toBeInTheDocument()
    }, { timeout: 3000 })
    
    await waitFor(() => {
      expect(screen.getByText('Total Observations')).toBeInTheDocument()
      expect(screen.getByText('1,250')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('displays recent patients section', async () => {
    renderWithProviders(<Dashboard />)
    
    await waitFor(() => {
      expect(screen.getByText('Recent Patients')).toBeInTheDocument()
    }, { timeout: 3000 })
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('displays recent alerts section', async () => {
    renderWithProviders(<Dashboard />)
    
    await waitFor(() => {
      expect(screen.getByText('Recent Alerts')).toBeInTheDocument()
    }, { timeout: 3000 })
    
    await waitFor(() => {
      expect(screen.getByText('High Pain Score')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('shows loading states for individual cards', async () => {
    // Mock delayed responses to test loading states
    mockAxiosInstance.get.mockImplementation((url) => {
      return new Promise(resolve => setTimeout(() => {
        if (url.includes('patients/stats')) {
          return resolve({ data: { total: 150, totalObservations: 1250 } })
        }
        if (url.includes('clinicians/stats')) {
          return resolve({ data: { active: 25 } })
        }
        if (url.includes('alerts/stats')) {
          return resolve({ data: { active: 8 } })
        }
        if (url.includes('patients/recent')) {
          return resolve({ data: [] })
        }
        if (url.includes('alerts/recent')) {
          return resolve({ alerts: [] })
        }
        return resolve({ data: [] })
      }, 100))
    })
    
    renderWithProviders(<Dashboard />)
    
    // Check for loading skeleton in stat cards
    const loadingElements = screen.getAllByRole('generic')
    const hasLoadingSkeleton = loadingElements.some(el => el.className.includes('animate-pulse'))
    expect(hasLoadingSkeleton).toBe(true)
  })

  it('shows empty state when no recent data', async () => {
    // Mock empty responses
    mockAxiosInstance.get.mockImplementation((url) => {
      if (url.includes('patients/stats')) {
        return Promise.resolve({ data: { total: 150, totalObservations: 1250 } })
      }
      if (url.includes('clinicians/stats')) {
        return Promise.resolve({ data: { active: 25 } })
      }
      if (url.includes('alerts/stats')) {
        return Promise.resolve({ data: { active: 8 } })
      }
      if (url.includes('patients/recent')) {
        return Promise.resolve({ data: [] })
      }
      if (url.includes('alerts/recent')) {
        return Promise.resolve({ alerts: [] })
      }
      
      return Promise.resolve({ data: [] })
    })

    renderWithProviders(<Dashboard />)
    
    await waitFor(() => {
      expect(screen.getByText('No recent patients')).toBeInTheDocument()
    }, { timeout: 5000 })
  })

  it('displays trend indicators', async () => {
    renderWithProviders(<Dashboard />)
    
    // Wait for the statistics to load first
    await waitFor(() => {
      expect(screen.getByText('Total Patients')).toBeInTheDocument()
    }, { timeout: 3000 })
    
    // Then check for trend indicators
    await waitFor(() => {
      expect(screen.getByText('12%')).toBeInTheDocument()
      expect(screen.getByText('5%')).toBeInTheDocument()
      expect(screen.getByText('8%')).toBeInTheDocument()
      expect(screen.getByText('23%')).toBeInTheDocument()
    }, { timeout: 3000 })
    
    // Check for "vs last month" text
    const vsLastMonthElements = screen.getAllByText('vs last month')
    expect(vsLastMonthElements.length).toBeGreaterThan(0)
  })

  it('has navigation links', async () => {
    renderWithProviders(<Dashboard />)
    
    await waitFor(() => {
      const viewAllLinks = screen.getAllByRole('link', { name: /view all/i })
      expect(viewAllLinks.length).toBeGreaterThan(0)
      
      viewAllLinks.forEach(link => {
        expect(link).toHaveAttribute('href')
      })
    }, { timeout: 3000 })
  })

  it('displays patient and alert counts in headers', async () => {
    renderWithProviders(<Dashboard />)
    
    await waitFor(() => {
      expect(screen.getByText('Recent Patients')).toBeInTheDocument()
      expect(screen.getByText('Recent Alerts')).toBeInTheDocument()
    }, { timeout: 3000 })
  })
})