import type { PrismaService } from '../prisma.service';
import type { WebsiteQuoteSubmissionV1 } from './website-quote-contract';
import { websiteQuotePayloadFingerprint } from './website-quote-idempotency';

export type WebsiteQuoteReplayResolution =
  | { kind: 'NEW' }
  | { kind: 'REPLAY'; quoteId: string; quoteReference: string }
  | { kind: 'CONFLICT'; quoteId: string; quoteReference: string }
  | { kind: 'CORRUPT_EXISTING'; quoteId: string; quoteReference: string };

export async function resolveWebsiteQuoteReplay(
  prisma: Pick<PrismaService, 'quote'>,
  payload: WebsiteQuoteSubmissionV1,
): Promise<WebsiteQuoteReplayResolution> {
  const existing = await prisma.quote.findUnique({
    where: { submissionKey: payload.submissionId },
    select: {
      id: true,
      reference: true,
      revisions: {
        where: { origin: 'CUSTOMER_SUBMISSION' },
        orderBy: { revisionNumber: 'asc' },
        take: 1,
        select: { structuredData: true },
      },
    },
  });

  if (!existing) return { kind: 'NEW' };

  const originalSubmission = existing.revisions[0];
  if (!originalSubmission) {
    return {
      kind: 'CORRUPT_EXISTING',
      quoteId: existing.id,
      quoteReference: existing.reference,
    };
  }

  const incomingFingerprint = websiteQuotePayloadFingerprint(payload);
  const storedFingerprint = websiteQuotePayloadFingerprint(originalSubmission.structuredData);

  if (incomingFingerprint === storedFingerprint) {
    return {
      kind: 'REPLAY',
      quoteId: existing.id,
      quoteReference: existing.reference,
    };
  }

  return {
    kind: 'CONFLICT',
    quoteId: existing.id,
    quoteReference: existing.reference,
  };
}
