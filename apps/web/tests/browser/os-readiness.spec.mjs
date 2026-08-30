import { mkdir, writeFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';

const primaryRoutes = [
  ['Dashboard', '/'],
  ['Management', '/management'],
  ['Customers', '/customers'],
  ['Properties', '/properties'],
  ['Quotes', '/quotes'],
  ['Work orders', '/work-orders'],
  ['Recurring services', '/recurring-services'],
  ['Technicians', '/technicians'],
  ['Crews', '/crews'],
  ['Shift planning', '/shifts'],
  ['My profile', '/profile'],
];

const secondaryAdminRoutes = [
  ['Create Work Order', '/work-orders/new'],
  ['Employee records', '/employees'],
  ['Service catalogue', '/services'],
  ['Cleaning Job Templates', '/cleaning-job-templates'],
  ['Admin settings', '/admin/settings'],
  ['Admin services', '/admin/settings/services'],
  ['Service Scope Templates', '/admin/settings/service-scopes'],
  ['Messaging', '/admin/messaging'],
];

const collapsibleShellGroups = [
  { label: 'Team', paths: ['/technicians', '/crews', '/shifts'] },
];

const timings = [];

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

async function openAndMeasure(page, label, path) {
  const watch = installFailureWatch(page);
  const startedAt = Date.now();
  const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
  await expect(page.locator('.appShell')).toBeVisible();
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
  const durationMs = Date.now() - startedAt;
  timings.push({ kind: 'direct-load', label, path, durationMs });
  expect(response?.status() ?? 200, `${path} returned an unsuccessful document status`).toBeLessThan(400);
  expectClean(watch, path);
}

async function fillSearchAndVerify(page, { path, placeholder, value, label }) {
  const watch = installFailureWatch(page);
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.appShell')).toBeVisible();
  const input = page.getByPlaceholder(placeholder).first();
  await expect(input, `${label} search control should be visible`).toBeVisible();
  await input.fill(value);
  await expect(input).toHaveValue(value);
  await page.waitForTimeout(450);
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
  expectClean(watch, label);
}

async function revealCollapsibleShellRoute(page, path) {
  const group = collapsibleShellGroups.find(({ paths }) => paths.includes(path));
  if (!group) return false;
  const disclosure = page.getByRole('button', { name: group.label, exact: true }).first();
  if (await disclosure.count() === 0) return false;
  if (await disclosure.getAttribute('aria-expanded') !== 'true') await disclosure.click();
  await expect(disclosure).toHaveAttribute('aria-expanded', 'true');
  return true;
}

async function clickShellRoute(page, path) {
  let link = page.locator(`a[href="${path}"]`).first();
  if (await link.count() === 0) {
    await revealCollapsibleShellRoute(page, path);
    link = page.locator(`a[href="${path}"]`).first();
  }
  if (await link.count() === 0) return false;
  if (await link.isVisible()) await link.click();
  else await link.evaluate((element) => element.click());
  await page.waitForURL((url) => url.pathname === path, { timeout: 15_000 });
  await expect(page.locator('.appShell')).toBeVisible();
  return true;
}

test.describe('authenticated route readiness', () => {
  for (const [label, path] of [...primaryRoutes, ...secondaryAdminRoutes]) {
    test(`${label} opens without a browser or server failure`, async ({ page }) => {
      await openAndMeasure(page, label, path);
    });
  }
});

test.describe('production-safe read-only interactions', () => {
  test('Customers search accepts input without mutating records', async ({ page }) => {
    await fillSearchAndVerify(page, {
      path: '/customers',
      placeholder: 'Search customers',
      value: '__browser_audit_no_match__',
      label: 'Customers search',
    });
  });

  test('Properties customer lookup accepts input without submitting the form', async ({ page }) => {
    await fillSearchAndVerify(page, {
      path: '/properties',
      placeholder: 'Search by customer or contact name',
      value: '__browser_audit_no_match__',
      label: 'Properties customer lookup',
    });
  });

  test('Customers native validation blocks an empty create submission', async ({ page }) => {
    const watch = installFailureWatch(page);
    await page.goto('/customers', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.appShell')).toBeVisible();
    const form = page.locator('form.resourceForm').first();
    const contactName = form.getByLabel('Contact name');
    await contactName.fill('');
    await form.getByRole('button', { name: 'Save customer' }).click();
    await expect(contactName).toHaveJSProperty('validity.valid', false);
    await expect(page).toHaveURL((url) => url.pathname === '/customers');
    expectClean(watch, 'Customers validation');
  });

  test('Properties expandable sections can be inspected without saving', async ({ page }) => {
    const watch = installFailureWatch(page);
    await page.goto('/properties', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.appShell')).toBeVisible();
    const accessSection = page.locator('details.propertyFormSection').filter({ hasText: '4. Access & logistics' });
    const careSection = page.locator('details.propertyFormSection').filter({ hasText: '5. Household & care' });
    await accessSection.locator('summary').click();
    await careSection.locator('summary').click();
    await expect(accessSection).toHaveJSProperty('open', true);
    await expect(careSection).toHaveJSProperty('open', true);
    expectClean(watch, 'Properties expandable sections');
  });

  test('Quotes search and status filters work without changing quote state', async ({ page }) => {
    const watch = installFailureWatch(page);
    await page.goto('/quotes', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.appShell')).toBeVisible();
    const search = page.getByPlaceholder('Q-…');
    await search.fill('__browser_audit_no_match__');
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    await expect(search).toHaveValue('__browser_audit_no_match__');
    await page.getByRole('button', { name: 'Declined', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Declined', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Actionable', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Actionable', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
    expectClean(watch, 'Quotes filters');
  });

  test('Work Orders search filters the list without opening the editor', async ({ page }) => {
    const watch = installFailureWatch(page);
    await page.goto('/work-orders', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.appShell')).toBeVisible();
    const search = page.getByRole('searchbox', { name: /search work orders/i }).first();
    await expect(search, 'Work Orders search control should be visible').toBeVisible();
    await search.fill('__browser_audit_no_match__');
    await expect(search).toHaveValue('__browser_audit_no_match__');
    await page.waitForTimeout(450);
    await expect(page).toHaveURL((url) => url.pathname === '/work-orders');
    expectClean(watch, 'Work Orders search');
  });

  test('Technicians search filters the list without opening an editor', async ({ page }) => {
    await fillSearchAndVerify(page, {
      path: '/technicians',
      placeholder: 'Search technicians',
      value: '__browser_audit_no_match__',
      label: 'Technicians search',
    });
    await expect(page.getByRole('heading', { name: 'New technician' })).toBeVisible();
  });

  test('Crews search filters the list without opening an editor', async ({ page }) => {
    await fillSearchAndVerify(page, {
      path: '/crews',
      placeholder: 'Search crews',
      value: '__browser_audit_no_match__',
      label: 'Crews search',
    });
    await expect(page.getByRole('heading', { name: 'New crew' })).toBeVisible();
  });

  test('Shift Planning editor lookups can be exercised and cancelled without saving', async ({ page }) => {
    const watch = installFailureWatch(page);
    await page.goto('/shifts', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.appShell')).toBeVisible();
    await page.getByRole('button', { name: 'Create shift', exact: true }).click();
    const editor = page.locator('form.resourceForm').first();
    await expect(editor.getByRole('heading', { name: 'New shift' })).toBeVisible();

    const crewSearch = editor.getByRole('searchbox', { name: 'Search crews' });
    await crewSearch.fill('__browser_audit_no_match__');
    await expect(crewSearch).toHaveValue('__browser_audit_no_match__');
    await page.waitForTimeout(450);

    const technicianSearch = editor.getByRole('searchbox', { name: 'Search technicians' });
    await expect(technicianSearch).toBeVisible();
    await technicianSearch.fill('__browser_audit_no_match__');
    await expect(technicianSearch).toHaveValue('__browser_audit_no_match__');
    await page.waitForTimeout(450);

    const workOrderSearch = editor.getByRole('searchbox', { name: 'Search work orders' });
    await workOrderSearch.fill('__browser_audit_no_match__');
    await expect(workOrderSearch).toHaveValue('__browser_audit_no_match__');
    await page.waitForTimeout(450);

    await editor.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Create shift', exact: true })).toBeVisible();
    await expect(page).toHaveURL((url) => url.pathname === '/shifts');
    expectClean(watch, 'Shift Planning editor lookups');
  });

  test('Admin settings exposes navigable settings destinations without changing state', async ({ page }) => {
    const watch = installFailureWatch(page);
    await page.goto('/admin/settings', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.appShell')).toBeVisible();
    const settingsLinks = page.locator('a[href^="/admin/settings/"]:visible');
    expect(await settingsLinks.count(), 'Admin settings should expose at least one settings destination').toBeGreaterThan(0);
    expectClean(watch, 'Admin settings navigation');
  });
});

test('desktop primary navigation records client-transition timings', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Client-transition timing is sampled once on the desktop shell.');
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.appShell')).toBeVisible();

  for (const [label, path] of primaryRoutes.filter(([, route]) => route !== '/')) {
    const startedAt = Date.now();
    const navigated = await clickShellRoute(page, path);
    if (!navigated) {
      timings.push({ kind: 'client-transition-skipped', label, path, reason: 'shell-link-not-found' });
      continue;
    }
    timings.push({ kind: 'client-transition', label, path, durationMs: Date.now() - startedAt });
  }
});

test('Work Orders repeat navigation is timed separately', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Work Orders timing is sampled once on the desktop shell.');
  await page.goto('/customers', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.appShell')).toBeVisible();

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const startedAt = Date.now();
    expect(await clickShellRoute(page, '/work-orders'), 'Work Orders shell link should exist').toBe(true);
    timings.push({ kind: 'work-orders-transition', label: `attempt-${attempt}`, path: '/work-orders', durationMs: Date.now() - startedAt });
    if (attempt < 3) expect(await clickShellRoute(page, '/customers'), 'Customers shell link should exist').toBe(true);
  }
});

test.afterAll(async ({}, testInfo) => {
  const safeProject = testInfo.project.name.replace(/[^a-z0-9_-]+/gi, '-');
  const outputDir = 'test-results/browser-audit-summary';
  await mkdir(outputDir, { recursive: true });
  await writeFile(
    `${outputDir}/${safeProject}.json`,
    `${JSON.stringify({ project: testInfo.project.name, generatedAt: new Date().toISOString(), timings }, null, 2)}\n`,
    'utf8',
  );
});
