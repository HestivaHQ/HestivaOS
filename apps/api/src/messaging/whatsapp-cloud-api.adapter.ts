import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type {
  NormalizedInboundMessagingEvent,
  OutboundMessagingCommand,
  OutboundMessagingResult,
} from './messaging-contract';
import { MESSAGING_CONTRACT_VERSION } from './messaging-contract';
import type {
  MessagingProviderAdapter,
  MessagingWebhookContext,
} from './messaging-provider-adapter';

const PROVIDER = 'meta';

type WhatsAppWebhookPayload = {
  object?: unknown;
  entry?: Array<{
    id?: unknown;
    changes?: Array<{
      field?: unknown;
      value?: {
        metadata?: { phone_number_id?: unknown };
        messages?: Array<Record<string, unknown>>;
      };
    }>;
  }>;
};

type WhatsAppMessage = Record<string, unknown> & {
  from?: unknown;
  id?: unknown;
  timestamp?: unknown;
  type?: unknown;
  text?: { body?: unknown };
  interactive?: unknown;
  referral?: Record<string, unknown>;
  image?: Record<string, unknown>;
  document?: Record<string, unknown>;
  audio?: Record<string, unknown>;
  video?: Record<string, unknown>;
  sticker?: Record<string, unknown>;
};

function env(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function signatureHeader(
  headers: Readonly<Record<string, string | string[] | undefined>>,
): string | undefined {
  const value = headers['x-hub-signature-256'] ?? headers['X-Hub-Signature-256'];
  return Array.isArray(value) ? value[0] : value;
}

function asObject(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function occurredAt(timestamp: unknown, fallback: string): string {
  const raw = asString(timestamp);
  if (!raw) return fallback;
  const seconds = Number(raw);
  if (!Number.isFinite(seconds) || seconds < 0) return fallback;
  return new Date(seconds * 1000).toISOString();
}

function normalizePhone(value: string): string | undefined {
  return /^\d{7,15}$/.test(value) ? `+${value}` : undefined;
}

function mediaFrom(message: WhatsAppMessage) {
  const type = asString(message.type);
  if (!type || !['image', 'document', 'audio', 'video', 'sticker'].includes(type)) {
    return undefined;
  }
  const source = asObject(message[type]);
  if (!source) return undefined;
  return [{
    providerMediaId: asString(source.id),
    mimeType: asString(source.mime_type),
    fileName: asString(source.filename),
  }];
}

function attributionFrom(referral: Record<string, unknown> | undefined) {
  if (!referral) return undefined;
  const metadata: Record<string, unknown> = {};
  for (const key of ['source_type', 'source_id', 'source_url', 'ctwa_clid', 'headline', 'body', 'media_type']) {
    if (referral[key] !== undefined) metadata[key] = referral[key];
  }
  return {
    sourceType: asString(referral.source_type),
    sourceId: asString(referral.source_id),
    sourceUrl: asString(referral.source_url),
    clickId: asString(referral.ctwa_clid),
    headline: asString(referral.headline),
    body: asString(referral.body),
    mediaType: asString(referral.media_type),
    providerMetadata: Object.keys(metadata).length > 0 ? metadata : undefined,
  };
}

@Injectable()
export class WhatsAppCloudApiAdapter implements MessagingProviderAdapter {
  readonly channel = 'WHATSAPP' as const;
  readonly provider = PROVIDER;

  verifySubscription(mode: unknown, token: unknown): boolean {
    const verifyToken = env('META_WHATSAPP_WEBHOOK_VERIFY_TOKEN');
    return mode === 'subscribe' && typeof token === 'string' && !!verifyToken && token === verifyToken;
  }

  async normalizeInboundWebhook(
    payload: unknown,
    context: MessagingWebhookContext,
  ): Promise<ReadonlyArray<NormalizedInboundMessagingEvent>> {
    this.verifySignature(context);
    const root = asObject(payload) as WhatsAppWebhookPayload | undefined;
    if (!root || root.object !== 'whatsapp_business_account') return [];

    const events: NormalizedInboundMessagingEvent[] = [];
    for (const entry of Array.isArray(root.entry) ? root.entry : []) {
      for (const change of Array.isArray(entry.changes) ? entry.changes : []) {
        if (change.field !== 'messages') continue;
        const value = asObject(change.value);
        if (!value) continue;
        const metadata = asObject(value.metadata);
        const phoneNumberId = asString(metadata?.phone_number_id);
        const messages = Array.isArray(value.messages) ? value.messages : [];

        for (const rawMessage of messages) {
          const message = asObject(rawMessage) as WhatsAppMessage | undefined;
          if (!message) continue;
          const from = asString(message.from);
          const messageId = asString(message.id);
          if (!from || !messageId) continue;
          const type = asString(message.type);
          const media = mediaFrom(message);
          const kind =
            type === 'text' ? 'TEXT' as const :
            type === 'interactive' ? 'INTERACTIVE' as const :
            media ? 'MEDIA' as const : 'UNSUPPORTED' as const;
          const text = type === 'text' ? asString(message.text?.body) : undefined;
          const interactive = type === 'interactive' ? asObject(message.interactive) : undefined;
          const attribution = attributionFrom(asObject(message.referral));

          events.push({
            contractVersion: MESSAGING_CONTRACT_VERSION,
            channel: this.channel,
            provider: this.provider,
            providerEventId: `message:${messageId}`,
            providerMessageId: messageId,
            providerConversationId: phoneNumberId ? `${phoneNumberId}:${from}` : undefined,
            identity: {
              providerIdentityId: from,
              phoneE164: normalizePhone(from),
            },
            occurredAt: occurredAt(message.timestamp, context.receivedAt),
            receivedAt: context.receivedAt,
            kind,
            text,
            interactivePayload: interactive,
            media,
            attribution,
          });
        }
      }
    }
    return events;
  }

  async send(_command: OutboundMessagingCommand): Promise<OutboundMessagingResult> {
    throw new ServiceUnavailableException(
      'WhatsApp outbound transport is intentionally disabled until ambiguous provider outcomes can be reconciled without duplicate customer sends.',
    );
  }

  private verifySignature(context: MessagingWebhookContext): void {
    const appSecret = env('META_APP_SECRET');
    const rawBody = context.rawBody ? Buffer.from(context.rawBody) : undefined;
    const supplied = signatureHeader(context.headers);
    if (!appSecret || !rawBody || !supplied?.startsWith('sha256=')) {
      throw new UnauthorizedException('WhatsApp webhook authenticity could not be established.');
    }
    const suppliedHex = supplied.slice('sha256='.length);
    if (!/^[0-9a-f]{64}$/i.test(suppliedHex)) {
      throw new UnauthorizedException('WhatsApp webhook authenticity could not be established.');
    }
    const expected = createHmac('sha256', appSecret).update(rawBody).digest();
    const actual = Buffer.from(suppliedHex, 'hex');
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      throw new UnauthorizedException('WhatsApp webhook authenticity could not be established.');
    }
  }
}
