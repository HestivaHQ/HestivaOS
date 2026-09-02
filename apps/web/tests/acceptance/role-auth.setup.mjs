import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test as setup, expect } from '@playwright/test';
import { installAcceptanceSafetyGuard } from './acceptance-guard.mjs';

const adminIdentity = ['admin', 'HESTIVA_LR1B_ADMIN_EMAIL', 'HESTIVA_LR1B_ADMIN_PASSWORD'];
const workforce = [
  ['supervisor', 'HESTIVA_LR1B_SUPERVISOR_EMAIL', 'HESTIVA_LR1B_SUPERVISOR_PASSWORD', 'SUPERVISOR'],
  ['technician-lead', 'HESTIVA_LR1B_TECHNICIAN_LEAD_EMAIL', 'HESTIVA_LR1B_TECHNICIAN_LEAD_PASSWORD', 'TECHNICIAN'],
  ['technician-member', 'HESTIVA_LR1B_TECHNICIAN_MEMBER_EMAIL', 'HESTIVA_LR1B_TECHNICIAN_MEMBER_PASSWORD', 'TECHNICIAN'],
];

const authFile = (role) => fileURLToPath(new URL(`../../.playwright/acceptance/${role}.json`, import.meta.url));

setup.describe.configure({ mode: 'serial' });

function requiredCredential(name, role) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing LR-1B credentials for ${role}.`);
  return value;
}

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

async function waitForLoginReady(page) {
  // The product keeps login controls disabled until React hydration has completed.
  // Waiting for the real controls to become enabled therefore observes the same
  // readiness boundary a human user sees, without synthetic events or timing guesses.
  await expect(page.getByLabel('Email address')).toBeEnabled({ timeout: 12_000 });
  await expect(page.getByLabel('Password')).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeEnabled();
}

async function authenticateIdentity(page, role, emailName, passwordName) {
  const email = requiredCredential(emailName, role);
  const password = requiredCredential(passwordName, role);
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
  await waitForLoginReady(page);
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
}

async function saveAuthState(page, role) {
  if (role.startsWith('technician') && !new URL(page.url()).pathname.startsWith('/technician')) {
    await page.goto('/technician', { waitUntil: 'domcontentloaded' });
    await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
  }
  const file = authFile(role);
  await mkdir(dirname(file), { recursive: true });
  await page.context().storageState({ path: file });
}

setup('authenticate LR-1B admin identity', async ({ page }) => {
  const [role, emailName, passwordName] = adminIdentity;
  await authenticateIdentity(page, role, emailName, passwordName);
  await saveAuthState(page, role);
});

for (const [role, emailName, passwordName] of workforce) {
  setup(`bootstrap LR-1B ${role} identity through normal sign-in`, async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      await authenticateIdentity(page, role, emailName, passwordName);
    } finally {
      await context.close();
    }
  });
}

setup('ADMIN provisions LR-1B workforce roles and access through User Access', async ({ browser }) => {
  const context = await browser.newContext({ storageState: authFile('admin') });
  const page = await context.newPage();
  installAcceptanceSafetyGuard(page);

  try {
    await page.goto('/admin/settings/user-access', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'User Access' })).toBeVisible();
    const search = page.getByLabel('Search users');

    for (const [role, emailName, , desiredRole] of workforce) {
      const email = requiredCredential(emailName, role);
      await search.fill(email);

      const cards = page.locator('.userAccessCard');
      await expect(cards).toHaveCount(1);
      const card = cards.first();
      await card.getByRole('button', { name: 'Manage' }).click();

      const roleSelect = card.getByLabel('Application role');
      if (await roleSelect.inputValue() !== desiredRole) {
        await roleSelect.selectOption(desiredRole);
        await card.getByRole('button', { name: 'Save role' }).click();
        await expect(page.getByRole('status')).toHaveText('Application role updated.');
        await expect(roleSelect).toHaveValue(desiredRole);
      }

      const enableAccess = card.getByRole('button', { name: 'Enable access' });
      if (await enableAccess.isVisible().catch(() => false)) {
        await enableAccess.click();
        await expect(page.getByRole('status')).toHaveText('OS access enabled.');
      }

      await expect(card.locator('.accessBadge')).toHaveText('Active');
      await card.getByRole('button', { name: 'Close' }).click();
    }
  } finally {
    await context.close();
  }
});

for (const [role, emailName, passwordName] of workforce) {
  setup(`authenticate LR-1B ${role} identity after ADMIN provisioning`, async ({ page }) => {
    await authenticateIdentity(page, role, emailName, passwordName);
    await saveAuthState(page, role);
  });
}
