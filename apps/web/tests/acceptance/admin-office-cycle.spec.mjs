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
let quoteId = '';
let quoteReference = '';

function tomorrowAt(hour = 9) {
  const value = new Date();
  value.setUTCDate(value.getUTCDate() + 1);
  value.setUTCHours(hour, 0, 0, 0);
  return value.toISOString().slice(0, 16);
}

function tomorrowDate() {
  return tomorrowAt(9).slice(0, 10);
}

function websiteQuotePayload() {
  return {
    schemaVersion: '1.0',
    submissionId: crypto.randomUUID(),
    source: 'HESTIVA_WEBSITE',
    submittedAt: new Date().toISOString(),
    customer: {
      fullName: editedCustomerName,
      email: acceptanceEmail,
      mobile: '+27110000000',
      preferredContact: 'EMAIL',
    },
    property: {
      propertyType: 'HOUSE',
      addressLine1: '2 LR1B Acceptance Road',
      suburb: 'Johannesburg',
      postalCode: '2000',
      country: 'South Africa',
      location: { latitude: -26.2041, longitude: 28.0473, accuracyMetres: 100 },
      floorSize: 'FROM_80_TO_99',
      bedrooms: 'TWO',
      bathrooms: 'ONE',
      livingAreas: 'ONE',
      storeys: 'ONE',
      outdoorArea: 'NONE',
      estateClassification: 'NONE',
    },
    request: {
      primaryService: {
        websiteValue: 'Regular Home Cleaning',
        canonicalService: 'Regular Home Cleaning',
      },
      frequency: 'ONE_TIME',
      homeCondition: 'STANDARD',
      addOns: [
        {
          websiteValue: 'Inside oven',
          canonicalService: 'Inside Oven Cleaning',
          quantity: 1,
        },
      ],
      ecoFriendlyProducts: false,
    },
    visit: {
      preferredDate: tomorrowDate(),
      preferredTime: 'MORNING',
      flexibility: 'LR-1B controlled acceptance window.',
      urgency: 'Routine acceptance fixture.',
    },
    access: {
      complexAccess: 'NOT_APPLICABLE',
      keyHandover: 'SOMEONE_WILL_OPEN',
      someonePresent: true,
    },
    household: { hasPets: false },
    safety: {},
    notes: { additionalNotes: 'Disposable LR-1B Quote acceptance fixture.' },
    photos: [],
  };
}

