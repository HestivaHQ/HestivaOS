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
      currentRevisionNumber: true,
      revisions: {
        select: { revisionNumber: true, structuredData: true },
      },
    },
  });

  if (!existing) return { kind: 'NEW' };

  const currentRevision = existing.revisions.find(
    (revision) => revision.revisionNumber === existing.currentRevisionNumber,
  );
  if (!currentRevision) {
    return {
      kind: 'CORRUPT_EXISTING',
      quoteId: existing.id,
      quoteReference: existing.reference,
    };
  }

  const incomingFingerprint = websiteQuotePayloadFingerprint(payload);
  const storedFingerprint = websiteQuotePayloadFingerprint(currentRevision.structuredData);

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
