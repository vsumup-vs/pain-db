import { test, expect } from '@playwright/test'

test('debug server setup', async ({ page }) => {
  console.log('=== Debug Test Starting ===')
  
  // Navigate to the frontend
  await page.goto('/', { waitUntil: 'networkidle', timeout: 30000 })
  
  console.log('Page title:', await page.title())
  console.log('Page URL:', page.url())
  
  // Check if we can reach the API
  try {
    const response = await page.request.get('/api/health')
    console.log('API Health Check Status:', response.status())
    const healthData = await response.json()
    console.log('API Health Data:', healthData)
  } catch (error) {
    console.log('API Health Check Failed:', error.message)
  }
  
  // Try to navigate to assessment templates
  await page.goto('/assessment-templates', { waitUntil: 'networkidle', timeout: 30000 })
  console.log('Assessment Templates URL:', page.url())
  
  // Check what's actually on the page
  const bodyText = await page.locator('body').textContent()
  console.log('Page content preview:', bodyText.substring(0, 500))
  
  // Take a screenshot for debugging
  await page.screenshot({ path: 'debug-screenshot.png', fullPage: true })
  
  console.log('=== Debug Test Completed ===')
})