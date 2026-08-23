import type { WebsiteQuoteContractError } from './website-quote-contract';
import {
  WEBSITE_QUOTE_SCHEMA_VERSION_V2,
  validateWebsiteQuoteSubmissionV2,
} from './website-quote-contract-v2';
import { WEBSITE_QUOTE_SOURCE } from './website-quote-contract';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validationEnvelope(facts: Record<string, unknown>) {
  return {
    schemaVersion: WEBSITE_QUOTE_SCHEMA_VERSION_V2,
    submissionId: '00000000-0000-4000-8000-000000000001',
    source: WEBSITE_QUOTE_SOURCE,
    submittedAt: '2026-01-01T00:00:00.000Z',
    ...facts,
  };
}

/**
 * Validate channel-neutral Quote business facts through the mature Quote v2
 * field-validation surface. Transport identity is supplied only to satisfy the
 * validation shape; it is never returned, persisted or treated as provenance.
 */
export function validateQuoteBusinessFacts(payload: unknown): WebsiteQuoteContractError[] {
  return validateWebsiteQuoteSubmissionV2(
    validationEnvelope(isRecord(payload) ? payload : {}),
  );
}
