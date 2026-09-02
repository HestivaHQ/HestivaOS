import { test, expect } from '@playwright/test';
import { installAcceptanceSafetyGuard, expectNoServerErrors } from './acceptance-guard.mjs';

test.beforeEach(async ({ page }) => installAcceptanceSafetyGuard(page));

test('Technician member opens the Homent Technician interface in its own mobile session', async ({ page }) => {
  await expectNoServerErrors(page, async () => {
    await page.goto('/technician', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.technicianShell')).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Technician jobs' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Today' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Upcoming' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Recent' })).toBeVisible();
  });
});
