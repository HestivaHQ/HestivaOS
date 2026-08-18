import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const panel=readFileSync(new URL('../app/work-orders/[id]/interrupted-visit-admin-panel.tsx',import.meta.url),'utf8');
const api=readFileSync(new URL('../lib/work-order-interruption-api.ts',import.meta.url),'utf8');

test('replacement visit UI is a guided linked-work-order flow',()=>{
  assert.match(panel,/Create linked replacement Work Order/);
  assert.match(panel,/type="datetime-local"/);
  assert.match(panel,/new unassigned Work Order/);
  assert.match(panel,/temporary access credentials/);
  assert.match(panel,/original interrupted visit was not changed/);
});

test('replacement visit UI links to the new work order once created',()=>{
  assert.match(panel,/Linked replacement visit/);
  assert.match(panel,/href={`\/work-orders\/\$\{replacement\.replacement\.id\}`}/);
});

test('replacement visit client uses dedicated interruption replacement endpoints',()=>{
  assert.match(api,/\/interruption\/replacement/);
  assert.match(api,/createWorkOrderReplacementVisit/);
});
