import {
  ConflictException,
  Injectable,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  MessagingChannel,
  MessagingDeliveryStatus,
  MessagingDirection,
  MessagingMessageKind,
  MessagingMessagePurpose,
  Prisma,
} from '@prisma/client';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma.service';
import { MessagingOutcomePendingReconciliationError, MessagingService } from './messaging.service';

export const HOMENT_QUOTE_FLOW_CONTRACT = 'HOMENT_QUOTE_REQUEST_V1' as const;
export const HOMENT_QUOTE_FLOW_MAPPING = 'HOMENT_QUOTE_REQUEST_MAPPING_V1' as const;
export const HOMENT_QUOTE_FLOW_COMPLETION = 'HOMENT_QUOTE_REQUEST_COMPLETION_V1' as const;
export const HOMENT_QUOTE_FLOW_JSON_VERSION = '7.3' as const;
export const HOMENT_QUOTE_FLOW_START_SCREEN = 'YOUR_HOME' as const;
const META_FLOW_MESSAGE_VERSION = '3' as const;
const PROVIDER = 'meta';
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

type FlowSessionStatus = 'PREPARED' | 'OFFERED' | 'COMPLETED' | 'EXPIRED' | 'SUPERSEDED' | 'FALLBACK';

type FlowSessionRow = {
  id: string;
  conversation_id: string;
  channel: MessagingChannel;
  provider: string;
  flow_contract_id: string;
  mapping_version: string;
  completion_contract_id: string;
  provider_flow_artifact_id: string;
  flow_json_version: string;
  token_fingerprint: string;
  status: FlowSessionStatus;
  expires_at: Date;
  offered_at: Date | null;
  completed_at: Date | null;
  launch_message_id: string | null;
  completion_message_id: string | null;
  provider_completion_event_key: string | null;
  completion_fingerprint: string | null;
  completion_evidence: unknown;
};

export type WhatsAppFlowCompletionEnvelope = {
  flowToken: string;
  response: Readonly<Record<string, unknown>>;
};

function env(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function tokenFingerprint(rawToken: string): string {
  return createHash('sha256').update(rawToken, 'utf8').digest('hex');
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, canonicalize(child)]),
    );
  }
  return value;
}

function completionFingerprint(evidence: Readonly<Record<string, unknown>>): string {
  return createHash('sha256').update(JSON.stringify(canonicalize(evidence)), 'utf8').digest('hex');
}

