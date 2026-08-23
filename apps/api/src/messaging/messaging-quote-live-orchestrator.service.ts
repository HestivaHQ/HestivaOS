import { ConflictException, Injectable } from '@nestjs/common';
import {
  MessagingDeliveryStatus,
  MessagingDirection,
  MessagingMessageKind,
  MessagingMessagePurpose,
} from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { MessagingQuoteSubmissionService } from './messaging-quote-submission.service';
import { MessagingQuoteStateService } from './messaging-quote-state.service';
import { MessagingOutcomePendingReconciliationError, MessagingService } from './messaging.service';

function reviewSummaryText(draft: Record<string, unknown>): string {
  const property = (draft.property ?? {}) as Record<string, unknown>;
  const request = (draft.request ?? {}) as Record<string, unknown>;
  const visit = (draft.visit ?? {}) as Record<string, unknown>;
  const customer = (draft.customer ?? {}) as Record<string, unknown>;
  const primary = (request.primaryService ?? {}) as Record<string, unknown>;

  const values = [
    ['Service', primary.canonicalService ?? primary.websiteValue],
    ['Address', property.addressLine1],
    ['Suburb', property.suburb],
    ['Preferred date', visit.preferredDate],
    ['Preferred time', visit.preferredTime],
    ['Name', customer.fullName],
  ] as const;

  const lines = values
    .filter(([, value]) => typeof value === 'string' && value.trim())
    .map(([label, value]) => `${label}: ${String(value)}`);

  return [
    'Please review your quote request:',
    ...lines,
    '',
    'Reply CONFIRM exactly to submit these details for pricing and quotation.',
    'If anything is wrong, do not confirm. A correction flow will handle changes separately.',
  ].join('\n');
}

@Injectable()
export class MessagingQuoteLiveOrchestratorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly messaging: MessagingService,
    private readonly quoteState: MessagingQuoteStateService,
    private readonly quoteSubmission: MessagingQuoteSubmissionService,
  ) {}

  async handleInbound(messageId: string) {
    const inbound = await this.prisma.messagingMessage.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        conversationId: true,
        direction: true,
        kind: true,
        contentText: true,
        conversation: {
          select: {
            channel: true,
            provider: true,
            providerIdentityId: true,
          },
        },
      },
    });
    if (!inbound || inbound.direction !== MessagingDirection.INBOUND) return null;

    let state = await this.quoteState.get(inbound.conversationId);

    if (state.phase === 'SUBMITTED' || state.phase === 'HUMAN_REVIEW' || state.phase === 'COLLECTING') {
      return state;
    }

    if (state.phase === 'READY_TO_SUBMIT' || state.phase === 'SUBMITTING') {
      await this.quoteSubmission.submitReadyQuote(inbound.conversationId, state.version);
      return this.quoteState.get(inbound.conversationId);
    }

    if (!state.reviewSummaryMessageId) {
      const idempotencyKey = `messaging-quote-review:${inbound.conversationId}:${state.version}`;
      let outbound = await this.prisma.messagingMessage.findUnique({ where: { idempotencyKey } });
      const text = reviewSummaryText(state.draft as Record<string, unknown>);

      if (outbound) {
        if (
          outbound.conversationId !== inbound.conversationId ||
          outbound.direction !== MessagingDirection.OUTBOUND ||
          outbound.kind !== MessagingMessageKind.TEXT ||
          outbound.contentText !== text
        ) {
          throw new ConflictException('Messaging Quote review identity is bound to different immutable message data.');
        }
      } else {
        outbound = await this.prisma.$transaction(async (tx) => {
          const created = await tx.messagingMessage.create({
            data: {
              conversationId: inbound.conversationId,
              direction: MessagingDirection.OUTBOUND,
              kind: MessagingMessageKind.TEXT,
              purpose: MessagingMessagePurpose.GENERAL,
              idempotencyKey,
              contentText: text,
              occurredAt: new Date(),
            },
          });
          await tx.messagingMessageStatusEvent.create({
            data: { messageId: created.id, status: MessagingDeliveryStatus.PENDING },
          });
          return created;
        });
      }

      try {
        await this.messaging.send({
          channel: inbound.conversation.channel,
          provider: inbound.conversation.provider,
          providerIdentityId: inbound.conversation.providerIdentityId,
          conversationId: inbound.conversationId,
          causationMessageId: inbound.id,
          idempotencyKey,
          kind: 'TEXT',
          text,
        });
      } catch (error) {
        if (error instanceof MessagingOutcomePendingReconciliationError) return state;
        throw error;
      }

      state = await this.quoteState.recordReviewPresented(
        inbound.conversationId,
        state.version,
        outbound.id,
      );
      return state;
    }

    const explicitConfirmation =
      inbound.kind === MessagingMessageKind.TEXT && inbound.contentText?.trim() === 'CONFIRM';
    if (!explicitConfirmation) return state;

    state = await this.quoteState.confirmFromInboundMessage(
      inbound.conversationId,
      state.version,
      inbound.id,
    );
    await this.quoteSubmission.submitReadyQuote(inbound.conversationId, state.version);
    return this.quoteState.get(inbound.conversationId);
  }
}
