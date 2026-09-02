import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.HESTIVA_LR1B_BASE_URL;
const authRoot = new URL('./.playwright/acceptance/', import.meta.url);
const authState = (role) => fileURLToPath(new URL(`${role}.json`, authRoot));

export default defineConfig({
  testDir: './tests/acceptance',
  timeout: 45_000,
  expect: { timeout: 12_000 },
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL,
    actionTimeout: 12_000,
    navigationTimeout: 25_000,
    trace: 'off',
    screenshot: 'off',
    video: 'off',
  },
  projects: [
    { name: 'acceptance-auth', testMatch: /role-auth\.setup\.mjs/ },
    {
      name: 'admin-desktop',
      testMatch: /admin-.*\.spec\.mjs/,
      dependencies: ['acceptance-auth'],
      use: { ...devices['Desktop Chrome'], storageState: authState('admin') },
    },
    {
      name: 'supervisor-desktop',
      testMatch: /supervisor-.*\.spec\.mjs/,
      dependencies: ['acceptance-auth'],
      use: { ...devices['Desktop Chrome'], storageState: authState('supervisor') },
    },
    {
      name: 'technician-lead-mobile',
      testMatch: /technician-lead-.*\.spec\.mjs/,
      dependencies: ['acceptance-auth'],
      use: { ...devices['Pixel 7'], storageState: authState('technician-lead') },
    },
    {
      name: 'technician-member-mobile',
      testMatch: /technician-member-.*\.spec\.mjs/,
      dependencies: ['acceptance-auth'],
      use: { ...devices['Pixel 7'], storageState: authState('technician-member') },
    },
  ],
  outputDir: 'test-results/lr1b-acceptance',
});
