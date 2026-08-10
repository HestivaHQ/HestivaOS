import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const propertyForm = readFileSync(new URL('../app/properties/properties-manager.tsx', import.meta.url), 'utf8');
const workOrders = readFileSync(new URL('../app/work-orders/work-orders-manager.tsx', import.meta.url), 'utf8');
const technicianView = readFileSync(new URL('../app/work-orders/[id]/technician-job-view.tsx', import.meta.url), 'utf8');
const api = readFileSync(new URL('../lib/api.ts', import.meta.url), 'utf8');

test('Property form groups optional operational fields and keeps Province dormant', () => {
  for (const heading of ['1. Identity', '2. Address', '3. Home profile', '4. Access & logistics', '5. Household & care']) assert.match(propertyForm, new RegExp(heading.replace('&', '&amp;|&')));
  for (const field of ['bedrooms', 'bathrooms', 'livingAreas', 'storeys', 'hasPets', 'hasCameras', 'offLimitsNotes', 'fragileItemNotes', 'productRestrictionNotes', 'allergyNotes']) assert.match(propertyForm, new RegExp(field));
  assert.doesNotMatch(propertyForm, />Province</);
});

test('Property creation continues to Work Order with customer and property selected', () => {
  assert.match(propertyForm, /\/work-orders\?mode=create&customerId=.*&propertyId=/);
  assert.match(workOrders, /preselectedCustomerId/);
  assert.match(workOrders, /preselectedPropertyId/);
});

test('Work Order summary and Technician view consume live actionable Property fields', () => {
  assert.match(workOrders, /Property snapshot — current profile/);
  assert.match(workOrders, /property\.productRestrictionNotes/);
  assert.match(technicianView, /Household & care/);
  assert.match(technicianView, /workOrder\.property\.allergyNotes/);
});

test('generic selector contract is separate from full Property contract', () => {
  assert.match(api, /propertySelectorOptions/);
  assert.match(api, /Pick<Property, 'id' \| 'customerId' \| 'name' \| 'addressLine1' \| 'city'>/);
});
