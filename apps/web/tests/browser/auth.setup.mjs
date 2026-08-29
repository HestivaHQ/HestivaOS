import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { test as setup, expect } from '@playwright/test';

const authFile = '.playwright/auth/admin.json';

setup('authenticate browser-audit admin identity', async ({ page }) => {
  const email = process.env.HESTIVA_BROWSER_AUDIT_ADMIN_EMAIL;
  const password = process.env.HESTIVA_BROWSER_AUDIT_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error('Browser audit credentials are not configured. Required names: HESTIVA_BROWSER_AUDIT_ADMIN_EMAIL and HESTIVA_BROWSER_AUDIT_ADMIN_PASSWORD.');
  }

  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 20_000 });
  await expect(page.locator('.appShell')).toBeVisible();

  await mkdir(dirname(authFile), { recursive: true });
  await page.context().storageState({ path: authFile });
});
