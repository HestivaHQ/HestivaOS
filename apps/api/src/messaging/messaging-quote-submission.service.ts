import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { QuoteSubmissionService } from '../quotes/quote-submission.service';
import { prepareMessagingQuoteCreation } from './messaging-quote-creation-input';
import type { MessagingQuoteDraft } from './messaging-quote-draft';
import { resolveMessagingQuoteReplay } from './messaging-quote-replay-resolution';
import {
  parseMessagingQuoteStateSnapshot,
  viewMessagingQuoteState,
} from './messaging-quote-state';
import { MessagingQuoteStateService } from './messaging-quote-state.service';

function structuredMessagingQuote(input: {
  submittedAt: string;
  draft: MessagingQuoteDraft;
  channel: string;
  provider: string;
  conversationId: string;
  confirmationMessageId: string;
}): Prisma.InputJsonValue {
  return {
    schemaVersion: 'MESSAGING_QUOTE_V1',
    source: 'HOMENT_MESSAGING',
    submittedAt: input.submittedAt,
    ...input.draft,
    messagingProvenance: {
      channel: input.channel,
      provider: input.provider,
      conversationId: input.conversationId,
      confirmationMessageId: input.confirmationMessageId,
    },
  } as unknown as Prisma.InputJsonValue;
}

@Injectable()
export class MessagingQuoteSubmissionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly quoteState: MessagingQuoteStateService,
    private readonly quoteSubmissions: QuoteSubmissionService,
  ) {}

  async submitReadyQuote(conversationId: string, expectedVersion: number) {
    if (!Number.isInteger(expectedVersion) || expectedVersion < 0) {
      throw new ConflictException('A valid expected Messaging Quote state version is required.');
    }

    const conversation = await this.prisma.messagingConversation.findUnique({
      where: { id: conversationId },
      select: {
        id: true,
        channel: true,
        provider: true,
        quoteState: true,
        quoteStateVersion: true,
      },
    });
    if (!conversation) throw new NotFoundException('Messaging conversation not found.');
    if (conversation.quoteStateVersion !== expectedVersion) {
      throw new ConflictException(`Messaging Quote state is stale. Current version is ${conversation.quoteStateVersion}.`);
    }

    const state = parseMessagingQuoteStateSnapshot(
      conversation.quoteState,
      conversation.quoteStateVersion,
    );
    const phase = viewMessagingQuoteState(state).phase;

    if (phase === 'SUBMITTED') {
      const existing = state.submittedQuoteId
        ? await this.prisma.quote.findUnique({
            where: { id: state.submittedQuoteId },
            select: { id: true, reference: true, status: true },
          })
        : null;
      if (!existing) {
        throw new ConflictException('Submitted Messaging Quote linkage is inconsistent and requires recovery.');
      }
      return {
        quoteId: existing.id,
        quoteReference: existing.reference,
        quoteStatus: existing.status,
        created: false,
        replay: true,
        messagingQuoteState: viewMessagingQuoteState(state),
      };
    }

    if (phase !== 'READY_TO_SUBMIT' && phase !== 'SUBMITTING') {
      throw new ConflictException(`Messaging Quote is not ready for submission. Current phase is ${phase}.`);
    }
    if (!state.confirmationMessageId || !state.confirmedAt) {
      throw new ConflictException('Messaging Quote confirmation evidence is missing and requires recovery.');
    }

    const prepared = prepareMessagingQuoteCreation({
      provider: conversation.provider,
      conversationId: conversation.id,
      confirmationMessageId: state.confirmationMessageId,
      confirmedAt: new Date(state.confirmedAt),
      draft: state.draft,
      customerConfirmed: true,
      humanReviewRequired: state.humanReviewRequired,
      submittedQuoteId: state.submittedQuoteId,
    });
    if (prepared.kind === 'INVALID') {
      throw new ConflictException({
        message: 'Messaging Quote facts failed authoritative validation.',
        errors: prepared.errors,
      });
    }
    if (prepared.kind !== 'READY') {
      throw new ConflictException(`Messaging Quote cannot be submitted from phase ${prepared.phase}.`);
    }

    if (state.submissionKey && state.submissionKey !== prepared.value.submissionKey) {
      throw new ConflictException('Messaging Quote submission reservation does not match confirmed provenance.');
    }

    let reservedVersion = expectedVersion;
    if (phase === 'READY_TO_SUBMIT') {
      const reserved = await this.quoteState.beginSubmission(
        conversation.id,
        expectedVersion,
        prepared.value.submissionKey,
      );
      reservedVersion = reserved.version;
    }

    const structuredData = structuredMessagingQuote({
      submittedAt: prepared.value.submittedAt,
      draft: prepared.value.draft,
      channel: conversation.channel,
      provider: prepared.value.provenance.provider,
      conversationId: conversation.id,
      confirmationMessageId: state.confirmationMessageId,
    });

    const result = await this.quoteSubmissions.submit(
      {
        submissionKey: prepared.value.submissionKey,
        submittedAt: prepared.value.submittedAt,
        pricingSubmission: prepared.value.draft,
        structuredData,
        submittedActivityMetadata: {
          source: 'HOMENT_MESSAGING',
          channel: conversation.channel,
          provider: prepared.value.provenance.provider,
          conversationId: conversation.id,
          confirmationMessageId: state.confirmationMessageId,
        },
      },
      () => resolveMessagingQuoteReplay(
        this.prisma,
        prepared.value.submissionKey,
        structuredData,
      ),
    );

    const linkedState = await this.quoteState.recordSubmittedQuote(
      conversation.id,
      reservedVersion,
      result.quoteId,
    );

    return {
      ...result,
      messagingQuoteState: linkedState,
    };
  }
}
