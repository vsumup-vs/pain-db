import { test, expect } from '@playwright/test'

// Configure tests to run in serial mode to share context
test.describe.configure({ mode: 'serial' })

// Shared context and page
let sharedContext
let sharedPage

async function ensurePageStability(page, timeout = 20000) {
  try {
    if (page.isClosed()) {
      throw new Error('Page is closed')
    }
    
    // Wait for network to be idle
    await page.waitForLoadState('networkidle', { timeout })
    
    // Wait for any pending JavaScript
    await page.waitForTimeout(1000)
    
    // Check if page is still responsive
    await page.evaluate(() => document.readyState)
    
    console.log('✓ Page stability ensured')
  } catch (error) {
    console.log(`Page stability check failed: ${error.message}`)
    throw error
  }
}

async function checkPageState(page, context = '') {
  try {
    if (page.isClosed()) {
      throw new Error(`Page is closed during ${context}`)
    }
    
    const url = page.url()
    console.log(`Page state check (${context}): ${url}`)
    
    return true
  } catch (error) {
    console.log(`Page state check failed (${context}): ${error.message}`)
    throw error
  }
}

async function closeModals(page) {
  try {
    if (page.isClosed()) {
      return
    }

    // Look for modal containers and close them
    const modalSelectors = [
      '.fixed.inset-0.z-50',
      '.modal',
      '[role="dialog"]'
    ]

    for (const selector of modalSelectors) {
      try {
        const modals = page.locator(selector)
        const count = await modals.count()
        
        for (let i = 0; i < count; i++) {
          const modal = modals.nth(i)
          if (await modal.isVisible()) {
            // Try to find and click close button
            const closeButton = modal.locator('button').filter({ hasText: /×|Close|Cancel/ }).first()
            if (await closeButton.isVisible({ timeout: 2000 })) {
              await closeButton.click()
              await page.waitForTimeout(500)
            } else {
              // Try clicking the backdrop
              const backdrop = modal.locator('.bg-gray-500.bg-opacity-75').first()
              if (await backdrop.isVisible({ timeout: 2000 })) {
                await backdrop.click()
                await page.waitForTimeout(500)
              }
            }
          }
        }
      } catch (error) {
        // Continue with next selector
      }
    }

    // Press Escape as fallback
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)
    
    console.log('✓ Modals closed')
  } catch (error) {
    console.log(`Modal closing failed: ${error.message}`)
  }
}

async function enhancedClick(page, selectors, description = 'element') {
  const selectorArray = Array.isArray(selectors) ? selectors : [selectors]
  
  for (const selector of selectorArray) {
    try {
      const element = page.locator(selector).first()
      
      if (await element.isVisible({ timeout: 10000 })) {
        await element.scrollIntoViewIfNeeded()
        await element.click({ timeout: 10000 })
        console.log(`✓ Successfully clicked ${description} with selector: ${selector}`)
        return true
      }
    } catch (error) {
      console.log(`Failed to click ${description} with selector ${selector}: ${error.message}`)
    }
  }
  
  throw new Error(`Failed to click ${description} with any selector`)
}

async function enhancedFill(page, selectors, value, description = 'field') {
  const selectorArray = Array.isArray(selectors) ? selectors : [selectors]
  
  for (const selector of selectorArray) {
    try {
      const element = page.locator(selector).first()
      
      if (await element.isVisible({ timeout: 10000 })) {
        await element.scrollIntoViewIfNeeded()
        await element.fill(value)
        console.log(`✓ Successfully filled ${description} with selector: ${selector}`)
        return true
      }
    } catch (error) {
      console.log(`Failed to fill ${description} with selector ${selector}: ${error.message}`)
    }
  }
  
  throw new Error(`Failed to fill ${description} with any selector`)
}

