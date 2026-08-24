import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../prisma.service';

const TRUSTED_EVENTS = new Set([
  'email.sent',
  'email.delivered',
  'email.delivery_delayed',
  'email.bounced',
  'email.complained',
  'email.failed',
  'email.suppressed',
]);
const IGNORED_ENGAGEMENT_EVENTS = new Set(['email.opened', 'email.clicked']);
const MAX_TIMESTAMP_SKEW_SECONDS = 300;

type ResendEvent = {
  type: string;
  created_at: string;
  data: { email_id?: string; to?: string[]; bounce?: unknown; [key: string]: unknown };
};

function signingKey(): Buffer {
  const configured = process.env.RESEND_WEBHOOK_SIGNING_SECRET?.trim();
  if (!configured) throw new ServiceUnavailableException('RESEND_WEBHOOK_SIGNING_SECRET is not configured.');
  const encoded = configured.startsWith('whsec_') ? configured.slice('whsec_'.length) : configured;
  try {
    const key = Buffer.from(encoded, 'base64');
    if (!key.length) throw new Error('empty');
    return key;
  } catch {
    throw new ServiceUnavailableException('RESEND_WEBHOOK_SIGNING_SECRET is invalid.');
  }
}

function verifySignature(payload: Buffer, id: string, timestamp: string, signatureHeader: string): void {
  if (!id || !timestamp || !signatureHeader) throw new BadRequestException('Invalid Resend webhook signature.');
  const seconds = Number(timestamp);
  if (!Number.isFinite(seconds) || Math.abs(Date.now() / 1000 - seconds) > MAX_TIMESTAMP_SKEW_SECONDS) {
    throw new BadRequestException('Invalid Resend webhook timestamp.');
  }
  const expected = createHmac('sha256', signingKey())
    .update(`${id}.${timestamp}.${payload.toString('utf8')}`, 'utf8')
    .digest();
  const candidates = signatureHeader.split(/\s+/).map((part) => part.trim()).filter(Boolean);
  const valid = candidates.some((candidate) => {
    const value = candidate.startsWith('v1,') ? candidate.slice(3) : '';
    if (!value) return false;
    try {
      const actual = Buffer.from(value, 'base64');
      return actual.length === expected.length && timingSafeEqual(actual, expected);
    } catch { return false; }
  });
  if (!valid) throw new BadRequestException('Invalid Resend webhook signature.');
}

@Injectable()
export class ResendWebhookService {
  constructor(private readonly prisma: PrismaService) {}

  async ingest(payload: Buffer, headers: { id: string; timestamp: string; signature: string }) {
    verifySignature(payload, headers.id, headers.timestamp, headers.signature);
    let event: ResendEvent;
    try { event = JSON.parse(payload.toString('utf8')) as ResendEvent; }
    catch { throw new BadRequestException('Invalid Resend webhook payload.'); }

    if (IGNORED_ENGAGEMENT_EVENTS.has(event.type)) return { accepted: true, ignored: true };
    if (!TRUSTED_EVENTS.has(event.type)) return { accepted: true, ignored: true };
    const providerReference = event.data?.email_id?.trim();
    const occurredAt = new Date(event.created_at);
    if (!providerReference || Number.isNaN(occurredAt.getTime())) throw new BadRequestException('Invalid Resend email event.');

    const attempts = await this.prisma.$queryRaw<Array<{ attempt_id: string }>>(Prisma.sql`
      SELECT a.id AS attempt_id
      FROM correspondence_delivery_attempts a
      JOIN correspondence_delivery_attempt_events e ON e.attempt_id = a.id
      WHERE e.status = 'ACCEPTED'::"CorrespondenceDeliveryAttemptStatus"
        AND e.provider_reference = ${providerReference}
      ORDER BY e.created_at DESC
      LIMIT 1
    `);
    if (!attempts[0]) return { accepted: true, unmatched: true };

    const safeMetadata = {
      recipientCount: Array.isArray(event.data.to) ? event.data.to.length : 0,
      ...(event.type === 'email.bounced' && event.data.bounce ? { bounce: event.data.bounce } : {}),
    };
    await this.prisma.$executeRaw(Prisma.sql`
      INSERT INTO correspondence_provider_events (
        id, attempt_id, provider, provider_event_id, provider_reference, event_type, occurred_at, metadata, created_at
      ) VALUES (
        gen_random_uuid(), ${attempts[0].attempt_id}::uuid, 'RESEND', ${headers.id}, ${providerReference}, ${event.type},
        ${occurredAt}, ${JSON.stringify(safeMetadata)}::jsonb, CURRENT_TIMESTAMP
      )
      ON CONFLICT (provider_event_id) DO NOTHING
    `);
    return { accepted: true, ignored: false };
  }
}

export const RESEND_WEBHOOK_SECURITY = {
  maxTimestampSkewSeconds: MAX_TIMESTAMP_SKEW_SECONDS,
  trustedEvents: [...TRUSTED_EVENTS],
  ignoredEngagementEvents: [...IGNORED_ENGAGEMENT_EVENTS],
} as const;
