import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi } from 'vitest'
import AlertRuleForm from '../../components/AlertRuleForm'
import { api } from '../../services/api'

// Mock the API
vi.mock('../../services/api', () => ({
  api: {
    getAlertRuleTemplates: vi.fn(),
  }
}))

// Mock child components
vi.mock('../../components/RuleTester', () => ({
  default: ({ rule, onTest }) => (
    <div data-testid="rule-tester">
      <button onClick={() => onTest(rule)} data-testid="test-rule">Test Rule</button>
    </div>
  )
}))

vi.mock('../../components/RuleBuilder', () => ({
  default: ({ onExpressionChange, onValidationChange }) => (
    <div data-testid="rule-builder">
      <button 
        onClick={() => {
          onExpressionChange('test_expression')
          onValidationChange(true)
        }}
        data-testid="build-rule"
      >
        Build Rule
      </button>
    </div>
  )
}))

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
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

const mockTemplates = [
  {
    id: 1,
    name: 'High Pain Alert',
    category: 'Pain Management',
    description: 'Alert when pain level exceeds threshold',
    expression: 'pain_scale_0_10 > 7',
    severity: 'high'
  },
  {
    id: 2,
    name: 'Medication Adherence',
    category: 'Medication',
    description: 'Alert for poor medication adherence',
    expression: 'medication_adherence_rate < 0.8',
    severity: 'medium'
  }
]

describe('AlertRuleForm', () => {
  const mockOnSubmit = vi.fn()
  const mockOnCancel = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    api.getAlertRuleTemplates.mockResolvedValue({ data: mockTemplates })
  })

  it('renders without crashing', () => {
    renderWithQueryClient(
      <AlertRuleForm 
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isLoading={false}
      />
    )
    
    expect(screen.getByText('Create Alert Rule')).toBeInTheDocument()
  })

  it('renders form fields', () => {
    renderWithQueryClient(
      <AlertRuleForm 
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isLoading={false}
      />
    )
    
    expect(screen.getByLabelText(/rule name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/severity/i)).toBeInTheDocument()
  })

  it('displays severity options', () => {
    renderWithQueryClient(
      <AlertRuleForm 
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isLoading={false}
      />
    )
    
    const severitySelect = screen.getByLabelText(/severity/i)
    expect(severitySelect).toBeInTheDocument()
    
    // Check that all options exist in the select
    expect(screen.getByRole('option', { name: 'Low' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Medium' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'High' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Critical' })).toBeInTheDocument()
  })

  it('shows rule builder by default', () => {
    renderWithQueryClient(
      <AlertRuleForm 
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isLoading={false}
      />
    )
    
    // Should show visual builder initially
    expect(screen.getByTestId('rule-builder')).toBeInTheDocument()
  })

  it('can toggle between visual builder and manual expression', () => {
    renderWithQueryClient(
      <AlertRuleForm 
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isLoading={false}
      />
    )
    
    // Should show visual builder initially
    expect(screen.getByTestId('rule-builder')).toBeInTheDocument()
    
    // Toggle to manual expression
    const toggleButton = screen.getByText(/manual entry/i)
    fireEvent.click(toggleButton)
    
    // Should show manual expression inputs (condition, operator, etc.)
    expect(screen.getByLabelText(/condition/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/operator/i)).toBeInTheDocument()
  })

  it('shows rule tester when test button is clicked', () => {
    renderWithQueryClient(
      <AlertRuleForm 
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isLoading={false}
      />
    )
    
    const testButton = screen.getByText(/test rule/i)
    fireEvent.click(testButton)
    
    expect(screen.getByTestId('rule-tester')).toBeInTheDocument()
  })

  it('loads and displays templates', async () => {
    renderWithQueryClient(
      <AlertRuleForm 
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isLoading={false}
      />
    )
    
    const templatesButton = screen.getByText(/use template/i)
    fireEvent.click(templatesButton)
    
    await waitFor(() => {
      expect(screen.getByText('High Pain Alert')).toBeInTheDocument()
      expect(screen.getByText('Medication Adherence')).toBeInTheDocument()
    })
  })

  it('calls onCancel when cancel button is clicked', () => {
    renderWithQueryClient(
      <AlertRuleForm 
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isLoading={false}
      />
    )
    
    const cancelButton = screen.getByText('Cancel')
    fireEvent.click(cancelButton)
    
    expect(mockOnCancel).toHaveBeenCalledTimes(1)
  })

  it('populates form when editing existing rule', () => {
    const existingRule = {
      id: 1,
      name: 'Test Rule',
      expression: 'pain_scale_0_10 > 5',
      severity: 'medium',
      isActive: true
    }
    
    renderWithQueryClient(
      <AlertRuleForm 
        rule={existingRule}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isLoading={false}
      />
    )
    
    expect(screen.getByDisplayValue('Test Rule')).toBeInTheDocument()
  })

  it('disables submit button when loading', () => {
    renderWithQueryClient(
      <AlertRuleForm 
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isLoading={true}
      />
    )
    
    const submitButton = screen.getByRole('button', { name: /saving|create rule|update rule/i })
    expect(submitButton).toBeDisabled()
  })
})