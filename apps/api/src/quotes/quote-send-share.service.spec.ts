import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ConflictException } from '@nestjs/common';
import { CorrespondenceDeliveryAttemptStatus, CorrespondenceTemplateVersionStatus, QuoteStatus } from '@prisma/client';
import { QuoteSendShareService } from './quote-send-share.service';

type QuoteFixture = {
  id: string;
  reference: string;
  status: QuoteStatus;
  currentRevisionNumber: number;
  customer: { name: string; contactName: string; email: string; phone: string } | null;
  revisions: Array<{ structuredData: Record<string, never> }>;
};
type AccessIssueResult = { token: string; quoteReference: string; revisionNumber: number; expiresAt: Date };
type MaterializedRecord = { id: string; subject: string; body: string };
type DeliveryAttempt = { id: string };
type EmailAccepted = { outcome: 'ACCEPTED'; providerReference: string };

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
    const quoteFindUnique = jest.fn<() => Promise<QuoteFixture | null>>();
    quoteFindUnique.mockResolvedValue({
      id: '11111111-1111-4111-8111-111111111111', reference: 'Q-001', status: QuoteStatus.SUBMITTED, currentRevisionNumber: 2,
      customer: { name: 'Customer', contactName: 'Customer', email: 'customer@example.com', phone: '0821234567' }, revisions: [{ structuredData: {} }],
    });
    const templateFindFirst = jest.fn<() => Promise<{ id: string } | null>>();
    templateFindFirst.mockResolvedValue({ id: '22222222-2222-4222-8222-222222222222' });
    const executeRaw = jest.fn<() => Promise<number>>(); executeRaw.mockResolvedValue(1);
    const queryRaw = jest.fn<() => Promise<unknown[]>>(); queryRaw.mockResolvedValue([]);
    const prisma = { quote: { findUnique: quoteFindUnique }, correspondenceTemplateVersion: { findFirst: templateFindFirst }, $executeRaw: executeRaw, $queryRaw: queryRaw };
    const issue = jest.fn<() => Promise<AccessIssueResult>>();
    issue.mockResolvedValue({ token: 'a'.repeat(43), quoteReference: 'Q-001', revisionNumber: 2, expiresAt: new Date('2026-08-25T00:00:00Z') });
    const access = { issue };
    const engagement = { engagementSummary: jest.fn<() => Promise<unknown>>() };
    const responses = { summary: jest.fn<() => Promise<unknown>>() };
    const materialize = jest.fn<() => Promise<MaterializedRecord>>();
    materialize.mockResolvedValue({ id: '33333333-3333-4333-8333-333333333333', subject: 'Your Homent Quote is ready', body: 'Review: {{SECURE_QUOTE_LINK}}' });
    const createDeliveryAttempt = jest.fn<() => Promise<DeliveryAttempt>>();
    createDeliveryAttempt.mockResolvedValue({ id: '44444444-4444-4444-8444-444444444444' });
    const recordDeliveryOutcome = jest.fn<() => Promise<unknown>>(); recordDeliveryOutcome.mockResolvedValue({});
    const correspondence = { materialize, createDeliveryAttempt, recordDeliveryOutcome };
    const send = jest.fn<() => Promise<EmailAccepted>>(); send.mockResolvedValue({ outcome: 'ACCEPTED', providerReference: 'email_1' });
    const email = { assertConfigured: jest.fn(), send };
    const service = new QuoteSendShareService(prisma as never, access as never, engagement as never, responses as never, correspondence as never, email as never);
    return { service, prisma, access, engagement, responses, correspondence, email };
  }

  const pendingAttempt = { attempt_id: '55555555-5555-4555-8555-555555555555', record_id: '33333333-3333-4333-8333-333333333333', subject: 'Quote', body: 'Body', recipient_email: 'customer@example.com' };

  it('injects the capability only at the email transport boundary and records provider acceptance separately', async () => {
    const { service, access, correspondence, email } = harness();
    await expect(service.sendEmail('11111111-1111-4111-8111-111111111111', 2, actor)).resolves.toMatchObject({ state: 'PROVIDER_ACCEPTED' });
    expect(access.issue).toHaveBeenCalledWith(expect.objectContaining({ expectedRevisionNumber: 2 }));
    expect(JSON.stringify(correspondence.materialize.mock.calls[0])).not.toContain('a'.repeat(43));
    expect(email.send).toHaveBeenCalledWith(expect.objectContaining({ correspondenceAttemptId: '44444444-4444-4444-8444-444444444444' }));
  });

  it('blocks a new email and new capability while the previous provider outcome is unreconciled', async () => {
    const { service, prisma, access, correspondence, email } = harness();
    prisma.$queryRaw.mockResolvedValueOnce([pendingAttempt]);
    await expect(service.sendEmail('11111111-1111-4111-8111-111111111111', 2, actor)).rejects.toThrow('previous Quote email outcome is still uncertain');
    expect(access.issue).not.toHaveBeenCalled(); expect(correspondence.materialize).not.toHaveBeenCalled(); expect(email.send).not.toHaveBeenCalled();
  });

  it('reconciles a lost HTTP response from later signed provider acceptance evidence without issuing another capability', async () => {
    const { service, prisma, access, correspondence } = harness();
    prisma.$queryRaw
      .mockResolvedValueOnce([pendingAttempt])
      .mockResolvedValueOnce([{ event_type: 'email.sent', provider_reference: 'email_1', occurred_at: new Date() }]);
    await expect(service.recoverEmail('11111111-1111-4111-8111-111111111111', 2, actor)).resolves.toMatchObject({ state: 'PROVIDER_ACCEPTED', retryPermitted: false });
    expect(access.issue).not.toHaveBeenCalled();
    expect(correspondence.recordDeliveryOutcome).toHaveBeenCalledWith(actor, pendingAttempt.attempt_id, expect.objectContaining({ status: CorrespondenceDeliveryAttemptStatus.ACCEPTED, providerReference: 'email_1' }));
  });

  it.each(['email.bounced', 'email.failed', 'email.suppressed'])('preserves provider acceptance while making a deliberate resend available after %s', async (eventType) => {
    const { service, prisma, access, correspondence } = harness();
    prisma.$queryRaw
      .mockResolvedValueOnce([pendingAttempt])
      .mockResolvedValueOnce([{ event_type: eventType, provider_reference: 'email_1', occurred_at: new Date() }]);
    await expect(service.recoverEmail('11111111-1111-4111-8111-111111111111', 2, actor)).resolves.toMatchObject({ state: 'DELIVERY_FAILED', retryPermitted: true });
    expect(access.issue).not.toHaveBeenCalled();
    expect(correspondence.recordDeliveryOutcome).toHaveBeenCalledWith(actor, pendingAttempt.attempt_id, expect.objectContaining({ status: CorrespondenceDeliveryAttemptStatus.ACCEPTED, providerReference: 'email_1' }));
  });

  it('does not treat a complaint as a failed provider submission or authorize an automatic-looking resend', async () => {
    const { service, prisma } = harness();
    prisma.$queryRaw
      .mockResolvedValueOnce([pendingAttempt])
      .mockResolvedValueOnce([{ event_type: 'email.complained', provider_reference: 'email_1', occurred_at: new Date() }]);
    await expect(service.recoverEmail('11111111-1111-4111-8111-111111111111', 2, actor)).resolves.toMatchObject({ state: 'PROVIDER_ACCEPTED', retryPermitted: false });
  });

  it('converges a concurrent duplicate reconciliation when the same provider acceptance was already recorded', async () => {
    const { service, prisma, correspondence } = harness();
    prisma.$queryRaw
      .mockResolvedValueOnce([pendingAttempt])
      .mockResolvedValueOnce([{ event_type: 'email.sent', provider_reference: 'email_1', occurred_at: new Date() }])
      .mockResolvedValueOnce([{ status: 'ACCEPTED', provider_reference: 'email_1' }]);
    correspondence.recordDeliveryOutcome.mockRejectedValueOnce(new ConflictException('This delivery attempt already has a terminal outcome.'));
    await expect(service.recoverEmail('11111111-1111-4111-8111-111111111111', 2, actor)).resolves.toMatchObject({ state: 'PROVIDER_ACCEPTED' });
  });

  it('keeps an unresolved attempt blocked without rotating or resurrecting customer access', async () => {
    const { service, prisma, access, correspondence } = harness();
    prisma.$queryRaw.mockResolvedValueOnce([pendingAttempt]).mockResolvedValueOnce([]).mockResolvedValueOnce([{ token_fingerprint: 'fingerprint-only' }]);
    await expect(service.recoverEmail('11111111-1111-4111-8111-111111111111', 2, actor)).resolves.toMatchObject({ state: 'PENDING_RECONCILIATION', retryPermitted: false });
    expect(access.issue).not.toHaveBeenCalled(); expect(correspondence.recordDeliveryOutcome).not.toHaveBeenCalled();
  });

  it('fails recovery closed when the original secure grant is no longer active', async () => {
    const { service, prisma, access } = harness();
    prisma.$queryRaw.mockResolvedValueOnce([pendingAttempt]).mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    await expect(service.recoverEmail('11111111-1111-4111-8111-111111111111', 2, actor)).rejects.toThrow('original Quote link is no longer active');
    expect(access.issue).not.toHaveBeenCalled();
  });

  it('fails recovery closed when the Quote revision became stale', async () => {
    const { service, prisma } = harness();
    prisma.quote.findUnique.mockResolvedValue({ id: '11111111-1111-4111-8111-111111111111', reference: 'Q-001', status: QuoteStatus.SUBMITTED, currentRevisionNumber: 3, customer: null, revisions: [{ structuredData: {} }] });
    await expect(service.recoverEmail('11111111-1111-4111-8111-111111111111', 2, actor)).rejects.toBeInstanceOf(ConflictException);
  });

  it('keeps customer response evidence independent while email tracking is unresolved', async () => {
    const { service, prisma, engagement, responses } = harness();
    engagement.engagementSummary.mockResolvedValue({ accessState: 'ACTIVE', firstViewedAt: null, lastViewedAt: null, viewCount: 0 });
    responses.summary.mockResolvedValue({ response: { decision: 'CUSTOMER_ACCEPTED', respondedAt: '2026-08-24T10:00:00.000Z', source: 'PUBLIC_QUOTE_CAPABILITY' } });
    prisma.$queryRaw
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([pendingAttempt]);
    await expect(service.tracking('11111111-1111-4111-8111-111111111111', 2)).resolves.toMatchObject({
      response: { decision: 'CUSTOMER_ACCEPTED' },
      recovery: { state: 'PENDING_RECONCILIATION' },
    });
  });

  it('records only composer-open evidence for manual WhatsApp preparation', async () => {
    const { service, prisma } = harness();
    const result = await service.openWhatsApp('11111111-1111-4111-8111-111111111111', 2, actor);
    expect(result.evidence).toBe('WHATSAPP_COMPOSER_OPENED'); expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
  });

  it('fails closed when the requested revision is no longer current', async () => {
    const { service, prisma } = harness();
    prisma.quote.findUnique.mockResolvedValue({ id: '11111111-1111-4111-8111-111111111111', reference: 'Q-001', status: QuoteStatus.SUBMITTED, currentRevisionNumber: 3, customer: null, revisions: [{ structuredData: {} }] });
    await expect(service.sendEmail('11111111-1111-4111-8111-111111111111', 2, actor)).rejects.toBeInstanceOf(ConflictException);
  });

  it('requires the published Quote Correspondence template before rotating customer access', async () => {
    const { service, prisma, access } = harness();
    prisma.correspondenceTemplateVersion.findFirst.mockResolvedValue(null);
    await expect(service.sendEmail('11111111-1111-4111-8111-111111111111', 2, actor)).rejects.toThrow('Published Quote correspondence template is not available.');
    expect(prisma.correspondenceTemplateVersion.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ status: CorrespondenceTemplateVersionStatus.PUBLISHED }) }));
    expect(access.issue).not.toHaveBeenCalled();
  });
});
