import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const sources = [
  'playwright.acceptance.config.mjs',
  'scripts/validate-lr1b-acceptance-env.mjs',
  'tests/acceptance/role-auth.setup.mjs',
  'tests/acceptance/acceptance-guard.mjs',
  'tests/acceptance/admin-interface.spec.mjs',
  'tests/acceptance/supervisor-interface.spec.mjs',
  'tests/acceptance/technician-lead-interface.spec.mjs',
  'tests/acceptance/technician-member-interface.spec.mjs',
];

test('LR-1B acceptance JavaScript sources are syntactically valid', () => {
  for (const path of sources) {
    execFileSync(process.execPath, ['--check', new URL(`../${path}`, import.meta.url).pathname], { stdio: 'pipe' });
  }
});

test('LR-1B acceptance stays manual, role-isolated, credential-safe and Meta-excluded', async () => {
  const [workflow, config, validator, auth, guard] = await Promise.all([
    read('../../.github/workflows/lr1b-operational-acceptance.yml'),
    read('playwright.acceptance.config.mjs'),
    read('scripts/validate-lr1b-acceptance-env.mjs'),
    read('tests/acceptance/role-auth.setup.mjs'),
    read('tests/acceptance/acceptance-guard.mjs'),
  ]);

  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /\npull_request:/);
  assert.doesNotMatch(workflow, /\npush:/);
  assert.doesNotMatch(workflow, /\nschedule:/);
  assert.match(workflow, /RUN LR1B ACCEPTANCE/);
  assert.match(workflow, /secrets\.HESTIVA_LR1B_ADMIN_EMAIL/);
  assert.match(workflow, /secrets\.HESTIVA_LR1B_SUPERVISOR_EMAIL/);
  assert.match(workflow, /secrets\.HESTIVA_LR1B_TECHNICIAN_LEAD_EMAIL/);
  assert.match(workflow, /secrets\.HESTIVA_LR1B_TECHNICIAN_MEMBER_EMAIL/);
  assert.doesNotMatch(workflow, /META_|WHATSAPP_|MESSENGER_|FACEBOOK_/);

  assert.match(config, /name: 'admin-desktop'/);
  assert.match(config, /name: 'supervisor-desktop'/);
  assert.match(config, /name: 'technician-lead-mobile'/);
  assert.match(config, /name: 'technician-member-mobile'/);
  assert.match(config, /trace: 'off'/);
  assert.match(config, /screenshot: 'off'/);
  assert.match(config, /video: 'off'/);

  assert.match(validator, /HESTIVA_LR1B_ACCEPTANCE_ENABLED/);
  assert.match(validator, /distinct email addresses/);
  assert.match(auth, /waitForHydratedLogin\(page\)/);
  assert.match(auth, /Need an account\? Create one/);
  assert.match(auth, /Supabase password sign-in:/);
  assert.match(auth, /storageState\(\{ path: file \}\)/);
  assert.doesNotMatch(auth, /console\.log\(/);
  assert.doesNotMatch(auth, /response\.text\(/);
  assert.doesNotMatch(auth, /response\.json\(/);
  assert.doesNotMatch(auth, /postData(?:JSON)?\(/);

  assert.match(guard, /graph\.facebook\.com/);
  assert.match(guard, /manual-replies/);
  assert.match(guard, /\/whatsapp/);
  assert.match(guard, /\/messenger/);
});
