import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const component = await readFile(new URL('../app/quote/public-quote-page.tsx', import.meta.url), 'utf8');
const api = await readFile(new URL('../lib/public-quote-api.ts', import.meta.url), 'utf8');
const page = await readFile(new URL('../app/quote/page.tsx', import.meta.url), 'utf8');
const css = await readFile(new URL('../app/quote/quote.css', import.meta.url), 'utf8');

test('capability is accepted only from the fragment and removed from browser history', () => {
  assert.match(component, /capabilityFromFragment\(window\.location\.hash\)/);
  assert.match(component, /window\.history\.replaceState/);
  assert.doesNotMatch(component, /localStorage|sessionStorage/);
  assert.match(api, /Authorization: `QuoteCapability \$\{capability\}`/);
  assert.match(api, /referrerPolicy: 'no-referrer'/);
  assert.match(api, /cache: 'no-store'/);
});

test('capability is not rendered into customer content', () => {
  assert.doesNotMatch(component, />\{capability\}</);
  assert.doesNotMatch(component, /dangerouslySetInnerHTML/);
  assert.match(page, /robots: \{ index: false, follow: false, nocache: true \}/);
  assert.match(page, /referrer: 'no-referrer'/);
});

test('renders canonical stored Quote projection and pricing without browser recalculation', () => {
  assert.match(component, /quote\.pricing\.lineItems\.map/);
  assert.match(component, /quote\.pricing\.subtotalMinor/);
  assert.match(component, /quote\.pricing\.discountMinor/);
  assert.match(component, /quote\.pricing\.taxMinor/);
  assert.match(component, /quote\.pricing\.totalMinor/);
  assert.doesNotMatch(component, /unitAmountMinor\s*\*|lineTotalMinor\s*\+/);
  assert.doesNotMatch(component, /internalCost|profit|margin|customerId|propertyId/);
});

test('view confirmation requires resolution, server challenge, visibility and server dwell', () => {
  assert.match(component, /if \(!projection \|\| !capability \|\| viewStarted\.current\) return/);
  assert.match(component, /issueViewChallenge\(capability\)/);
  assert.match(component, /document\.visibilityState !== 'visible'/);
  assert.match(component, /challenge\.minimumVisibleDwellMs/);
  assert.match(component, /confirmQuoteView\(capability, challenge!\.challenge\)/);
  assert.match(component, /viewStarted\.current = true/);
});

test('accept and decline both require an explicit confirmation dialog and idempotency identity', () => {
  assert.match(component, /openConfirmation\('CUSTOMER_ACCEPTED'\)/);
  assert.match(component, /openConfirmation\('CUSTOMER_DECLINED'\)/);
  assert.match(component, /role="dialog"/);
  assert.match(component, /crypto\.randomUUID\(\)/);
  assert.match(api, /confirmed: true/);
  assert.match(component, /PENDING_INTERNAL_COMPLETION/);
  assert.match(component, /You do not need to accept again/);
});

test('covers safe unavailable, network, terminal and mobile states without customer login', () => {
  assert.match(component, /This quote link is unavailable/);
  assert.match(component, /We couldn’t load your quote/);
  assert.match(component, /quote\.status === 'ACCEPTED'/);
  assert.match(component, /quote\.status === 'DECLINED'/);
  assert.doesNotMatch(component, /signIn|login|supabase/i);
  assert.match(css, /@media \(max-width: 359px\)/);
  assert.match(css, /min-height: 50px/);
  assert.doesNotMatch(css, /overflow-x:\s*scroll/);
});
