import { test, expect } from '@playwright/test'

test.describe('Patients', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/patients')
  })

  test('should display patients page', async ({ page }) => {
    await expect(page.getByText('Patients')).toBeVisible()
    await expect(page.getByText('Add Patient')).toBeVisible()
  })

  test('should create new patient', async ({ page }) => {
    await page.getByText('Add Patient').click()
    
    await expect(page.getByText('Add New Patient')).toBeVisible()
    
    await page.fill('input[name="firstName"]', 'John')
    await page.fill('input[name="lastName"]', 'Doe')
    await page.fill('input[name="email"]', 'john.doe@test.com')
    await page.fill('input[name="phone"]', '555-0123')
    await page.fill('input[name="dateOfBirth"]', '1990-01-01')
    
    await page.getByText('Add Patient').click()
    
    await expect(page.getByText('Patient created successfully')).toBeVisible()
  })

  test('should search patients', async ({ page }) => {
    await page.fill('input[placeholder*="Search patients"]', 'John')
    
    await page.waitForTimeout(500)
    
    const patients = page.locator('[data-testid="patient-card"]')
    await expect(patients.first()).toBeVisible()
  })

  test('should view patient details', async ({ page }) => {
    await page.locator('[data-testid="view-patient"]').first().click()
    
    await expect(page.getByText('Patient Details')).toBeVisible()
    await expect(page.getByText('Enrollments')).toBeVisible()
    await expect(page.getByText('Observations')).toBeVisible()
  })
})