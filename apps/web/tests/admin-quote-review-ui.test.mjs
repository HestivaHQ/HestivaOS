import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const frame = source('../app/components/app-frame.tsx');
const page = source('../app/quotes/page.tsx');
const queue = source('../app/quotes/quotes-manager.tsx');
const detailPage = source('../app/quotes/[id]/page.tsx');
const detail = source('../app/quotes/[id]/quote-review.tsx');
const api = source('../lib/api.ts');

test('Quotes navigation and pages are supplementary ADMIN-only guards', () => {
  assert.match(frame, /href: '\/quotes', label: 'Quotes'/);
  assert.match(frame, /authoritativeUser\.role === 'ADMIN'/);
  assert.match(page, /appUser\.role !== 'ADMIN'\) redirect\('\/'\)/);
  assert.match(detailPage, /appUser\.role !== 'ADMIN'\) redirect\('\/'\)/);
});

test('queue is responsive content with useful status, request, revision and filtering', () => {
  for (const value of ['Needs review', 'Submitted', 'Accepted', 'Declined', 'Expired', 'currentRevisionNumber', 'primaryService', 'preferredDate', 'submittedAt']) assert.match(queue, new RegExp(value));
  assert.match(queue, /Actionable requests appear first/);
  assert.match(queue, /role="search"/);
});

test('detail presents authoritative blockers, resolutions, pricing, operations, evidence and activity', () => {
  for (const value of ['Review status', 'Customer request', 'Customer resolution', 'Property resolution', 'Service &amp; operational scope', 'Authoritative pricing', 'Customer Quote Photos', 'Activity']) assert.match(detail, new RegExp(value));
  assert.match(detail, /preflight\?\.blockers/);
  assert.match(detail, /Ready to accept/);
  assert.match(detail, /current\.lineItems\.map/);
  assert.match(detail, /money\(line\.lineTotalMinor, current\.currency\)/);
  assert.doesNotMatch(detail, /catalogue|defaultPrice|unitAmountMinor \*/);
  assert.match(detail, /Laundry loads/);
  assert.match(detail, /Ironing loads/);
  assert.match(detail, /rows\.map/);
  assert.match(detail, /filter\(\(\[, value\]\) => present\(value\)\)/);
});

test('resolution submission is revision-safe and prevents cross-Customer Property selection', () => {
  assert.match(detail, /expectedRevisionNumber: quote\.currentRevisionNumber/);
  assert.match(detail, /properties\.filter\(\(property\) => property\.customerId === customerId\)/);
  assert.match(detail, /selectedCustomerProperties\.some\(\(item\) => item\.id === propertyId\)/);
  assert.match(detail, /Quote changed or another decision was recorded/);
});

test('acceptance is confirmed, preflight-refreshed, single-flight and recovers uncertain results', () => {
  assert.match(detail, /api\.quotePreflight\(quote\.id, quote\.currentRevisionNumber\)/);
  assert.match(detail, /acceptDialog\.current\?\.showModal\(\)/);
  assert.match(detail, /if \(!quote \|\| saving\) return/);
  assert.match(detail, /api\.acceptQuote\(quote\.id, quote\.currentRevisionNumber\)/);
  assert.match(detail, /const current = await api\.quote\(quote\.id\)/);
  assert.match(detail, /did not automatically repeat the decision request/);
  assert.match(detail, /View Recurring Agreement/);
  assert.match(detail, /View Initial Work Order/);
});

test('decline is confirmed with a meaningful reason and terminal Quotes hide decisions', () => {
  assert.match(detail, /declineDialog\.current\?\.showModal\(\)/);
  assert.match(detail, /textarea required minLength=\{3\} maxLength=\{500\}/);
  assert.match(detail, /api\.declineQuote\(quote\.id, quote\.currentRevisionNumber/);
  assert.match(detail, /const canDecide = quote\.status === 'SUBMITTED' \|\| quote\.status === 'NEEDS_ATTENTION'/);
});

test('API client sends expected revisions and exposes no credential secret model', () => {
  assert.match(api, /acceptQuote:[\s\S]*json\(\{ expectedRevisionNumber \}\)/);
  assert.match(api, /declineQuote:[\s\S]*json\(\{ expectedRevisionNumber, reason \}\)/);
  assert.doesNotMatch(api, /secretValue|TemporaryAccessCredential/);
});

test('native semantic dialogs and labelled status regions preserve accessibility', () => {
  assert.match(detail, /<dialog/);
  assert.match(detail, /aria-labelledby="accept-title"/);
  assert.match(detail, /aria-labelledby="decline-title"/);
  assert.match(detail, /role="alert"/);
  assert.match(detail, /<fieldset><legend>/);
});
