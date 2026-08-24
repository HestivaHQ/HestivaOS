import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { CorrespondenceSenderResolver, ResendEmailTransport } from './resend-email.transport';

describe('ResendEmailTransport', () => {
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };
  const attemptId = '11111111-1111-4111-8111-111111111111';

  beforeEach(() => {
    process.env.RESEND_API_KEY = 'test-resend-key';
    process.env.HESTIVA_CORRESPONDENCE_QUOTE_FROM = 'Homent Quotes <quotes@homent.co.za>';
    process.env.HESTIVA_CORRESPONDENCE_QUOTE_REPLY_TO = 'quotes@homent.co.za';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = { ...originalEnv };
    jest.restoreAllMocks();
  });

  it('uses the Quote sender, reply mailbox, idempotency key and signed-webhook correlation tag', async () => {
    const fetchMock = jest.fn(async (_url: string | URL | Request, init?: RequestInit) => new Response(JSON.stringify({ id: 'email_123' }), { status: 200, headers: { 'content-type': 'application/json' } }));
    global.fetch = fetchMock as typeof fetch;
    const transport = new ResendEmailTransport(new CorrespondenceSenderResolver());

    await expect(transport.send({
      purpose: 'QUOTE',
      to: 'customer@example.com',
      subject: 'Your Homent Quote is ready',
      text: 'Review your quote.',
      idempotencyKey: `correspondence-attempt/${attemptId}`,
      correspondenceAttemptId: attemptId,
    })).resolves.toEqual({ outcome: 'ACCEPTED', providerReference: 'email_123' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    expect((init?.headers as Record<string, string>)['Idempotency-Key']).toBe(`correspondence-attempt/${attemptId}`);
    expect(JSON.parse(String(init?.body))).toEqual({
      from: 'Homent Quotes <quotes@homent.co.za>',
      to: ['customer@example.com'],
      reply_to: 'quotes@homent.co.za',
      subject: 'Your Homent Quote is ready',
      text: 'Review your quote.',
      tags: [
        { name: 'purpose', value: 'quote' },
        { name: 'correspondence_attempt', value: attemptId },
      ],
    });
  });

  it('does not turn an uncertain network outcome into a failed or accepted result', async () => {
    global.fetch = jest.fn(async () => { throw new Error('network'); }) as typeof fetch;
    const transport = new ResendEmailTransport(new CorrespondenceSenderResolver());
    await expect(transport.send({ purpose: 'QUOTE', to: 'customer@example.com', subject: 'Quote', text: 'Body', idempotencyKey: 'attempt/1', correspondenceAttemptId: attemptId }))
      .resolves.toEqual({ outcome: 'UNCERTAIN', message: 'Resend transport outcome is uncertain.' });
  });

  it('reports explicit provider rejection as rejected evidence', async () => {
    global.fetch = jest.fn(async () => new Response(JSON.stringify({ name: 'validation_error', message: 'Invalid sender' }), { status: 422, headers: { 'content-type': 'application/json' } })) as typeof fetch;
    const transport = new ResendEmailTransport(new CorrespondenceSenderResolver());
    await expect(transport.send({ purpose: 'QUOTE', to: 'customer@example.com', subject: 'Quote', text: 'Body', idempotencyKey: 'attempt/2', correspondenceAttemptId: attemptId }))
      .resolves.toEqual({ outcome: 'REJECTED', code: 'validation_error', message: 'Invalid sender' });
  });
});
