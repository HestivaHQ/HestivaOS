import {
  BadGatewayException,
  Injectable,
  OnModuleInit,
  ServiceUnavailableException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type {
  NormalizedInboundMessagingEvent,
  OutboundMessagingCommand,
  OutboundMessagingResult,
} from './messaging-contract';
import { MESSAGING_CONTRACT_VERSION } from './messaging-contract';
import { MessagingAdapterRegistry } from './messaging-adapter-registry';
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
export class WhatsAppCloudApiAdapter implements MessagingProviderAdapter, OnModuleInit {
  readonly channel = 'WHATSAPP' as const;
  readonly provider = PROVIDER;

  constructor(private readonly registry: MessagingAdapterRegistry) {}

  onModuleInit(): void {
    if (this.outboundConfigured()) this.registry.register(this);
  }

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

  async send(command: OutboundMessagingCommand): Promise<OutboundMessagingResult> {
    const accessToken = env('META_WHATSAPP_ACCESS_TOKEN');
    const phoneNumberId = env('META_WHATSAPP_PHONE_NUMBER_ID');
    const graphVersion = env('META_GRAPH_API_VERSION');
    if (!accessToken || !phoneNumberId || !graphVersion) {
      throw new ServiceUnavailableException('WhatsApp Cloud API outbound transport is not configured.');
    }
    if (command.channel !== this.channel || command.provider.trim().toLowerCase() !== this.provider) {
      throw new UnprocessableEntityException('Outbound command does not target this WhatsApp provider adapter.');
    }
    if (command.kind !== 'TEXT' || !command.text?.trim()) {
      throw new UnprocessableEntityException('WhatsApp Cloud API v1 transport currently supports text commands only.');
    }

    let response: Response;
    try {
      response = await fetch(`https://graph.facebook.com/${encodeURIComponent(graphVersion)}/${encodeURIComponent(phoneNumberId)}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: command.providerIdentityId,
          type: 'text',
          text: { preview_url: false, body: command.text.trim() },
        }),
      });
    } catch {
      throw new BadGatewayException('WhatsApp Cloud API could not be reached.');
    }

    if (!response.ok) {
      throw new BadGatewayException(`WhatsApp Cloud API rejected the message with HTTP ${response.status}.`);
    }
    const body = await response.json() as { messages?: Array<{ id?: unknown }> };
    const providerMessageId = asString(body.messages?.[0]?.id);
    if (!providerMessageId) {
      throw new BadGatewayException('WhatsApp Cloud API returned no provider message identity.');
    }
    return { providerMessageId, acceptedAt: new Date().toISOString() };
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

  private outboundConfigured(): boolean {
    return !!env('META_WHATSAPP_ACCESS_TOKEN') && !!env('META_WHATSAPP_PHONE_NUMBER_ID') && !!env('META_GRAPH_API_VERSION');
  }
}
