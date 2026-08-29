import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.HESTIVA_BROWSER_AUDIT_BASE_URL;

export default defineConfig({
  testDir: './tests/browser',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  forbidOnly: true,
  retries: 1,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL,
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
    trace: 'off',
    screenshot: 'off',
    video: 'off',
  },
  projects: [
    {
      name: 'auth-setup',
      testMatch: /auth\.setup\.mjs/,
    },
    {
      name: 'desktop-chromium',
      testIgnore: /auth\.setup\.mjs/,
      dependencies: ['auth-setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.playwright/auth/admin.json',
      },
    },
    {
      name: 'mobile-chromium',
      testIgnore: /auth\.setup\.mjs/,
      dependencies: ['auth-setup'],
      use: {
        ...devices['Pixel 7'],
        storageState: '.playwright/auth/admin.json',
      },
    },
  ],
  outputDir: 'test-results/browser-audit',
});