@Injectable()
export class WhatsAppQuoteFlowSessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly messaging: MessagingService,
  ) {}

  availability() {
    const artifactId = env('META_WHATSAPP_QUOTE_FLOW_ID');
    const enabled = env('META_WHATSAPP_QUOTE_FLOW_ENABLED') === 'true';
    return {
      configured: enabled && !!artifactId,
      enabled,
      artifactId: enabled ? artifactId : undefined,
      realTimeProviderHealthChecked: false,
    };
  }

  async offer(conversationId: string, causationMessageId?: string) {
    const availability = this.availability();
    if (!availability.configured || !availability.artifactId) {
      throw new ServiceUnavailableException('WhatsApp Quote Flow is not configured and enabled.');
    }

    const conversation = await this.prisma.messagingConversation.findUnique({
      where: { id: conversationId },
      select: { id: true, channel: true, provider: true, providerIdentityId: true },
    });
    if (!conversation || conversation.channel !== MessagingChannel.WHATSAPP || conversation.provider.toLowerCase() !== PROVIDER) {
      throw new UnprocessableEntityException('Quote Flow launch requires the Meta WhatsApp conversation.');
    }

    const prepared = await this.prepare(conversation.id, availability.artifactId);
    if (prepared.reused) return { sessionId: prepared.session.id, status: prepared.session.status, reused: true };

    const idempotencyKey = `whatsapp-quote-flow:${prepared.session.id}`;
    const launchMessage = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.messagingMessage.findUnique({ where: { idempotencyKey } });
      if (existing) return existing;
      const created = await tx.messagingMessage.create({
        data: {
          conversationId: conversation.id,
          direction: MessagingDirection.OUTBOUND,
          kind: MessagingMessageKind.INTERACTIVE,
          purpose: MessagingMessagePurpose.GENERAL,
          idempotencyKey,
          contentText: 'Homent quote request Flow',
          occurredAt: new Date(),
        },
      });
      await tx.messagingMessageStatusEvent.create({
        data: { messageId: created.id, status: MessagingDeliveryStatus.PENDING },
      });
      return created;
    });

    await this.bindLaunchMessage(prepared.session.id, launchMessage.id);

    try {
      await this.messaging.send({
        channel: 'WHATSAPP',
        provider: PROVIDER,
        providerIdentityId: conversation.providerIdentityId,
        conversationId: conversation.id,
        causationMessageId,
        idempotencyKey,
        kind: 'INTERACTIVE',
        interactivePayload: {
          type: 'flow',
          body: { text: 'Complete this short form to request your Homent cleaning quote.' },
          action: {
            name: 'flow',
            parameters: {
              flow_message_version: META_FLOW_MESSAGE_VERSION,
              flow_token: prepared.rawToken,
              flow_id: availability.artifactId,
              flow_cta: 'Request a quote',
              flow_action: 'navigate',
              flow_action_payload: { screen: HOMENT_QUOTE_FLOW_START_SCREEN },
            },
          },
        },
      });
    } catch (error) {
      if (error instanceof MessagingOutcomePendingReconciliationError) throw error;
      throw error;
    }

    const offeredAt = new Date();
    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE messaging_quote_flow_sessions
      SET status = 'OFFERED', offered_at = ${offeredAt}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${prepared.session.id}::uuid AND status = 'PREPARED'
    `);
    return { sessionId: prepared.session.id, status: 'OFFERED' as const, reused: false };
  }

  async hasActiveUnresolvedSession(conversationId: string): Promise<boolean> {
    await this.expireDue(conversationId);
    const rows = await this.prisma.$queryRaw<Array<{ exists: boolean }>>(Prisma.sql`
      SELECT EXISTS(
        SELECT 1 FROM messaging_quote_flow_sessions
        WHERE conversation_id = ${conversationId}::uuid
          AND status IN ('PREPARED','OFFERED')
      ) AS exists
    `);
    return rows[0]?.exists === true;
  }

  async enterGuidedFallback(conversationId: string, reason: string) {
    const trimmed = reason.trim();
    if (!trimmed) throw new UnprocessableEntityException('A deliberate Flow fallback reason is required.');
    const count = await this.prisma.$executeRaw(Prisma.sql`
      UPDATE messaging_quote_flow_sessions
      SET status = 'FALLBACK', fallback_reason = ${trimmed}, fallback_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE conversation_id = ${conversationId}::uuid
        AND status IN ('PREPARED','OFFERED')
    `);
    return { transitioned: count > 0 };
  }

  async captureCompletion(
    message: { id: string; conversationId: string; providerEventKey: string | null },
    envelope: WhatsAppFlowCompletionEnvelope,
  ) {
    if (!message.providerEventKey) throw new ConflictException('Flow completion is missing durable provider-event identity.');
    const tokenHash = tokenFingerprint(envelope.flowToken);
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${tokenHash}, 0))`);
      const sessions = await tx.$queryRaw<FlowSessionRow[]>(Prisma.sql`
        SELECT * FROM messaging_quote_flow_sessions WHERE token_fingerprint = ${tokenHash} LIMIT 1
      `);
      const session = sessions[0];
      if (!session) throw new ConflictException('Flow completion does not match an active HestivaOS session.');
      if (session.conversation_id !== message.conversationId || session.channel !== MessagingChannel.WHATSAPP || session.provider !== PROVIDER) {
        throw new ConflictException('Flow completion does not match its bound conversation/provider context.');
      }
      if (
        session.flow_contract_id !== HOMENT_QUOTE_FLOW_CONTRACT ||
        session.mapping_version !== HOMENT_QUOTE_FLOW_MAPPING ||
        session.completion_contract_id !== HOMENT_QUOTE_FLOW_COMPLETION ||
        session.flow_json_version !== HOMENT_QUOTE_FLOW_JSON_VERSION
      ) {
        throw new ConflictException('Flow completion version binding is unsupported.');
      }

      const response = envelope.response;
      if (
        response.homent_contract !== HOMENT_QUOTE_FLOW_CONTRACT ||
        response.homent_mapping_version !== HOMENT_QUOTE_FLOW_MAPPING ||
        response.homent_completion_version !== HOMENT_QUOTE_FLOW_COMPLETION
      ) {
        throw new ConflictException('Flow completion metadata does not match the bound V1 contract.');
      }

      const evidence = {
        flowTokenFingerprint: tokenHash,
        providerFlowArtifactId: session.provider_flow_artifact_id,
        flowJsonVersion: session.flow_json_version,
        response,
      };
      const fingerprint = completionFingerprint(evidence);

      if (session.status === 'COMPLETED') {
        if (session.completion_fingerprint !== fingerprint) {
          throw new ConflictException('Conflicting Flow completion replay detected.');
        }
        return { sessionId: session.id, replay: true, completed: true };
      }
      if (session.status !== 'OFFERED') {
        throw new ConflictException('Flow completion session is not eligible for completion.');
      }
      if (session.expires_at.getTime() <= now.getTime()) {
        await tx.$executeRaw(Prisma.sql`
          UPDATE messaging_quote_flow_sessions SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP
          WHERE id = ${session.id}::uuid AND status = 'OFFERED'
        `);
        throw new ConflictException('Flow completion session has expired.');
      }

      await tx.$executeRaw(Prisma.sql`
        UPDATE messaging_quote_flow_sessions
        SET status = 'COMPLETED', completed_at = ${now}, completion_message_id = ${message.id}::uuid,
            provider_completion_event_key = ${message.providerEventKey}, completion_fingerprint = ${fingerprint},
            completion_evidence = ${JSON.stringify(evidence)}::jsonb, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${session.id}::uuid AND status = 'OFFERED'
      `);
      return { sessionId: session.id, replay: false, completed: true };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  private async prepare(conversationId: string, artifactId: string) {
    const rawToken = randomBytes(32).toString('base64url');
    const fingerprint = tokenFingerprint(rawToken);
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${conversationId}, 0))`);
      await tx.$executeRaw(Prisma.sql`
        UPDATE messaging_quote_flow_sessions SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP
        WHERE conversation_id = ${conversationId}::uuid AND status IN ('PREPARED','OFFERED') AND expires_at <= CURRENT_TIMESTAMP
      `);
      const active = await tx.$queryRaw<FlowSessionRow[]>(Prisma.sql`
        SELECT * FROM messaging_quote_flow_sessions
        WHERE conversation_id = ${conversationId}::uuid
          AND flow_contract_id = ${HOMENT_QUOTE_FLOW_CONTRACT}
          AND mapping_version = ${HOMENT_QUOTE_FLOW_MAPPING}
          AND provider_flow_artifact_id = ${artifactId}
          AND status IN ('PREPARED','OFFERED')
        ORDER BY created_at DESC LIMIT 1
      `);
      if (active[0]?.status === 'OFFERED') return { session: active[0], rawToken: '', reused: true };
      if (active[0]?.status === 'PREPARED') {
        await tx.$executeRaw(Prisma.sql`
          UPDATE messaging_quote_flow_sessions SET status = 'SUPERSEDED', updated_at = CURRENT_TIMESTAMP
          WHERE id = ${active[0].id}::uuid AND status = 'PREPARED'
        `);
      }

      const id = randomUUID();
      const created = await tx.$queryRaw<FlowSessionRow[]>(Prisma.sql`
        INSERT INTO messaging_quote_flow_sessions (
          id, conversation_id, channel, provider, flow_contract_id, mapping_version, completion_contract_id,
          provider_flow_artifact_id, flow_json_version, token_fingerprint, status, expires_at
        ) VALUES (
          ${id}::uuid, ${conversationId}::uuid, 'WHATSAPP'::"MessagingChannel", ${PROVIDER},
          ${HOMENT_QUOTE_FLOW_CONTRACT}, ${HOMENT_QUOTE_FLOW_MAPPING}, ${HOMENT_QUOTE_FLOW_COMPLETION},
          ${artifactId}, ${HOMENT_QUOTE_FLOW_JSON_VERSION}, ${fingerprint}, 'PREPARED', ${expiresAt}
        ) RETURNING *
      `);
      return { session: created[0], rawToken, reused: false };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  private async bindLaunchMessage(sessionId: string, messageId: string) {
    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE messaging_quote_flow_sessions SET launch_message_id = ${messageId}::uuid, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${sessionId}::uuid AND status = 'PREPARED'
    `);
  }

  private async expireDue(conversationId: string) {
    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE messaging_quote_flow_sessions SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP
      WHERE conversation_id = ${conversationId}::uuid AND status IN ('PREPARED','OFFERED') AND expires_at <= CURRENT_TIMESTAMP
    `);
  }
}
