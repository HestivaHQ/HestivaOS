import { BadGatewayException, Injectable, ServiceUnavailableException, UnprocessableEntityException } from '@nestjs/common';

const APP_REVIEW_TEST_PHONE_NUMBER_ID = '1292261450635742';
const APP_REVIEW_TEMPLATE_NAME = 'jaspers_market_order_confirmation_v1';

function env(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function normalizeRecipient(value: string): string {
  const normalized = value.trim().replace(/^\+/, '').replace(/[\s()-]/g, '');
  if (!/^\d{7,15}$/.test(normalized)) {
    throw new UnprocessableEntityException('Recipient must be a valid international WhatsApp number.');
  }
  return normalized;
}

@Injectable()
export class WhatsAppAppReviewService {
  async sendTestTemplate(recipient: string) {
    const accessToken = env('META_WHATSAPP_ACCESS_TOKEN');
    const phoneNumberId = env('META_WHATSAPP_PHONE_NUMBER_ID');
    const graphVersion = env('META_GRAPH_API_VERSION');

    if (!accessToken || !phoneNumberId || !graphVersion) {
      throw new ServiceUnavailableException('WhatsApp Cloud API test transport is not configured.');
    }
    if (phoneNumberId !== APP_REVIEW_TEST_PHONE_NUMBER_ID) {
      throw new ServiceUnavailableException('App Review test sender is locked to the approved Meta test phone number.');
    }

    const to = normalizeRecipient(recipient);
    let response: Response;
    try {
      response = await fetch(`https://graph.facebook.com/${encodeURIComponent(graphVersion)}/${encodeURIComponent(phoneNumberId)}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'template',
          template: {
            name: APP_REVIEW_TEMPLATE_NAME,
            language: { code: 'en_US' },
            components: [{
              type: 'body',
              parameters: [
                { type: 'text', text: 'John Doe' },
                { type: 'text', text: '123456' },
                { type: 'text', text: 'Aug 29, 2026' },
              ],
            }],
          },
        }),
      });
    } catch {
      throw new BadGatewayException('Unable to reach WhatsApp Cloud API for the App Review test.');
    }

    if (!response.ok) {
      throw new BadGatewayException(`WhatsApp Cloud API rejected the App Review test with HTTP ${response.status}.`);
    }

    const body = await response.json() as { messages?: Array<{ id?: unknown }> };
    const providerMessageId = typeof body.messages?.[0]?.id === 'string' ? body.messages[0].id : undefined;
    if (!providerMessageId) {
      throw new BadGatewayException('WhatsApp Cloud API did not return a message ID for the App Review test.');
    }

    return {
      providerMessageId,
      acceptedAt: new Date().toISOString(),
      templateName: APP_REVIEW_TEMPLATE_NAME,
    };
  }
}
