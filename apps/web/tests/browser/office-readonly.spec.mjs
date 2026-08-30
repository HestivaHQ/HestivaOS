import { test, expect } from '@playwright/test';

function installFailureWatch(page) {
  const pageErrors = [];
  const serverErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 500) serverErrors.push(`${response.status()} ${new URL(response.url()).pathname}`);
  });
  return { pageErrors, serverErrors };
}

function expectClean(watch, label) {
  expect(watch.pageErrors, `${label} raised browser page errors`).toEqual([]);
  expect(watch.serverErrors, `${label} received HTTP 5xx responses`).toEqual([]);
}

test.describe('production-safe office interactions', () => {
  test('Employee Records search and status filters remain read-only', async ({ page }) => {
    const watch = installFailureWatch(page);
    await page.goto('/employees', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.appShell')).toBeVisible();

    const search = page.getByRole('searchbox', { name: 'Search' }).first();
    await search.fill('__browser_audit_no_match__');
    await expect(search).toHaveValue('__browser_audit_no_match__');
    await page.waitForTimeout(350);

    const status = page.getByRole('combobox', { name: 'Status' }).first();
    await status.selectOption('INACTIVE');
    await expect(status).toHaveValue('INACTIVE');
    await page.waitForTimeout(350);
    await status.selectOption('ALL');
    await expect(status).toHaveValue('ALL');

    await expect(page).toHaveURL((url) => url.pathname === '/employees');
    expectClean(watch, 'Employee Records filters');
  });

  test('Recurring Services create references can load and close without submitting', async ({ page }) => {
    const watch = installFailureWatch(page);
    await page.goto('/recurring-services', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.appShell')).toBeVisible();

    await page.getByRole('button', { name: 'Create recurring service', exact: true }).click();
    const form = page.locator('form.resourceForm').first();
    await expect(form.getByRole('heading', { name: 'New recurring service' })).toBeVisible();
    await expect(form.getByRole('combobox', { name: 'Property' })).toBeVisible();
    await expect(form.getByRole('combobox', { name: 'Primary service' })).toBeVisible();
    await expect(form.getByRole('combobox', { name: 'Frequency' })).toHaveValue('WEEKLY');
    await expect(form.getByRole('combobox', { name: 'Preferred time window' })).toHaveValue('FLEXIBLE');

    await form.getByRole('button', { name: 'Close create form', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Create recurring service', exact: true })).toBeVisible();
    await expect(page).toHaveURL((url) => url.pathname === '/recurring-services');
    expectClean(watch, 'Recurring Services create reference loading');
  });
});
