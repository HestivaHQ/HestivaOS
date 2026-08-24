import { ConflictException, Injectable } from '@nestjs/common';
import { MessagingDirection, MessagingMessageKind } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { WhatsAppQuoteFlowSessionService } from './whatsapp-quote-flow-session.service';

function asObject(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

@Injectable()
export class WhatsAppQuoteFlowInboundService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: WhatsAppQuoteFlowSessionService,
  ) {}

  /**
   * Returns true when Flow-first orchestration owns this inbound message and
   * the deterministic guided Quote collector must not consume it.
   */
  async handleInbound(messageId: string): Promise<boolean> {
    const message = await this.prisma.messagingMessage.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        conversationId: true,
        direction: true,
        kind: true,
        providerEventKey: true,
        attachmentMetadata: true,
        conversation: { select: { channel: true, provider: true } },
      },
    });
    if (!message || message.direction !== MessagingDirection.INBOUND) return false;
    if (message.conversation.channel !== 'WHATSAPP' || message.conversation.provider.toLowerCase() !== 'meta') return false;

    const metadata = asObject(message.attachmentMetadata);
    const interactive = asObject(metadata?.interactivePayload);
    if (message.kind === MessagingMessageKind.INTERACTIVE && interactive?.type === 'nfm_reply') {
      const reply = asObject(interactive.nfm_reply);
      const responseJson = reply?.response_json;
      if (typeof responseJson !== 'string' || !responseJson.trim()) {
        throw new ConflictException('WhatsApp Flow completion response_json is missing or malformed.');
      }
      let response: unknown;
      try {
        response = JSON.parse(responseJson);
      } catch {
        throw new ConflictException('WhatsApp Flow completion response_json is not valid JSON.');
      }
      const object = asObject(response);
      if (!object || typeof object.flow_token !== 'string' || !object.flow_token.trim()) {
        throw new ConflictException('WhatsApp Flow completion is missing its correlation token.');
      }
      const { flow_token: flowToken, ...businessResponse } = object;
      await this.sessions.captureCompletion(
        { id: message.id, conversationId: message.conversationId, providerEventKey: message.providerEventKey },
        { flowToken, response: businessResponse },
      );
      return true;
    }

    // While Flow remains unresolved, ordinary text/media/interactive traffic is
    // normal WhatsApp conversation/help. It must not mutate guided Quote state.
    return this.sessions.hasActiveUnresolvedSession(message.conversationId);
  }
}
