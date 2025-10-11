const { test, expect } = require('@playwright/test');

test.describe('Authentication Flow E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:3000');
  });

  test('should complete user registration flow', async ({ page }) => {
    // Navigate to registration page
    await page.click('text=Register');

    // Fill registration form
    await page.fill('[data-testid="email"]', 'e2e-test@example.com');
    await page.fill('[data-testid="password"]', 'SecurePassword123!');
    await page.fill('[data-testid="firstName"]', 'E2E');
    await page.fill('[data-testid="lastName"]', 'Test');
    await page.selectOption('[data-testid="role"]', 'CLINICIAN');

    // Submit registration
    await page.click('[data-testid="register-submit"]');

    // Verify success message
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });

  test('should complete user login flow', async ({ page }) => {
    // Navigate to login page
    await page.click('text=Login');

    // Fill login form
    await page.fill('[data-testid="email"]', 'e2e-test@example.com');
    await page.fill('[data-testid="password"]', 'SecurePassword123!');

    // Submit login
    await page.click('[data-testid="login-submit"]');

    // Verify redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('should handle social login buttons', async ({ page }) => {
    // Navigate to login page
    await page.click('text=Login');

    // Check social login buttons are present
    await expect(page.locator('[data-testid="google-login"]')).toBeVisible();
    await expect(page.locator('[data-testid="microsoft-login"]')).toBeVisible();

    // Click Google login (should redirect to OAuth)
    await page.click('[data-testid="google-login"]');
    
    // Verify redirect to Google OAuth (URL should contain google.com)
    await page.waitForURL(/.*google\.com.*/);
  });

  test('should handle organization selection', async ({ page }) => {
    // Assume user is logged in
    await page.goto('http://localhost:3000/select-organization');

    // Select organization
    await page.selectOption('[data-testid="organization-select"]', { index: 0 });
    await page.click('[data-testid="select-organization-submit"]');

    // Verify redirect to dashboard with organization context
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('[data-testid="organization-name"]')).toBeVisible();
  });

  test('should handle logout', async ({ page }) => {
    // Assume user is logged in and on dashboard
    await page.goto('http://localhost:3000/dashboard');

    // Click logout
    await page.click('[data-testid="logout-button"]');

    // Verify redirect to login page
    await expect(page).toHaveURL(/.*login/);
  });
});