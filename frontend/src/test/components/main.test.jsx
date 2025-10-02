import React from 'react'
import { render } from '@testing-library/react'
import { vi } from 'vitest'

// Mock ReactDOM with both default and named exports
const mockRender = vi.fn()
const mockCreateRoot = vi.fn(() => ({
  render: mockRender
}))

vi.mock('react-dom/client', () => ({
  default: {
    createRoot: mockCreateRoot
  },
  createRoot: mockCreateRoot
}))

// Mock App component
vi.mock('../../App', () => ({
  default: () => <div data-testid="app">App Component</div>
}))

describe('main.jsx', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock document.getElementById
    global.document.getElementById = vi.fn(() => ({
      id: 'root'
    }))
  })

  it('should render the app with all providers', async () => {
    // Import main.jsx to trigger the render
    await import('../../main.jsx')
    
    // Verify that createRoot was called
    expect(mockCreateRoot).toHaveBeenCalledTimes(1)
    expect(mockRender).toHaveBeenCalledTimes(1)
    
    // Get the rendered component
    const renderedComponent = mockRender.mock.calls[0][0]
    
    // Render it to test the structure
    const { container } = render(renderedComponent)
    
    // Check that it contains the expected providers and components
    expect(container.querySelector('[data-testid="app"]')).toBeTruthy()
  })
})