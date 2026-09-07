import { test, expect } from '@playwright/test';
import { installAcceptanceSafetyGuard, expectNoServerErrors } from './acceptance-guard.mjs';

const runId = process.env.GITHUB_RUN_ID ?? String(Date.now());
const runAttempt = process.env.GITHUB_RUN_ATTEMPT ?? '1';
const suffix = `${runId}-${runAttempt}`.replace(/[^0-9-]/g, '').slice(-18);
const customerName = `LR1B C2 Diagnostic ${suffix}`;
const editedCustomerName = `${customerName} Updated`;
const acceptanceEmail = `lr1b-c2-${suffix.replaceAll('-', '')}@example.invalid`;

async function searchCustomer(page, name) {
  const search = page.getByPlaceholder('Search customers');
  await search.fill(name);
  const row = page.locator('.dataRow').filter({ hasText: name }).first();
  await expect(row).toBeVisible();
  return row;
}

async function readResponseBody(response) {
  try {
    return (await response.text()).slice(0, 4000);
  } catch {
    return '<unreadable>';
  }
}

test.beforeEach(async ({ page }) => installAcceptanceSafetyGuard(page));

test('C2 diagnostic proves the Customer-to-Property preselection boundary', async ({ page }) => {
  test.setTimeout(90_000);
  await expectNoServerErrors(page, async () => {
    await page.goto('/customers', { waitUntil: 'domcontentloaded' });
    const form = page.locator('form.resourceForm');
    await form.getByLabel('Contact name').fill(customerName);
    await form.getByLabel('Email').fill(acceptanceEmail);
    await form.getByLabel('Phone').fill('+27110000000');
    await form.getByLabel('Status').selectOption('ACTIVE');
    await form.getByLabel('Notes').fill('Disposable targeted LR-1B C2 diagnostic customer.');
    await form.getByRole('button', { name: 'Save customer' }).click();

    await expect(page).toHaveURL(/\/properties\?mode=create&customerId=[0-9a-f-]+$/i);
    const customerId = new URL(page.url()).searchParams.get('customerId') ?? '';
    expect(customerId).toMatch(/^[0-9a-f]{8}-[0-9a-f-]{27}$/i);

    await page.goto('/customers', { waitUntil: 'domcontentloaded' });
    const row = await searchCustomer(page, customerName);
    await row.getByRole('button', { name: 'Edit' }).click();
    const editForm = page.locator('form.resourceForm');
    await editForm.getByLabel('Contact name').fill(editedCustomerName);
    await editForm.getByRole('button', { name: 'Save customer' }).click();
    await expect(editForm.getByRole('heading', { name: 'New customer' })).toBeVisible();
    await searchCustomer(page, editedCustomerName);

    const selectorResponses = [];
    page.on('response', async (response) => {
      if (!response.url().includes('/customers/selector-options')) return;
      selectorResponses.push({
        url: response.url(),
        status: response.status(),
        body: await readResponseBody(response),
      });
    });

    const targetUrl = `/properties?mode=create&customerId=${encodeURIComponent(customerId)}`;
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
    const propertyForm = page.locator('form.resourceForm');
    await expect(propertyForm.getByRole('heading', { name: 'New property' })).toBeVisible();
    const select = propertyForm.locator('label', { hasText: /^Customer\b/ }).locator('select');
    await expect(select).toHaveValue(customerId);

    const renderState = await propertyForm.evaluate((element) => ({
      text: element.innerText.slice(0, 6000),
      labels: Array.from(element.querySelectorAll('label')).map((label) => ({
        text: label.textContent?.trim() ?? '',
        htmlFor: label.htmlFor,
      })),
      controls: Array.from(element.querySelectorAll('input, select, textarea, button')).map((control) => ({
        tag: control.tagName,
        type: control.getAttribute('type'),
        id: control.id,
        name: control.getAttribute('name'),
        value: 'value' in control ? String(control.value) : null,
        ariaLabel: control.getAttribute('aria-label'),
        ariaLabelledBy: control.getAttribute('aria-labelledby'),
        text: control.textContent?.trim().slice(0, 1000) ?? '',
      })),
    }));
    const errorBanner = await page.locator('.errorBanner').allTextContents();
    const selectCount = await select.count();

    let state = null;
    if (selectCount > 0) {
      state = await select.first().evaluate((element) => ({
        value: element.value,
        selectedIndex: element.selectedIndex,
        options: Array.from(element.options).map((option) => ({ value: option.value, text: option.text, selected: option.selected })),
      }));
    }

    const targetOption = state?.options.find((option) => option.value === customerId) ?? null;
    console.log(`[LR1B C2 diagnostic] targetUrl=${page.url()}`);
    console.log(`[LR1B C2 diagnostic] customerId=${customerId} customerControlCount=${selectCount}`);
    console.log(`[LR1B C2 diagnostic] renderState=${JSON.stringify(renderState)}`);
    console.log(`[LR1B C2 diagnostic] selectState=${JSON.stringify(state)}`);
    console.log(`[LR1B C2 diagnostic] errors=${JSON.stringify(errorBanner)} selectorResponses=${JSON.stringify(selectorResponses)}`);

    expect(selectCount, `Property form must expose a Customer control. Diagnostic state: ${JSON.stringify({ renderState, errorBanner, selectorResponses })}`).toBeGreaterThan(0);
    expect(targetOption, `Customer ${customerId} must exist in the Property selector. Diagnostic state: ${JSON.stringify({ state, renderState, errorBanner, selectorResponses })}`).not.toBeNull();
    expect(state?.value, `Property selector must select ${customerId}. Diagnostic state: ${JSON.stringify({ state, renderState, errorBanner, selectorResponses })}`).toBe(customerId);
    expect(targetOption?.text, `Selected Customer label must reflect the persisted edit. Diagnostic state: ${JSON.stringify({ state, renderState, errorBanner, selectorResponses })}`).toContain(editedCustomerName);
  });
});
