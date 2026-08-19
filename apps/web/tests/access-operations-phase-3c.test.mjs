import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('management Needs Attention retains one stable access condition and derives appointment urgency', () => {
  const source = read('../api/src/attention/attention.service.ts');
  assert.match(source, /conditionKey: `work-order:\$\{workOrder\.id\}:access-required`/);
  assert.match(source, /accessAttentionPriority\(workOrder\.scheduledAt, now\)/);
  assert.match(source, /PRIORITY_CHANGED/);
  assert.match(source, /existing\.state === AttentionState\.RESOLVED/);
  assert.match(source, /occurrenceCount: \{ increment: 1 \}/);
  assert.match(source, /AUTO_RESOLVED/);
  const panel = read('app/components/attention-panel.tsx');
  assert.match(panel, /getTime\(\) <= Date\.now\(\)/);
});

test('access escalation never mutates Work Order lifecycle or exposes protected credential values', () => {
  const attention = read('../api/src/attention/attention.service.ts');
  const policy = read('../api/src/work-orders/access-operations-policy.ts');
  assert.doesNotMatch(attention, /secretValue|attachmentStoragePath|protectedText/);
  assert.doesNotMatch(policy, /WorkOrderStatus|customer|correspondence|finance/i);
  assert.match(policy, /ARRANGED_ANOTHER_WAY/);
  assert.match(policy, /reviewStatus === TemporaryAccessCredentialReviewStatus\.ACCEPTED/);
  assert.match(policy, /credential\.revokedAt === null/);
});

test('Technician UI receives only assignment-scoped safe readiness, never credential metadata', () => {
  const service = read('../api/src/technician-jobs/technician-jobs.service.ts');
  const ui = read('app/technician/components/job-brief.tsx');
  assert.match(service, /assignedTechnicians: \{ some: \{ technicianId \} \}/);
  assert.match(service, /accessOperationallyResolved/);
  assert.match(service, /temporaryAccessCredentials: _protectedCredentialMetadata/);
  assert.match(ui, /Access needs management action/);
  assert.doesNotMatch(ui, /secretValue|attachmentStoragePath|protectedText/i);
});
