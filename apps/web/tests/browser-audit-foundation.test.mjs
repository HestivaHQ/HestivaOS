import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const browserFiles = [
  'playwright.config.mjs',
  'tests/browser/auth.setup.mjs',
  'tests/browser/os-readiness.spec.mjs',
  'scripts/validate-browser-audit-env.mjs',
];

test('browser audit JavaScript sources are syntactically valid', () => {
  for (const path of browserFiles) {
    execFileSync(process.execPath, ['--check', new URL(`../${path}`, import.meta.url).pathname], { stdio: 'pipe' });
  }
});

test('browser audit remains manual, read-only and credential-safe by construction', async () => {
  const [workflow, config, auth, readiness] = await Promise.all([
    read('../../.github/workflows/os-browser-audit.yml'),
    read('playwright.config.mjs'),
    read('tests/browser/auth.setup.mjs'),
    read('tests/browser/os-readiness.spec.mjs'),
  ]);

  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /\nschedule:/);
  assert.match(workflow, /secrets\.HESTIVA_BROWSER_AUDIT_ADMIN_EMAIL/);
  assert.match(workflow, /secrets\.HESTIVA_BROWSER_AUDIT_ADMIN_PASSWORD/);
  assert.match(workflow, /path: test-results\/browser-audit-summary\/\*\.json/);
  assert.match(workflow, /if-no-files-found: error/);
  assert.doesNotMatch(workflow, /playwright-report/);
  assert.doesNotMatch(workflow, /storageState/);

  assert.match(config, /trace: 'off'/);
  assert.match(config, /screenshot: 'off'/);
  assert.match(config, /video: 'off'/);
  assert.match(auth, /storageState\(\{ path: authFile \}\)/);
  assert.match(auth, /Supabase password sign-in:/);
  assert.match(auth, /HestivaOS user sync:/);
  assert.match(auth, /response\.status\(\)/);
  assert.doesNotMatch(auth, /response\.text\(/);
  assert.doesNotMatch(auth, /response\.json\(/);
  assert.doesNotMatch(auth, /console\.log\(/);
  assert.doesNotMatch(auth, /password\s*[:=].*console/i);
  assert.match(readiness, /production-safe read-only interactions/);
  assert.match(readiness, /Customers search accepts input without mutating records/);
  assert.match(readiness, /Customers native validation blocks an empty create submission/);
  assert.match(readiness, /Properties expandable sections can be inspected without saving/);
  assert.match(readiness, /Quotes search and status filters work without changing quote state/);
  assert.match(readiness, /Work Orders search filters the list without opening the editor/);
  assert.match(readiness, /getByRole\('searchbox', \{ name: \/search work orders\/i \}\)/);
  assert.match(readiness, /Technicians search filters the list without opening an editor/);
  assert.match(readiness, /placeholder: 'Search technicians'/);
  assert.match(readiness, /Crews search filters the list without opening an editor/);
  assert.match(readiness, /placeholder: 'Search crews'/);
  assert.match(readiness, /Shift Planning editor lookups can be exercised and cancelled without saving/);
  assert.match(readiness, /getByRole\('button', \{ name: 'Create shift', exact: true \}\)/);
  assert.match(readiness, /getByRole\('searchbox', \{ name: 'Search crews' \}\)/);
  assert.match(readiness, /getByRole\('searchbox', \{ name: 'Search technicians' \}\)/);
  assert.match(readiness, /getByRole\('searchbox', \{ name: 'Search work orders' \}\)/);
  assert.match(readiness, /getByRole\('button', \{ name: 'Cancel', exact: true \}\)/);
  assert.match(readiness, /Admin settings exposes navigable settings destinations without changing state/);
  assert.match(readiness, /const collapsibleShellGroups/);
  assert.match(readiness, /label: 'Team'/);
  assert.match(readiness, /async function revealCollapsibleShellRoute/);
  assert.match(readiness, /aria-expanded/);
  assert.match(readiness, /async function clickShellRoute/);
  assert.match(readiness, /element\.click\(\)/);
  assert.match(readiness, /shell-link-not-found/);
  assert.match(readiness, /work-orders-transition/);
  assert.match(readiness, /HTTP 5xx responses/);
  assert.doesNotMatch(readiness, /response\.text\(/);
  assert.doesNotMatch(readiness, /response\.json\(/);
  assert.doesNotMatch(readiness, /api\.(?:create|update|delete|send|complete|assign|upload)/);
});
