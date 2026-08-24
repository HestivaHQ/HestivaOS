import { BadGatewayException, Injectable, ServiceUnavailableException } from '@nestjs/common';

export type CorrespondencePurpose = 'QUOTE';
export type EmailSender = { from: string; replyTo: string };
export type ResendSendInput = {
  purpose: CorrespondencePurpose;
  to: string;
  subject: string;
  text: string;
  idempotencyKey: string;
  correspondenceAttemptId: string;
};
export type ResendSendResult =
  | { outcome: 'ACCEPTED'; providerReference: string }
  | { outcome: 'REJECTED'; code: string; message: string }
  | { outcome: 'UNCERTAIN'; message: string };

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new ServiceUnavailableException(`${name} is not configured.`);
  return value;
}

@Injectable()
export class CorrespondenceSenderResolver {
  resolve(purpose: CorrespondencePurpose): EmailSender {
    if (purpose === 'QUOTE') {
      return {
        from: required('HESTIVA_CORRESPONDENCE_QUOTE_FROM'),
        replyTo: required('HESTIVA_CORRESPONDENCE_QUOTE_REPLY_TO'),
      };
    }
    throw new ServiceUnavailableException('Correspondence sender purpose is not configured.');
  }
}

@Injectable()
export class ResendEmailTransport {
  constructor(private readonly senders: CorrespondenceSenderResolver) {}

  assertConfigured(purpose: CorrespondencePurpose): void {
    required('RESEND_API_KEY');
    this.senders.resolve(purpose);
  }

  async send(input: ResendSendInput): Promise<ResendSendResult> {
    const apiKey = required('RESEND_API_KEY');
    const sender = this.senders.resolve(input.purpose);
    let response: Response;
    try {
      response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': input.idempotencyKey,
        },
        body: JSON.stringify({
          from: sender.from,
          to: [input.to],
          reply_to: sender.replyTo,
          subject: input.subject,
          text: input.text,
          tags: [
            { name: 'purpose', value: input.purpose.toLowerCase() },
            { name: 'correspondence_attempt', value: input.correspondenceAttemptId },
          ],
        }),
      });
    } catch {
      return { outcome: 'UNCERTAIN', message: 'Resend transport outcome is uncertain.' };
    }

    const body = await response.json().catch(() => null) as { id?: unknown; name?: unknown; message?: unknown } | null;
    if (response.ok && typeof body?.id === 'string' && body.id.trim()) {
      return { outcome: 'ACCEPTED', providerReference: body.id.trim() };
    }
    if (!response.ok) {
      return {
        outcome: 'REJECTED',
        code: typeof body?.name === 'string' ? body.name : `HTTP_${response.status}`,
        message: typeof body?.message === 'string' ? body.message : 'Resend rejected the email request.',
      };
    }
    throw new BadGatewayException('Resend returned a malformed success response.');
  }

  /**
   * Replays the exact immutable attempt with the same Resend idempotency key.
   * Resend therefore recovers the original logical submission instead of creating
   * a new HestivaOS Correspondence attempt or rotating the customer capability.
   */
  recover(input: ResendSendInput): Promise<ResendSendResult> {
    return this.send(input);
  }
}