import { test, expect } from '@playwright/test';
import { installAcceptanceSafetyGuard, expectNoServerErrors } from './acceptance-guard.mjs';

const runId = process.env.GITHUB_RUN_ID ?? String(Date.now());
const runAttempt = process.env.GITHUB_RUN_ATTEMPT ?? '1';
const fixtureSuffix = `${runId}-${runAttempt}`.replace(/[^0-9-]/g, '').slice(-18);
const customerName = `LR1B Customer ${fixtureSuffix}`;
const editedCustomerName = `${customerName} Updated`;
const propertyName = `LR1B Property ${fixtureSuffix}`;
const editedPropertyName = `${propertyName} Updated`;
const acceptanceEmail = `lr1b-${fixtureSuffix.replaceAll('-', '')}@example.invalid`;

let customerId = '';
let propertyId = '';

function tomorrowAt(hour = 9) {
  const value = new Date();
  value.setUTCDate(value.getUTCDate() + 1);
  value.setUTCHours(hour, 0, 0, 0);
  return value.toISOString().slice(0, 16);
}

async function selectFirstNonEmptyOption(select) {
  await expect.poll(async () => select.locator('option').count()).toBeGreaterThan(1);
  const option = select.locator('option').nth(1);
  const value = await option.getAttribute('value');
  if (!value) throw new Error('Expected the first selectable option to have a value.');
  await select.selectOption(value);
  return option.textContent();
}

async function searchCustomer(page, name) {
  const search = page.getByPlaceholder('Search customers');
  await search.fill(name);
  const row = page.locator('.dataRow').filter({ hasText: name }).first();
  await expect(row).toBeVisible();
  return row;
}

async function findProperty(page, name) {
  const row = page.locator('.dataRow').filter({ hasText: name }).first();
  await expect(row).toBeVisible();
  return row;
}

test.beforeEach(async ({ page }) => installAcceptanceSafetyGuard(page));