async function waitForModal(page, timeout = 15000) {
  try {
    if (page.isClosed()) {
      throw new Error('Page is closed')
    }

    // Wait for the specific modal structure from Modal.jsx
    const modalContainer = page.locator('.fixed.inset-0.z-50.overflow-y-auto').first()
    await modalContainer.waitFor({ state: 'visible', timeout })
    
    const modalContent = modalContainer.locator('.relative.bg-white.rounded-lg.shadow-xl').first()
    await modalContent.waitFor({ state: 'visible', timeout: 5000 })
    
    console.log('✓ Modal detected and visible')
    return modalContent
  } catch (error) {
    console.log(`Modal detection failed: ${error.message}`)
    
    // Debug: Check what's actually on the page
    const allModals = await page.locator('.fixed, .modal, [role="dialog"]').count()
    console.log(`Debug: Found ${allModals} potential modal elements`)
    
    throw error
  }
}

test.describe('Assessment Templates', () => {
  test.beforeAll(async ({ browser }) => {
    console.log('=== Setting up shared context ===')
    sharedContext = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      ignoreHTTPSErrors: true,
    })
    
    sharedPage = await sharedContext.newPage()
    
    // Enhanced error handling for page events
    sharedPage.on('pageerror', (error) => {
      console.log(`Page error: ${error.message}`)
    })
    
    sharedPage.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.log(`Console error: ${msg.text()}`)
      }
    })
    
    // Navigate to assessment templates page
    await sharedPage.goto('/assessment-templates', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    })
    
    await ensurePageStability(sharedPage)
    console.log('=== Shared context setup completed ===')
  })

  test.afterAll(async () => {
    console.log('=== Cleaning up shared context ===')
    try {
      if (sharedPage && !sharedPage.isClosed()) {
        await sharedPage.close()
      }
      if (sharedContext) {
        await sharedContext.close()
      }
    } catch (error) {
      console.log(`Cleanup error: ${error.message}`)
    }
    console.log('=== Cleanup completed ===')
  })

  test.afterEach(async () => {
    console.log('=== Test cleanup ===')
    try {
      if (sharedPage && !sharedPage.isClosed()) {
        await closeModals(sharedPage)
        await checkPageState(sharedPage, 'CLEANUP')
      }
    } catch (error) {
      console.log(`Cleanup error: ${error.message}`)
    }
    console.log('=== Test cleanup completed ===')
  })

  test('should display assessment templates page structure', async () => {
    console.log('Testing page structure...')
    await ensurePageStability(sharedPage)
    
    // Check main heading
    const heading = sharedPage.locator('h1:has-text("Assessment Templates")')
    await expect(heading).toBeVisible({ timeout: 10000 })
    
    // Use more robust selector for tab navigation
    const tabNavigation = sharedPage.locator('nav:has(button:has-text("All Templates"))')
    await expect(tabNavigation).toBeVisible({ timeout: 10000 })
    
    // Check individual tabs with more specific selectors
    const allTemplatesTab = sharedPage.locator('button:has-text("All Templates")')
    await expect(allTemplatesTab).toBeVisible()
    
    const standardizedTab = sharedPage.locator('button:has-text("Standardized")')
    await expect(standardizedTab).toBeVisible()
    
    // Use more specific selector for Custom tab to avoid matching "Create Custom Template"
    const customTab = sharedPage.locator('nav button:has-text("Custom")')  // Scoped to nav element
    await expect(customTab).toBeVisible()
    
    // Check create button with exact text match
    const createButton = sharedPage.locator('button', { hasText: 'Create Custom Template' })  // Exact text match
    await expect(createButton).toBeVisible()

    console.log('Page structure test completed successfully')
  })

  test('should navigate between tabs', async () => {
    console.log('Testing tab navigation...')
    
    if (sharedPage.isClosed()) {
      throw new Error('Shared page is closed')
    }
    
    await ensurePageStability(sharedPage)

    // Use the same specific selector as in the structure test
    const tabContainer = sharedPage.locator('div.border-b.border-gray-200').first()
    const tabNavigation = tabContainer.locator('nav.-mb-px.flex.space-x-8').first()
    
    // Test Standardized tab
    const standardizedTab = tabContainer.locator('button').filter({ hasText: 'Standardized' }).first()
    if (await standardizedTab.isVisible({ timeout: 10000 })) {
      await standardizedTab.click({ timeout: 10000 })
      await sharedPage.waitForTimeout(2000)
      console.log('✓ Successfully clicked Standardized tab')
    }

    // Test Custom tab
    const customTab = tabContainer.locator('button').filter({ hasText: 'Custom' }).first()
    if (await customTab.isVisible({ timeout: 10000 })) {
      await customTab.click({ timeout: 10000 })
      await sharedPage.waitForTimeout(2000)
      console.log('✓ Successfully clicked Custom tab')
    }

    // Test All Templates tab
    const allTemplatesTab = tabContainer.locator('button').filter({ hasText: 'All Templates' }).first()
    if (await allTemplatesTab.isVisible({ timeout: 10000 })) {
      await allTemplatesTab.click({ timeout: 10000 })
      await sharedPage.waitForTimeout(2000)
      console.log('✓ Successfully clicked All Templates tab')
    }

    console.log('✓ Tab navigation test completed')
  })

  test('should open create template modal', async () => {
    console.log('Testing create template modal...')
    
    if (sharedPage.isClosed()) {
      throw new Error('Shared page is closed')
    }
    
    await ensurePageStability(sharedPage)
    await closeModals(sharedPage)

    try {
      // Click create button with enhanced error handling
      const createButton = sharedPage.locator('button').filter({ hasText: 'Create Custom Template' }).first()
      
      if (await createButton.isVisible({ timeout: 15000 })) {
        console.log('✓ Create button found, clicking...')
        await createButton.click({ timeout: 10000 })
        console.log('✓ Clicked create button')
        
        // Wait for modal with enhanced detection
        await sharedPage.waitForTimeout(2000)
        
        try {
          const modal = await waitForModal(sharedPage, 20000)
          console.log('✓ Create template modal opened successfully')
          
          // Verify modal content using the correct structure
          const modalTitle = modal.locator('h3.text-lg.font-medium.text-gray-900').filter({ hasText: 'Create Assessment Template' }).first()
          await expect(modalTitle).toBeVisible({ timeout: 10000 })
          
          // Verify form elements are present
          const nameField = modal.locator('input[name="name"], input[placeholder*="name" i]').first()
          await expect(nameField).toBeVisible({ timeout: 5000 })
          
          console.log('✓ Modal content verified')
          
          // Close modal for cleanup
          await closeModals(sharedPage)
          await sharedPage.waitForTimeout(1000)
          
        } catch (modalError) {
          console.log(`Modal detection failed: ${modalError.message}`)
          
          // Enhanced debugging
          await sharedPage.screenshot({ path: 'modal-debug.png', fullPage: true })
          
          // Check page state
          await checkPageState(sharedPage, 'MODAL_ERROR')
          
          throw modalError
        }
        
      } else {
        throw new Error('Create button not found')
      }
    } catch (error) {
      console.log(`Create modal test failed: ${error.message}`)
      
      // Take screenshot for debugging
      await sharedPage.screenshot({ path: 'create-modal-error.png', fullPage: true })
      
      throw error
    }
  })

  test('should handle modal form interactions', async () => {
    console.log('Testing modal form interactions...')
    
    if (sharedPage.isClosed()) {
      throw new Error('Shared page is closed')
    }
    
    await ensurePageStability(sharedPage)
    await closeModals(sharedPage)

    try {
      // Open modal
      const createButton = sharedPage.locator('button').filter({ hasText: 'Create Custom Template' }).first()
      await createButton.click({ timeout: 10000 })
      
      const modal = await waitForModal(sharedPage, 15000)
      
      // Test form interactions
      const nameField = modal.locator('input[name="name"], input[placeholder*="name" i]').first()
      await nameField.fill('Test Template')
      
      const descriptionField = modal.locator('textarea[name="description"], textarea[placeholder*="description" i]').first()
      if (await descriptionField.isVisible({ timeout: 5000 })) {
        await descriptionField.fill('Test description')
      }
      
      console.log('✓ Form fields filled successfully')
      
      // Close modal
      await closeModals(sharedPage)
      
    } catch (error) {
      console.log(`Modal form test failed: ${error.message}`)
      await sharedPage.screenshot({ path: 'modal-form-error.png', fullPage: true })
      throw error
    }
  })
})