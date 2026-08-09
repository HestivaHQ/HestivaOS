import test from 'node:test';
import assert from 'node:assert/strict';
import { businessProfileCompleteness, formatBusinessProfile } from '../lib/business-profile.js';

test('completeness uses exactly five core fields', () => {
  assert.equal(businessProfileCompleteness({ registeredName: 'Synthetic', registrationNumber: '1', contactNumber: '2', businessEmail: 'a@example.test' }), 80);
  assert.equal(businessProfileCompleteness({ bankName: 'Optional Bank', taxNumber: 'Optional' }), 0);
});
test('formatter includes only selected non-empty public fields', () => {
  const message = formatBusinessProfile({ registeredName: 'Synthetic Co', shareRegisteredName: true, businessEmail: '', shareBusinessEmail: true, website: 'https://example.test', shareWebsite: false, id: 'internal', updatedAt: 'never' });
  assert.match(message, /Registered name: Synthetic Co/);
  assert.doesNotMatch(message, /example\.test|internal|updatedAt|never/);
});
test('formatter excludes banking and compliance when toggles are off', () => {
  const message = formatBusinessProfile({ accountNumber: '123456', shareAccountNumber: false, taxNumber: 'TAX-1', shareTaxNumber: false, bankName: 'Test Bank', shareBankName: true });
  assert.match(message, /Bank: Test Bank/);
  assert.doesNotMatch(message, /123456|TAX-1/);
});
