import type { PrismaService } from '../prisma.service';
import type { WebsiteQuoteSubmissionV1 } from './website-quote-contract';
import type { WebsiteQuoteSubmissionV2 } from './website-quote-contract-v2';
import { websiteQuotePayloadFingerprint } from './website-quote-idempotency';

export type WebsiteQuoteReplayResolution =
  | { kind: 'NEW' }
  | { kind: 'REPLAY'; quoteId: string; quoteReference: string }
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
      revisions: {
        where: { origin: 'CUSTOMER_SUBMISSION' },
        orderBy: { revisionNumber: 'asc' },
        take: 2,
        select: { structuredData: true },
      },
    },
  });

  if (!existing) return { kind: 'NEW' };

  if (existing.revisions.length !== 1) {
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
