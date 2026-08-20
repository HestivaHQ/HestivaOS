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
import {
  MessagingProviderOutcomeUnknownError,
  type MessagingProviderAdapter,
  type MessagingWebhookContext,
} from './messaging-provider-adapter';

const PROVIDER = 'meta';

type WhatsAppWebhookPayload = {
  object?: unknown;
  entry?: Array<{
    changes?: Array<{
      field?: unknown;
      value?: {
        metadata?: { phone_number_id?: unknown };
        messages?: Array<Record<string, unknown>>;
        statuses?: Array<Record<string, unknown>>;
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
};

export type NormalizedWhatsAppStatusEvent = {
  providerMessageId: string;
  correlationId?: string;
  providerStatus: 'sent' | 'delivered' | 'read' | 'failed';
  occurredAt: string;
};

function env(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function signatureHeader(headers: Readonly<Record<string, string | string[] | undefined>>): string | undefined {
  const value = headers['x-hub-signature-256'] ?? headers['X-Hub-Signature-256'];
  return Array.isArray(value) ? value[0] : value;
}

function asObject(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}
function asString(value: unknown): string | undefined { return typeof value === 'string' && value.length > 0 ? value : undefined; }
function occurredAt(timestamp: unknown, fallback: string): string {
  const raw = asString(timestamp); if (!raw) return fallback;
  const seconds = Number(raw); return Number.isFinite(seconds) && seconds >= 0 ? new Date(seconds * 1000).toISOString() : fallback;
}
function normalizePhone(value: string): string | undefined { return /^\d{7,15}$/.test(value) ? `+${value}` : undefined; }
function mediaFrom(message: Record<string, unknown>) {
  const type = asString(message.type);
  if (!type || !['image', 'document', 'audio', 'video', 'sticker'].includes(type)) return undefined;
  const source = asObject(message[type]); if (!source) return undefined;
  return [{ providerMediaId: asString(source.id), mimeType: asString(source.mime_type), fileName: asString(source.filename) }];
}
function attributionFrom(referral: Record<string, unknown> | undefined) {
  if (!referral) return undefined;
  const metadata: Record<string, unknown> = {};
  for (const key of ['source_type', 'source_id', 'source_url', 'ctwa_clid', 'headline', 'body', 'media_type']) if (referral[key] !== undefined) metadata[key] = referral[key];
  return { sourceType: asString(referral.source_type), sourceId: asString(referral.source_id), sourceUrl: asString(referral.source_url), clickId: asString(referral.ctwa_clid), headline: asString(referral.headline), body: asString(referral.body), mediaType: asString(referral.media_type), providerMetadata: Object.keys(metadata).length ? metadata : undefined };
}

@Injectable()
export class WhatsAppCloudApiAdapter implements MessagingProviderAdapter, OnModuleInit {
  readonly channel = 'WHATSAPP' as const;
  readonly provider = PROVIDER;
  constructor(private readonly registry: MessagingAdapterRegistry) {}

  onModuleInit(): void { if (this.outboundConfigured()) this.registry.register(this); }

  verifySubscription(mode: unknown, token: unknown): boolean {
    const verifyToken = env('META_WHATSAPP_WEBHOOK_VERIFY_TOKEN');
    return mode === 'subscribe' && typeof token === 'string' && !!verifyToken && token === verifyToken;
  }

  async normalizeInboundWebhook(payload: unknown, context: MessagingWebhookContext): Promise<ReadonlyArray<NormalizedInboundMessagingEvent>> {
    this.verifySignature(context);
    const root = asObject(payload) as WhatsAppWebhookPayload | undefined;
    if (!root || root.object !== 'whatsapp_business_account') return [];
    const events: NormalizedInboundMessagingEvent[] = [];
    for (const entry of Array.isArray(root.entry) ? root.entry : []) for (const change of Array.isArray(entry.changes) ? entry.changes : []) {
      if (change.field !== 'messages') continue;
      const value = asObject(change.value); if (!value) continue;
      const metadata = asObject(value.metadata); const phoneNumberId = asString(metadata?.phone_number_id);
      for (const raw of Array.isArray(value.messages) ? value.messages : []) {
        const message = asObject(raw) as WhatsAppMessage | undefined; if (!message) continue;
        const from = asString(message.from), messageId = asString(message.id); if (!from || !messageId) continue;
        const type = asString(message.type), media = mediaFrom(message);
        const kind = type === 'text' ? 'TEXT' as const : type === 'interactive' ? 'INTERACTIVE' as const : media ? 'MEDIA' as const : 'UNSUPPORTED' as const;
        events.push({ contractVersion: MESSAGING_CONTRACT_VERSION, channel: this.channel, provider: this.provider, providerEventId: `message:${messageId}`, providerMessageId: messageId, providerConversationId: phoneNumberId ? `${phoneNumberId}:${from}` : undefined, identity: { providerIdentityId: from, phoneE164: normalizePhone(from) }, occurredAt: occurredAt(message.timestamp, context.receivedAt), receivedAt: context.receivedAt, kind, text: type === 'text' ? asString(message.text?.body) : undefined, interactivePayload: type === 'interactive' ? asObject(message.interactive) : undefined, media, attribution: attributionFrom(asObject(message.referral)) });
      }
    }
    return events;
  }

  async normalizeStatusWebhook(payload: unknown, context: MessagingWebhookContext): Promise<ReadonlyArray<NormalizedWhatsAppStatusEvent>> {
    this.verifySignature(context);
    const root = asObject(payload) as WhatsAppWebhookPayload | undefined;
    if (!root || root.object !== 'whatsapp_business_account') return [];
    const events: NormalizedWhatsAppStatusEvent[] = [];
    for (const entry of Array.isArray(root.entry) ? root.entry : []) for (const change of Array.isArray(entry.changes) ? entry.changes : []) {
      if (change.field !== 'messages') continue;
      const value = asObject(change.value); if (!value) continue;
      for (const raw of Array.isArray(value.statuses) ? value.statuses : []) {
        const status = asObject(raw); if (!status) continue;
        const providerMessageId = asString(status.id), providerStatus = asString(status.status);
        if (!providerMessageId || !providerStatus || !['sent','delivered','read','failed'].includes(providerStatus)) continue;
        events.push({ providerMessageId, correlationId: asString(status.biz_opaque_callback_data), providerStatus: providerStatus as NormalizedWhatsAppStatusEvent['providerStatus'], occurredAt: occurredAt(status.timestamp, context.receivedAt) });
      }
    }
    return events;
  }

  async send(command: OutboundMessagingCommand): Promise<OutboundMessagingResult> {
    const accessToken = env('META_WHATSAPP_ACCESS_TOKEN'), phoneNumberId = env('META_WHATSAPP_PHONE_NUMBER_ID'), graphVersion = env('META_GRAPH_API_VERSION');
    if (!accessToken || !phoneNumberId || !graphVersion) throw new ServiceUnavailableException('WhatsApp Cloud API outbound transport is not configured.');
    if (command.channel !== this.channel || command.provider.trim().toLowerCase() !== this.provider) throw new UnprocessableEntityException('Outbound command does not target this WhatsApp provider adapter.');
    if (command.kind !== 'TEXT' || !command.text?.trim()) throw new UnprocessableEntityException('WhatsApp Cloud API v1 transport currently supports text commands only.');
    if (command.idempotencyKey.length > 512) throw new UnprocessableEntityException('Outbound correlation identity is too long for the provider callback field.');

    let response: Response;
    try {
      response = await fetch(`https://graph.facebook.com/${encodeURIComponent(graphVersion)}/${encodeURIComponent(phoneNumberId)}/messages`, { method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to: command.providerIdentityId, type: 'text', text: { preview_url: false, body: command.text.trim() }, biz_opaque_callback_data: command.idempotencyKey }) });
    } catch { throw new MessagingProviderOutcomeUnknownError(); }
    if (response.status >= 500) throw new MessagingProviderOutcomeUnknownError();
    if (!response.ok) throw new BadGatewayException(`WhatsApp Cloud API rejected the message with HTTP ${response.status}.`);
    try {
      const body = await response.json() as { messages?: Array<{ id?: unknown }> };
      const providerMessageId = asString(body.messages?.[0]?.id);
      if (!providerMessageId) throw new MessagingProviderOutcomeUnknownError();
      return { providerMessageId, acceptedAt: new Date().toISOString() };
    } catch (error) {
      if (error instanceof MessagingProviderOutcomeUnknownError) throw error;
      throw new MessagingProviderOutcomeUnknownError();
    }
  }

  private outboundConfigured(): boolean { return !!env('META_WHATSAPP_ACCESS_TOKEN') && !!env('META_WHATSAPP_PHONE_NUMBER_ID') && !!env('META_GRAPH_API_VERSION'); }
  private verifySignature(context: MessagingWebhookContext): void {
    const appSecret = env('META_APP_SECRET'), rawBody = context.rawBody ? Buffer.from(context.rawBody) : undefined, supplied = signatureHeader(context.headers);
    if (!appSecret || !rawBody || !supplied?.startsWith('sha256=')) throw new UnauthorizedException('WhatsApp webhook authenticity could not be established.');
    const suppliedHex = supplied.slice('sha256='.length);
    if (!/^[0-9a-f]{64}$/i.test(suppliedHex)) throw new UnauthorizedException('WhatsApp webhook authenticity could not be established.');
    const expected = createHmac('sha256', appSecret).update(rawBody).digest(), actual = Buffer.from(suppliedHex, 'hex');
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new UnauthorizedException('WhatsApp webhook authenticity could not be established.');
  }
}
