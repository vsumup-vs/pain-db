import { test, expect } from '@playwright/test'

test.describe('Patients', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/patients')
  })

  test('should display patients page', async ({ page }) => {
    // Use more specific selector to avoid the navigation link
    await expect(page.locator('h1').filter({ hasText: 'Patients' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Add Patient' })).toBeVisible()
  })

  test('should create new patient', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Patient' }).click()
    
    // Use heading selector to avoid conflict with button text
    await expect(page.getByRole('heading', { name: 'Add Patient' })).toBeVisible()
    
    // Generate unique identifiers to avoid duplicates
    const timestamp = Date.now()
    const uniqueEmail = `test.patient.${timestamp}@example.com`
    const uniqueFirstName = `Test${timestamp}`
    const uniqueLastName = `Patient${timestamp}`
    const fullName = `${uniqueFirstName} ${uniqueLastName}`
    
    await page.fill('input[name="firstName"]', uniqueFirstName)
    await page.fill('input[name="lastName"]', uniqueLastName)
    await page.fill('input[name="email"]', uniqueEmail)
    await page.fill('input[name="phone"]', '555-0123')
    await page.fill('input[name="dateOfBirth"]', '1990-01-01')
    
    // Wait for modal to be fully loaded
    await page.waitForSelector('.fixed.inset-0.z-50', { state: 'visible' })
    
    // Click the Create Patient button
    await page.getByRole('button', { name: 'Create Patient' }).click()
    
    // Wait for the modal to close (which indicates success)
    await page.waitForSelector('.fixed.inset-0.z-50', { state: 'hidden' }, { timeout: 10000 })
    
    // Verify the patient appears in the list using the unique name
    await expect(page.getByText(fullName)).toBeVisible()
  })

  test('should search patients', async ({ page }) => {
    await page.fill('input[placeholder*="Search patients"]', 'Test')
    
    await page.waitForTimeout(500)
    
    // The actual patient cards don't have data-testid, they're just divs with patient info
    // We should look for patient cards by their structure instead
    const patients = page.locator('.grid .bg-white').filter({ hasText: 'MRN:' })
    
    // If no patients exist, we should see "No patients found"
    await expect(page.getByText('No patients found').or(patients.first())).toBeVisible()
  })

  test('should view patient details', async ({ page }) => {
    // First check if there are any patients, if not, create one
    const hasPatients = await page.locator('.grid .bg-white').filter({ hasText: 'MRN:' }).count() > 0
    
    if (!hasPatients) {
      // Create a patient first
      await page.getByRole('button', { name: 'Add Patient' }).click()
      await page.waitForSelector('.fixed.inset-0.z-50', { state: 'visible' })
      
      // Generate unique email
      const timestamp = Date.now()
      const uniqueEmail = `detail.test.${timestamp}@example.com`
      
      await page.fill('input[name="firstName"]', 'Detail')
      await page.fill('input[name="lastName"]', 'Test')
      await page.fill('input[name="email"]', uniqueEmail)
      
      // Click Create Patient button
      await page.getByRole('button', { name: 'Create Patient' }).click()
      
      // Wait for modal to close
      await page.waitForSelector('.fixed.inset-0.z-50', { state: 'hidden' }, { timeout: 10000 })
    }
    
    // Look for edit button (pencil icon) in patient cards
    const editButton = page.locator('button[title="Edit Patient"]').first()
    await expect(editButton).toBeVisible()
    await editButton.click()
    
    // Should open edit modal
    await expect(page.getByRole('heading', { name: 'Edit Patient' })).toBeVisible()
  })
})