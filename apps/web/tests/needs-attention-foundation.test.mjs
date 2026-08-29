import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('dashboard hierarchy starts with Needs Attention then Today work before shortcuts and upcoming', () => {
  const source = read('app/(authenticated)/page.tsx');
  const attention = source.indexOf('title="Needs Attention"');
  const today = source.indexOf('title="Today’s Work"');
  const shortcuts = source.indexOf('id="shortcuts-title"');
  const upcoming = source.indexOf('title="Upcoming Work"');
  assert.ok(attention >= 0 && attention < today);
  assert.ok(today < shortcuts);
  assert.ok(shortcuts < upcoming);
  assert.doesNotMatch(source, /Alerts \/ Action Required/);
});

test('Needs Attention provides Mine All, Seen, ownership and direct Work Order action', () => {
  const source = read('app/components/attention-panel.tsx');
  assert.match(source, /'mine', 'all'/);
  assert.match(source, /Mark seen/);
  assert.match(source, /Unassigned queue/);
  assert.match(source, /eligibleQueues\.includes\(item\.queue\)/);
  assert.match(source, /item\.actionHref/);
});

test('initial producers are limited to authoritative current Work Order conditions', () => {
  const source = read('../api/src/attention/attention.service.ts');
  assert.match(source, /assignedTechnicians:\s*\{ none: \{\} \}/);
  assert.match(source, /scheduledAt:\s*\{ lt: todayStart \}/);
  assert.match(source, /completionAcknowledgedAt:\s*null/);
  assert.doesNotMatch(source, /PAYMENT_ATTENTION|CORRESPONDENCE_FAILURE|ACCESS_CREDENTIAL_MISSING/);
});
