import { test, expect } from '@playwright/test'

test('simple assessment templates page load', async ({ page }) => {
  await page.goto('/assessment-templates')
  
  // Wait for page to load
  await page.waitForLoadState('networkidle')
  
  // Take a screenshot for debugging
  await page.screenshot({ path: 'debug-assessment-templates.png', fullPage: true })
  
  // Check if there are any error messages
  const errorElements = await page.locator('[class*="error"], [class*="Error"]').count()
  console.log('Error elements found:', errorElements)
  
  // Check if there are any loading indicators - Fixed CSS selector
  const loadingElements = await page.locator('[class*="loading"], [class*="Loading"]').count()
  const loadingTextElements = await page.locator('text="Loading"').count()
  console.log('Loading elements found:', loadingElements + loadingTextElements)
  
  // Get the full page content
  const bodyContent = await page.locator('body').innerHTML()
  console.log('Page HTML length:', bodyContent.length)
  
  // Look for specific elements
  const hasHeader = await page.locator('h1:has-text("Assessment Templates")').count()
  const hasTabs = await page.locator('nav').count()
  const hasButtons = await page.locator('button').count()
  
  console.log('Header found:', hasHeader)
  console.log('Navigation found:', hasTabs)
  console.log('Buttons found:', hasButtons)
  
  // Basic assertions
  expect(hasHeader).toBeGreaterThan(0)
  expect(hasButtons).toBeGreaterThan(0)
})