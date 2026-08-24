import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const component = await readFile(new URL('../app/quote/public-quote-page.tsx', import.meta.url), 'utf8');
const api = await readFile(new URL('../lib/public-quote-api.ts', import.meta.url), 'utf8');
const page = await readFile(new URL('../app/quote/page.tsx', import.meta.url), 'utf8');
const css = await readFile(new URL('../app/quote/quote.css', import.meta.url), 'utf8');

test('initial fragment capability is consumed, tab-scoped and removed from visible history', () => {
  assert.match(component, /capabilityFromFragment\(window\.location\.hash\)/);
  assert.match(component, /window\.sessionStorage\.setItem\(TAB_CAPABILITY_KEY, capability\)/);
  assert.match(component, /window\.history\.replaceState/);
  assert.doesNotMatch(component, /localStorage/);
  assert.match(api, /Authorization: `QuoteCapability \$\{capability\}`/);
  assert.match(api, /referrerPolicy: 'no-referrer'/);
  assert.match(api, /cache: 'no-store'/);
});

test('refresh without a fragment recovers only the same tab-session capability', () => {
  assert.match(component, /return recoverTabCapability\(\)/);
  assert.match(component, /window\.sessionStorage\.getItem\(TAB_CAPABILITY_KEY\)/);
  assert.match(component, /if \(!stored\) return null/);
  assert.match(component, /if \(!token\)[\s\S]*setUnavailable\(true\)/);
});

test('a supplied new fragment replaces tab context while an invalid fragment clears old context instead of falling back', () => {
  assert.match(component, /if \(fragmentSupplied\)/);
  assert.match(component, /if \(!fromFragment\)[\s\S]*clearTabCapability\(\)[\s\S]*return null/);
  assert.match(component, /storeTabCapability\(fromFragment\)/);
  assert.match(component, /window\.sessionStorage\.removeItem\(TAB_CAPABILITY_KEY\)/);
});

test('capability is not rendered into customer content or persisted broadly', () => {
  assert.doesNotMatch(component, />\{capability\}</);
  assert.doesNotMatch(component, /dangerouslySetInnerHTML/);
  assert.doesNotMatch(component, /localStorage/);
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

test('durable public response projection reconstructs converted, pending and declined reload UX', () => {
  assert.match(api, /customerResponseState: 'NO_RESPONSE' \| 'ACCEPTED_CONVERTED' \| 'ACCEPTED_PENDING_INTERNAL_COMPLETION' \| 'DECLINED'/);
  assert.match(component, /case 'ACCEPTED_CONVERTED': return 'CONVERTED'/);
  assert.match(component, /case 'ACCEPTED_PENDING_INTERNAL_COMPLETION': return 'PENDING_INTERNAL_COMPLETION'/);
  assert.match(component, /case 'DECLINED': return 'DECLINED'/);
  assert.match(component, /Your acceptance has been received/);
  assert.match(component, /quote\.actionable && !effectiveResultState/);
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

test('definitive unavailable access clears tab capability while network failures preserve retry continuity', () => {
  assert.match(component, /if \(error\.status === 404\) markUnavailable\(\)/);
  assert.match(component, /const markUnavailable = \(\) => \{[\s\S]*clearTabCapability\(\)/);
  assert.match(component, /else setNetworkError\(true\)/);
});

test('covers safe unavailable, network, terminal and mobile states without customer login', () => {
  assert.match(component, /This quote link is unavailable/);
  assert.match(component, /We couldn’t load your quote/);
  assert.match(component, /effectiveResultState === 'CONVERTED'/);
  assert.match(component, /effectiveResultState === 'DECLINED'/);
  assert.doesNotMatch(component, /signIn|login|supabase/i);
  assert.match(css, /@media \(max-width: 359px\)/);
  assert.match(css, /min-height: 50px/);
  assert.doesNotMatch(css, /overflow-x:\s*scroll/);
});
