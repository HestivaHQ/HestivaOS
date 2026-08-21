import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { MessagingDirection, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import type { MessagingQuoteDraft } from './messaging-quote-draft';
import {
  confirmMessagingQuoteReview,
  markMessagingQuoteReviewPresented,
  markMessagingQuoteSubmitted,
  parseMessagingQuoteStateSnapshot,
  setMessagingQuoteHumanReview,
  updateMessagingQuoteDraft,
  viewMessagingQuoteState,
  type MessagingQuoteStateSnapshot,
} from './messaging-quote-state';

@Injectable()
export class MessagingQuoteStateService {
  constructor(private readonly prisma: PrismaService) {}

  async get(conversationId: string) {
    const row = await this.prisma.messagingConversation.findUnique({
      where: { id: conversationId },
      select: { quoteState: true, quoteStateVersion: true },
    });
    if (!row) throw new NotFoundException('Messaging conversation not found.');

    const state = parseMessagingQuoteStateSnapshot(row.quoteState, row.quoteStateVersion);
    return viewMessagingQuoteState(state);
  }

  async updateDraft(
    conversationId: string,
    expectedVersion: number,
    patch: Partial<MessagingQuoteDraft>,
  ) {
    return this.transition(conversationId, expectedVersion, (state) => updateMessagingQuoteDraft(state, patch));
  }

  async setHumanReview(conversationId: string, expectedVersion: number, required: boolean) {
    return this.transition(conversationId, expectedVersion, (state) => setMessagingQuoteHumanReview(state, required));
  }

  async recordReviewPresented(
    conversationId: string,
    expectedVersion: number,
    reviewSummaryMessageId: string,
  ) {
    await this.requireConversationMessage(conversationId, reviewSummaryMessageId, MessagingDirection.OUTBOUND);
    return this.transition(
      conversationId,
      expectedVersion,
      (state) => markMessagingQuoteReviewPresented(state, reviewSummaryMessageId),
    );
  }

  async confirmFromInboundMessage(
    conversationId: string,
    expectedVersion: number,
    confirmationMessageId: string,
  ) {
    const message = await this.requireConversationMessage(
      conversationId,
      confirmationMessageId,
      MessagingDirection.INBOUND,
    );
    return this.transition(
      conversationId,
      expectedVersion,
      (state) => confirmMessagingQuoteReview(state, confirmationMessageId, message.occurredAt),
    );
  }

  async recordSubmittedQuote(conversationId: string, expectedVersion: number, quoteId: string) {
    const quote = await this.prisma.quote.findUnique({ where: { id: quoteId }, select: { id: true } });
    if (!quote) throw new ConflictException('Canonical Quote does not exist.');
    return this.transition(
      conversationId,
      expectedVersion,
      (state) => markMessagingQuoteSubmitted(state, quote.id),
    );
  }

  private async requireConversationMessage(
    conversationId: string,
    messageId: string,
    direction: MessagingDirection,
  ) {
    const normalizedId = messageId.trim();
    if (!normalizedId) throw new ConflictException('Messaging message identity is required.');
    const message = await this.prisma.messagingMessage.findUnique({
      where: { id: normalizedId },
      select: { id: true, conversationId: true, direction: true, occurredAt: true },
    });
    if (!message || message.conversationId !== conversationId || message.direction !== direction) {
      throw new ConflictException('Messaging Quote state message provenance does not match the conversation.');
    }
    return message;
  }

  private async transition(
    conversationId: string,
    expectedVersion: number,
    apply: (state: MessagingQuoteStateSnapshot) => MessagingQuoteStateSnapshot,
  ) {
    if (!Number.isInteger(expectedVersion) || expectedVersion < 0) {
      throw new ConflictException('A valid expected Messaging Quote state version is required.');
    }

    return this.prisma.$transaction(async (tx) => {
      const row = await tx.messagingConversation.findUnique({
        where: { id: conversationId },
        select: { quoteState: true, quoteStateVersion: true },
      });
      if (!row) throw new NotFoundException('Messaging conversation not found.');
      if (row.quoteStateVersion !== expectedVersion) {
        throw new ConflictException(`Messaging Quote state is stale. Current version is ${row.quoteStateVersion}.`);
      }

      const current = parseMessagingQuoteStateSnapshot(row.quoteState, row.quoteStateVersion);
      const next = apply(current);
      if (next === current) return viewMessagingQuoteState(current);
      if (next.version !== expectedVersion + 1) {
        throw new ConflictException('Messaging Quote state transition produced an invalid version.');
      }

      const updated = await tx.messagingConversation.updateMany({
        where: { id: conversationId, quoteStateVersion: expectedVersion },
        data: {
          quoteState: next as unknown as Prisma.InputJsonValue,
          quoteStateVersion: next.version,
        },
      });
      if (updated.count !== 1) {
        throw new ConflictException('Messaging Quote state changed concurrently. Reload before retrying.');
      }

      return viewMessagingQuoteState(next);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
}
