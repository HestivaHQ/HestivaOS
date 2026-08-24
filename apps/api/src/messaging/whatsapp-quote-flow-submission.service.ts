import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma.service';
import { QuoteSubmissionService } from '../quotes/quote-submission.service';
import { resolveMessagingQuoteReplay } from './messaging-quote-replay-resolution';
import { mapWhatsAppQuoteFlowV1, type FlowV1SessionEvidence } from './whatsapp-quote-flow-v1-mapper';

type SessionRow = FlowV1SessionEvidence & {
  id: string;
  conversationId: string;
  provider: string;
  completedAt: Date;
  submissionKey: string | null;
  submittedQuoteId: string | null;
  humanReviewReason: string | null;
};

function submissionKey(session: Pick<SessionRow, 'id' | 'completionFingerprint'>): string {
  if (!session.completionFingerprint) throw new ConflictException('Flow completion fingerprint is missing.');
  return `messaging-flow:${createHash('sha256').update(`${session.id}\n${session.completionFingerprint}`).digest('hex')}`;
}

function structuredFlowQuote(input: { session: SessionRow; draft: unknown; submittedAt: string }): Prisma.InputJsonValue {
  return {
    schemaVersion: 'MESSAGING_QUOTE_V1',
    source: 'HOMENT_MESSAGING',
    submittedAt: input.submittedAt,
    ...(input.draft as Record<string, unknown>),
    messagingProvenance: {
      channel: 'WHATSAPP',
      provider: input.session.provider,
      conversationId: input.session.conversationId,
      confirmationOrigin: 'WHATSAPP_FLOW',
      flowSessionId: input.session.id,
      flowContractId: input.session.flowContractId,
      mappingVersion: input.session.mappingVersion,
      completionContractId: input.session.completionContractId,
      providerFlowArtifactId: input.session.providerFlowArtifactId,
      flowJsonVersion: input.session.flowJsonVersion,
      completionFingerprint: input.session.completionFingerprint,
    },
  } as Prisma.InputJsonValue;
}

@Injectable()
export class WhatsAppQuoteFlowSubmissionService {
  constructor(private readonly prisma: PrismaService, private readonly quoteSubmissions: QuoteSubmissionService) {}

  async processCompletedSession(sessionId: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${sessionId}, 0))`);
      const rows = await tx.$queryRaw<SessionRow[]>(Prisma.sql`
        SELECT id, conversation_id AS "conversationId", provider,
          flow_contract_id AS "flowContractId", mapping_version AS "mappingVersion",
          completion_contract_id AS "completionContractId", provider_flow_artifact_id AS "providerFlowArtifactId",
          flow_json_version AS "flowJsonVersion", status, completed_at AS "completedAt",
          completion_fingerprint AS "completionFingerprint", completion_evidence AS "completionEvidence",
          submission_key AS "submissionKey", submitted_quote_id AS "submittedQuoteId",
          human_review_reason AS "humanReviewReason"
        FROM messaging_quote_flow_sessions WHERE id = ${sessionId}::uuid FOR UPDATE
      `);
      const session = rows[0];
      if (!session) throw new NotFoundException('WhatsApp Quote Flow session not found.');
      if (session.submittedQuoteId) {
        const quote = await tx.quote.findUnique({ where: { id: session.submittedQuoteId }, select: { id: true, reference: true, status: true } });
        if (!quote) throw new ConflictException('Flow session Quote linkage is inconsistent and requires recovery.');
        return { kind: 'QUOTE' as const, quoteId: quote.id, quoteReference: quote.reference, quoteStatus: quote.status, replay: true };
      }
      if (session.humanReviewReason) return { kind: 'HUMAN_REVIEW' as const, reason: session.humanReviewReason, replay: true };

      const mapped = mapWhatsAppQuoteFlowV1(session);
      if (mapped.kind !== 'READY') {
        const reason = mapped.kind === 'HUMAN_REVIEW' ? mapped.reason : `Flow V1 validation: ${mapped.reason}`;
        await tx.$executeRaw(Prisma.sql`
          UPDATE messaging_quote_flow_sessions SET human_review_reason = ${reason}, processed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
          WHERE id = ${session.id}::uuid AND submitted_quote_id IS NULL
        `);
        return { kind: 'HUMAN_REVIEW' as const, reason, replay: false };
      }

      const key = submissionKey(session);
      if (session.submissionKey && session.submissionKey !== key) throw new ConflictException('Flow Quote submission reservation conflicts with immutable completion evidence.');
      await tx.$executeRaw(Prisma.sql`
        UPDATE messaging_quote_flow_sessions SET submission_key = ${key}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${session.id}::uuid AND (submission_key IS NULL OR submission_key = ${key})
      `);
      const submittedAt = session.completedAt.toISOString();
      const structuredData = structuredFlowQuote({ session, draft: mapped.draft, submittedAt });
      const result = await this.quoteSubmissions.submit({
        submissionKey: key,
        submittedAt,
        pricingSubmission: mapped.draft,
        structuredData,
        submittedActivityMetadata: {
          source: 'HOMENT_MESSAGING', channel: 'WHATSAPP', provider: session.provider,
          conversationId: session.conversationId, confirmationOrigin: 'WHATSAPP_FLOW', flowSessionId: session.id,
          completionFingerprint: session.completionFingerprint,
        },
      }, () => resolveMessagingQuoteReplay(this.prisma, key, structuredData));

      const linked = await tx.$executeRaw(Prisma.sql`
        UPDATE messaging_quote_flow_sessions SET submitted_quote_id = ${result.quoteId}::uuid, processed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${session.id}::uuid AND (submitted_quote_id IS NULL OR submitted_quote_id = ${result.quoteId}::uuid)
      `);
      if (linked !== 1) throw new ConflictException('Flow session could not be linked safely to the canonical Quote.');
      return { kind: 'QUOTE' as const, ...result };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
}
