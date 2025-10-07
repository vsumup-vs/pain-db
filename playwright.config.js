import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 3 : 2,
  workers: 1,
  reporter: [
    ['html'],
    ['list']
  ],
  globalSetup: './e2e/global-setup.js',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 30000,
    navigationTimeout: 60000,
    // Disable strict mode to be more lenient with selectors
    strictSelectors: false,
    contextOptions: {
      ignoreHTTPSErrors: true,
      viewport: { width: 1280, height: 720 },
      reducedMotion: 'reduce'
    }
  },

  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--disable-web-security',
            '--disable-features=TranslateUI',
            '--disable-ipc-flooding-protection',
            '--disable-renderer-backgrounding',
            '--disable-backgrounding-occluded-windows',
            '--disable-field-trial-config',
            '--no-sandbox',
            '--disable-setuid-sandbox'
          ]
        }
      },
    },
  ],

  webServer: [
    {
      command: 'npm run dev',
      port: 5173,
      cwd: './frontend',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
    {
      command: 'npm start',
      port: 3000,
      cwd: './',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
  ],
})