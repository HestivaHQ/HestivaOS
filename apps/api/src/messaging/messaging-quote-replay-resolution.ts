import { createHash } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import type { PrismaService } from '../prisma.service';
import type { QuoteSubmissionReplayResolution } from '../quotes/quote-submission.service';

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entryValue]) => [key, canonicalize(entryValue)]),
    );
  }
  return value;
}

function fingerprint(value: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(canonicalize(value)), 'utf8')
    .digest('hex');
}

export async function resolveMessagingQuoteReplay(
  prisma: Pick<PrismaService, 'quote'>,
  submissionKey: string,
  structuredData: Prisma.InputJsonValue,
): Promise<QuoteSubmissionReplayResolution> {
  const existing = await prisma.quote.findUnique({
    where: { submissionKey },
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

  if (fingerprint(existing.revisions[0].structuredData) === fingerprint(structuredData)) {
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
