import { BadGatewayException, Injectable, ServiceUnavailableException, UnprocessableEntityException } from '@nestjs/common';

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

function normalizeTemplateName(value: string): string {
  const normalized = value.trim();
  if (!/^[a-z0-9_]{1,512}$/.test(normalized)) {
    throw new UnprocessableEntityException('Template name must contain only lowercase letters, numbers and underscores.');
  }
  return normalized;
}

function normalizeLanguageCode(value: string): string {
  const normalized = value.trim();
  if (!/^[A-Za-z]{2,3}(?:_[A-Za-z]{2})?$/.test(normalized)) {
    throw new UnprocessableEntityException('Template language code is invalid.');
  }
  return normalized;
}

function normalizeBodyParameters(values: unknown): string[] {
  if (values === undefined) return [];
  if (!Array.isArray(values) || values.length > 20) {
    throw new UnprocessableEntityException('Template body parameters must be an array of at most 20 text values.');
  }
  return values.map((value) => {
    if (typeof value !== 'string' || !value.trim() || value.trim().length > 1024) {
      throw new UnprocessableEntityException('Each template body parameter must be non-empty text of at most 1024 characters.');
    }
    return value.trim();
  });
}

type MetaTemplate = {
  id?: unknown;
  name?: unknown;
  status?: unknown;
  category?: unknown;
  language?: unknown;
};

type WhatsAppTemplate = {
  id: string | null;
  name: string;
  status: string;
  category: string | null;
  language: string;
};

@Injectable()
export class WhatsAppBusinessService {
  private configuredTransport() {
    const accessToken = env('META_WHATSAPP_ACCESS_TOKEN');
    const phoneNumberId = env('META_WHATSAPP_PHONE_NUMBER_ID');
    const graphVersion = env('META_GRAPH_API_VERSION');
    if (!accessToken || !phoneNumberId || !graphVersion) {
      throw new ServiceUnavailableException('WhatsApp Business transport is not configured.');
    }
    return { accessToken, phoneNumberId, graphVersion };
  }

  private configuredBusinessAccountId() {
    const businessAccountId = env('META_WHATSAPP_BUSINESS_ACCOUNT_ID');
    if (!businessAccountId) {
      throw new ServiceUnavailableException('WhatsApp Business Account management is not configured.');
    }
    return businessAccountId;
  }

  private async fetchTemplates(): Promise<WhatsAppTemplate[]> {
    const { accessToken, graphVersion } = this.configuredTransport();
    const businessAccountId = this.configuredBusinessAccountId();

    let response: Response;
    try {
      response = await fetch(
        `https://graph.facebook.com/${encodeURIComponent(graphVersion)}/${encodeURIComponent(businessAccountId)}/message_templates?fields=id,name,status,category,language&limit=100`,
        { method: 'GET', headers: { Authorization: `Bearer ${accessToken}` } },
      );
    } catch {
      throw new BadGatewayException('Unable to reach WhatsApp Business Management API.');
    }

    if (!response.ok) {
      throw new BadGatewayException(`WhatsApp Business Management API rejected the request with HTTP ${response.status}.`);
    }

    const body = await response.json() as { data?: MetaTemplate[] };
    if (!Array.isArray(body.data)) {
      throw new BadGatewayException('WhatsApp Business Management API returned an unexpected response.');
    }

    return body.data.flatMap((template) => {
      if (typeof template.name !== 'string' || typeof template.status !== 'string' || typeof template.language !== 'string') return [];
      return [{
        id: typeof template.id === 'string' ? template.id : null,
        name: template.name,
        status: template.status,
        category: typeof template.category === 'string' ? template.category : null,
        language: template.language,
      }];
    });
  }

  listTemplates() {
    return this.fetchTemplates();
  }

  async sendTemplateMessage(input: { to?: unknown; templateName?: unknown; languageCode?: unknown; bodyParameters?: unknown }) {
    const { accessToken, phoneNumberId, graphVersion } = this.configuredTransport();
    if (typeof input.to !== 'string' || typeof input.templateName !== 'string' || typeof input.languageCode !== 'string') {
      throw new UnprocessableEntityException('Recipient, template name and language code are required.');
    }

    const to = normalizeRecipient(input.to);
    const templateName = normalizeTemplateName(input.templateName);
    const languageCode = normalizeLanguageCode(input.languageCode);
    const bodyParameters = normalizeBodyParameters(input.bodyParameters);
    const templates = await this.fetchTemplates();
    const selected = templates.find((template) => template.name === templateName && template.language === languageCode);
    if (!selected || selected.status !== 'APPROVED') {
      throw new UnprocessableEntityException('The selected WhatsApp template is not approved for the configured Business Account and language.');
    }

    const template: Record<string, unknown> = {
      name: templateName,
      language: { code: languageCode },
    };
    if (bodyParameters.length > 0) {
      template.components = [{
        type: 'body',
        parameters: bodyParameters.map((text) => ({ type: 'text', text })),
      }];
    }

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
          template,
        }),
      });
    } catch {
      throw new BadGatewayException('Unable to reach WhatsApp Cloud API.');
    }

    if (!response.ok) {
      throw new BadGatewayException(`WhatsApp Cloud API rejected the template message with HTTP ${response.status}.`);
    }

    const body = await response.json() as { messages?: Array<{ id?: unknown }> };
    const providerMessageId = typeof body.messages?.[0]?.id === 'string' ? body.messages[0].id : undefined;
    if (!providerMessageId) {
      throw new BadGatewayException('WhatsApp Cloud API did not return a message ID.');
    }

    return {
      providerMessageId,
      acceptedAt: new Date().toISOString(),
      templateName,
    };
  }
}
