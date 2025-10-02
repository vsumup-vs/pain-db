import { test, expect } from '@playwright/test'

test.describe('Complete Workflow', () => {
  test('should complete full patient management workflow', async ({ page }) => {
    // 1. Create a patient
    await page.goto('/patients')
    await page.getByText('Add Patient').click()
    
    await page.fill('input[name="firstName"]', 'Jane')
    await page.fill('input[name="lastName"]', 'Smith')
    await page.fill('input[name="email"]', 'jane.smith@test.com')
    await page.fill('input[name="phone"]', '555-0456')
    await page.fill('input[name="dateOfBirth"]', '1985-05-15')
    
    await page.getByText('Add Patient').click()
    await expect(page.getByText('Patient created successfully')).toBeVisible()
    
    // 2. Create an enrollment
    await page.goto('/enrollments')
    await page.getByText('Create Enrollment').click()
    
    await page.selectOption('select[name="patientId"]', { label: 'Jane Smith' })
    await page.selectOption('select[name="presetId"]', { index: 1 })
    await page.fill('input[name="diagnosisCode"]', 'M79.3')
    
    await page.getByText('Create Enrollment').click()
    await expect(page.getByText('Enrollment created successfully')).toBeVisible()
    
    // 3. Add an observation
    await page.goto('/observations')
    await page.getByText('Add Observation').click()
    
    await page.selectOption('select[name="enrollmentId"]', { index: 1 })
    await page.selectOption('select[name="metricDefinitionId"]', { index: 1 })
    await page.fill('input[name="value"]', '7')
    
    await page.getByText('Add Observation').click()
    await expect(page.getByText('Observation recorded successfully')).toBeVisible()
    
    // 4. Verify data appears in dashboard
    await page.goto('/dashboard')
    await expect(page.getByText('Jane Smith')).toBeVisible()
    await expect(page.getByText('Recent Observations')).toBeVisible()
  })

  test('should handle assessment template workflow', async ({ page }) => {
    // 1. Create assessment template
    await page.goto('/assessment-templates')
    await page.getByText('Create Template').click()
    
    await page.fill('input[name="name"]', 'Custom Pain Assessment')
    await page.fill('textarea[name="description"]', 'Custom assessment for pain management')
    
    await page.getByText('Create Template').click()
    await expect(page.getByText('Assessment template created successfully')).toBeVisible()
    
    // 2. Create condition preset using the template
    await page.goto('/condition-presets')
    await page.getByText('Create Preset').click()
    
    await page.fill('input[name="name"]', 'Custom Pain Protocol')
    await page.fill('textarea[name="description"]', 'Protocol using custom assessment')
    
    // Select the created template
    await page.check('input[value="Custom Pain Assessment"]')
    
    await page.getByText('Create Preset').click()
    await expect(page.getByText('Condition preset created successfully')).toBeVisible()
    
    // 3. Verify preset shows linked template
    await expect(page.getByText('Custom Pain Assessment')).toBeVisible()
  })
})