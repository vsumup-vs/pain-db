import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import Layout from '../../components/Layout'

const renderWithRouter = (ui) => {
  return render(
    <BrowserRouter>
      {ui}
    </BrowserRouter>
  )
}

describe('Layout', () => {
  it('renders without crashing', () => {
    renderWithRouter(
      <Layout>
        <div>Test Content</div>
      </Layout>
    )
    
    expect(screen.getByText('ClinMetrics Pro')).toBeInTheDocument()
  })

  it('renders navigation items', () => {
    renderWithRouter(
      <Layout>
        <div>Test Content</div>
      </Layout>
    )
    
    // Use getAllByText to handle multiple instances (mobile + desktop)
    expect(screen.getAllByText('Dashboard')).toHaveLength(2)
    expect(screen.getAllByText('Patients')).toHaveLength(2)
    expect(screen.getAllByText('Clinicians')).toHaveLength(2)
    expect(screen.getAllByText('Condition Presets')).toHaveLength(2)
    expect(screen.getAllByText('Metric Definitions')).toHaveLength(2)
    expect(screen.getAllByText('Assessment Templates')).toHaveLength(2)
  })

  it('renders children content', () => {
    renderWithRouter(
      <Layout>
        <div>Test Content</div>
      </Layout>
    )
    
    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  it('highlights active navigation item for dashboard', () => {
    // Mock window.location.pathname
    Object.defineProperty(window, 'location', {
      value: { pathname: '/' },
      writable: true
    })
    
    renderWithRouter(
      <Layout>
        <div>Test Content</div>
      </Layout>
    )
    
    // Get all dashboard links and check the first one (desktop)
    const dashboardLinks = screen.getAllByText('Dashboard')
    const dashboardLink = dashboardLinks[0].closest('a')
    expect(dashboardLink).toHaveClass('bg-gray-100', 'text-gray-900')
  })

  it('shows inactive styling for non-current navigation items', () => {
    // Mock window.location.pathname
    Object.defineProperty(window, 'location', {
      value: { pathname: '/' },
      writable: true
    })
    
    renderWithRouter(
      <Layout>
        <div>Test Content</div>
      </Layout>
    )
    
    // Get all patient links and check the first one (desktop)
    const patientLinks = screen.getAllByText('Patients')
    const patientLink = patientLinks[0].closest('a')
    expect(patientLink).toHaveClass('text-gray-600')
  })
})