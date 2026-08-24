import { UnprocessableEntityException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { WhatsAppCloudApiAdapter } from './whatsapp-cloud-api.adapter';

const ENV_NAMES = ['META_WHATSAPP_ACCESS_TOKEN','META_WHATSAPP_PHONE_NUMBER_ID','META_GRAPH_API_VERSION'] as const;

describe('WhatsApp Quote Flow launch transport', () => {
  const registry = { register: jest.fn() };
  let adapter: WhatsAppCloudApiAdapter;

  beforeEach(() => {
    process.env.META_WHATSAPP_ACCESS_TOKEN = 'access-token';
    process.env.META_WHATSAPP_PHONE_NUMBER_ID = 'phone-number-1';
    process.env.META_GRAPH_API_VERSION = 'vXX.X';
    adapter = new WhatsAppCloudApiAdapter(registry as any);
  });
  afterEach(() => {
    jest.restoreAllMocks();
    for (const name of ENV_NAMES) delete process.env[name];
  });

  it('builds the reviewed static Flow launch shape through the existing send boundary', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ messages: [{ id: 'wamid.flow-1' }] }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    );
    await adapter.send({
      channel: 'WHATSAPP', provider: 'meta', providerIdentityId: '27821234567', conversationId: 'conversation-1',
      idempotencyKey: 'whatsapp-quote-flow:session-1', kind: 'INTERACTIVE',
      interactivePayload: {
        type: 'flow', body: { text: 'Complete the form.' },
        action: { name: 'flow', parameters: { flow_message_version: '3', flow_token: 'opaque-token', flow_id: 'flow-123', flow_cta: 'Request a quote', flow_action: 'navigate', flow_action_payload: { screen: 'YOUR_HOME' } } },
      },
    });
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body).toEqual(expect.objectContaining({
      type: 'interactive', biz_opaque_callback_data: 'whatsapp-quote-flow:session-1',
      interactive: expect.objectContaining({ type: 'flow', action: expect.objectContaining({ name: 'flow' }) }),
    }));
    expect(body.interactive.action.parameters).toEqual(expect.objectContaining({ flow_message_version: '3', flow_id: 'flow-123', flow_token: 'opaque-token', flow_action: 'navigate', flow_action_payload: { screen: 'YOUR_HOME' } }));
  });

  it('rejects an arbitrary interactive payload instead of broadening WhatsApp interactive sending', async () => {
    const fetchMock = jest.spyOn(global, 'fetch');
    await expect(adapter.send({
      channel: 'WHATSAPP', provider: 'meta', providerIdentityId: '27821234567', conversationId: 'conversation-1',
      idempotencyKey: 'interactive-1', kind: 'INTERACTIVE', interactivePayload: { type: 'button' },
    })).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
