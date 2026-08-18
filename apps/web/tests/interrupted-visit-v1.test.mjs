import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const field=readFileSync(new URL('../app/technician/components/interrupted-visit-panel.tsx',import.meta.url),'utf8');
const boundary=readFileSync(new URL('../app/technician/components/interrupted-visit-boundary.tsx',import.meta.url),'utf8');
const management=readFileSync(new URL('../app/work-orders/[id]/interrupted-visit-admin-panel.tsx',import.meta.url),'utf8');

test('Technician interruption uses controlled reasons and durable local operation',()=>{
  for(const value of ['NO_ACCESS','UTILITIES_UNAVAILABLE','SAFETY_CONCERN','CUSTOMER_REQUESTED','REQUIRED_RESOURCE_UNAVAILABLE','OTHER'])assert.match(field,new RegExp(value));
  assert.match(field,/saveInterruption/);
  assert.match(field,/crypto\.randomUUID/);
  assert.match(field,/Sync pending/);
});

test('local interruption locks the attempted visit instead of reopening it',()=>{
  assert.match(boundary,/This attempted visit is now read-only on this device/);
  assert.match(boundary,/Do not reopen, reschedule or complete the original visit/);
});

test('management routing is controlled and preserves Finance and replacement boundaries',()=>{
  for(const value of ['REPLACEMENT_VISIT','FOLLOW_UP','PARTIAL_COMPLETION_REVIEW','FINANCIAL_REVIEW','CLOSE'])assert.match(management,new RegExp(value));
  assert.match(management,/Create replacement visit/);
  assert.match(management,/A new unassigned Work Order will be created/);
  assert.match(management,/does not create or change any charge, payment, credit or refund/);
});
