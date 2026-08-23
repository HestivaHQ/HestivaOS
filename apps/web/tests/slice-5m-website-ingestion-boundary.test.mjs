import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const controller = readFileSync(new URL('../../api/src/quotes/website-quote-ingestion.controller.ts', import.meta.url), 'utf8');
const service = readFileSync(new URL('../../api/src/quotes/website-quote-ingestion.service.ts', import.meta.url), 'utf8');
const quoteSubmission = readFileSync(new URL('../../api/src/quotes/quote-submission.service.ts', import.meta.url), 'utf8');
const appModule = readFileSync(new URL('../../api/src/app.module.ts', import.meta.url), 'utf8');
const replay = readFileSync(new URL('../../api/src/quotes/website-quote-replay-resolution.ts', import.meta.url), 'utf8');

test('private website ingestion route uses integration auth rather than Supabase user auth', () => {
  assert.match(controller, /@Controller\('integrations\/website\/quotes'\)/);
  assert.match(controller, /@Public\(\)/);
  assert.match(controller, /verifyWebsiteIntegrationAuthorization\(authorization\)/);
  assert.match(controller, /UnauthorizedException/);
  assert.match(appModule, /QuotesModule/);
});

test('ingestion validates both contract versions and delegates immutable replay resolution to shared Quote submission authority', () => {
  assert.match(service, /validateWebsiteQuoteSubmissionV1/);
  assert.match(service, /validateWebsiteQuoteSubmissionV2/);
  assert.match(service, /resolveWebsiteQuoteReplay/);
  assert.match(service, /quoteSubmissions\.submit/);
  assert.match(replay, /WebsiteQuoteSubmissionV1 \| WebsiteQuoteSubmissionV2/);
  assert.match(quoteSubmission, /replay\.kind === 'REPLAY'/);
  assert.match(quoteSubmission, /replay\.kind === 'CONFLICT'/);
  assert.match(quoteSubmission, /replay\.kind === 'CORRUPT_EXISTING'/);
});

test('shared Quote submission authority persists review-required pricing without zeroing immutable quote revision totals', () => {
  assert.match(quoteSubmission, /costResolution\.kind === 'READY'/);
  assert.match(quoteSubmission, /calculateWebsiteQuotePricing\(input\.pricingSubmission\)/);
  assert.match(quoteSubmission, /costResolution\.kind === 'NEEDS_ATTENTION'/);
  assert.match(quoteSubmission, /QuoteStatus\.NEEDS_ATTENTION/);
  assert.match(quoteSubmission, /operationalCostAttention/);
  assert.doesNotMatch(quoteSubmission, /Authoritative quote operational costs are not complete yet\./);
  assert.doesNotMatch(quoteSubmission, /subtotalMinor:\s*0/);
  assert.doesNotMatch(quoteSubmission, /totalMinor:\s*0/);
  assert.match(quoteSubmission, /tx\.quote\.create/);
});
