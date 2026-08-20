import { describe, expect, it, jest } from '@jest/globals';
import { MessagingService } from './messaging.service';
import type { NormalizedInboundMessagingEvent } from './messaging-contract';

function inboundEvent(): NormalizedInboundMessagingEvent {
  return {
    contractVersion: '1.0',
    channel: 'WHATSAPP',
    provider: 'meta',
    providerEventId: 'message:wamid.1',
    providerMessageId: 'wamid.1',
    providerConversationId: 'phone-1:27821234567',
    identity: { providerIdentityId: '27821234567', phoneE164: '+27821234567' },
    occurredAt: '2026-08-20T15:00:00.000Z',
    receivedAt: '2026-08-20T15:00:01.000Z',
    kind: 'TEXT',
    text: 'I need a quote',
    attribution: {
      sourceType: 'ad',
      sourceId: 'ad-1',
      clickId: 'click-1',
      providerMetadata: { ctwa_clid: 'click-1' },
    },
  };
}

describe('MessagingService inbound persistence', () => {
  it('persists referral provenance in the existing JSON metadata field without pretending it is media', async () => {
    const createMessage = jest.fn(async ({ data }: any) => ({ id: 'message-1', occurredAt: data.occurredAt, ...data }));
    const tx = {
      messagingMessage: {
        findUnique: jest.fn(async () => null),
        create: createMessage,
      },
      messagingConversation: {
        upsert: jest.fn(async () => ({ id: 'conversation-1' })),
      },
      messagingMessageStatusEvent: {
        create: jest.fn(async () => ({ id: 'status-1' })),
      },
      workOrderAccessRecovery: {
        findFirst: jest.fn(async () => null),
        update: jest.fn(),
      },
    };
    const prisma = {
      $transaction: jest.fn(async (callback: any) => callback(tx)),
    };
    const service = new MessagingService(prisma as any, {} as any);

    await service.persistInbound(inboundEvent());

    expect(createMessage).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        attachmentMetadata: {
          attribution: expect.objectContaining({
            sourceType: 'ad',
            sourceId: 'ad-1',
            clickId: 'click-1',
          }),
        },
      }),
    }));
  });

  it('preserves the historical media-array shape when no provider envelope is needed', async () => {
    const createMessage = jest.fn(async ({ data }: any) => ({ id: 'message-1', occurredAt: data.occurredAt, ...data }));
    const tx = {
      messagingMessage: { findUnique: jest.fn(async () => null), create: createMessage },
      messagingConversation: { upsert: jest.fn(async () => ({ id: 'conversation-1' })) },
      messagingMessageStatusEvent: { create: jest.fn(async () => ({ id: 'status-1' })) },
      workOrderAccessRecovery: { findFirst: jest.fn(async () => null), update: jest.fn() },
    };
    const prisma = { $transaction: jest.fn(async (callback: any) => callback(tx)) };
    const service = new MessagingService(prisma as any, {} as any);
    const event = inboundEvent();
    delete (event as any).attribution;
    (event as any).kind = 'MEDIA';
    (event as any).media = [{ providerMediaId: 'media-1', mimeType: 'image/jpeg' }];

    await service.persistInbound(event);

    expect(createMessage).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        attachmentMetadata: [{ providerMediaId: 'media-1', mimeType: 'image/jpeg' }],
      }),
    }));
  });
});
