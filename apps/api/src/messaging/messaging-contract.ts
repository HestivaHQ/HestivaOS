export const MESSAGING_CONTRACT_VERSION = '1.0' as const;

export const MESSAGING_CHANNELS = ['WHATSAPP', 'MESSENGER'] as const;
export type MessagingChannel = (typeof MESSAGING_CHANNELS)[number];

export const MESSAGING_DIRECTIONS = ['INBOUND', 'OUTBOUND'] as const;
export type MessagingDirection = (typeof MESSAGING_DIRECTIONS)[number];

export const MESSAGING_MESSAGE_KINDS = [
  'TEXT',
  'INTERACTIVE',
  'MEDIA',
  'SYSTEM',
  'UNSUPPORTED',
] as const;
export type MessagingMessageKind = (typeof MESSAGING_MESSAGE_KINDS)[number];

export const MESSAGING_CONVERSATION_PHASES = [
  'NEW',
  'COLLECTING',
  'READY_FOR_BUSINESS_ACTION',
  'HUMAN_REVIEW',
  'CLOSED',
] as const;
export type MessagingConversationPhase =
  (typeof MESSAGING_CONVERSATION_PHASES)[number];

export interface MessagingProviderIdentity {
  /** Provider-scoped identifier. It is not a HestivaOS Customer identity. */
  providerIdentityId: string;
  /** E.164 is allowed only when the provider supplies a verified/normalized phone identity. */
  phoneE164?: string;
}

export interface MessagingAttribution {
  sourceType?: string;
  sourceId?: string;
  sourceUrl?: string;
  clickId?: string;
  headline?: string;
  body?: string;
  mediaType?: string;
  /** Provider-specific fields that are useful for provenance but are not business truth. */
  providerMetadata?: Readonly<Record<string, unknown>>;
}

export interface NormalizedInboundMessagingEvent {
  contractVersion: typeof MESSAGING_CONTRACT_VERSION;
  channel: MessagingChannel;
  provider: string;
  providerEventId: string;
  providerMessageId?: string;
  providerConversationId?: string;
  identity: MessagingProviderIdentity;
  occurredAt: string;
  receivedAt: string;
  kind: MessagingMessageKind;
  text?: string;
  interactivePayload?: Readonly<Record<string, unknown>>;
  media?: ReadonlyArray<{
    providerMediaId?: string;
    mimeType?: string;
    fileName?: string;
    /** Private object path populated only after provider media is secured. Never expose in broad projections. */
    privateStoragePath?: string;
  }>;
  attribution?: MessagingAttribution;
}

export interface MessagingConversationState {
  /** Incremented by the conversation engine whenever durable state changes. */
  version: number;
  phase: MessagingConversationPhase;
  /** Channel-neutral workflow name, for example QUOTE. */
  workflow?: string;
  /** Channel-neutral deterministic step key. */
  step?: string;
  /** Structured facts collected so far; business domains must validate before acting. */
  collected: Readonly<Record<string, unknown>>;
  /** Why automation yielded to a human, when phase is HUMAN_REVIEW. */
  escalationReason?: string;
}

export interface OutboundMessagingCommand {
  channel: MessagingChannel;
  provider: string;
  providerIdentityId: string;
  conversationId: string;
  causationMessageId?: string;
  idempotencyKey: string;
  kind: Exclude<MessagingMessageKind, 'UNSUPPORTED'>;
  text?: string;
  interactivePayload?: Readonly<Record<string, unknown>>;
  media?: ReadonlyArray<{
    mediaId?: string;
    url?: string;
    mimeType?: string;
    fileName?: string;
  }>;
}

export interface OutboundMessagingResult {
  providerMessageId: string;
  acceptedAt: string;
}