test.describe.serial('LR-1B Bundle 2 office customer-to-work acceptance', () => {
  test.setTimeout(120_000);

  test('C1 creates, validates, reloads and edits a disposable Customer', async ({ page }) => {
    await expectNoServerErrors(page, async () => {
      await page.goto('/customers', { waitUntil: 'domcontentloaded' });
      const form = page.locator('form.resourceForm');
      const contactName = form.getByLabel('Contact name');

      await form.getByRole('button', { name: 'Save customer' }).click();
      await expect.poll(async () => contactName.evaluate((element) => element.checkValidity())).toBe(false);
      await expect(page).toHaveURL(/\/customers(?:\?.*)?$/);

      await contactName.fill(customerName);
      await form.getByLabel('Email').fill(acceptanceEmail);
      await form.getByLabel('Phone').fill('+27110000000');
      await form.getByLabel('Status').selectOption('ACTIVE');
      await form.getByLabel('Notes').fill('Disposable LR-1B Bundle 2 acceptance customer.');
      await form.getByRole('button', { name: 'Save customer' }).click();

      await expect(page).toHaveURL(/\/properties\?mode=create&customerId=[0-9a-f-]+$/i);
      customerId = new URL(page.url()).searchParams.get('customerId') ?? '';
      expect(customerId).toMatch(/^[0-9a-f]{8}-[0-9a-f-]{27}$/i);

      await page.goto('/customers', { waitUntil: 'domcontentloaded' });
      let row = await searchCustomer(page, customerName);
      await expect(row).toContainText('ACTIVE');
      await row.getByRole('button', { name: 'Edit' }).click();

      const editForm = page.locator('form.resourceForm');
      await editForm.getByLabel('Contact name').fill(editedCustomerName);
      await editForm.getByLabel('Notes').fill('Disposable LR-1B Bundle 2 acceptance customer — edited.');
      await editForm.getByRole('button', { name: 'Save customer' }).click();
      await expect(editForm.getByRole('heading', { name: 'New customer' })).toBeVisible();

      row = await searchCustomer(page, editedCustomerName);
      await expect(row).toContainText(acceptanceEmail);
      await page.reload({ waitUntil: 'domcontentloaded' });
      row = await searchCustomer(page, editedCustomerName);
      await expect(row).toContainText('ACTIVE');
    });
  });

  test('C2 creates, associates, reloads and edits a disposable Property', async ({ page }) => {
    expect(customerId).toMatch(/^[0-9a-f]{8}-[0-9a-f-]{27}$/i);
    await expectNoServerErrors(page, async () => {
      await page.goto(`/properties?mode=create&customerId=${encodeURIComponent(customerId)}`, { waitUntil: 'domcontentloaded' });
      const form = page.locator('form.resourceForm');
      await expect(form.getByRole('heading', { name: 'New property' })).toBeVisible();
      await expect(form.getByLabel('Customer', { exact: true }).locator('option:checked')).toContainText(editedCustomerName);

      await form.getByLabel('Property name').fill(propertyName);
      await form.getByLabel('Address', { exact: true }).fill('1 LR1B Acceptance Road');
      await form.getByLabel('City').fill('Johannesburg');
      await form.getByLabel('Postal code').fill('2000');
      await form.getByLabel('Access notes').fill('Disposable LR-1B access note.');
      await form.getByLabel('Parking notes').fill('Disposable LR-1B parking note.');
      await form.getByRole('button', { name: 'Save property' }).click();

      await expect(page).toHaveURL(/\/work-orders\/new\?customerId=[0-9a-f-]+&propertyId=[0-9a-f-]+$/i);
      const url = new URL(page.url());
      expect(url.searchParams.get('customerId')).toBe(customerId);
      propertyId = url.searchParams.get('propertyId') ?? '';
      expect(propertyId).toMatch(/^[0-9a-f]{8}-[0-9a-f-]{27}$/i);

      await page.goto('/properties', { waitUntil: 'domcontentloaded' });
      let row = await findProperty(page, propertyName);
      await expect(row).toContainText(editedCustomerName);
      await row.getByRole('button', { name: 'Edit' }).click();
      const editForm = page.locator('form.resourceForm');
      await editForm.getByLabel('Property name').fill(editedPropertyName);
      await editForm.getByLabel('Address', { exact: true }).fill('2 LR1B Acceptance Road');
      await editForm.getByRole('button', { name: 'Save property' }).click();
      await expect(editForm.getByRole('heading', { name: 'New property' })).toBeVisible();

      row = await findProperty(page, editedPropertyName);
      await expect(row).toContainText('2 LR1B Acceptance Road');
      await page.reload({ waitUntil: 'domcontentloaded' });
      row = await findProperty(page, editedPropertyName);
      await expect(row).toContainText(editedCustomerName);
      await expect(row).toContainText('Johannesburg');
    });
  });

  test('W1 creates a direct Work Order with primary service and add-on selection', async ({ page }) => {
    expect(customerId).toMatch(/^[0-9a-f]{8}-[0-9a-f-]{27}$/i);
    expect(propertyId).toMatch(/^[0-9a-f]{8}-[0-9a-f-]{27}$/i);
    await expectNoServerErrors(page, async () => {
      await page.goto(`/work-orders/new?customerId=${encodeURIComponent(customerId)}&propertyId=${encodeURIComponent(propertyId)}`, { waitUntil: 'domcontentloaded' });
      const form = page.locator('form.resourceForm');
      await expect(form.getByRole('heading', { name: 'New work order' })).toBeVisible();
      await expect(form.getByLabel('Customer', { exact: true }).locator('option:checked')).toContainText(editedCustomerName);
      await expect(form.getByLabel('Property', { exact: true }).locator('option:checked')).toHaveText(editedPropertyName);

      const primaryService = form.getByLabel('Primary Service');
      const primaryServiceName = (await selectFirstNonEmptyOption(primaryService))?.trim() ?? '';
      expect(primaryServiceName.length).toBeGreaterThan(0);

      const addOn = form.locator('.addOnOption').first();
      await expect(addOn).toBeVisible();
      await addOn.getByRole('checkbox').first().check();
      const quantity = addOn.getByLabel('Quantity');
      if (await quantity.count()) await quantity.fill('2');
      const capacityCheck = addOn.getByLabel('Labour/time capacity checked for this job');
      if (await capacityCheck.count()) await capacityCheck.check();
      const addOnName = (await addOn.locator('span').first().textContent())?.trim() ?? '';

      await form.getByLabel('Frequency').selectOption('ONE_TIME');
      await form.getByLabel('Home Condition').selectOption('STANDARD');
      await form.getByLabel('Job-specific instructions').fill(`Disposable LR-1B Bundle 2 direct Work Order for ${editedPropertyName}.`);
      await form.getByLabel('Priority').selectOption('NORMAL');
      await form.getByLabel('Scheduled at').fill(tomorrowAt(9));
      await form.getByRole('button', { name: 'Save work order' }).click();

      await expect(primaryService).toHaveValue('');
      await page.goto('/work-orders', { waitUntil: 'domcontentloaded' });
      const search = page.getByPlaceholder('Reference, customer, property or service');
      await search.fill(editedPropertyName);
      let row = page.locator('.dataRow').filter({ hasText: editedPropertyName }).first();
      await expect(row).toBeVisible();
      await expect(row).toContainText(primaryServiceName);
      if (addOnName) await expect(row).toContainText(addOnName.split('Inactive')[0].trim());
      await expect(row).toContainText('One-time');
      await expect(row).toContainText('NEW');

      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.getByPlaceholder('Reference, customer, property or service').fill(editedPropertyName);
      row = page.locator('.dataRow').filter({ hasText: editedPropertyName }).first();
      await expect(row).toBeVisible();
      await expect(row).toContainText(primaryServiceName);
    });
  });
});