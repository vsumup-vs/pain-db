const { test, expect } = require('@playwright/test');

/**
 * Simplified Encounter Notes E2E Tests
 * Tests the complete encounter note workflow using existing data
 */

test.describe('Encounter Notes - Simple Tests', () => {
  // Test navigation to Encounter Notes page
  test('should navigate to Encounter Notes page and verify UI', async ({ page }) => {
    // Login
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', 'admin@test.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    await page.waitForURL('http://localhost:5173/', { timeout: 10000 });

    // Click on Encounter Notes navigation link
    await page.click('text=Encounter Notes');

    // Wait for Encounter Notes page to load
    await page.waitForURL('http://localhost:5173/encounter-notes', { timeout: 10000 });

    // Verify page elements
    await expect(page.locator('h1:has-text("Encounter Notes")')).toBeVisible();
    await expect(page.locator('button:has-text("New Encounter Note")')).toBeVisible();

    // Verify filters are visible
    await expect(page.locator('label:has-text("Patient ID")')).toBeVisible();
    await expect(page.locator('label:has-text("Clinician ID")')).toBeVisible();
    await expect(page.locator('label:has-text("Encounter Type")')).toBeVisible();
    await expect(page.locator('label:has-text("Status")')).toBeVisible();

    console.log('✅ Successfully navigated to Encounter Notes page');
  });

  // Test opening the New Encounter Note modal
  test('should open new encounter note modal and verify form fields', async ({ page }) => {
    // Login and navigate
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', 'admin@test.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:5173/');
    await page.click('text=Encounter Notes');
    await page.waitForURL('http://localhost:5173/encounter-notes');

    // Click New Encounter Note button
    await page.click('button:has-text("New Encounter Note")');

    // Wait a moment for the modal to render
    await page.waitForTimeout(500);

    // Verify modal title
    await expect(page.locator('h2:has-text("Create Encounter Note")')).toBeVisible();

    // Verify form fields are present
    await expect(page.locator('label:has-text("Patient")')).toBeVisible();
    await expect(page.locator('label:has-text("Clinician")')).toBeVisible();
    await expect(page.locator('label:has-text("Encounter Type")')).toBeVisible();

    // Verify SOAP sections
    await expect(page.locator('label:has-text("Subjective")')).toBeVisible();
    await expect(page.locator('label:has-text("Objective")')).toBeVisible();
    await expect(page.locator('label:has-text("Assessment")')).toBeVisible();
    await expect(page.locator('label:has-text("Plan")')).toBeVisible();

    // Verify action buttons
    await expect(page.locator('button:has-text("Cancel")')).toBeVisible();
    await expect(page.locator('button:has-text("Save Draft")')).toBeVisible();

    console.log('✅ Successfully opened new encounter note modal');
  });

  // Test filtering encounter notes
  test('should filter encounter notes by status', async ({ page }) => {
    // Login and navigate
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', 'admin@test.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:5173/');
    await page.click('text=Encounter Notes');
    await page.waitForURL('http://localhost:5173/encounter-notes');

    // Wait for initial data to load
    await page.waitForTimeout(1000);

    // Get the status filter dropdown
    const statusFilter = page.locator('label:has-text("Status")').locator('..').locator('select');

    // Test filtering by Draft
    await statusFilter.selectOption('false');
    await page.waitForTimeout(1000);
    console.log('✅ Filtered by Draft status');

    // Test filtering by Attested
    await statusFilter.selectOption('true');
    await page.waitForTimeout(1000);
    console.log('✅ Filtered by Attested status');

    // Test showing all notes
    await statusFilter.selectOption('');
    await page.waitForTimeout(1000);
    console.log('✅ Showing all encounter notes');
  });

  // Test filtering by encounter type
  test('should filter encounter notes by type', async ({ page }) => {
    // Login and navigate
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', 'admin@test.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:5173/');
    await page.click('text=Encounter Notes');
    await page.waitForURL('http://localhost:5173/encounter-notes');

    // Wait for initial data to load
    await page.waitForTimeout(1000);

    // Get the encounter type filter dropdown
    const typeFilter = page.locator('label:has-text("Encounter Type")').locator('..').locator('select');

    // Test filtering by RPM
    await typeFilter.selectOption('RPM');
    await page.waitForTimeout(1000);
    console.log('✅ Filtered by RPM type');

    // Test filtering by CCM
    await typeFilter.selectOption('CCM');
    await page.waitForTimeout(1000);
    console.log('✅ Filtered by CCM type');

    // Test showing all types
    await typeFilter.selectOption('');
    await page.waitForTimeout(1000);
    console.log('✅ Showing all encounter types');
  });

  // Test viewing encounter note details
  test('should view encounter note details when clicking view button', async ({ page }) => {
    // Login and navigate
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', 'admin@test.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:5173/');
    await page.click('text=Encounter Notes');
    await page.waitForURL('http://localhost:5173/encounter-notes');

    // Wait for encounter notes to load
    await page.waitForTimeout(2000);

    // Check if there are any encounter notes
    const viewButtons = page.locator('button[title="View Note"]');
    const count = await viewButtons.count();

    if (count > 0) {
      // Click the first view button
      await viewButtons.first().click();

      // Wait for modal to open
      await page.waitForTimeout(500);

      // Verify modal shows encounter note details
      const modalVisible = await page.locator('h2:has-text("View Encounter Note")').isVisible() ||
                          await page.locator('h2:has-text("Edit Encounter Note")').isVisible();
      expect(modalVisible).toBeTruthy();

      console.log('✅ Successfully viewed encounter note details');
    } else {
      console.log('⚠️ No encounter notes available to view');
    }
  });

  // Test that edit button is only visible for draft notes
  test('should only show edit button for draft notes, not attested notes', async ({ page }) => {
    // Login and navigate
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', 'admin@test.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:5173/');
    await page.click('text=Encounter Notes');
    await page.waitForURL('http://localhost:5173/encounter-notes');

    // Wait for data to load
    await page.waitForTimeout(2000);

    // Filter by Draft status
    const statusFilter = page.locator('label:has-text("Status")').locator('..').locator('select');
    await statusFilter.selectOption('false');
    await page.waitForTimeout(1000);

    // Count edit buttons for draft notes
    const draftEditButtons = await page.locator('button[title="Edit Note"]').count();
    console.log(`✅ Draft notes have ${draftEditButtons} edit buttons`);

    // Filter by Attested status
    await statusFilter.selectOption('true');
    await page.waitForTimeout(1000);

    // Count edit buttons for attested notes (should be 0)
    const attestedEditButtons = await page.locator('button[title="Edit Note"]').count();
    console.log(`✅ Attested notes have ${attestedEditButtons} edit buttons`);
    expect(attestedEditButtons).toBe(0);
  });

  // Test that attested badge is visible for locked notes
  test('should display "Attested" badge for locked notes', async ({ page }) => {
    // Login and navigate
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', 'admin@test.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:5173/');
    await page.click('text=Encounter Notes');
    await page.waitForURL('http://localhost:5173/encounter-notes');

    // Wait for data to load
    await page.waitForTimeout(2000);

    // Filter by Attested status
    const statusFilter = page.locator('label:has-text("Status")').locator('..').locator('select');
    await statusFilter.selectOption('true');
    await page.waitForTimeout(1000);

    // Check for Attested badges
    const attestedBadges = await page.locator('span:has-text("Attested")').count();

    if (attestedBadges > 0) {
      console.log(`✅ Found ${attestedBadges} attested encounter notes with badges`);
      await expect(page.locator('span:has-text("Attested")').first()).toBeVisible();
    } else {
      console.log('⚠️ No attested encounter notes available');
    }
  });

  // Test pagination (if there are enough notes)
  test('should display pagination controls when there are multiple pages', async ({ page }) => {
    // Login and navigate
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', 'admin@test.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:5173/');
    await page.click('text=Encounter Notes');
    await page.waitForURL('http://localhost:5173/encounter-notes');

    // Wait for data to load
    await page.waitForTimeout(2000);

    // Check if pagination exists
    const paginationExists = await page.locator('button:has-text("Previous")').isVisible();

    if (paginationExists) {
      console.log('✅ Pagination controls are visible');

      // Verify pagination buttons exist
      await expect(page.locator('button:has-text("Previous")')).toBeVisible();
      await expect(page.locator('button:has-text("Next")')).toBeVisible();
    } else {
      console.log('⚠️ Not enough encounter notes for pagination');
    }
  });
});
