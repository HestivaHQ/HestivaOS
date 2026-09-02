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
  'tests/acceptance/admin-workforce.spec.mjs',
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
  const [workflow, config, validator, auth, guard, login, workforce] = await Promise.all([
    read('../../.github/workflows/lr1b-operational-acceptance.yml'),
    read('playwright.acceptance.config.mjs'),
    read('scripts/validate-lr1b-acceptance-env.mjs'),
    read('tests/acceptance/role-auth.setup.mjs'),
    read('tests/acceptance/acceptance-guard.mjs'),
    read('app/login/page.tsx'),
    read('tests/acceptance/admin-workforce.spec.mjs'),
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
  assert.match(auth, /setup\.describe\.configure\(\{ mode: 'serial' \}\)/);
  assert.match(auth, /waitForLoginReady\(page\)/);
  assert.match(auth, /toBeEnabled\(\{ timeout: 12_000 \}\)/);
  assert.doesNotMatch(auth, /dispatchEvent/);
  assert.doesNotMatch(auth, /Need an account\? Create one/);
  assert.match(auth, /Supabase password sign-in:/);
  assert.match(auth, /storageState\(\{ path: file \}\)/);
  assert.doesNotMatch(auth, /console\.log\(/);
  assert.doesNotMatch(auth, /response\.text\(/);
  assert.doesNotMatch(auth, /response\.json\(/);
  assert.doesNotMatch(auth, /postData(?:JSON)?\(/);

  const adminAuth = auth.indexOf("setup('authenticate LR-1B admin identity'");
  const bootstrap = auth.indexOf('bootstrap LR-1B ${role} identity through normal sign-in');
  const provision = auth.indexOf("setup('ADMIN provisions LR-1B workforce roles and access through User Access'");
  const roleAuth = auth.indexOf('authenticate LR-1B ${role} identity after ADMIN provisioning');
  assert.ok(adminAuth >= 0 && bootstrap > adminAuth && provision > bootstrap && roleAuth > provision);
  assert.match(auth, /page\.goto\('\/admin\/settings\/user-access'/);
  assert.match(auth, /getByLabel\('Application role'\)/);
  assert.match(auth, /selectOption\(desiredRole\)/);
  assert.match(auth, /getByRole\('button', \{ name: 'Enable access' \}\)/);
  assert.match(auth, /installAcceptanceSafetyGuard\(page\)/);

  assert.match(login, /useEffect\(\(\) => \{/);
  assert.match(login, /setHydrated\(true\)/);
  assert.match(login, /disabled=\{!interactive\}/);
  assert.match(login, /if \(!hydrated \|\| submissionInFlight\.current\) return/);

  assert.match(workforce, /page\.goto\('\/technicians'/);
  assert.match(workforce, /page\.goto\('\/employees'/);
  assert.match(workforce, /Save workforce links/);
  assert.match(workforce, /page\.goto\('\/crews'/);
  assert.match(workforce, /Crew leader/);
  assert.match(workforce, /page\.goto\('\/shifts'/);
  assert.match(workforce, /Create shift/);
  assert.match(workforce, /Copy/);
  assert.match(workforce, /Delete/);
  assert.match(workforce, /installAcceptanceSafetyGuard\(page\)/);
  assert.doesNotMatch(workforce, /createClient\(|supabase|prisma|DATABASE_URL|fetch\(/i);
  assert.doesNotMatch(workforce, /graph\.facebook\.com|whatsapp|messenger/i);

  assert.match(guard, /graph\.facebook\.com/);
  assert.match(guard, /manual-replies/);
  assert.match(guard, /\/whatsapp/);
  assert.match(guard, /\/messenger/);
});
