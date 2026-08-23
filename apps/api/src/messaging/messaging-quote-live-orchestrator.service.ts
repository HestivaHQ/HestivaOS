import { ConflictException, Injectable } from '@nestjs/common';
import {
  MessagingChannel,
  MessagingDeliveryStatus,
  MessagingDirection,
  MessagingMessageKind,
  MessagingMessagePurpose,
} from '@prisma/client';
import { PrismaService } from '../prisma.service';
import {
  applyMessagingGuidedCleaningAnswer,
  nextMessagingGuidedCleaningQuestion,
  type MessagingGuidedCleaningQuestion,
} from './messaging-quote-guided-cleaning-requirements';
import {
  applyMessagingGuidedHomeAnswer,
  nextMessagingGuidedHomeQuestion,
  type MessagingGuidedHomeQuestion,
} from './messaging-quote-guided-home';
import {
  applyMessagingGuidedPostEventAnswer,
  nextMessagingGuidedPostEventQuestion,
  type MessagingGuidedPostEventQuestion,
} from './messaging-quote-guided-post-event';
import { messagingQuoteMediaAssetIds } from './messaging-quote-draft';
import { securedInboundQuoteImageAssetIds } from './messaging-quote-media-bridge';
import { MessagingQuoteSubmissionService } from './messaging-quote-submission.service';
import { MessagingQuoteStateService } from './messaging-quote-state.service';
import type { MessagingQuoteStateView } from './messaging-quote-state';
import { MessagingOutcomePendingReconciliationError, MessagingService } from './messaging.service';

const CORRECTION_MENU = [
  'Which section would you like to change?',
  '1. Home / property',
  '2. Cleaning service and personalisation',
  '3. Preferred visit',
  '4. Access and household',
  '5. Safety, notes and photos',
  '6. Your customer details',
  'Reply with the number only.',
].join('\n');

function reviewSummaryText(draft: Record<string, unknown>): string {
  const property = (draft.property ?? {}) as Record<string, unknown>;
  const request = (draft.request ?? {}) as Record<string, unknown>;
  const visit = (draft.visit ?? {}) as Record<string, unknown>;
  const access = (draft.access ?? {}) as Record<string, unknown>;
  const household = (draft.household ?? {}) as Record<string, unknown>;
  const customer = (draft.customer ?? {}) as Record<string, unknown>;
  const primary = (request.primaryService ?? {}) as Record<string, unknown>;
  const addOns = Array.isArray(request.addOns) ? request.addOns : [];
  const photoCount = Array.isArray(draft.messagingMediaAssetIds)
    ? new Set(draft.messagingMediaAssetIds.filter((value): value is string => typeof value === 'string' && Boolean(value.trim()))).size
    : 0;

  const values = [
    ['Service', primary.canonicalService ?? primary.websiteValue],
    ['Frequency', request.frequency],
    ['Home condition', request.homeCondition],
    ['Address', property.addressLine1],
    ['Suburb', property.suburb],
    ['Property type', property.propertyType],
    ['Preferred date', visit.preferredDate],
    ['Preferred time', visit.preferredTime],
    ['Complex access', access.complexAccess],
    ['Someone present', typeof access.someonePresent === 'boolean' ? (access.someonePresent ? 'Yes' : 'No') : null],
    ['Pets', typeof household.hasPets === 'boolean' ? (household.hasPets ? 'Yes' : 'No') : null],
    ['Name', customer.fullName],
    ['Email', customer.email],
    ['Mobile', customer.mobile],
    ['Preferred contact', customer.preferredContact],
  ] as const;

  const lines = values
    .filter(([, value]) => typeof value === 'string' && value.trim())
    .map(([label, value]) => `${label}: ${String(value)}`);

  if (addOns.length) lines.push(`Add-ons: ${addOns.length} selected`);
  lines.push(`Photos: ${photoCount > 0 ? `${photoCount} selected` : 'None'}`);

  return [
    'Please review your quote request:',
    ...lines,
    '',
    'Reply CONFIRM exactly to submit these details for pricing and quotation.',
    'Reply CHANGE exactly if you need to correct a section first.',
  ].join('\n');
}

