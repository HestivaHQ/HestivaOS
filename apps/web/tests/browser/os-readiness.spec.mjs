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
  expect(watch.pageErrors, `${path} raised browser page errors`).toEqual([]);
  expect(watch.serverErrors, `${path} received HTTP 5xx responses`).toEqual([]);
}

test.describe('authenticated route readiness', () => {
  for (const [label, path] of [...primaryRoutes, ...secondaryAdminRoutes]) {
    test(`${label} opens without a browser or server failure`, async ({ page }) => {
      await openAndMeasure(page, label, path);
    });
  }
});

test('desktop primary navigation records client-transition timings', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Client-transition timing is sampled once on the desktop shell.');
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.appShell')).toBeVisible();

  for (const [label, path] of primaryRoutes.filter(([, route]) => route !== '/')) {
    const link = page.locator(`a[href="${path}"]`).filter({ visible: true }).first();
    if (await link.count() === 0) {
      timings.push({ kind: 'client-transition-skipped', label, path, reason: 'visible-link-not-found' });
      continue;
    }
    const startedAt = Date.now();
    await link.click();
    await page.waitForURL((url) => url.pathname === path, { timeout: 15_000 });
    await expect(page.locator('.appShell')).toBeVisible();
    const durationMs = Date.now() - startedAt;
    timings.push({ kind: 'client-transition', label, path, durationMs });
  }
});

test('Work Orders repeat navigation is timed separately', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Work Orders timing is sampled once on the desktop shell.');
  await page.goto('/customers', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.appShell')).toBeVisible();

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const workOrdersLink = page.locator('a[href="/work-orders"]').filter({ visible: true }).first();
    const startedAt = Date.now();
    await workOrdersLink.click();
    await page.waitForURL((url) => url.pathname === '/work-orders', { timeout: 15_000 });
    await expect(page.locator('.appShell')).toBeVisible();
    timings.push({ kind: 'work-orders-transition', label: `attempt-${attempt}`, path: '/work-orders', durationMs: Date.now() - startedAt });
    if (attempt < 3) {
      const customersLink = page.locator('a[href="/customers"]').filter({ visible: true }).first();
      await customersLink.click();
      await page.waitForURL((url) => url.pathname === '/customers', { timeout: 15_000 });
    }
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
