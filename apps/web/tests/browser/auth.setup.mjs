import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test as setup, expect } from '@playwright/test';

const authFile = fileURLToPath(new URL('../../.playwright/auth/admin.json', import.meta.url));

function classifyRequest(url) {
  try {
    const pathname = new URL(url).pathname;
    if (pathname.includes('/auth/v1/token')) return 'supabaseAuth';
    if (pathname.endsWith('/users/sync')) return 'userSync';
  } catch {
    // Ignore malformed/non-http request URLs; they are irrelevant to these diagnostics.
  }
  return null;
}

function describeStage(stage) {
  if (!stage.seen) return 'not observed';
  if (stage.requestFailed) return 'request failed before an HTTP response';
  if (stage.status !== null) return `HTTP ${stage.status}`;
  return 'request observed without a final HTTP status';
}

setup('authenticate browser-audit admin identity', async ({ page }) => {
  const email = process.env.HESTIVA_BROWSER_AUDIT_ADMIN_EMAIL;
  const password = process.env.HESTIVA_BROWSER_AUDIT_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error('Browser audit credentials are not configured. Required names: HESTIVA_BROWSER_AUDIT_ADMIN_EMAIL and HESTIVA_BROWSER_AUDIT_ADMIN_PASSWORD.');
  }

  const diagnostics = {
    supabaseAuth: { seen: false, requestFailed: false, status: null },
    userSync: { seen: false, requestFailed: false, status: null },
  };

  page.on('request', (request) => {
    const stage = classifyRequest(request.url());
    if (stage) diagnostics[stage].seen = true;
  });

  page.on('response', (response) => {
    const stage = classifyRequest(response.url());
    if (!stage) return;
    diagnostics[stage].seen = true;
    if (response.request().method() !== 'OPTIONS') {
      diagnostics[stage].status = response.status();
    }
  });

  page.on('requestfailed', (request) => {
    const stage = classifyRequest(request.url());
    if (!stage) return;
    diagnostics[stage].seen = true;
    diagnostics[stage].requestFailed = true;
  });

  const diagnosticSummary = () =>
    `Supabase password sign-in: ${describeStage(diagnostics.supabaseAuth)}; HestivaOS user sync: ${describeStage(diagnostics.userSync)}.`;

  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  const loginStatus = page.getByRole('status');
  const deadline = Date.now() + 20_000;

  while (Date.now() < deadline) {
    if (!new URL(page.url()).pathname.startsWith('/login')) break;

    if (await loginStatus.isVisible().catch(() => false)) {
      const message = (await loginStatus.textContent())?.trim() || 'Login page reported an unspecified status.';
      throw new Error(`Browser audit sign-in failed while still on /login. UI status: ${JSON.stringify(message)} ${diagnosticSummary()}`);
    }

    await page.waitForTimeout(250);
  }

  if (new URL(page.url()).pathname.startsWith('/login')) {
    throw new Error(`Browser audit sign-in timed out while still on /login. ${diagnosticSummary()}`);
  }

  await expect(page.locator('.appShell')).toBeVisible();

  await mkdir(dirname(authFile), { recursive: true });
  await page.context().storageState({ path: authFile });
});
