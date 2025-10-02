import React from 'react'
import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import { vi } from 'vitest'

// Create a custom render function that includes providers
export function renderWithProviders(ui, options = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  function Wrapper({ children }) {
    return (
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          {children}
          <ToastContainer />
        </BrowserRouter>
      </QueryClientProvider>
    )
  }

  return render(ui, { wrapper: Wrapper, ...options })
}

// Mock API responses
export const mockApiResponses = {
  patients: {
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
    total: 1,
    page: 1,
    limit: 10
  },
  assessmentTemplates: {
    data: [
      {
        id: 1,
        name: 'Brief Pain Inventory (BPI)',
        description: 'Standardized pain assessment',
        isStandardized: true,
        metricCount: 7,
        createdAt: '2024-01-01T00:00:00Z'
      }
    ]
  },
  conditionPresets: [
    {
      id: 1,
      name: 'Chronic Pain Management',
      description: 'Comprehensive chronic pain monitoring',
      createdAt: '2024-01-01T00:00:00Z'
    }
  ]
}

// Create a mock axios instance
export const createMockAxiosInstance = (responses = {}) => ({
  get: vi.fn((url) => {
    const endpoint = url.replace('/api/', '').split('?')[0]
    
    if (responses[endpoint]) {
      return Promise.resolve({ data: responses[endpoint] })
    }
    
    return Promise.resolve({ data: { data: [], total: 0 } })
  }),
  post: vi.fn(() => Promise.resolve({ data: { success: true } })),
  put: vi.fn(() => Promise.resolve({ data: { success: true } })),
  delete: vi.fn(() => Promise.resolve({ data: { success: true } })),
  interceptors: {
    request: { use: vi.fn() },
    response: { use: vi.fn() }
  }
})

// Setup axios mock
export function setupAxiosMock(responses = {}) {
  const mockInstance = createMockAxiosInstance(responses)
  
  // Mock axios module
  vi.doMock('axios', () => ({
    default: {
      create: vi.fn(() => mockInstance),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() }
      }
    },
    create: vi.fn(() => mockInstance)
  }))
  
  return mockInstance
}

// Legacy fetch mock for backward compatibility
export function mockFetch(responses = {}) {
  global.fetch = vi.fn((url) => {
    const endpoint = url.split('/api/')[1]?.split('?')[0]
    
    if (responses[endpoint]) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(responses[endpoint])
      })
    }
    
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ data: [], total: 0 })
    })
  })
}