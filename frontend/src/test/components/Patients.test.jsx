import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock the API service directly
vi.mock('../../../services/api', () => ({
  api: {
    getPatients: vi.fn(),
    createPatient: vi.fn(),
    updatePatient: vi.fn(),
    deletePatient: vi.fn(),
    getPatientsStats: vi.fn()
  }
}))

import { renderWithProviders } from '../utils'
import Patients from '../../pages/Patients'
import { api } from '../../../services/api'

describe('Patients', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup default mock responses - API returns {data: [...]}
    api.getPatients.mockResolvedValue({
      data: [
        {
          id: 1,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          phone: '555-0123',
          mrn: 'MRN001',
          dateOfBirth: '1990-01-15',
          gender: 'male',
          address: '123 Main St, Anytown, ST 12345'
        },
        {
          id: 2,
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane.smith@example.com',
          phone: '555-0456',
          mrn: 'MRN002',
          dateOfBirth: '1985-05-20',
          gender: 'female',
          address: '456 Oak Ave, Somewhere, ST 67890'
        }
      ],
      pagination: {
        page: 1,
        pages: 1,
        total: 2
      }
    })

    api.createPatient.mockResolvedValue({
      data: { id: 3, firstName: 'New', lastName: 'Patient' }
    })

    api.updatePatient.mockResolvedValue({ success: true })
    api.deletePatient.mockResolvedValue({ success: true })
    api.getPatientsStats.mockResolvedValue({
      data: { total: 2, totalObservations: 10 }
    })
  })

  it('renders patients page', async () => {
    renderWithProviders(<Patients />)
    
    await waitFor(() => {
      expect(screen.getByText('Patients')).toBeInTheDocument()
      expect(screen.getByText('Manage patient information and medical records')).toBeInTheDocument()
    })
  })

  it('displays patients data', async () => {
    renderWithProviders(<Patients />)
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument()
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      expect(screen.getByText('jane.smith@example.com')).toBeInTheDocument()
      expect(screen.getByText('MRN: MRN001')).toBeInTheDocument()
      expect(screen.getByText('MRN: MRN002')).toBeInTheDocument()
    })
  })

  it('displays loading state', async () => {
    // Mock a pending promise for loading state
    api.getPatients.mockReturnValue(new Promise(() => {}))
    
    renderWithProviders(<Patients />)
    
    // Check for loading spinner
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('displays empty state when no patients', async () => {
    api.getPatients.mockResolvedValue({
      data: [],
      pagination: { page: 1, pages: 1, total: 0 }
    })
    
    renderWithProviders(<Patients />)
    
    await waitFor(() => {
      expect(screen.getByText('No patients found')).toBeInTheDocument()
      expect(screen.getByText('Get started by adding your first patient.')).toBeInTheDocument()
      expect(screen.getByText('Add First Patient')).toBeInTheDocument()
    })
  })

  it('opens add patient modal', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Patients />)
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    // Click the "Add Patient" button
    const addPatientButton = screen.getByText('Add Patient')
    await user.click(addPatientButton)
    
    // Modal should open
    await waitFor(() => {
      expect(screen.getByText('Add Patient')).toBeInTheDocument()
    })
  })

  it('searches patients', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Patients />)
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    // Search for "John"
    const searchInput = screen.getByPlaceholderText('Search patients by name, email, or MRN...')
    await user.type(searchInput, 'John')
    
    // API should be called with search parameter
    expect(api.getPatients).toHaveBeenCalledWith({ search: 'John' })
  })

  it('clears search when X button is clicked', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Patients />)
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    // Search for something first
    const searchInput = screen.getByPlaceholderText('Search patients by name, email, or MRN...')
    await user.type(searchInput, 'John')
    
    // Click the clear button (X)
    const clearButton = screen.getByRole('button', { name: '' }) // X button has no text
    await user.click(clearButton)
    
    // Search input should be cleared
    expect(searchInput.value).toBe('')
  })

  it('displays patient information correctly', async () => {
    renderWithProviders(<Patients />)
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    // Check that patient details are displayed
    expect(screen.getByText('555-0123')).toBeInTheDocument()
    expect(screen.getByText('1/15/1990')).toBeInTheDocument()
    expect(screen.getByText('123 Main St, Anytown, ST 12345')).toBeInTheDocument()
    expect(screen.getByText('male')).toBeInTheDocument()
  })

  it('handles patient creation', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Patients />)
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    // Open add patient modal
    const addPatientButton = screen.getByText('Add Patient')
    await user.click(addPatientButton)
    
    await waitFor(() => {
      expect(screen.getByText('Add Patient')).toBeInTheDocument()
    })

    // Fill out form (simplified)
    const firstNameInput = screen.getByLabelText(/first name/i)
    await user.type(firstNameInput, 'New')
    
    const lastNameInput = screen.getByLabelText(/last name/i)
    await user.type(lastNameInput, 'Patient')
    
    const emailInput = screen.getByLabelText(/email/i)
    await user.type(emailInput, 'new.patient@example.com')
    
    // Submit form
    const submitButton = screen.getByRole('button', { name: /add patient/i })
    await user.click(submitButton)
    
    expect(api.createPatient).toHaveBeenCalled()
  })

  it('handles API errors gracefully', async () => {
    api.getPatients.mockRejectedValue(new Error('API Error'))
    
    renderWithProviders(<Patients />)
    
    // The component should handle errors gracefully
    await waitFor(() => {
      expect(screen.getByText('Patients')).toBeInTheDocument()
    })
  })

  it('displays search results count', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Patients />)
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    // Search for something
    const searchInput = screen.getByPlaceholderText('Search patients by name, email, or MRN...')
    await user.type(searchInput, 'John')
    
    // Should show search results info
    await waitFor(() => {
      expect(screen.getByText(/Searching for "John"/)).toBeInTheDocument()
    })
  })

  it('opens edit patient modal', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Patients />)
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    // Find and click edit button (pencil icon)
    const editButtons = screen.getAllByRole('button')
    const editButton = editButtons.find(button => 
      button.querySelector('svg') && 
      button.closest('.bg-white.rounded-2xl') // Inside patient card
    )
    
    if (editButton) {
      await user.click(editButton)
      
      // Modal should open with edit title
      await waitFor(() => {
        expect(screen.getByText('Edit Patient')).toBeInTheDocument()
      })
    }
  })
})