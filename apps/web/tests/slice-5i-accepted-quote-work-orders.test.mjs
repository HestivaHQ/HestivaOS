import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const manager = readFileSync(new URL('../app/work-orders/work-orders-manager.tsx', import.meta.url), 'utf8');
const display = readFileSync(new URL('../lib/work-order-display.ts', import.meta.url), 'utf8');
const api = readFileSync(new URL('../../api/src/work-orders/work-orders.service.ts', import.meta.url), 'utf8');
const schema = readFileSync(new URL('../../api/prisma/schema.prisma', import.meta.url), 'utf8');

test('primary and add-on services have separate canonical controls and filtered queries', () => {
  assert.match(manager, /Primary Service<select required/);
  assert.match(manager, /<fieldset className="addOnSection"><legend>Add-ons<\/legend>/);
  assert.match(manager, /status=ACTIVE&type=PRIMARY/);
  assert.match(manager, /status=ACTIVE&type=ADD_ON/);
  assert.doesNotMatch(manager, /<label>Title<input/);
});

test('add-on selector presents accessible responsive choices without changing selection state', () => {
  assert.match(manager, /Select any optional services for this job\./);
  assert.doesNotMatch(manager, /Choose zero or more active add-on services\./);
  assert.match(manager, /selectableAddOns\.map/);
  assert.match(manager, /htmlFor=\{inputId\}/);
  assert.match(manager, /id=\{inputId\} type="checkbox"/);
  assert.match(manager, /event\.target\.checked \? \[\.\.\.form\.addOnIds, service\.id\] : form\.addOnIds\.filter/);
  assert.match(manager, /service\.status === 'INACTIVE' \? <small>Inactive · historical selection<\/small>/);
  assert.match(manager, /No add-ons are currently available\./);
  assert.match(manager, /status=ACTIVE&type=ADD_ON/);
});

test('accepted quote fields use controlled human labels', () => {
  for (const label of ['One-time', 'Weekly', 'Every two weeks', 'Monthly', 'Custom', 'Light upkeep', 'Standard lived-in condition', 'Needs extra attention', 'Heavy build-up', 'Recently renovated', 'Vacant property', 'Move-in / move-out condition']) assert.match(display, new RegExp(label));
  assert.match(manager, /Property snapshot/);
  assert.match(manager, /Job-specific instructions/);
});

test('schema keeps nullable historical fields and an explicit add-on join', () => {
  assert.match(schema, /frequency WorkOrderFrequency\?/);
  assert.match(schema, /homeCondition HomeCondition\?/);
  assert.match(schema, /model WorkOrderAddOn/);
  assert.match(schema, /@@id\(\[workOrderId, serviceId\]\)/);
});

test('server validates primary type, add-on type and status, duplicates, and controlled enums', () => {
  assert.match(api, /service\.type !== ServiceType\.PRIMARY && service\.type !== ServiceType\.BOTH/);
  assert.match(api, /service\.type !== ServiceType\.ADD_ON && service\.type !== ServiceType\.BOTH/);
  assert.match(api, /Only active add-ons can be newly assigned/);
  assert.match(api, /Duplicate add-on service IDs are not allowed/);
  assert.match(api, /Object\.values\(WorkOrderFrequency\)/);
  assert.match(api, /Object\.values\(HomeCondition\)/);
  assert.match(api, /customFrequencyNote is only allowed for CUSTOM frequency/);
});
