import type { PrismaService } from '../prisma.service';
import type { WebsiteQuotePricingSnapshotV1, WebsiteQuoteSubmissionV1 } from './website-quote-contract';
import type { WebsiteQuoteSubmissionV2 } from './website-quote-contract-v2';
import { websiteQuotePayloadFingerprint } from './website-quote-idempotency';

type WebsiteQuoteReplayResponse = {
  quoteStatus: 'SUBMITTED' | 'NEEDS_ATTENTION';
  pricing: WebsiteQuotePricingSnapshotV1;
};

export type WebsiteQuoteReplayResolution =
  | { kind: 'NEW' }
  | { kind: 'REPLAY'; quoteId: string; quoteReference: string; response: WebsiteQuoteReplayResponse }
  | { kind: 'CONFLICT'; quoteId: string; quoteReference: string }
  | { kind: 'CORRUPT_EXISTING'; quoteId: string; quoteReference: string };

export async function resolveWebsiteQuoteReplay(
  prisma: Pick<PrismaService, 'quote'>,
  payload: WebsiteQuoteSubmissionV1 | WebsiteQuoteSubmissionV2,
): Promise<WebsiteQuoteReplayResolution> {
  const existing = await prisma.quote.findUnique({
    where: { submissionKey: payload.submissionId },
    select: {
      id: true,
      reference: true,
      activities: {
        where: { type: 'QUOTE_SUBMITTED' },
        orderBy: { createdAt: 'asc' },
        take: 2,
        select: { newStatus: true },
      },
      revisions: {
        where: { origin: 'CUSTOMER_SUBMISSION' },
        orderBy: { revisionNumber: 'asc' },
        take: 2,
        select: {
          structuredData: true,
          currency: true,
          subtotalMinor: true,
          totalMinor: true,
          lineItems: {
            orderBy: { sortOrder: 'asc' },
            select: {
              type: true,
              code: true,
              label: true,
              quantity: true,
              unitAmountMinor: true,
              lineTotalMinor: true,
            },
          },
        },
      },
    },
  });

  if (!existing) return { kind: 'NEW' };

  if (existing.revisions.length !== 1 || existing.activities.length !== 1) {
    return {
      kind: 'CORRUPT_EXISTING',
      quoteId: existing.id,
      quoteReference: existing.reference,
    };
  }

  const originalSubmission = existing.revisions[0];
  const incomingFingerprint = websiteQuotePayloadFingerprint(payload);
  const storedFingerprint = websiteQuotePayloadFingerprint(originalSubmission.structuredData);

  if (incomingFingerprint === storedFingerprint) {
    const submittedStatus = existing.activities[0].newStatus;
    const pricingLineItems = originalSubmission.lineItems.filter((item) => item.type !== 'ADJUSTMENT');
    if (
      originalSubmission.currency !== 'ZAR'
      || (submittedStatus !== 'SUBMITTED' && submittedStatus !== 'NEEDS_ATTENTION')
      || pricingLineItems.some((item) => item.code === null)
    ) {
      return {
        kind: 'CORRUPT_EXISTING',
        quoteId: existing.id,
        quoteReference: existing.reference,
      };
    }

    const adjustmentLines = originalSubmission.lineItems.filter((item) => item.type === 'ADJUSTMENT');
    const pricingLines = pricingLineItems.map((item) => ({
      code: item.code!,
      label: item.label,
      quantity: item.quantity,
      unitAmountMinor: item.unitAmountMinor,
      lineAmountMinor: item.lineTotalMinor,
    }));

    return {
      kind: 'REPLAY',
      quoteId: existing.id,
      quoteReference: existing.reference,
      response: {
        quoteStatus: submittedStatus,
        pricing: {
          currency: 'ZAR',
          subtotalMinor: originalSubmission.subtotalMinor,
          adjustmentsMinor: adjustmentLines.reduce((sum, item) => sum + item.lineTotalMinor, 0),
          totalMinor: originalSubmission.totalMinor,
          lines: pricingLines,
        },
      },
    };
  }

  return {
    kind: 'CONFLICT',
    quoteId: existing.id,
    quoteReference: existing.reference,
  };
}
