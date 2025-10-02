import { test, expect } from '@playwright/test'

test.describe('Condition Presets', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/condition-presets')
  })

  test('should display condition presets page', async ({ page }) => {
    await expect(page.getByText('Condition Presets')).toBeVisible()
    await expect(page.getByText('Create Preset')).toBeVisible()
  })

  test('should create new condition preset', async ({ page }) => {
    await page.getByText('Create Preset').click()
    
    await expect(page.getByText('Create Condition Preset')).toBeVisible()
    
    await page.fill('input[name="name"]', 'Test Condition Preset')
    await page.fill('textarea[name="description"]', 'Test description for condition preset')
    
    await page.getByText('Create Preset').click()
    
    await expect(page.getByText('Condition preset created successfully')).toBeVisible()
  })

  test('should search condition presets', async ({ page }) => {
    await page.fill('input[placeholder*="Search presets"]', 'Pain')
    
    await page.waitForTimeout(500)
    
    const presets = page.locator('[data-testid="preset-card"]')
    await expect(presets.first()).toBeVisible()
  })

  test('should edit condition preset', async ({ page }) => {
    await page.locator('[data-testid="edit-preset"]').first().click()
    
    await expect(page.getByText('Edit Condition Preset')).toBeVisible()
    
    await page.fill('input[name="name"]', 'Updated Preset Name')
    await page.getByText('Update Preset').click()
    
    await expect(page.getByText('Condition preset updated successfully')).toBeVisible()
  })
})