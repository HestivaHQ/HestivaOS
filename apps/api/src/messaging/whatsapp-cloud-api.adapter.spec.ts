import { UnauthorizedException } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { MessagingProviderOutcomeUnknownError } from './messaging-provider-adapter';
import { WhatsAppCloudApiAdapter } from './whatsapp-cloud-api.adapter';

const ENV_NAMES = ['META_APP_SECRET','META_WHATSAPP_WEBHOOK_VERIFY_TOKEN','META_WHATSAPP_ACCESS_TOKEN','META_WHATSAPP_PHONE_NUMBER_ID','META_GRAPH_API_VERSION'] as const;
function signedContext(body: Buffer, secret = 'app-secret') { return { receivedAt: '2026-08-20T15:00:00.000Z', rawBody: body, headers: { 'x-hub-signature-256': `sha256=${createHmac('sha256', secret).update(body).digest('hex')}` } }; }
function payload() { return { object:'whatsapp_business_account', entry:[{ changes:[{ field:'messages', value:{ metadata:{phone_number_id:'phone-number-1'}, messages:[{from:'27821234567',id:'wamid.message-1',timestamp:'1787238000',type:'text',text:{body:'I need a quote'},referral:{source_type:'ad',source_id:'ad-1',ctwa_clid:'click-1'}}] } }] }] }; }

describe('WhatsAppCloudApiAdapter', () => {
  const registry = { register: jest.fn() };
  let adapter: WhatsAppCloudApiAdapter;
  beforeEach(() => { for (const name of ENV_NAMES) delete process.env[name]; registry.register.mockClear(); adapter = new WhatsAppCloudApiAdapter(registry as any); });
  afterEach(() => { jest.restoreAllMocks(); for (const name of ENV_NAMES) delete process.env[name]; });

  it('verifies the Meta subscription token and raw-body signature', async () => {
    process.env.META_WHATSAPP_WEBHOOK_VERIFY_TOKEN='verify-me'; process.env.META_APP_SECRET='app-secret';
    expect(adapter.verifySubscription('subscribe','verify-me')).toBe(true);
    const body=Buffer.from(JSON.stringify(payload()));
    await expect(adapter.normalizeInboundWebhook(payload(),{receivedAt:'2026-08-20T15:00:00.000Z',headers:{},rawBody:body})).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(adapter.normalizeInboundWebhook(payload(),signedContext(body))).resolves.toHaveLength(1);
  });

  it('normalizes Meta status callbacks with the HestivaOS correlation identity', async () => {
    process.env.META_APP_SECRET='app-secret';
    const providerPayload={object:'whatsapp_business_account',entry:[{changes:[{field:'messages',value:{statuses:[{id:'wamid.out-1',status:'delivered',timestamp:'1787238010',biz_opaque_callback_data:'access-recovery:req-1'}]}}]}]};
    const body=Buffer.from(JSON.stringify(providerPayload));
    await expect(adapter.normalizeStatusWebhook(providerPayload,signedContext(body))).resolves.toEqual([{providerMessageId:'wamid.out-1',correlationId:'access-recovery:req-1',providerStatus:'delivered',occurredAt:expect.any(String)}]);
  });

  it('registers outbound only when send configuration is complete and includes callback correlation', async () => {
    process.env.META_WHATSAPP_ACCESS_TOKEN='access-token'; process.env.META_WHATSAPP_PHONE_NUMBER_ID='phone-number-1'; process.env.META_GRAPH_API_VERSION='vXX.X';
    adapter.onModuleInit(); expect(registry.register).toHaveBeenCalledWith(adapter);
    const fetchMock=jest.spyOn(global,'fetch').mockResolvedValue(new Response(JSON.stringify({messages:[{id:'wamid.out-1'}]}),{status:200,headers:{'Content-Type':'application/json'}}));
    await expect(adapter.send({channel:'WHATSAPP',provider:'meta',providerIdentityId:'27821234567',conversationId:'conversation-1',idempotencyKey:'access-recovery:req-1',kind:'TEXT',text:'Hello'})).resolves.toEqual(expect.objectContaining({providerMessageId:'wamid.out-1'}));
    const request=fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(request.body as string)).toEqual(expect.objectContaining({biz_opaque_callback_data:'access-recovery:req-1'}));
  });

  it('treats network and provider 5xx outcomes as unknown rather than safe-to-retry failures', async () => {
    process.env.META_WHATSAPP_ACCESS_TOKEN='access-token'; process.env.META_WHATSAPP_PHONE_NUMBER_ID='phone-number-1'; process.env.META_GRAPH_API_VERSION='vXX.X';
    jest.spyOn(global,'fetch').mockRejectedValueOnce(new Error('timeout'));
    await expect(adapter.send({channel:'WHATSAPP',provider:'meta',providerIdentityId:'27821234567',conversationId:'c',idempotencyKey:'k',kind:'TEXT',text:'Hello'})).rejects.toBeInstanceOf(MessagingProviderOutcomeUnknownError);
    jest.spyOn(global,'fetch').mockResolvedValueOnce(new Response('server error',{status:503}));
    await expect(adapter.send({channel:'WHATSAPP',provider:'meta',providerIdentityId:'27821234567',conversationId:'c',idempotencyKey:'k2',kind:'TEXT',text:'Hello'})).rejects.toBeInstanceOf(MessagingProviderOutcomeUnknownError);
  });
});
