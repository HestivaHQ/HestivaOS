import { test, expect } from '@playwright/test';
import { installAcceptanceSafetyGuard, expectNoServerErrors } from './acceptance-guard.mjs';

test.beforeEach(async ({ page }) => installAcceptanceSafetyGuard(page));

test('SUPERVISOR opens the office interface in its own authenticated session', async ({ page }) => {
  await expectNoServerErrors(page, async () => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.appShell')).toBeVisible();
    await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
    await page.goto('/work-orders', { waitUntil: 'domcontentloaded' });
    await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
  });
});
