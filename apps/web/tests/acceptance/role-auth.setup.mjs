import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test as setup, expect } from '@playwright/test';

const identities = [
  ['admin', 'HESTIVA_LR1B_ADMIN_EMAIL', 'HESTIVA_LR1B_ADMIN_PASSWORD'],
  ['supervisor', 'HESTIVA_LR1B_SUPERVISOR_EMAIL', 'HESTIVA_LR1B_SUPERVISOR_PASSWORD'],
  ['technician-lead', 'HESTIVA_LR1B_TECHNICIAN_LEAD_EMAIL', 'HESTIVA_LR1B_TECHNICIAN_LEAD_PASSWORD'],
  ['technician-member', 'HESTIVA_LR1B_TECHNICIAN_MEMBER_EMAIL', 'HESTIVA_LR1B_TECHNICIAN_MEMBER_PASSWORD'],
];

const authFile = (role) => fileURLToPath(new URL(`../../.playwright/acceptance/${role}.json`, import.meta.url));

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

async function waitForHydratedLogin(page) {
  // A click before React hydrates falls through to the browser's native GET form
  // submission (`/login?`) instead of running handleSubmit. Exercise the harmless
  // mode toggle first so acceptance never submits credentials until React handlers
  // are demonstrably attached.
  const createAccount = page.getByRole('button', { name: 'Need an account? Create one' });
  await expect(createAccount).toBeVisible();
  await createAccount.click();
  await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();

  await page.getByRole('button', { name: 'Already have an account? Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
}

for (const [role, emailName, passwordName] of identities) {
  setup(`authenticate LR-1B ${role} identity`, async ({ page }) => {
    const email = process.env[emailName];
    const password = process.env[passwordName];
    if (!email || !password) throw new Error(`Missing LR-1B credentials for ${role}.`);

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
      if (response.request().method() !== 'OPTIONS') diagnostics[stage].status = response.status();
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
    await waitForHydratedLogin(page);
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();

    const loginStatus = page.getByRole('status');
    const deadline = Date.now() + 20_000;
    while (Date.now() < deadline) {
      if (!new URL(page.url()).pathname.startsWith('/login')) break;
      if (await loginStatus.isVisible().catch(() => false)) {
        const message = (await loginStatus.textContent())?.trim() || 'Login page reported an unspecified status.';
        throw new Error(`LR-1B ${role} sign-in failed while still on /login. UI status: ${JSON.stringify(message)} ${diagnosticSummary()}`);
      }
      await page.waitForTimeout(250);
    }

    if (new URL(page.url()).pathname.startsWith('/login')) {
      throw new Error(`LR-1B ${role} sign-in timed out while still on /login. ${diagnosticSummary()}`);
    }

    const path = new URL(page.url()).pathname;
    if (role.startsWith('technician') && !path.startsWith('/technician')) {
      await page.goto('/technician', { waitUntil: 'domcontentloaded' });
      await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
    }

    const file = authFile(role);
    await mkdir(dirname(file), { recursive: true });
    await page.context().storageState({ path: file });
  });
}
