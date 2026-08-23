import type { WebsiteQuoteSubmissionV2 } from '../quotes/website-quote-contract-v2';

/**
 * Messaging collects the same business facts as the live Website Quote flow,
 * but does not reuse the Website transport envelope, provenance, submission ID,
 * authentication secret, or ingestion route.
 */
export type MessagingQuoteDraft = Pick<
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
>;

type DeepPartial<T> = T extends Array<infer Item>
  ? Array<DeepPartial<Item>>
  : T extends object
    ? { [Key in keyof T]?: DeepPartial<T[Key]> }
    : T;

/**
 * A Messaging conversation may persist part of a canonical fact group while it
 * asks the remaining deterministic questions. This is workflow state only; the
 * authoritative Quote boundary still requires a complete MessagingQuoteDraft.
 */
export type MessagingQuoteDraftProgress = {
  [Key in keyof MessagingQuoteDraft]?: DeepPartial<MessagingQuoteDraft[Key]>;
};

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
export const MESSAGING_QUOTE_REQUIRED_FACT_GROUPS: ReadonlyArray<
  keyof MessagingQuoteDraft
> = [
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
