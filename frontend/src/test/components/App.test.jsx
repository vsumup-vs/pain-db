import React from 'react'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi } from 'vitest'
import App from '../../App'

// Mock all the page components
vi.mock('../../pages/Dashboard', () => ({
  default: () => <div data-testid="dashboard">Dashboard Page</div>
}))

vi.mock('../../pages/Patients', () => ({
  default: () => <div data-testid="patients">Patients Page</div>
}))

vi.mock('../../pages/Clinicians', () => ({
  default: () => <div data-testid="clinicians">Clinicians Page</div>
}))

vi.mock('../../pages/ConditionPresets', () => ({
  default: () => <div data-testid="condition-presets">Condition Presets Page</div>
}))

vi.mock('../../pages/MetricDefinitions', () => ({
  default: () => <div data-testid="metric-definitions">Metric Definitions Page</div>
}))

vi.mock('../../pages/AssessmentTemplatesEnhanced', () => ({
  default: () => <div data-testid="assessment-templates">Assessment Templates Page</div>
}))

vi.mock('../../pages/Observations', () => ({
  default: () => <div data-testid="observations">Observations Page</div>
}))

vi.mock('../../pages/Alerts', () => ({
  default: () => <div data-testid="alerts">Alerts Page</div>
}))

vi.mock('../../pages/AlertRules', () => ({
  default: () => <div data-testid="alert-rules">Alert Rules Page</div>
}))

vi.mock('../../pages/Enrollments', () => ({
  default: () => <div data-testid="enrollments">Enrollments Page</div>
}))

vi.mock('../../pages/EnrollmentDetails', () => ({
  default: () => <div data-testid="enrollment-details">Enrollment Details Page</div>
}))

vi.mock('../../components/Layout', () => ({
  default: ({ children }) => <div data-testid="layout">{children}</div>
}))

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
})

const renderWithProviders = (ui, { route = '/' } = {}) => {
  window.history.pushState({}, 'Test page', route)
  
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <BrowserRouter>
        {ui}
      </BrowserRouter>
    </QueryClientProvider>
  )
}

describe('App', () => {
  it('renders without crashing', () => {
    renderWithProviders(<App />)
    expect(screen.getByTestId('layout')).toBeInTheDocument()
  })

  it('renders Dashboard on root route', () => {
    renderWithProviders(<App />, { route: '/' })
    expect(screen.getByTestId('dashboard')).toBeInTheDocument()
  })

  it('renders Patients page on /patients route', () => {
    renderWithProviders(<App />, { route: '/patients' })
    expect(screen.getByTestId('patients')).toBeInTheDocument()
  })

  it('renders Clinicians page on /clinicians route', () => {
    renderWithProviders(<App />, { route: '/clinicians' })
    expect(screen.getByTestId('clinicians')).toBeInTheDocument()
  })

  it('renders Condition Presets page on /condition-presets route', () => {
    renderWithProviders(<App />, { route: '/condition-presets' })
    expect(screen.getByTestId('condition-presets')).toBeInTheDocument()
  })

  it('renders Metric Definitions page on /metric-definitions route', () => {
    renderWithProviders(<App />, { route: '/metric-definitions' })
    expect(screen.getByTestId('metric-definitions')).toBeInTheDocument()
  })

  it('renders Assessment Templates page on /assessment-templates route', () => {
    renderWithProviders(<App />, { route: '/assessment-templates' })
    expect(screen.getByTestId('assessment-templates')).toBeInTheDocument()
  })

  it('renders Observations page on /observations route', () => {
    renderWithProviders(<App />, { route: '/observations' })
    expect(screen.getByTestId('observations')).toBeInTheDocument()
  })

  it('renders Alerts page on /alerts route', () => {
    renderWithProviders(<App />, { route: '/alerts' })
    expect(screen.getByTestId('alerts')).toBeInTheDocument()
  })

  it('renders Alert Rules page on /alert-rules route', () => {
    renderWithProviders(<App />, { route: '/alert-rules' })
    expect(screen.getByTestId('alert-rules')).toBeInTheDocument()
  })

  it('renders Enrollments page on /enrollments route', () => {
    renderWithProviders(<App />, { route: '/enrollments' })
    expect(screen.getByTestId('enrollments')).toBeInTheDocument()
  })

  it('renders Enrollment Details page on /enrollments/:id route', () => {
    renderWithProviders(<App />, { route: '/enrollments/123' })
    expect(screen.getByTestId('enrollment-details')).toBeInTheDocument()
  })
})