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

async function requestNativeSubmit(form, submitButton) {
  await form.evaluate((element, button) => element.requestSubmit(button), await submitButton.elementHandle());
}

test.describe('production-safe office interactions', () => {
  test('Employee Records search and status filters remain read-only', async ({ page }) => {
    const watch = installFailureWatch(page);
    await page.goto('/employees', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.appShell')).toBeVisible();

    const filters = page.locator('.employeeFilters');
    const search = filters.getByRole('searchbox', { name: 'Search', exact: true });
    await search.fill('__browser_audit_no_match__');
    await expect(search).toHaveValue('__browser_audit_no_match__');
    await page.waitForTimeout(350);

    const status = filters.getByRole('combobox', { name: 'Status', exact: true });
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

  test('Service Catalogue search filters active services without changing state', async ({ page }) => {
    const watch = installFailureWatch(page);
    await page.goto('/services', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.appShell')).toBeVisible();

    const search = page.getByRole('searchbox', { name: 'Search', exact: true });
    await search.fill('__browser_audit_no_match__');
    await expect(search).toHaveValue('__browser_audit_no_match__');
    await expect(page.getByText('No active services found', { exact: true })).toBeVisible();

    await expect(page).toHaveURL((url) => url.pathname === '/services');
    expectClean(watch, 'Service Catalogue search');
  });

  test('Cleaning Job Templates native validation blocks an empty save', async ({ page }) => {
    const watch = installFailureWatch(page);
    await page.goto('/cleaning-job-templates', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.appShell')).toBeVisible();

    const form = page.locator('form.resourceForm').first();
    await expect(form.getByRole('heading', { name: 'New template', exact: true })).toBeVisible();
    const name = form.getByRole('textbox', { name: 'Name', exact: true });
    await expect(name).toHaveValue('');
    await form.getByRole('button', { name: 'Save template', exact: true }).click();
    await expect(name).toHaveJSProperty('validity.valid', false);

    await expect(page).toHaveURL((url) => url.pathname === '/cleaning-job-templates');
    await expect(form.getByRole('heading', { name: 'New template', exact: true })).toBeVisible();
    expectClean(watch, 'Cleaning Job Templates required-field validation');
  });

  test('Create Work Order reference searches stay read-only and invalid save is blocked', async ({ page }) => {
    const watch = installFailureWatch(page);
    await page.goto('/work-orders/new', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.appShell')).toBeVisible();

    const form = page.locator('form.resourceForm').first();
    await expect(form.getByRole('heading', { name: 'New work order', exact: true })).toBeVisible();

    const customerSearch = form.getByRole('searchbox', { name: 'Search customers', exact: true });
    const crewSearch = form.getByRole('searchbox', { name: 'Search crews', exact: true });
    const technicianSearch = form.getByRole('searchbox', { name: 'Search eligible technicians', exact: true });
    const serviceSearch = form.getByRole('searchbox', { name: 'Search primary services', exact: true });
    const addOnSearch = form.getByRole('searchbox', { name: 'Search add-ons', exact: true });

    for (const search of [customerSearch, crewSearch, technicianSearch, serviceSearch, addOnSearch]) {
      await search.fill('__browser_audit_no_match__');
      await expect(search).toHaveValue('__browser_audit_no_match__');
    }
    await page.waitForTimeout(500);

    const primaryService = form.getByRole('combobox', { name: 'Primary Service', exact: true });
    await expect(primaryService).toHaveValue('');
    await requestNativeSubmit(form, form.getByRole('button', { name: 'Save work order', exact: true }));
    await expect(primaryService).toHaveJSProperty('validity.valid', false);

    await expect(page).toHaveURL((url) => url.pathname === '/work-orders/new');
    await expect(form.getByRole('heading', { name: 'New work order', exact: true })).toBeVisible();
    expectClean(watch, 'Create Work Order reference searches and validation');
  });
});
