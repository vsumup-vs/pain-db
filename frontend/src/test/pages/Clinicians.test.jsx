import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi } from 'vitest'
import { toast } from 'react-toastify'
import Clinicians from '../../pages/Clinicians'
import { api } from '../../services/api'

// Mock the API
vi.mock('../../services/api', () => ({
  api: {
    getClinicians: vi.fn(),
    createClinician: vi.fn(),
    updateClinician: vi.fn(),
    deleteClinician: vi.fn(),
  }
}))

// Mock react-toastify
vi.mock('react-toastify', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  }
}))

// Mock Modal component
vi.mock('../../components/Modal', () => ({
  default: ({ isOpen, onClose, title, children }) => isOpen ? (
    <div data-testid="modal">
      <div data-testid="modal-title">{title}</div>
      <button data-testid="modal-close" onClick={onClose}>Close</button>
      {children}
    </div>
  ) : null
}))

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { 
      retry: false,
      cacheTime: 0,
      staleTime: 0,
    },
    mutations: { retry: false },
  },
})

const renderWithQueryClient = (ui) => {
  const queryClient = createTestQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  )
}

const mockClinicians = [
  {
    id: 1,
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '555-0123',
    specialization: 'Pain Management',
    specialty: 'Pain Management',
    department: 'Anesthesiology',
    licenseNumber: 'MD123456'
  },
  {
    id: 2,
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@example.com',
    phone: '555-0124',
    specialization: 'Rheumatology',
    specialty: 'Rheumatology',
    department: 'Internal Medicine',
    licenseNumber: 'MD789012'
  }
]

describe('Clinicians', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default mock - return all clinicians for empty search
    api.getClinicians.mockImplementation(({ search } = {}) => {
      if (!search) {
        return Promise.resolve({ data: mockClinicians })
      }
      // Filter based on search term
      const filtered = mockClinicians.filter(clinician =>
        `${clinician.firstName} ${clinician.lastName} ${clinician.email} ${clinician.specialization} ${clinician.department}`
          .toLowerCase()
          .includes(search.toLowerCase())
      )
      return Promise.resolve({ data: filtered })
    })
  })

  it('renders without crashing', async () => {
    renderWithQueryClient(<Clinicians />)
    
    await waitFor(() => {
      expect(screen.getByText('Clinicians')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('displays search input and add button', async () => {
    renderWithQueryClient(<Clinicians />)
    
    await waitFor(() => {
      expect(screen.getByText('Clinicians')).toBeInTheDocument()
    }, { timeout: 3000 })
    
    expect(screen.getByPlaceholderText(/search clinicians by name, specialty, or department/i)).toBeInTheDocument()
    expect(screen.getByText('Add Clinician')).toBeInTheDocument()
  })

  it('displays clinicians list', async () => {
    renderWithQueryClient(<Clinicians />)
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('filters clinicians based on search term', async () => {
    renderWithQueryClient(<Clinicians />)
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    }, { timeout: 3000 })
    
    const searchInput = screen.getByPlaceholderText(/search clinicians by name, specialty, or department/i)
    fireEvent.change(searchInput, { target: { value: 'John' } })
    
    await waitFor(() => {
      expect(api.getClinicians).toHaveBeenCalledWith({ search: 'John' })
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('clears search when clear button is clicked', async () => {
    renderWithQueryClient(<Clinicians />)
    
    // Wait for the component to fully load and display the clinicians list
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    }, { timeout: 3000 })
    
    const searchInput = screen.getByPlaceholderText(/search clinicians by name, specialty, or department/i)
    fireEvent.change(searchInput, { target: { value: 'John' } })
    
    // Wait for the clear button to appear and the search to be processed
    await waitFor(() => {
      expect(searchInput.value).toBe('John')
      // Look for the clear button using a more specific selector
      const clearButtons = screen.getAllByRole('button')
      const clearButton = clearButtons.find(button => 
        button.querySelector('svg') && 
        button.closest('.relative') && 
        button.className.includes('absolute')
      )
      expect(clearButton).toBeInTheDocument()
    }, { timeout: 3000 })
    
    // Find and click the clear button
    const clearButtons = screen.getAllByRole('button')
    const clearButton = clearButtons.find(button => 
      button.querySelector('svg') && 
      button.closest('.relative') && 
      button.className.includes('absolute')
    )
    
    fireEvent.click(clearButton)
    
    // Wait for the input to be cleared and get a fresh reference
    await waitFor(() => {
      const updatedSearchInput = screen.getByPlaceholderText(/search clinicians by name, specialty, or department/i)
      expect(updatedSearchInput.value).toBe('')
    }, { timeout: 3000 })
  })

  it('displays no results message when search returns empty', async () => {
    renderWithQueryClient(<Clinicians />)
    
    await waitFor(() => {
      expect(screen.getByText('Clinicians')).toBeInTheDocument()
    }, { timeout: 3000 })
    
    const searchInput = screen.getByPlaceholderText(/search clinicians by name, specialty, or department/i)
    fireEvent.change(searchInput, { target: { value: 'NonexistentName' } })
    
    await waitFor(() => {
      expect(screen.getByText('No clinicians found')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('opens edit modal when edit button is clicked', async () => {
    renderWithQueryClient(<Clinicians />)
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    }, { timeout: 3000 })
    
    // Find edit button by title attribute
    const editButtons = screen.getAllByTitle('Edit clinician')
    fireEvent.click(editButtons[0])
    
    await waitFor(() => {
      expect(screen.getByTestId('modal')).toBeInTheDocument()
    })
  })

  it('closes modal when close button is clicked', async () => {
    renderWithQueryClient(<Clinicians />)
    
    await waitFor(() => {
      expect(screen.getByText('Clinicians')).toBeInTheDocument()
    }, { timeout: 3000 })
    
    const addButton = screen.getByText('Add Clinician')
    fireEvent.click(addButton)
    
    await waitFor(() => {
      expect(screen.getByTestId('modal')).toBeInTheDocument()
    })
    
    const closeButton = screen.getByTestId('modal-close')
    fireEvent.click(closeButton)
    
    await waitFor(() => {
      expect(screen.queryByTestId('modal')).not.toBeInTheDocument()
    })
  })

  it('displays loading state initially', () => {
    api.getClinicians.mockImplementation(() => new Promise(() => {})) // Never resolves
    
    renderWithQueryClient(<Clinicians />)
    
    // Should show loading spinner, not the title yet
    expect(screen.queryByText('Clinicians')).not.toBeInTheDocument()
  })

  it('opens create modal when Add Clinician button is clicked', async () => {
    renderWithQueryClient(<Clinicians />)
    
    await waitFor(() => {
      expect(screen.getByText('Clinicians')).toBeInTheDocument()
    }, { timeout: 3000 })
    
    const addButton = screen.getByText('Add Clinician')
    fireEvent.click(addButton)
    
    expect(screen.getByTestId('modal')).toBeInTheDocument()
  })

  it('displays empty state when no clinicians exist', async () => {
    api.getClinicians.mockResolvedValue({ data: [] })
    
    renderWithQueryClient(<Clinicians />)
    
    await waitFor(() => {
      expect(screen.getByText('No clinicians yet')).toBeInTheDocument()
      expect(screen.getByText('Get started by adding your first clinician to the system.')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('handles API error gracefully', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    api.getClinicians.mockRejectedValue(new Error('API Error'))
    
    renderWithQueryClient(<Clinicians />)
    
    await waitFor(() => {
      expect(screen.getByText(/Error loading clinicians/i)).toBeInTheDocument()
    }, { timeout: 3000 })
    
    consoleError.mockRestore()
  })
})