async function postWebsiteQuote(payload, secret = process.env.HESTIVA_LR1B_WEBSITE_INTEGRATION_SECRET) {
  const apiBase = process.env.HESTIVA_LR1B_API_URL?.trim().replace(/\/$/, '');
  if (!apiBase || !secret) throw new Error('LR-1B Quote ingress configuration is unavailable.');
  return fetch(`${apiBase}/api/v1/integrations/website/quotes`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${secret}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

async function selectFirstNonEmptyOption(select) {
  await expect.poll(async () => select.locator('option').count()).toBeGreaterThan(1);
  const option = select.locator('option').nth(1);
  const value = await option.getAttribute('value');
  if (!value) throw new Error('Expected the first selectable option to have a value.');
  await select.selectOption(value);
  return option.textContent();
}

function selectContainingOption(container, value) {
  return container.locator(`select:has(option[value="${value}"])`);
}

async function openPropertySection(form, name) {
  const section = form.locator('details.propertyFormSection').filter({ hasText: name });
  await expect(section).toBeVisible();
  if (!(await section.evaluate((element) => element.open))) await section.locator('summary').click();
  await expect(section).toHaveJSProperty('open', true);
  return section;
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
      const customerSelect = selectContainingOption(form, customerId);
      await expect(customerSelect).toHaveValue(customerId);
      await expect(customerSelect.locator('option:checked')).toContainText(editedCustomerName);

      await form.getByLabel('Property name').fill(propertyName);
      await form.getByLabel('Address', { exact: true }).fill('1 LR1B Acceptance Road');
      await form.getByLabel('City').fill('Johannesburg');
      await form.getByLabel('Postal code').fill('2000');
      const accessSection = await openPropertySection(form, '4. Access & logistics');
      await accessSection.getByLabel('Access notes').fill('Disposable LR-1B access note.');
      await accessSection.getByLabel('Parking notes').fill('Disposable LR-1B parking note.');
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
      const editAccessSection = await openPropertySection(editForm, '4. Access & logistics');
      await expect(editAccessSection.getByLabel('Access notes')).toHaveValue('Disposable LR-1B access note.');
      await expect(editAccessSection.getByLabel('Parking notes')).toHaveValue('Disposable LR-1B parking note.');
      await editAccessSection.getByLabel('Access notes').fill('Disposable LR-1B access note — edited.');
      await editAccessSection.getByLabel('Parking notes').fill('Disposable LR-1B parking note — edited.');
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
      const customerSelect = selectContainingOption(form, customerId);
      const propertySelect = selectContainingOption(form, propertyId);
      await expect(customerSelect).toHaveValue(customerId);
      await expect(customerSelect.locator('option:checked')).toContainText(editedCustomerName);
      await expect(propertySelect).toHaveValue(propertyId);
      await expect(propertySelect.locator('option:checked')).toHaveText(editedPropertyName);

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

  test('Q1 ingests, replays, reviews and revises a controlled Website Quote without correspondence delivery', async ({ page }) => {
    expect(customerId).toMatch(/^[0-9a-f]{8}-[0-9a-f-]{27}$/i);
    expect(propertyId).toMatch(/^[0-9a-f]{8}-[0-9a-f-]{27}$/i);

    const payload = websiteQuotePayload();
    const denied = await postWebsiteQuote(payload, 'lr1b-invalid-integration-secret');
    expect([401, 403]).toContain(denied.status);

    const createdResponse = await postWebsiteQuote(payload);
    expect(createdResponse.ok).toBe(true);
    const created = await createdResponse.json();
    expect(created.created).toBe(true);
    expect(created.submissionId).toBe(payload.submissionId);
    expect(created.quoteId).toMatch(/^[0-9a-f]{8}-[0-9a-f-]{27}$/i);
    expect(created.quoteReference).toMatch(/^Q-\d{8}-\d{4}$/);
    quoteId = created.quoteId;
    quoteReference = created.quoteReference;

    const replayResponse = await postWebsiteQuote(payload);
    expect(replayResponse.ok).toBe(true);
    const replay = await replayResponse.json();
    expect(replay.created).toBe(false);
    expect(replay.quoteId).toBe(quoteId);
    expect(replay.quoteReference).toBe(quoteReference);
    expect(replay.pricing).toEqual(created.pricing);

    await expectNoServerErrors(page, async () => {
      await page.goto(`/quotes/${quoteId}`, { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { name: quoteReference })).toBeVisible();
      await expect(page.getByText('Inside Oven Cleaning', { exact: true }).first()).toBeVisible();
      await page.getByRole('link', { name: 'Resolve pricing review' }).click();
      await expect(page).toHaveURL(new RegExp(`/quotes/${quoteId}/pricing-review$`));
      await page.getByLabel('Oven size').selectOption('STANDARD_SINGLE');
      await page.getByRole('button', { name: 'Save details and recheck Quote' }).click();
      await expect(page.getByRole('status')).toContainText(/Pricing review complete|Revision \d+ saved/);

      await page.goto(`/quotes/${quoteId}`, { waitUntil: 'domcontentloaded' });
      await expect(page.getByText('Version').locator('strong')).toHaveText('2');
      await expect(page.locator('.quoteTimeline')).toContainText('Quote revision created');
    });
  });

  test('Q2 resolves the Quote to the acceptance Customer/Property and verifies accepted Work Order handoff', async ({ page }) => {
    expect(quoteId).toMatch(/^[0-9a-f]{8}-[0-9a-f-]{27}$/i);
    await expectNoServerErrors(page, async () => {
      await page.goto(`/quotes/${quoteId}`, { waitUntil: 'domcontentloaded' });
      const resolution = page.getByRole('form', { name: 'Customer and property decision' });
      await resolution.getByLabel('Use an existing customer').check();
      await resolution.getByLabel('Existing customer').selectOption(customerId);
      await resolution.getByLabel('Use an existing property').check();
      await resolution.getByLabel('Property').selectOption(propertyId);
      await resolution.getByRole('button', { name: 'Save customer & property decision' }).click();
      await expect(page.getByRole('status')).toContainText('Customer and property decision saved.');
      await expect(page.getByRole('heading', { name: 'Ready to accept' })).toBeVisible();

      await page.getByRole('button', { name: 'Review acceptance' }).click();
      const dialog = page.getByRole('dialog', { name: new RegExp(`Accept ${quoteReference}`) });
      await expect(dialog).toBeVisible();
      await dialog.getByRole('button', { name: 'Accept Quote' }).click();
      await expect(page.getByRole('status')).toContainText('Quote accepted.');
      await expect(page.getByRole('heading', { name: 'Accepted records' })).toBeVisible();
      const workOrderLink = page.getByRole('link', { name: 'View work order' });
      await expect(workOrderLink).toBeVisible();
      const workOrderHref = await workOrderLink.getAttribute('href');
      expect(workOrderHref).toMatch(/^\/work-orders\/[0-9a-f-]+$/i);

      await page.reload({ waitUntil: 'domcontentloaded' });
      await expect(page.locator('.quoteStatus')).toContainText('Accepted');
      await page.getByRole('link', { name: 'View work order' }).click();
      await expect(page).toHaveURL(new RegExp(`${workOrderHref}$`));
    });
  });
});