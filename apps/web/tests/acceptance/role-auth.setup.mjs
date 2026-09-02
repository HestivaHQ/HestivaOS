import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test as setup, expect } from '@playwright/test';

const identities = [
  ['admin', 'HESTIVA_LR1B_ADMIN_EMAIL', 'HESTIVA_LR1B_ADMIN_PASSWORD'],
  ['supervisor', 'HESTIVA_LR1B_SUPERVISOR_EMAIL', 'HESTIVA_LR1B_SUPERVISOR_PASSWORD'],
  ['technician-lead', 'HESTIVA_LR1B_TECHNICIAN_LEAD_EMAIL', 'HESTIVA_LR1B_TECHNICIAN_LEAD_PASSWORD'],
  ['technician-member', 'HESTIVA_LR1B_TECHNICIAN_MEMBER_EMAIL', 'HESTIVA_LR1B_TECHNICIAN_MEMBER_PASSWORD'],
];

const authFile = (role) => fileURLToPath(new URL(`../../.playwright/acceptance/${role}.json`, import.meta.url));

for (const [role, emailName, passwordName] of identities) {
  setup(`authenticate LR-1B ${role} identity`, async ({ page }) => {
    const email = process.env[emailName];
    const password = process.env[passwordName];
    if (!email || !password) throw new Error(`Missing LR-1B credentials for ${role}.`);

    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).not.toHaveURL(/\/login(?:\?|$)/, { timeout: 20_000 });

    const path = new URL(page.url()).pathname;
    if (role.startsWith('technician') && !path.startsWith('/technician')) {
      await page.goto('/technician', { waitUntil: 'domcontentloaded' });
      await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
    }

    const file = authFile(role);
    await mkdir(dirname(file), { recursive: true });
    await page.context().storageState({ path: file });
  });
}