type InboundForOrchestration = {
  id: string;
  conversationId: string;
  direction: MessagingDirection;
  kind: MessagingMessageKind;
  contentText: string | null;
  conversation: {
    channel: MessagingChannel;
    provider: string;
    providerIdentityId: string;
  };
};

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

    if (state.phase === 'SUBMITTED' || state.phase === 'HUMAN_REVIEW') return state;

    if (state.phase === 'COLLECTING') return this.handleGuidedCollection(inbound, state);

    if (state.phase === 'READY_TO_SUBMIT' || state.phase === 'SUBMITTING') {
      await this.quoteSubmission.submitReadyQuote(inbound.conversationId, state.version);
      return this.quoteState.get(inbound.conversationId);
    }

    if (!state.reviewSummaryMessageId) {
      const idempotencyKey = `messaging-quote-review:${inbound.conversationId}:${state.version}`;
      const text = reviewSummaryText(state.draft as Record<string, unknown>);
      const outbound = await this.sendDurableText(inbound, idempotencyKey, text);
      if (!outbound) return state;

      state = await this.quoteState.recordReviewPresented(
        inbound.conversationId,
        state.version,
        outbound.id,
      );
      return state;
    }

    const text = inbound.kind === MessagingMessageKind.TEXT ? inbound.contentText?.trim() ?? '' : '';
    if (text === 'CONFIRM') {
      state = await this.quoteState.confirmFromInboundMessage(
        inbound.conversationId,
        state.version,
        inbound.id,
      );
      await this.quoteSubmission.submitReadyQuote(inbound.conversationId, state.version);
      return this.quoteState.get(inbound.conversationId);
    }

    const correctionKey = `messaging-quote-correction:${inbound.conversationId}:${state.version}`;
    const correctionPrompt = await this.prisma.messagingMessage.findUnique({
      where: { idempotencyKey: correctionKey },
      include: { statusEvents: { where: { status: MessagingDeliveryStatus.ACCEPTED }, take: 1 } },
    });

    if (text === 'CHANGE') {
      await this.sendDurableText(inbound, correctionKey, CORRECTION_MENU);
      return state;
    }

    if (!correctionPrompt?.statusEvents.length) return state;

    const patch = this.correctionPatch(text);
    if (!patch) {
      await this.sendDurableText(
        inbound,
        `messaging-quote-correction-retry:${inbound.id}`,
        `Please choose the section to change using the requested number.\n\n${CORRECTION_MENU}`,
      );
      return state;
    }

    const updated = await this.quoteState.updateDraft(inbound.conversationId, state.version, patch as any);
    return this.handleGuidedCollection(inbound, updated);
  }

  private correctionPatch(selection: string): Record<string, unknown> | null {
    if (selection === '1') return { property: null };
    if (selection === '2') return { request: null };
    if (selection === '3') return { visit: null };
    if (selection === '4') return { access: null, household: null };
    if (selection === '5') return { safety: null, notes: null, photos: null, messagingMediaAssetIds: [] };
    if (selection === '6') return { customer: null };
    return null;
  }

  private async handleGuidedCollection(
    inbound: InboundForOrchestration,
    state: MessagingQuoteStateView,
  ) {
    if (nextMessagingGuidedHomeQuestion(state.draft)) return this.handleGuidedHome(inbound, state);
    if (nextMessagingGuidedCleaningQuestion(state.draft)) return this.handleGuidedCleaningRequirements(inbound, state);
    if (nextMessagingGuidedPostEventQuestion(state.draft)) return this.handleGuidedPostEvent(inbound, state);
    return state;
  }

  private async handleGuidedHome(inbound: InboundForOrchestration, state: MessagingQuoteStateView) {
    const question = nextMessagingGuidedHomeQuestion(state.draft);
    if (!question) return state;

    const promptKey = this.guidedHomePromptKey(inbound.conversationId, state.version, question);
    const prompt = await this.prisma.messagingMessage.findUnique({
      where: { idempotencyKey: promptKey },
      include: { statusEvents: { where: { status: MessagingDeliveryStatus.ACCEPTED }, take: 1 } },
    });

    if (!prompt?.statusEvents.length) {
      await this.sendDurableText(inbound, promptKey, question.text);
      return state;
    }

    const answer = inbound.kind === MessagingMessageKind.TEXT
      ? applyMessagingGuidedHomeAnswer(state.draft, inbound.contentText)
      : { kind: 'INVALID' as const, question };

    if (answer.kind !== 'ACCEPTED') {
      await this.sendDurableText(
        inbound,
        `messaging-quote-home-retry:${inbound.id}:${question.id}`,
        `Please answer the current quote question using the requested format.\n\n${question.text}`,
      );
      return state;
    }

    const updated = await this.quoteState.updateDraft(inbound.conversationId, state.version, answer.patch);
    const nextQuestion = nextMessagingGuidedHomeQuestion(updated.draft);
    if (nextQuestion) {
      await this.sendDurableText(
        inbound,
        this.guidedHomePromptKey(inbound.conversationId, updated.version, nextQuestion),
        nextQuestion.text,
      );
    } else {
      const cleaningQuestion = nextMessagingGuidedCleaningQuestion(updated.draft);
      if (cleaningQuestion) {
        await this.sendDurableText(
          inbound,
          this.guidedCleaningPromptKey(inbound.conversationId, updated.version, cleaningQuestion),
          cleaningQuestion.text,
        );
      }
    }
    return updated;
  }

  private async handleGuidedCleaningRequirements(
    inbound: InboundForOrchestration,
    state: MessagingQuoteStateView,
  ) {
    const question = nextMessagingGuidedCleaningQuestion(state.draft);
    if (!question) return state;

    const promptKey = this.guidedCleaningPromptKey(inbound.conversationId, state.version, question);
    const prompt = await this.prisma.messagingMessage.findUnique({
      where: { idempotencyKey: promptKey },
      include: { statusEvents: { where: { status: MessagingDeliveryStatus.ACCEPTED }, take: 1 } },
    });

    if (!prompt?.statusEvents.length) {
      await this.sendDurableText(inbound, promptKey, question.text);
      return state;
    }

    if (question.id === 'PHOTOS' && inbound.kind === MessagingMessageKind.MEDIA) {
      const assetIds = inbound.conversation.channel === MessagingChannel.WHATSAPP
        ? await securedInboundQuoteImageAssetIds(this.prisma, inbound.id, inbound.conversationId)
        : [];
      if (!assetIds.length) {
        await this.sendDurableText(
          inbound,
          `messaging-quote-photo-retry:${inbound.id}`,
          `Only secured WhatsApp images can be attached to this quote right now.\n\n${question.text}`,
        );
        return state;
      }

      const selected = [...new Set([...messagingQuoteMediaAssetIds(state.draft), ...assetIds])];
      const updated = await this.quoteState.updateDraft(
        inbound.conversationId,
        state.version,
        { messagingMediaAssetIds: selected },
      );
      const nextQuestion = nextMessagingGuidedCleaningQuestion(updated.draft);
      if (nextQuestion) {
        await this.sendDurableText(
          inbound,
          this.guidedCleaningPromptKey(inbound.conversationId, updated.version, nextQuestion),
          nextQuestion.text,
        );
      }
      return updated;
    }

    const answer = inbound.kind === MessagingMessageKind.TEXT
      ? applyMessagingGuidedCleaningAnswer(state.draft, inbound.contentText)
      : { kind: 'INVALID' as const, question };

    if (answer.kind !== 'ACCEPTED') {
      await this.sendDurableText(
        inbound,
        `messaging-quote-cleaning-retry:${inbound.id}:${question.id}`,
        `Please answer the current quote question using the requested format.\n\n${question.text}`,
      );
      return state;
    }

    const updated = await this.quoteState.updateDraft(inbound.conversationId, state.version, answer.patch);
    const nextQuestion = nextMessagingGuidedCleaningQuestion(updated.draft);
    if (nextQuestion) {
      await this.sendDurableText(
        inbound,
        this.guidedCleaningPromptKey(inbound.conversationId, updated.version, nextQuestion),
        nextQuestion.text,
      );
    } else {
      const postEventQuestion = nextMessagingGuidedPostEventQuestion(updated.draft);
      if (postEventQuestion) {
        await this.sendDurableText(
          inbound,
          this.guidedPostEventPromptKey(inbound.conversationId, updated.version, postEventQuestion),
          postEventQuestion.text,
        );
      }
    }
    return updated;
  }

  private async handleGuidedPostEvent(
    inbound: InboundForOrchestration,
    state: MessagingQuoteStateView,
  ) {
    const question = nextMessagingGuidedPostEventQuestion(state.draft);
    if (!question) return state;

    const promptKey = this.guidedPostEventPromptKey(inbound.conversationId, state.version, question);
    const prompt = await this.prisma.messagingMessage.findUnique({
      where: { idempotencyKey: promptKey },
      include: { statusEvents: { where: { status: MessagingDeliveryStatus.ACCEPTED }, take: 1 } },
    });

    if (!prompt?.statusEvents.length) {
      await this.sendDurableText(inbound, promptKey, question.text);
      return state;
    }

    const answer = inbound.kind === MessagingMessageKind.TEXT
      ? applyMessagingGuidedPostEventAnswer(state.draft, inbound.contentText)
      : { kind: 'INVALID' as const, question };

    if (answer.kind !== 'ACCEPTED') {
      await this.sendDurableText(
        inbound,
        `messaging-quote-post-event-retry:${inbound.id}:${question.id}`,
        `Please answer the current quote question using the requested format.\n\n${question.text}`,
      );
      return state;
    }

    const updated = await this.quoteState.updateDraft(inbound.conversationId, state.version, answer.patch);
    const nextQuestion = nextMessagingGuidedPostEventQuestion(updated.draft);
    if (nextQuestion) {
      await this.sendDurableText(
        inbound,
        this.guidedPostEventPromptKey(inbound.conversationId, updated.version, nextQuestion),
        nextQuestion.text,
      );
    } else {
      const cleaningQuestion = nextMessagingGuidedCleaningQuestion(updated.draft);
      if (cleaningQuestion) {
        await this.sendDurableText(
          inbound,
          this.guidedCleaningPromptKey(inbound.conversationId, updated.version, cleaningQuestion),
          cleaningQuestion.text,
        );
      }
    }
    return updated;
  }

  private guidedHomePromptKey(conversationId: string, version: number, question: MessagingGuidedHomeQuestion) {
    return `messaging-quote-home:${conversationId}:${version}:${question.id}`;
  }

  private guidedCleaningPromptKey(conversationId: string, version: number, question: MessagingGuidedCleaningQuestion) {
    return `messaging-quote-cleaning:${conversationId}:${version}:${question.id}`;
  }

  private guidedPostEventPromptKey(conversationId: string, version: number, question: MessagingGuidedPostEventQuestion) {
    return `messaging-quote-post-event:${conversationId}:${version}:${question.id}`;
  }

  private async sendDurableText(
    inbound: InboundForOrchestration,
    idempotencyKey: string,
    text: string,
  ) {
    let outbound = await this.prisma.messagingMessage.findUnique({ where: { idempotencyKey } });

    if (outbound) {
      if (
        outbound.conversationId !== inbound.conversationId ||
        outbound.direction !== MessagingDirection.OUTBOUND ||
        outbound.kind !== MessagingMessageKind.TEXT ||
        outbound.contentText !== text
      ) {
        throw new ConflictException('Messaging Quote outbound identity is bound to different immutable message data.');
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
      return outbound;
    } catch (error) {
      if (error instanceof MessagingOutcomePendingReconciliationError) return null;
      throw error;
    }
  }
}
