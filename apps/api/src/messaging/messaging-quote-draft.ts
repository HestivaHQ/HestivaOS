import type { PostEventQuoteFacts } from '../quotes/quote-operational-cost-source';
import type { WebsiteQuoteSubmissionV2 } from '../quotes/website-quote-contract-v2';

type MessagingQuoteRequest = WebsiteQuoteSubmissionV2['request'] & {
  postEvent?: PostEventQuoteFacts;
};

/**
 * Messaging collects the same shared business facts as the live Website Quote
 * flow, plus Messaging-only collection of approved internal Quote extensions
 * such as structured Post-Event facts. It does not reuse the Website transport
 * envelope, provenance, submission ID, authentication secret, or ingestion route.
 */
export type MessagingQuoteDraft = Omit<
  Pick<
    WebsiteQuoteSubmissionV2,
    | 'customer'
    | 'property'
    | 'request'
    | 'visit'
    | 'access'
    | 'household'
    | 'safety'
    | 'notes'
    | 'photos'
  >,
  'request'
> & {
  request: MessagingQuoteRequest;
};

type DeepPartial<T> = T extends Array<infer Item>
  ? Array<DeepPartial<Item>>
  : T extends object
    ? { [Key in keyof T]?: DeepPartial<T[Key]> }
    : T;

/**
 * A Messaging conversation may persist part of a canonical fact group while it
 * asks the remaining deterministic questions. This is workflow state only; the
 * authoritative Quote boundary still requires a complete MessagingQuoteDraft.
 *
 * `messagingMediaAssetIds` is Messaging-owned workflow provenance, not a
 * Website-style Quote photo payload. It references already-secured private
 * provider media until Quote creation atomically promotes that evidence into
 * canonical QuotePhoto records.
 */
export type MessagingQuoteDraftProgress = {
  [Key in keyof MessagingQuoteDraft]?: DeepPartial<MessagingQuoteDraft[Key]>;
} & {
  messagingMediaAssetIds?: string[];
};

export function messagingQuoteMediaAssetIds(draft: MessagingQuoteDraftProgress): string[] {
  if (!Array.isArray(draft.messagingMediaAssetIds)) return [];
  return [...new Set(draft.messagingMediaAssetIds.filter((value): value is string => typeof value === 'string' && Boolean(value.trim())).map((value) => value.trim()))];
}

/** Keep Messaging-only workflow provenance outside channel-neutral validation. */
export function canonicalMessagingQuoteDraftProgress(
  draft: MessagingQuoteDraftProgress,
): Omit<MessagingQuoteDraftProgress, 'messagingMediaAssetIds'> {
  const canonical: Omit<MessagingQuoteDraftProgress, 'messagingMediaAssetIds'> = {};
  for (const key of MESSAGING_QUOTE_REQUIRED_FACT_GROUPS) {
    const value = draft[key];
    if (value !== undefined) (canonical as Record<string, unknown>)[key] = value;
  }
  return canonical;
}

export const MESSAGING_QUOTE_SECTIONS = [
  'YOUR_HOME',
  'CLEANING_REQUIREMENTS',
  'PERSONALISE_SERVICE',
  'PREFERRED_VISIT',
  'ACCESS_AND_HOUSEHOLD',
  'PHOTOS_AND_NOTES',
  'YOUR_DETAILS',
  'REVIEW',
] as const;

export type MessagingQuoteSection = (typeof MESSAGING_QUOTE_SECTIONS)[number];

/**
 * Conversation order may adapt when a customer volunteers information early,
 * but completion must resolve the same canonical fact groups as the Website
 * Quote Contract v2 before the Quote domain is asked to act.
 */
export const MESSAGING_QUOTE_REQUIRED_FACT_GROUPS: ReadonlyArray<keyof MessagingQuoteDraft> = [
  'property',
  'request',
  'visit',
  'access',
  'household',
  'safety',
  'notes',
  'customer',
  'photos',
];
