import { ConflictException } from '@nestjs/common';
import { CorrespondenceDeliveryAttemptStatus, CorrespondenceTemplateVersionStatus, QuoteStatus } from '@prisma/client';
import { QuoteSendShareService } from './quote-send-share.service';

describe('QuoteSendShareService', () => {
  const originalOrigin = process.env.HESTIVA_QUOTE_CUSTOMER_PUBLIC_ORIGIN;
  const actor = { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' } as never;

  beforeEach(() => { process.env.HESTIVA_QUOTE_CUSTOMER_PUBLIC_ORIGIN = 'https://os.homent.example'; });
  afterEach(() => {
    if (originalOrigin === undefined) delete process.env.HESTIVA_QUOTE_CUSTOMER_PUBLIC_ORIGIN;
    else process.env.HESTIVA_QUOTE_CUSTOMER_PUBLIC_ORIGIN = originalOrigin;
    jest.restoreAllMocks();
  });

  function harness() {
    const prisma = {
      quote: { findUnique: jest.fn().mockResolvedValue({
        id: '11111111-1111-4111-8111-111111111111', reference: 'Q-001', status: QuoteStatus.SUBMITTED, currentRevisionNumber: 2,
        customer: { name: 'Customer', contactName: 'Customer', email: 'customer@example.com', phone: '0821234567' },
        revisions: [{ structuredData: {} }],
      }) },
      correspondenceTemplateVersion: { findFirst: jest.fn().mockResolvedValue({ id: '22222222-2222-4222-8222-222222222222' }) },
      $executeRaw: jest.fn().mockResolvedValue(1),
      $queryRaw: jest.fn().mockResolvedValue([]),
    };
    const access = { issue: jest.fn().mockResolvedValue({ token: 'a'.repeat(43), quoteReference: 'Q-001', revisionNumber: 2, expiresAt: new Date('2026-08-25T00:00:00Z') }) };
    const engagement = { engagementSummary: jest.fn() };
    const responses = { summary: jest.fn() };
    const correspondence = {
      materialize: jest.fn().mockResolvedValue({ id: '33333333-3333-4333-8333-333333333333', subject: 'Your Homent Quote is ready', body: 'Review: {{SECURE_QUOTE_LINK}}' }),
      createDeliveryAttempt: jest.fn().mockResolvedValue({ id: '44444444-4444-4444-8444-444444444444' }),
      recordDeliveryOutcome: jest.fn(),
    };
    const email = { send: jest.fn().mockResolvedValue({ outcome: 'ACCEPTED', providerReference: 'email_1' }) };
    const service = new QuoteSendShareService(prisma as never, access as never, engagement as never, responses as never, correspondence as never, email as never);
    return { service, prisma, access, correspondence, email };
  }

  it('injects the capability only at the email transport boundary and records provider acceptance separately', async () => {
    const { service, access, correspondence, email } = harness();
    await expect(service.sendEmail('11111111-1111-4111-8111-111111111111', 2, actor)).resolves.toMatchObject({ state: 'PROVIDER_ACCEPTED' });
    expect(access.issue).toHaveBeenCalledWith(expect.objectContaining({ expectedRevisionNumber: 2 }));
    expect(correspondence.materialize).toHaveBeenCalledWith(actor, expect.objectContaining({
      provenance: expect.objectContaining({ quoteId: '11111111-1111-4111-8111-111111111111', revisionNumber: 2, secureLinkInjectedAtTransport: true }),
    }));
    expect(JSON.stringify(correspondence.materialize.mock.calls[0])).not.toContain('a'.repeat(43));
    expect(email.send).toHaveBeenCalledWith(expect.objectContaining({
      text: expect.stringContaining(`https://os.homent.example/quote#${'a'.repeat(43)}`),
      correspondenceAttemptId: '44444444-4444-4444-8444-444444444444',
    }));
    expect(correspondence.recordDeliveryOutcome).toHaveBeenCalledWith(actor, '44444444-4444-4444-8444-444444444444', expect.objectContaining({
      status: CorrespondenceDeliveryAttemptStatus.ACCEPTED,
      providerReference: 'email_1',
    }));
  });

  it('records only composer-open evidence for manual WhatsApp preparation', async () => {
    const { service, prisma } = harness();
    const result = await service.openWhatsApp('11111111-1111-4111-8111-111111111111', 2, actor);
    expect(result.evidence).toBe('WHATSAPP_COMPOSER_OPENED');
    expect(result.composerUrl).toContain('https://wa.me/27821234567?text=');
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
  });

  it('fails closed when the requested revision is no longer current', async () => {
    const { service, prisma } = harness();
    prisma.quote.findUnique.mockResolvedValue({
      id: '11111111-1111-4111-8111-111111111111', reference: 'Q-001', status: QuoteStatus.SUBMITTED, currentRevisionNumber: 3,
      customer: null, revisions: [{ structuredData: {} }],
    });
    await expect(service.sendEmail('11111111-1111-4111-8111-111111111111', 2, actor)).rejects.toBeInstanceOf(ConflictException);
  });

  it('requires the published Quote Correspondence template', async () => {
    const { service, prisma } = harness();
    prisma.correspondenceTemplateVersion.findFirst.mockResolvedValue(null);
    await expect(service.sendEmail('11111111-1111-4111-8111-111111111111', 2, actor)).rejects.toThrow('Published Quote correspondence template is not available.');
    expect(prisma.correspondenceTemplateVersion.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ status: CorrespondenceTemplateVersionStatus.PUBLISHED }) }));
  });
});
