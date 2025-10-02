import { test, expect } from '@playwright/test'

test.describe('Assessment Templates', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/assessment-templates')
  })

  test('should display assessment templates page', async ({ page }) => {
    await expect(page.getByText('Assessment Templates')).toBeVisible()
    await expect(page.getByText('Create Template')).toBeVisible()
  })

  test('should create new assessment template', async ({ page }) => {
    await page.getByText('Create Template').click()
    
    await expect(page.getByText('Create Assessment Template')).toBeVisible()
    
    await page.fill('input[name="name"]', 'Test Assessment Template')
    await page.fill('textarea[name="description"]', 'Test description for assessment template')
    
    await page.getByText('Create Template').click()
    
    await expect(page.getByText('Assessment template created successfully')).toBeVisible()
  })

  test('should search assessment templates', async ({ page }) => {
    await page.fill('input[placeholder*="Search templates"]', 'Pain')
    
    // Wait for search results
    await page.waitForTimeout(500)
    
    // Should show filtered results
    const templates = page.locator('[data-testid="template-card"]')
    await expect(templates.first()).toBeVisible()
  })

  test('should filter templates by type', async ({ page }) => {
    await page.selectOption('select', 'standardized')
    
    // Wait for filter to apply
    await page.waitForTimeout(500)
    
    // Should show only standardized templates
    const standardizedBadges = page.locator('text=Standardized')
    await expect(standardizedBadges.first()).toBeVisible()
  })

  test('should edit assessment template', async ({ page }) => {
    // Click on first template's edit button
    await page.locator('[data-testid="edit-template"]').first().click()
    
    await expect(page.getByText('Edit Assessment Template')).toBeVisible()
    
    await page.fill('input[name="name"]', 'Updated Template Name')
    await page.getByText('Update Template').click()
    
    await expect(page.getByText('Assessment template updated successfully')).toBeVisible()
  })

  test('should preview assessment template', async ({ page }) => {
    await page.locator('[data-testid="preview-template"]').first().click()
    
    await expect(page.getByText('Template Preview')).toBeVisible()
    await expect(page.getByText('Metrics')).toBeVisible()
  })
})