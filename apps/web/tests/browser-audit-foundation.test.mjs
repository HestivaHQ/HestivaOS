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
  assert.match(workflow, /browser-audit-summary/);
  assert.doesNotMatch(workflow, /playwright-report/);
  assert.doesNotMatch(workflow, /storageState/);

  assert.match(config, /trace: 'off'/);
  assert.match(config, /screenshot: 'off'/);
  assert.match(config, /video: 'off'/);
  assert.match(auth, /storageState\(\{ path: authFile \}\)/);
  assert.doesNotMatch(auth, /console\.log\(.*password/i);
  assert.match(readiness, /work-orders-transition/);
  assert.match(readiness, /HTTP 5xx responses/);
  assert.doesNotMatch(readiness, /response\.text\(/);
  assert.doesNotMatch(readiness, /response\.json\(/);
});
