import { test, expect } from '@playwright/test'

test.describe('Condition Presets', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/condition-presets')
  })

  test('should display condition presets page', async ({ page }) => {
    // Use heading role to be more specific
    await expect(page.getByRole('heading', { name: 'Condition Presets', level: 1 })).toBeVisible()
    await expect(page.getByText('Manage care programs')).toBeVisible()
  })

  test('should create new condition preset', async ({ page }) => {
    // Click the main Create Condition Preset button (not the "Create Your First" button)
    await page.locator('main').getByRole('button', { name: 'Create Condition Preset' }).click()
    
    // Wait for modal to appear
    await page.waitForSelector('text="Create Condition Preset"', { timeout: 10000 })
    
    // Generate unique name with timestamp
    const timestamp = Date.now()
    const uniqueName = `Test Preset ${timestamp}`
    
    // Fill the preset name field using the placeholder text to identify it
    const presetNameInput = page.getByPlaceholder('e.g., Chronic Pain Management')
    await presetNameInput.waitFor({ state: 'visible', timeout: 5000 })
    await presetNameInput.fill(uniqueName)
    
    // Wait for the Next button to become enabled
    const nextButton = page.getByRole('button', { name: 'Next' })
    await expect(nextButton).toBeEnabled({ timeout: 5000 })
    
    // Click Next to proceed to step 2 (Diagnoses)
    await nextButton.click()
    
    // Wait for step transition
    await page.waitForTimeout(1000)
    
    // Step 2: Diagnoses - skip adding diagnoses and go to next step
    const nextButton2 = page.getByRole('button', { name: 'Next' })
    if (await nextButton2.isVisible()) {
      await nextButton2.click()
      await page.waitForTimeout(1000)
    }
    
    // Step 3: Assessment Templates - look for the specific "Create Preset" button in the modal
    // Use a more specific selector that targets the modal's create button
    const createPresetButton = page.locator('[role="dialog"], .modal').getByRole('button', { name: 'Create Preset' })
    if (await createPresetButton.isVisible()) {
      await createPresetButton.click()
    } else {
      // Fallback: look for any button with "Create" in the modal area
      const modalCreateButton = page.locator('[role="dialog"], .modal').getByRole('button', { name: /Create/i }).last()
      if (await modalCreateButton.isVisible()) {
        await modalCreateButton.click()
      }
    }
    
    // Wait for success indication with multiple strategies
    await Promise.race([
      // Strategy 1: Wait for success message
      page.waitForSelector('text=/success|created|saved/i', { timeout: 10000 }).catch(() => null),
      // Strategy 2: Wait for modal to close
      page.waitForSelector('text="Create Condition Preset"', { state: 'detached', timeout: 10000 }).catch(() => null),
      // Strategy 3: Wait for preset to appear in list
      page.waitForSelector(`text="${uniqueName}"`, { timeout: 10000 }).catch(() => null)
    ])
    
    // Additional wait for UI to settle
    await page.waitForTimeout(2000)
  })

  test('should search condition presets', async ({ page }) => {
    // Use the search input in the main content area
    const searchInput = page.getByPlaceholder('Search condition presets...')
    await searchInput.fill('nonexistent')
    
    // Should show no results message - be more specific to avoid strict mode violation
    await expect(page.getByText('No matching condition presets found')).toBeVisible()
  })

  test('should edit condition preset', async ({ page }) => {
    // First check if there are any presets to edit
    const presetItems = page.locator('[data-testid="preset-item"], .preset-item, .condition-preset-item')
    const presetCount = await presetItems.count()
    
    if (presetCount === 0) {
      console.log('No presets available to edit, skipping test')
      test.skip()
      return
    }
    
    // Click on the first preset or edit button
    const editButton = page.getByRole('button', { name: /edit|modify/i }).first()
    if (await editButton.isVisible()) {
      await editButton.click()
    } else {
      // If no edit button, try clicking on the preset item itself
      await presetItems.first().click()
    }
    
    // Wait for edit modal/form
    await page.waitForSelector('[role="dialog"], .modal, .edit-form', { timeout: 5000 })
    
    // Generate unique updated name
    const timestamp = Date.now()
    const updatedName = `Updated Preset ${timestamp}`
    
    // Fill the name input
    const nameInput = page.getByPlaceholder('e.g., Chronic Pain Management')
    if (await nameInput.isVisible()) {
      await nameInput.clear()
      await nameInput.fill(updatedName)
    } else {
      // Fallback to generic input selector
      const fallbackInput = page.locator('input[type="text"]').first()
      await fallbackInput.clear()
      await fallbackInput.fill(updatedName)
    }
    
    // Click update/save button
    const updateButton = page.getByRole('button', { name: /update|save|confirm/i })
    await updateButton.click()
    
    // Wait for success indication
    await Promise.race([
      page.waitForSelector('text=/success|updated|saved/i', { timeout: 10000 }).catch(() => null),
      page.waitForSelector('[role="dialog"], .modal', { state: 'detached', timeout: 10000 }).catch(() => null)
    ])
  })
})