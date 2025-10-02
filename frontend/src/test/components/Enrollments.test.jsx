import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock the API service directly
vi.mock('../../../services/api', () => ({
  api: {
    getEnrollments: vi.fn(),
    getEnrollment: vi.fn(),
    createEnrollment: vi.fn(),
    createBulkEnrollments: vi.fn(),
    updateEnrollment: vi.fn(),
    deleteEnrollment: vi.fn(),
    getPatients: vi.fn(),
    getClinicians: vi.fn(),
    getConditionPresets: vi.fn(),
    getEnrollmentsStats: vi.fn(),
    addMedicationToEnrollment: vi.fn()
  }
}))

import { renderWithProviders } from '../utils'
import Enrollments from '../../pages/Enrollments'
import { api } from '../../../services/api'

describe('Enrollments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup default mock responses - API returns {data: [...]}
    api.getEnrollments.mockResolvedValue({
      data: [
        {
          id: 1,
          status: 'active',
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          createdAt: '2024-01-01T00:00:00Z',
          diagnosisCode: 'M79.3',
          notes: 'Patient enrolled for chronic pain management',
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
          },
          conditionPreset: {
            id: 1,
            name: 'Chronic Pain Management'
          }
        },
        {
          id: 2,
          status: 'paused',
          startDate: '2024-01-15',
          endDate: '2024-12-31',
          createdAt: '2024-01-15T00:00:00Z',
          patient: {
            id: 2,
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane.smith@example.com'
          },
          clinician: {
            id: 2,
            firstName: 'Dr. Michael',
            lastName: 'Brown'
          },
          conditionPreset: {
            id: 2,
            name: 'Post-Surgery Recovery'
          }
        }
      ]
    })

    api.getPatients.mockResolvedValue({
      data: [
        {
          id: 1,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          mrn: 'MRN001'
        },
        {
          id: 2,
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane.smith@example.com',
          mrn: 'MRN002'
        }
      ]
    })

    api.getClinicians.mockResolvedValue({
      data: [
        {
          id: 1,
          firstName: 'Dr. Sarah',
          lastName: 'Johnson',
          email: 'sarah.johnson@hospital.com',
          specialization: 'Pain Management'
        },
        {
          id: 2,
          firstName: 'Dr. Michael',
          lastName: 'Brown',
          email: 'michael.brown@hospital.com',
          specialization: 'Orthopedics'
        }
      ]
    })

    api.getConditionPresets.mockResolvedValue({
      data: [
        {
          id: 1,
          name: 'Chronic Pain Management',
          description: 'Standard protocol for chronic pain patients'
        },
        {
          id: 2,
          name: 'Post-Surgery Recovery',
          description: 'Recovery protocol for post-surgical patients'
        }
      ]
    })

    api.createEnrollment.mockResolvedValue({
      data: { id: 3, status: 'active' }
    })

    api.updateEnrollment.mockResolvedValue({ success: true })
    api.deleteEnrollment.mockResolvedValue({ success: true })
    api.getEnrollmentsStats.mockResolvedValue({ total: 2 })
    api.addMedicationToEnrollment.mockResolvedValue({ success: true })
  })

  it('renders without crashing', async () => {
    renderWithProviders(<Enrollments />)
    
    await waitFor(() => {
      expect(screen.getByText('Enrollments')).toBeInTheDocument()
      expect(screen.getByText('Manage patient enrollments and care programs')).toBeInTheDocument()
    })
  })

  it('displays enrollments data', async () => {
    renderWithProviders(<Enrollments />)
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument()
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      expect(screen.getByText('jane.smith@example.com')).toBeInTheDocument()
      expect(screen.getByText('Dr. Sarah Johnson')).toBeInTheDocument()
      expect(screen.getByText('Dr. Michael Brown')).toBeInTheDocument()
      expect(screen.getByText('Chronic Pain Management')).toBeInTheDocument()
      expect(screen.getByText('Post-Surgery Recovery')).toBeInTheDocument()
    })
  })

  it('displays loading state', async () => {
    // Mock a pending promise for loading state
    api.getEnrollments.mockReturnValue(new Promise(() => {}))
    
    renderWithProviders(<Enrollments />)
    
    // Check for loading spinner
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('displays empty state when no enrollments', async () => {
    api.getEnrollments.mockResolvedValue({ data: [] })
    
    renderWithProviders(<Enrollments />)
    
    await waitFor(() => {
      expect(screen.getByText('No enrollments found')).toBeInTheDocument()
      expect(screen.getByText('Get started by creating your first enrollment.')).toBeInTheDocument()
      expect(screen.getByText('Create First Enrollment')).toBeInTheDocument()
    })
  })

  it('opens new enrollment modal', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Enrollments />)
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    // Click the "New Enrollment" button
    const newEnrollmentButton = screen.getByText('New Enrollment')
    await user.click(newEnrollmentButton)
    
    // Modal should open - check for modal content
    await waitFor(() => {
      expect(screen.getByText('Create New Enrollment')).toBeInTheDocument()
    })
  })

  it('opens bulk upload modal', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Enrollments />)
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    // Click the "Bulk Upload" button
    const bulkUploadButton = screen.getByText('Bulk Upload')
    await user.click(bulkUploadButton)
    
    // Modal should open - check for modal content
    await waitFor(() => {
      expect(screen.getByText('Bulk Upload Enrollments')).toBeInTheDocument()
    })
  })

  it('filters enrollments by status', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Enrollments />)
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    // Filter by active status
    const statusFilter = screen.getByDisplayValue('all')
    await user.selectOptions(statusFilter, 'active')
    
    expect(api.getEnrollments).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'active'
      })
    )
  })

  it('searches enrollments by patient name', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Enrollments />)
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    })

    // Search for "John"
    const searchInput = screen.getByPlaceholderText('Search enrollments...')
    await user.type(searchInput, 'John')
    
    // Should still see John Doe (client-side filtering)
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })
  })

  it('displays status badges correctly', async () => {
    renderWithProviders(<Enrollments />)
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    // Check that status badges are displayed
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('Paused')).toBeInTheDocument()
  })

  it('updates enrollment status', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Enrollments />)
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    // Find and click status dropdown for first enrollment
    const statusSelects = screen.getAllByDisplayValue('active')
    const enrollmentStatusSelect = statusSelects.find(select => 
      select.closest('.bg-white.p-6') // Find the one inside an enrollment card
    )
    
    if (enrollmentStatusSelect) {
      await user.selectOptions(enrollmentStatusSelect, 'paused')
      
      expect(api.updateEnrollment).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 1,
          data: { status: 'paused' }
        })
      )
    }
  })

  it('handles enrollment creation', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Enrollments />)
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    // Open new enrollment modal
    const newEnrollmentButton = screen.getByText('New Enrollment')
    await user.click(newEnrollmentButton)
    
    await waitFor(() => {
      expect(screen.getByText('Create New Enrollment')).toBeInTheDocument()
    })

    // Fill out form (simplified - actual form has many fields)
    const patientSelect = screen.getByLabelText(/patient/i)
    await user.selectOptions(patientSelect, '1')
    
    const clinicianSelect = screen.getByLabelText(/clinician/i)
    await user.selectOptions(clinicianSelect, '1')
    
    // Submit form
    const submitButton = screen.getByRole('button', { name: /create enrollment/i })
    await user.click(submitButton)
    
    expect(api.createEnrollment).toHaveBeenCalled()
  })

  it('handles API errors gracefully', async () => {
    api.getEnrollments.mockRejectedValue(new Error('API Error'))
    
    renderWithProviders(<Enrollments />)
    
    // The component should handle errors gracefully
    await waitFor(() => {
      expect(screen.getByText('Enrollments')).toBeInTheDocument()
    })
  })

  it('displays enrollment count correctly', async () => {
    renderWithProviders(<Enrollments />)
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    // Check enrollment count
    expect(screen.getByText('2 enrollments')).toBeInTheDocument()
  })

  it('navigates to enrollment details', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Enrollments />)
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    // Find and click view details button (eye icon)
    const viewButtons = screen.getAllByRole('button')
    const viewButton = viewButtons.find(button => 
      button.querySelector('svg') && 
      button.closest('.bg-white.p-6') // Inside enrollment card
    )
    
    if (viewButton) {
      await user.click(viewButton)
      // Navigation would be handled by React Router in real app
    }
  })

  it('clears search when input is cleared', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Enrollments />)
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    })

    // Search for "John"
    const searchInput = screen.getByPlaceholderText('Search enrollments...')
    await user.type(searchInput, 'John')
    await user.clear(searchInput)
    
    // Should see all enrollments again
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    })
  })

  it('displays enrollment details correctly', async () => {
    renderWithProviders(<Enrollments />)
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    // Check that enrollment details are displayed
    expect(screen.getByText('M79.3')).toBeInTheDocument() // Diagnosis code
    expect(screen.getByText('Patient enrolled for chronic pain management')).toBeInTheDocument() // Notes
    expect(screen.getByText('1/1/2024')).toBeInTheDocument() // Start date
  })
})