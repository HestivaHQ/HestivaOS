import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const sources = [
  'playwright.acceptance.config.mjs',
  'scripts/validate-lr1b-acceptance-env.mjs',
  'scripts/wait-for-lr1b-deployment.mjs',
  'tests/acceptance/role-auth.setup.mjs',
  'tests/acceptance/acceptance-guard.mjs',
  'tests/acceptance/admin-interface.spec.mjs',
  'tests/acceptance/admin-office-cycle.spec.mjs',
  'tests/acceptance/admin-property-preselection-diagnostic.spec.mjs',
  'tests/acceptance/admin-workforce.spec.mjs',
  'tests/acceptance/supervisor-interface.spec.mjs',
  'tests/acceptance/technician-lead-interface.spec.mjs',
  'tests/acceptance/technician-member-interface.spec.mjs',
];

test('LR-1B acceptance JavaScript sources are syntactically valid', () => {
  for (const path of sources) execFileSync(process.execPath, ['--check', new URL(`../${path}`, import.meta.url).pathname], { stdio: 'pipe' });
});

test('Bundle 2 locates wrapped Customer and Property selects by form structure', async () => {
  const [officeCycle, propertyDiagnostic] = await Promise.all([
    read('tests/acceptance/admin-office-cycle.spec.mjs'),
    read('tests/acceptance/admin-property-preselection-diagnostic.spec.mjs'),
  ]);

  assert.doesNotMatch(officeCycle, /getByLabel\(['"](?:Customer|Property)['"],\s*\{\s*exact:\s*true\s*\}\)/);
  assert.doesNotMatch(propertyDiagnostic, /getByLabel\(['"]Customer['"],\s*\{\s*exact:\s*true\s*\}\)/);
  assert.match(officeCycle, /locator\('label', \{ hasText: new RegExp\(`/);
  assert.match(propertyDiagnostic, /locator\('label', \{ hasText: \/\^Customer\\b\/ \}\)\.locator\('select'\)/);
});

test('LR-1B acceptance stays deployment-gated, role-isolated, credential-safe and Meta-excluded', async () => {
  const [workflow, config, validator, deploymentVerifier, auth, guard, login, workforce] = await Promise.all([
    read('../../.github/workflows/lr1b-operational-acceptance.yml'),
    read('playwright.acceptance.config.mjs'),
    read('scripts/validate-lr1b-acceptance-env.mjs'),
    read('scripts/wait-for-lr1b-deployment.mjs'),
    read('tests/acceptance/role-auth.setup.mjs'),
    read('tests/acceptance/acceptance-guard.mjs'),
    read('app/login/page.tsx'),
    read('tests/acceptance/admin-workforce.spec.mjs'),
  ]);

  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /push:[\s\S]{0,80}branches:[\s\S]{0,80}- main/);
  assert.doesNotMatch(workflow, /\npull_request:/);
  assert.doesNotMatch(workflow, /\nschedule:/);
  assert.match(workflow, /RUN LR1B ACCEPTANCE/);
  assert.match(workflow, /vars\.HESTIVA_LR1B_AUTOMATION_ENABLED == 'true'/);
  assert.match(workflow, /github\.event_name == 'workflow_dispatch' && inputs\.scope == 'full'/);
  assert.match(workflow, /github\.event_name == 'push'/);
  assert.match(workflow, /hestivaos-production-lr1b/);
  assert.match(workflow, /cancel-in-progress: false/);
  assert.match(workflow, /wait-for-lr1b-deployment\.mjs/);
  assert.match(workflow, /retention-days: 3/);
  assert.match(workflow, /actions\/checkout@v6/);
  assert.match(workflow, /actions\/setup-node@v7/);
  assert.match(workflow, /node-version: 24/);
  assert.doesNotMatch(workflow, /actions\/(?:checkout|setup-node)@v4/);
  assert.match(workflow, /secrets\.HESTIVA_LR1B_ADMIN_EMAIL/);
  assert.match(workflow, /secrets\.HESTIVA_LR1B_SUPERVISOR_EMAIL/);
  assert.match(workflow, /secrets\.HESTIVA_LR1B_TECHNICIAN_LEAD_EMAIL/);
  assert.match(workflow, /secrets\.HESTIVA_LR1B_TECHNICIAN_MEMBER_EMAIL/);
  assert.doesNotMatch(workflow, /META_|WHATSAPP_|MESSENGER_|FACEBOOK_/);

  assert.match(config, /name: 'admin-desktop'/);
  assert.match(config, /name: 'supervisor-desktop'/);
  assert.match(config, /name: 'technician-lead-mobile'/);
  assert.match(config, /name: 'technician-member-mobile'/);
  assert.match(config, /trace: 'retain-on-failure'/);
  assert.match(config, /screenshot: 'only-on-failure'/);
  assert.match(config, /video: 'off'/);
  assert.match(config, /workers: 1/);

  assert.match(deploymentVerifier, /HESTIVA_LR1B_EXPECTED_SHA/);
  assert.match(deploymentVerifier, /\/api\/revision/);
  assert.match(deploymentVerifier, /\/api\/v1\/ready/);
  assert.match(deploymentVerifier, /webRevision === expected && apiRevision === expected && apiReady/);
  assert.doesNotMatch(deploymentVerifier, /password|token|secret/i);

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
  assert.match(workforce, /getByLabel\('Linked Technician'\)[\s\S]{0,160}hasText: visibleName/);
  assert.match(workforce, /getByLabel\('Employee record'\)[\s\S]{0,120}hasText: reference/);
  assert.match(workforce, /await expect\(card\)\.toBeVisible\(\)/);
  assert.doesNotMatch(workforce, /waitForResponse/);
  assert.doesNotMatch(workforce, /employeeCard[\s\S]{0,80}hasText: email/);
  assert.match(workforce, /async function selectOptionByText/);
  assert.match(workforce, /selectOptionByText\(panel\.getByLabel\('Employee record'\)/);
  assert.doesNotMatch(workforce, /selectOption\(\{ label: new RegExp/);
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