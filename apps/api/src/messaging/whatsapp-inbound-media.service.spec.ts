import { ServiceUnavailableException, UnprocessableEntityException } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { createHash } from 'node:crypto';
import { WhatsAppInboundMediaService } from './whatsapp-inbound-media.service';

const upload = jest.fn<() => Promise<{ data: unknown; error: Error | null }>>();
jest.mock('@supabase/supabase-js', () => ({ createClient: () => ({ storage: { from: () => ({ upload }) } }) }));

const ENV_NAMES = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'META_WHATSAPP_ACCESS_TOKEN',
  'META_WHATSAPP_PHONE_NUMBER_ID',
  'META_GRAPH_API_VERSION',
] as const;

function mediaEvent() {
  return {
    contractVersion: '1.0' as const,
    channel: 'WHATSAPP' as const,
    provider: 'meta',
    providerEventId: 'message:wamid.in-1',
    providerMessageId: 'wamid.in-1',
    identity: { providerIdentityId: '27821234567' },
    occurredAt: '2026-08-20T17:00:00.000Z',
    receivedAt: '2026-08-20T17:00:01.000Z',
    kind: 'MEDIA' as const,
    media: [{ providerMediaId: 'media-1', mimeType: 'image/jpeg', fileName: 'photo.jpg' }],
  };
}

function harness(existing: unknown[] = []) {
  const queryRaw = jest.fn<() => Promise<unknown[]>>().mockResolvedValue(existing);
  const executeRaw = jest.fn<() => Promise<number>>().mockResolvedValue(1);
  const prisma = { $queryRaw: queryRaw, $executeRaw: executeRaw } as any;
  return { service: new WhatsAppInboundMediaService(prisma), prisma };
}

describe('WhatsAppInboundMediaService', () => {
  beforeEach(() => {
    for (const name of ENV_NAMES) delete process.env[name];
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-only-service-role-key';
    process.env.META_WHATSAPP_ACCESS_TOKEN = 'access-token';
    process.env.META_WHATSAPP_PHONE_NUMBER_ID = 'phone-number-1';
    process.env.META_GRAPH_API_VERSION = 'vXX.X';
    upload.mockReset().mockResolvedValue({ data: {}, error: null });
    jest.restoreAllMocks();
  });

  it('retrieves, verifies and stores inbound WhatsApp media privately', async () => {
    const bytes = Buffer.from('image-bytes');
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    const fetchMock = jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: 'media-1',
        url: 'https://lookaside.fbsbx.com/media-1',
        mime_type: 'image/jpeg',
        sha256,
        file_size: String(bytes.length),
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(bytes, { status: 200, headers: { 'Content-Type': 'image/jpeg' } }));
    const { service, prisma } = harness();

    await expect(service.secureInboundMedia('11111111-1111-4111-8111-111111111111', mediaEvent())).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(upload).toHaveBeenCalledWith(
      'whatsapp/11111111-1111-4111-8111-111111111111/media-1',
      bytes,
      expect.objectContaining({ contentType: 'image/jpeg', upsert: true }),
    );
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(2);
  });

  it('does not download a media asset that is already stored', async () => {
    const fetchMock = jest.spyOn(global, 'fetch');
    const { service, prisma } = harness([{ id: 'asset-1', status: 'STORED', storage_path: 'whatsapp/message/media-1' }]);
    await service.secureInboundMedia('11111111-1111-4111-8111-111111111111', mediaEvent());
    expect(fetchMock).not.toHaveBeenCalled();
    expect(prisma.$executeRaw).not.toHaveBeenCalled();
    expect(upload).not.toHaveBeenCalled();
  });

  it('fails closed when provider media exceeds the fixed 20 MB v1 limit', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({
      id: 'media-1',
      url: 'https://lookaside.fbsbx.com/media-1',
      mime_type: 'image/jpeg',
      sha256: 'deadbeef',
      file_size: String(20 * 1024 * 1024 + 1),
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    const { service } = harness();
    await expect(service.secureInboundMedia('11111111-1111-4111-8111-111111111111', mediaEvent())).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(upload).not.toHaveBeenCalled();
  });

  it('requires private storage and Meta media retrieval configuration', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    let { service } = harness();
    await expect(service.secureInboundMedia('11111111-1111-4111-8111-111111111111', mediaEvent())).rejects.toBeInstanceOf(ServiceUnavailableException);

    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-only-service-role-key';
    delete process.env.META_WHATSAPP_ACCESS_TOKEN;
    ({ service } = harness());
    await expect(service.secureInboundMedia('11111111-1111-4111-8111-111111111111', mediaEvent())).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
