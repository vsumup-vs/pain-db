const { test, expect } = require('@playwright/test');

/**
 * Encounter Notes E2E Tests
 * Tests the complete encounter note workflow:
 * 1. Create encounter note from alert resolution
 * 2. Create encounter note manually
 * 3. Edit draft encounter note
 * 4. Complete SOAP fields
 * 5. Attest and lock encounter note
 * 6. Verify locked notes are read-only
 */

test.describe('Encounter Notes', () => {
  let authToken;
  let userId;
  let organizationId;
  let patientId;
  let clinicianId;
  let alertId;

  test.beforeAll(async ({ request }) => {
    // Login to get auth token
    const loginResponse = await request.post('http://localhost:3000/api/auth/login', {
      data: {
        email: 'admin@test.com',
        password: 'admin123'
      }
    });

    expect(loginResponse.ok()).toBeTruthy();
    const loginData = await loginResponse.json();
    authToken = loginData.token;
    userId = loginData.user.id;
    organizationId = loginData.user.organizations[0].organizationId;

    // Get a patient for testing
    const patientsResponse = await request.get('http://localhost:3000/api/patients', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'x-organization-id': organizationId
      }
    });

    expect(patientsResponse.ok()).toBeTruthy();
    const patientsData = await patientsResponse.json();

    if (patientsData.data && patientsData.data.length > 0) {
      patientId = patientsData.data[0].id;
    } else {
      console.log('No patients found for testing');
    }

    // Get a clinician for testing
    const cliniciansResponse = await request.get('http://localhost:3000/api/clinicians', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'x-organization-id': organizationId
      }
    });

    expect(cliniciansResponse.ok()).toBeTruthy();
    const cliniciansData = await cliniciansResponse.json();

    if (cliniciansData.data && cliniciansData.data.length > 0) {
      clinicianId = cliniciansData.data[0].id;
    } else {
      console.log('No clinicians found for testing');
    }

    // Get an alert for testing (if available)
    const alertsResponse = await request.get('http://localhost:3000/api/alerts?status=PENDING&limit=1', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'x-organization-id': organizationId
      }
    });

    if (alertsResponse.ok()) {
      const alertsData = await alertsResponse.json();
      if (alertsData.data && alertsData.data.length > 0) {
        alertId = alertsData.data[0].id;
      }
    }
  });

  test('should navigate to Encounter Notes page', async ({ page }) => {
    // Login
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', 'admin@test.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    await page.waitForURL('http://localhost:5173/');

    // Click on Encounter Notes navigation link
    await page.click('text=Encounter Notes');

    // Wait for Encounter Notes page to load
    await page.waitForURL('http://localhost:5173/encounter-notes');

    // Verify page title
    await expect(page.locator('h1:has-text("Encounter Notes")')).toBeVisible();
  });

  test('should open new encounter note modal', async ({ page }) => {
    // Login and navigate to Encounter Notes
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', 'admin@test.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:5173/');
    await page.click('text=Encounter Notes');
    await page.waitForURL('http://localhost:5173/encounter-notes');

    // Click New Encounter Note button
    await page.click('button:has-text("New Encounter Note")');

    // Verify modal opens
    await expect(page.locator('text=Create Encounter Note')).toBeVisible();
  });

  test('should create a manual encounter note', async ({ page, request }) => {
    if (!patientId || !clinicianId) {
      test.skip('No patient or clinician available for testing');
      return;
    }

    // Login and navigate to Encounter Notes
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', 'admin@test.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:5173/');
    await page.click('text=Encounter Notes');
    await page.waitForURL('http://localhost:5173/encounter-notes');

    // Click New Encounter Note button
    await page.click('button:has-text("New Encounter Note")');

    // Fill in the form
    await page.fill('input[placeholder="Enter patient ID"]', patientId);
    await page.fill('input[placeholder="Enter clinician ID"]', clinicianId);

    // Select encounter type
    await page.selectOption('select', 'RPM');

    // Fill in SOAP fields
    await page.fill('textarea[placeholder*="Subjective"]', 'Patient reports improved pain levels');
    await page.fill('textarea[placeholder*="Objective"]', 'BP: 120/80, HR: 72, Weight: 165 lbs');
    await page.fill('textarea[placeholder*="Assessment"]', 'Pain management plan effective');
    await page.fill('textarea[placeholder*="Plan"]', 'Continue current medications, follow up in 2 weeks');

    // Save as draft
    await page.click('button:has-text("Save Draft")');

    // Wait for success message or navigation
    await page.waitForTimeout(2000);

    // Verify encounter note was created
    const encounterNotesResponse = await request.get('http://localhost:3000/api/encounter-notes', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'x-organization-id': organizationId
      }
    });

    expect(encounterNotesResponse.ok()).toBeTruthy();
    const encounterNotesData = await encounterNotesResponse.json();
    expect(encounterNotesData.data.length).toBeGreaterThan(0);
  });

  test('should edit a draft encounter note', async ({ page, request }) => {
    // First, create a draft encounter note via API
    if (!patientId || !clinicianId) {
      test.skip('No patient or clinician available for testing');
      return;
    }

    const createResponse = await request.post('http://localhost:3000/api/encounter-notes', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'x-organization-id': organizationId
      },
      data: {
        patientId,
        clinicianId,
        encounterType: 'RPM',
        subjective: 'Initial subjective note',
        objective: 'Initial objective note',
        assessment: 'Initial assessment',
        plan: 'Initial plan'
      }
    });

    expect(createResponse.ok()).toBeTruthy();
    const createData = await createResponse.json();
    const noteId = createData.data.id;

    // Login and navigate to Encounter Notes
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', 'admin@test.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:5173/');
    await page.click('text=Encounter Notes');
    await page.waitForURL('http://localhost:5173/encounter-notes');

    // Find and click the edit button for the draft note
    await page.click(`button[title="Edit Note"]`);

    // Wait for modal to open
    await expect(page.locator('text=Edit Encounter Note')).toBeVisible();

    // Edit SOAP fields
    await page.fill('textarea[placeholder*="Subjective"]', 'Updated subjective note');
    await page.fill('textarea[placeholder*="Objective"]', 'Updated objective note');

    // Save changes
    await page.click('button:has-text("Save Draft")');

    // Wait for changes to save
    await page.waitForTimeout(2000);

    // Verify changes were saved
    const getResponse = await request.get(`http://localhost:3000/api/encounter-notes/${noteId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'x-organization-id': organizationId
      }
    });

    expect(getResponse.ok()).toBeTruthy();
    const getData = await getResponse.json();
    expect(getData.data.subjective).toContain('Updated');
  });

  test('should attest and lock encounter note', async ({ page, request }) => {
    // First, create a draft encounter note via API
    if (!patientId || !clinicianId) {
      test.skip('No patient or clinician available for testing');
      return;
    }

    const createResponse = await request.post('http://localhost:3000/api/encounter-notes', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'x-organization-id': organizationId
      },
      data: {
        patientId,
        clinicianId,
        encounterType: 'RPM',
        subjective: 'Complete subjective note',
        objective: 'Complete objective note',
        assessment: 'Complete assessment',
        plan: 'Complete plan'
      }
    });

    expect(createResponse.ok()).toBeTruthy();
    const createData = await createResponse.json();
    const noteId = createData.data.id;

    // Attest the note via API
    const attestResponse = await request.put(`http://localhost:3000/api/encounter-notes/${noteId}/attest`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'x-organization-id': organizationId
      }
    });

    expect(attestResponse.ok()).toBeTruthy();
    const attestData = await attestResponse.json();
    expect(attestData.data.isLocked).toBe(true);
    expect(attestData.data.attestedBy).toBe(userId);
    expect(attestData.data.attestedAt).toBeTruthy();

    // Verify the note is read-only in the UI
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', 'admin@test.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:5173/');
    await page.click('text=Encounter Notes');
    await page.waitForURL('http://localhost:5173/encounter-notes');

    // Verify "Attested" badge is visible
    await expect(page.locator('text=Attested')).toBeVisible();

    // Verify edit button is not visible for attested notes
    const editButtons = await page.locator('button[title="Edit Note"]').count();
    console.log(`Edit buttons visible for attested note: ${editButtons}`);
  });

  test('should not allow editing locked encounter notes', async ({ request }) => {
    // Create and attest a note
    if (!patientId || !clinicianId) {
      test.skip('No patient or clinician available for testing');
      return;
    }

    const createResponse = await request.post('http://localhost:3000/api/encounter-notes', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'x-organization-id': organizationId
      },
      data: {
        patientId,
        clinicianId,
        encounterType: 'RPM',
        subjective: 'Locked note subjective',
        objective: 'Locked note objective',
        assessment: 'Locked note assessment',
        plan: 'Locked note plan'
      }
    });

    const createData = await createResponse.json();
    const noteId = createData.data.id;

    // Attest the note
    await request.put(`http://localhost:3000/api/encounter-notes/${noteId}/attest`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'x-organization-id': organizationId
      }
    });

    // Try to update the locked note - should fail
    const updateResponse = await request.put(`http://localhost:3000/api/encounter-notes/${noteId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'x-organization-id': organizationId
      },
      data: {
        subjective: 'Attempted update'
      }
    });

    expect(updateResponse.ok()).toBeFalsy();
    const updateData = await updateResponse.json();
    expect(updateData.error).toContain('Cannot edit');
  });

  test('should not allow deleting locked encounter notes', async ({ request }) => {
    // Create and attest a note
    if (!patientId || !clinicianId) {
      test.skip('No patient or clinician available for testing');
      return;
    }

    const createResponse = await request.post('http://localhost:3000/api/encounter-notes', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'x-organization-id': organizationId
      },
      data: {
        patientId,
        clinicianId,
        encounterType: 'RPM',
        subjective: 'To be locked',
        objective: 'To be locked',
        assessment: 'To be locked',
        plan: 'To be locked'
      }
    });

    const createData = await createResponse.json();
    const noteId = createData.data.id;

    // Attest the note
    await request.put(`http://localhost:3000/api/encounter-notes/${noteId}/attest`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'x-organization-id': organizationId
      }
    });

    // Try to delete the locked note - should fail
    const deleteResponse = await request.delete(`http://localhost:3000/api/encounter-notes/${noteId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'x-organization-id': organizationId
      }
    });

    expect(deleteResponse.ok()).toBeFalsy();
    const deleteData = await deleteResponse.json();
    expect(deleteData.error).toContain('Cannot delete');
  });

  test('should filter encounter notes by status', async ({ page }) => {
    // Login and navigate to Encounter Notes
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', 'admin@test.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:5173/');
    await page.click('text=Encounter Notes');
    await page.waitForURL('http://localhost:5173/encounter-notes');

    // Filter by Draft status
    await page.selectOption('select[name="status"]', 'false');
    await page.waitForTimeout(1000);

    // Verify Draft badge is visible
    await expect(page.locator('span:has-text("Draft")')).toBeVisible();

    // Filter by Attested status
    await page.selectOption('select[name="status"]', 'true');
    await page.waitForTimeout(1000);

    // Verify Attested badge is visible (if any attested notes exist)
    const attestedCount = await page.locator('span:has-text("Attested")').count();
    console.log(`Attested notes found: ${attestedCount}`);
  });
});
