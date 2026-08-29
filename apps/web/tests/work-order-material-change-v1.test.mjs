import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const apiSource = await readFile(new URL('../lib/work-order-material-change-api.ts', import.meta.url), 'utf8');
const panelSource = await readFile(new URL('../app/work-orders/[id]/material-change-admin-panel.tsx', import.meta.url), 'utf8');
const pageSource = await readFile(new URL('../app/(authenticated)/work-orders/[id]/page.tsx', import.meta.url), 'utf8');

test('material change client uses the dedicated preview, commit and history contracts', () => {
  assert.match(apiSource, /\/material-change\/preview/);
  assert.match(apiSource, /\/material-change`/);
  assert.match(apiSource, /\/material-changes`/);
  assert.match(apiSource, /operationId: string/);
  assert.match(apiSource, /expectedUpdatedAt: string/);
});

test('Admin surface is consequence-first and does not send customer correspondence directly', () => {
  assert.match(pageSource, /appUser\.role === 'ADMIN'/);
  assert.match(panelSource, /Review consequences/);
  assert.match(panelSource, /Apply reviewed change/);
  assert.match(panelSource, /Required imminent-change override reason/);
  assert.match(panelSource, /Financial review boundary/);
  assert.doesNotMatch(panelSource, /sendEmail|sendWhatsApp|sendSms/);
});

test('Admin surface uses controlled selections instead of free-form identifiers', () => {
  assert.match(panelSource, /Customer<select/);
  assert.match(panelSource, /Property<select/);
  assert.match(panelSource, /Primary service<select/);
  assert.match(panelSource, /Frequency<select/);
  assert.match(panelSource, /Home condition<select/);
  assert.match(panelSource, /Add-ons and quantities/);
});
