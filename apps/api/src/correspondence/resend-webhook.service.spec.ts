import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import { ResendWebhookService } from './resend-webhook.service';

function signed(raw: Buffer, secret: string, id = 'msg_test_event', timestamp = String(Math.floor(Date.now() / 1000))) {
  const encoded = secret.startsWith('whsec_') ? secret.slice(6) : secret;
  const signature = createHmac('sha256', Buffer.from(encoded, 'base64')).update(`${id}.${timestamp}.${raw.toString('utf8')}`, 'utf8').digest('base64');
  return { id, timestamp, signature: `v1,${signature}` };
}

describe('ResendWebhookService', () => {
  const originalSecret = process.env.RESEND_WEBHOOK_SIGNING_SECRET;
  const secret = `whsec_${Buffer.from('01234567890123456789012345678901').toString('base64')}`;
  beforeEach(() => { process.env.RESEND_WEBHOOK_SIGNING_SECRET = secret; });
  afterEach(() => { if (originalSecret === undefined) delete process.env.RESEND_WEBHOOK_SIGNING_SECRET; else process.env.RESEND_WEBHOOK_SIGNING_SECRET = originalSecret; jest.restoreAllMocks(); });

  function harness() {
    const queryRaw = jest.fn<() => Promise<Array<{ attempt_id: string }>>>(); queryRaw.mockResolvedValue([{ attempt_id: '11111111-1111-1111-1111-111111111111' }]);
    const executeRaw = jest.fn<() => Promise<number>>(); executeRaw.mockResolvedValue(1);
    const prisma = { $queryRaw: queryRaw, $executeRaw: executeRaw };
    return { service: new ResendWebhookService(prisma as never), prisma };
  }

  it('accepts a correctly signed delivery event and persists provider evidence against the matching Correspondence attempt', async () => {
    const { service, prisma } = harness();
    const raw = Buffer.from(JSON.stringify({ type: 'email.delivered', created_at: new Date().toISOString(), data: { email_id: 'email_123', to: ['customer@example.com'] } }));
    await expect(service.ingest(raw, signed(raw, secret))).resolves.toEqual({ accepted: true, ignored: false });
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
  });

  it('converges duplicate webhook delivery through provider-event idempotency', async () => {
    const { service, prisma } = harness();
    const raw = Buffer.from(JSON.stringify({ type: 'email.sent', created_at: new Date().toISOString(), data: { email_id: 'email_123' } }));
    const headers = signed(raw, secret, 'same-provider-event');
    await expect(service.ingest(raw, headers)).resolves.toEqual({ accepted: true, ignored: false });
    await expect(service.ingest(raw, headers)).resolves.toEqual({ accepted: true, ignored: false });
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(2);
  });

  it('preserves delayed and out-of-order provider events as separate append-only evidence', async () => {
    const { service, prisma } = harness();
    const delivered = Buffer.from(JSON.stringify({ type: 'email.delivered', created_at: '2026-08-24T13:00:00.000Z', data: { email_id: 'email_123' } }));
    const sent = Buffer.from(JSON.stringify({ type: 'email.sent', created_at: '2026-08-24T12:59:00.000Z', data: { email_id: 'email_123' } }));
    await service.ingest(delivered, signed(delivered, secret, 'event-delivered'));
    await service.ingest(sent, signed(sent, secret, 'event-sent'));
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(2);
  });

  it('ignores provider open evidence rather than treating it as Quote customer-view evidence', async () => {
    const prisma = { $queryRaw: jest.fn(), $executeRaw: jest.fn() };
    const service = new ResendWebhookService(prisma as never);
    const raw = Buffer.from(JSON.stringify({ type: 'email.opened', created_at: new Date().toISOString(), data: { email_id: 'email_123' } }));
    await expect(service.ingest(raw, signed(raw, secret))).resolves.toEqual({ accepted: true, ignored: true });
    expect(prisma.$queryRaw).not.toHaveBeenCalled(); expect(prisma.$executeRaw).not.toHaveBeenCalled();
  });

  it('rejects an invalid webhook signature before trusting the payload', async () => {
    const prisma = { $queryRaw: jest.fn(), $executeRaw: jest.fn() };
    const service = new ResendWebhookService(prisma as never);
    const raw = Buffer.from(JSON.stringify({ type: 'email.delivered', created_at: new Date().toISOString(), data: { email_id: 'email_123' } }));
    await expect(service.ingest(raw, { id: 'event_1', timestamp: String(Math.floor(Date.now() / 1000)), signature: 'v1,bad' })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('rejects stale signed webhook timestamps', async () => {
    const prisma = { $queryRaw: jest.fn(), $executeRaw: jest.fn() };
    const service = new ResendWebhookService(prisma as never);
    const raw = Buffer.from(JSON.stringify({ type: 'email.sent', created_at: new Date().toISOString(), data: { email_id: 'email_123' } }));
    await expect(service.ingest(raw, signed(raw, secret, 'event_old', String(Math.floor(Date.now() / 1000) - 601)))).rejects.toBeInstanceOf(BadRequestException);
  });
});