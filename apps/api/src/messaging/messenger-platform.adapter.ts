import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { NormalizedInboundMessagingEvent, OutboundMessagingCommand, OutboundMessagingResult } from './messaging-contract';
import { MESSAGING_CONTRACT_VERSION } from './messaging-contract';
import type { MessagingProviderAdapter, MessagingWebhookContext } from './messaging-provider-adapter';

const PROVIDER = 'meta';

function env(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}
function asObject(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}
function asString(value: unknown): string | undefined { return typeof value === 'string' && value.length > 0 ? value : undefined; }
function asNumber(value: unknown): number | undefined { return typeof value === 'number' && Number.isFinite(value) ? value : undefined; }
function signatureHeader(headers: Readonly<Record<string, string | string[] | undefined>>): string | undefined {
  const value = headers['x-hub-signature-256'] ?? headers['X-Hub-Signature-256'];
  return Array.isArray(value) ? value[0] : value;
}
function occurredAt(timestamp: unknown, fallback: string): string {
  const milliseconds = asNumber(timestamp);
  return milliseconds !== undefined && milliseconds >= 0 ? new Date(milliseconds).toISOString() : fallback;
}
function normalizeAttachments(message: Record<string, unknown>) {
  const raw = Array.isArray(message.attachments) ? message.attachments : [];
  const media = raw.flatMap((item) => {
    const attachment = asObject(item); if (!attachment) return [];
    const payload = asObject(attachment.payload);
    const url = asString(payload?.url);
    const type = asString(attachment.type);
    if (!url || !type) return [];
    return [{ providerMediaId: url, mimeType: type }];
  });
  return media.length ? media : undefined;
}

@Injectable()
export class MessengerPlatformAdapter implements MessagingProviderAdapter {
  readonly channel = 'MESSENGER' as const;
  readonly provider = PROVIDER;

  verifySubscription(mode: unknown, token: unknown): boolean {
    const verifyToken = env('META_MESSENGER_WEBHOOK_VERIFY_TOKEN');
    return mode === 'subscribe' && typeof token === 'string' && !!verifyToken && token === verifyToken;
  }

  async normalizeInboundWebhook(payload: unknown, context: MessagingWebhookContext): Promise<ReadonlyArray<NormalizedInboundMessagingEvent>> {
    this.verifySignature(context);
    const root = asObject(payload);
    if (!root || root.object !== 'page') return [];
    const events: NormalizedInboundMessagingEvent[] = [];
    for (const rawEntry of Array.isArray(root.entry) ? root.entry : []) {
      const entry = asObject(rawEntry); if (!entry) continue;
      const pageId = asString(entry.id);
      for (const rawEvent of Array.isArray(entry.messaging) ? entry.messaging : []) {
        const event = asObject(rawEvent); if (!event) continue;
        const sender = asObject(event.sender), recipient = asObject(event.recipient);
        const senderId = asString(sender?.id), recipientId = asString(recipient?.id);
        if (!senderId) continue;
        const message = asObject(event.message);
        const postback = asObject(event.postback);
        const referral = asObject(event.referral) ?? asObject(postback?.referral);
        const messageId = asString(message?.mid);
        const attachments = message ? normalizeAttachments(message) : undefined;
        const kind = message ? (attachments ? 'MEDIA' as const : 'TEXT' as const) : postback ? 'INTERACTIVE' as const : 'UNSUPPORTED' as const;
        const eventIdentity = messageId ?? `${senderId}:${asNumber(event.timestamp) ?? context.receivedAt}:${postback ? 'postback' : 'event'}`;
        events.push({
          contractVersion: MESSAGING_CONTRACT_VERSION,
          channel: this.channel,
          provider: this.provider,
          providerEventId: `messenger:${eventIdentity}`,
          providerMessageId: messageId,
          providerConversationId: pageId && recipientId ? `${pageId}:${senderId}` : pageId ? `${pageId}:${senderId}` : undefined,
          identity: { providerIdentityId: senderId },
          occurredAt: occurredAt(event.timestamp, context.receivedAt),
          receivedAt: context.receivedAt,
          kind,
          text: message ? asString(message.text) : undefined,
          interactivePayload: postback ? { payload: postback.payload ?? null, title: postback.title ?? null } : undefined,
          media: attachments,
          attribution: referral ? {
            sourceType: asString(referral.source),
            sourceId: asString(referral.ref),
            sourceUrl: asString(referral.referer_uri),
            providerMetadata: referral,
          } : undefined,
        });
      }
    }
    return events;
  }

  async send(_command: OutboundMessagingCommand): Promise<OutboundMessagingResult> {
    throw new ServiceUnavailableException('Messenger outbound transport is disabled until safe retry semantics are approved.');
  }

  private verifySignature(context: MessagingWebhookContext): void {
    const appSecret = env('META_APP_SECRET'), rawBody = context.rawBody ? Buffer.from(context.rawBody) : undefined, supplied = signatureHeader(context.headers);
    if (!appSecret || !rawBody || !supplied?.startsWith('sha256=')) throw new UnauthorizedException('Messenger webhook authenticity could not be established.');
    const suppliedHex = supplied.slice('sha256='.length);
    if (!/^[0-9a-f]{64}$/i.test(suppliedHex)) throw new UnauthorizedException('Messenger webhook authenticity could not be established.');
    const expected = createHmac('sha256', appSecret).update(rawBody).digest(), actual = Buffer.from(suppliedHex, 'hex');
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new UnauthorizedException('Messenger webhook authenticity could not be established.');
  }
}
