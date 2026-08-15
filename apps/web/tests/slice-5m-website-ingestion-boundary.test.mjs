import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const controller = readFileSync(new URL('../../api/src/quotes/website-quote-ingestion.controller.ts', import.meta.url), 'utf8');
const service = readFileSync(new URL('../../api/src/quotes/website-quote-ingestion.service.ts', import.meta.url), 'utf8');
const appModule = readFileSync(new URL('../../api/src/app.module.ts', import.meta.url), 'utf8');
const replay = readFileSync(new URL('../../api/src/quotes/website-quote-replay-resolution.ts', import.meta.url), 'utf8');

test('private website ingestion route uses integration auth rather than Supabase user auth', () => {
  assert.match(controller, /@Controller\('integrations\/website\/quotes'\)/);
  assert.match(controller, /@Public\(\)/);
  assert.match(controller, /verifyWebsiteIntegrationAuthorization\(authorization\)/);
  assert.match(controller, /UnauthorizedException/);
  assert.match(appModule, /QuotesModule/);
});

test('ingestion validates both contract versions and reuses immutable replay resolution', () => {
  assert.match(service, /validateWebsiteQuoteSubmissionV1/);
  assert.match(service, /validateWebsiteQuoteSubmissionV2/);
  assert.match(service, /resolveWebsiteQuoteReplay/);
  assert.match(replay, /WebsiteQuoteSubmissionV1 \| WebsiteQuoteSubmissionV2/);
  assert.match(service, /replay\.kind === 'REPLAY'/);
  assert.match(service, /replay\.kind === 'CONFLICT'/);
  assert.match(service, /replay\.kind === 'CORRUPT_EXISTING'/);
});

test('new submissions persist review-required pricing without zeroing immutable quote revision totals', () => {
  assert.match(service, /costResolution\.kind === 'READY'/);
  assert.match(service, /calculateWebsiteQuotePricing\(submission\)/);
  assert.match(service, /costResolution\.kind === 'NEEDS_ATTENTION'/);
  assert.match(service, /QuoteStatus\.NEEDS_ATTENTION/);
  assert.match(service, /operationalCostAttention/);
  assert.doesNotMatch(service, /Authoritative quote operational costs are not complete yet\./);
  assert.doesNotMatch(service, /subtotalMinor:\s*0/);
  assert.doesNotMatch(service, /totalMinor:\s*0/);
  assert.match(service, /quote\.create/);
});
