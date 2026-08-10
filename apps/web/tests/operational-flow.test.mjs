import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const frame = source('../app/components/app-frame.tsx');
const account = source('../app/components/account-menu.tsx');
const mobile = source('../app/components/mobile-app-navigation.tsx');
const customers = source('../app/customers/customers-manager.tsx');
const properties = source('../app/properties/properties-manager.tsx');
const workOrders = source('../app/work-orders/work-orders-manager.tsx');
const adminSettings = source('../app/admin/settings/page.tsx');

test('shared desktop and mobile navigation follows operational order without Services', () => {
  const dashboard = frame.indexOf("['/', 'Dashboard']");
  const customer = frame.indexOf("['/customers', 'Customers']");
  const property = frame.indexOf("['/properties', 'Properties']");
  const workOrder = frame.indexOf("['/work-orders', 'Work orders']");
  assert.ok(dashboard < customer && customer < property && property < workOrder);
  assert.doesNotMatch(frame, /\['\/services', 'Services'\]/);
  assert.match(frame, /MobileAppNavigation[^>]+links=\{links\}/);
  assert.match(frame, /\{links\.map/);
  assert.match(adminSettings, /Business Lists/);
  assert.match(adminSettings, /\/admin\/settings\/services/);
});

test('the shell synchronizes the authoritative role and never fabricates Technician', () => {
  assert.match(frame, /user \?\? await \(await createAuthenticatedApi\(\)\)\.syncUser\(\)/);
  for (const role of ['ADMIN', 'TECHNICIAN', 'SUPERVISOR', 'OPERATIONS_MANAGER', 'DISPATCHER']) {
    const shown = role.replaceAll('_', ' ');
    assert.equal(role.replaceAll('_', ' '), shown);
  }
  assert.doesNotMatch(account, /\|\| 'Technician'/);
  assert.doesNotMatch(mobile, /\|\| 'Technician'/);
  assert.match(account, /user\?\.role\?\.replaceAll/);
  assert.match(mobile, /user\?\.role\?\.replaceAll/);
});

test('customer and property creation continue with canonical IDs', () => {
  assert.match(customers, /customer\.id/);
  assert.match(customers, /\/properties\?mode=create&customerId=/);
  assert.match(properties, /property\.customerId/);
  assert.match(properties, /property\.id/);
  assert.match(properties, /\/work-orders\?mode=create&customerId=/);
});

test('property form uses managed types and keeps Province dormant', () => {
  assert.match(properties, /activeBusinessLists\('PROPERTY_TYPE'\)/);
  assert.match(properties, /Select property type/);
  assert.match(properties, /No property types configured/);
  assert.doesNotMatch(properties, /<label>Province/);
  assert.doesNotMatch(properties, /Not classified/);
});

test('work-order deep links validate and preselect matching canonical relationships', () => {
  assert.match(workOrders, /preselectedCustomerId/);
  assert.match(workOrders, /preselectedPropertyId/);
  assert.match(workOrders, /item\.id === preselectedPropertyId && item\.customerId === customer\?\.id/);
  assert.match(workOrders, /selected customer or property is unavailable or mismatched/);
});

test('customer denial is product-safe and does not expose a raw API message for unexpected faults', () => {
  assert.match(customers, /Action denied\. \$\{err\.message\}/);
  assert.match(customers, /Unexpected server failure\. Please try again\./);
});
