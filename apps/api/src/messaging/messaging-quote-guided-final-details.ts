import type { MessagingQuoteDraftProgress } from './messaging-quote-draft';

export type MessagingGuidedFinalDetailsQuestionId =
  | 'OFF_LIMITS_AREAS'
  | 'FRAGILE_ITEMS'
  | 'PRODUCT_RESTRICTIONS'
  | 'ALLERGIES_OR_SENSITIVITIES'
  | 'EXISTING_DAMAGE'
  | 'ATTENTION_AREAS'
  | 'RENOVATION_DUST'
  | 'APPLIANCE_NOTES'
  | 'ADDITIONAL_NOTES'
  | 'PHOTOS'
  | 'FULL_NAME'
  | 'EMAIL'
  | 'MOBILE'
  | 'PREFERRED_CONTACT';

export type MessagingGuidedFinalDetailsQuestion = {
  id: MessagingGuidedFinalDetailsQuestionId;
  text: string;
};

export type MessagingGuidedFinalDetailsAnswer =
  | { kind: 'ACCEPTED'; patch: MessagingQuoteDraftProgress }
  | { kind: 'INVALID'; question: MessagingGuidedFinalDetailsQuestion }
  | { kind: 'COMPLETE' };

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function has(recordValue: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(recordValue, key);
}

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && Boolean(value.trim());
}

function optionalText(raw: string): string | null | undefined {
  const text = raw.trim();
  if (text === '0') return null;
  return text || undefined;
}

function optionalQuestion(
  id: MessagingGuidedFinalDetailsQuestionId,
  text: string,
): MessagingGuidedFinalDetailsQuestion {
  return { id, text: `${text} Reply with the details, or 0 for none.` };
}

export function nextMessagingGuidedFinalDetailsQuestion(
  draft: MessagingQuoteDraftProgress,
): MessagingGuidedFinalDetailsQuestion | null {
  const safety = record(draft.safety);
  if (!has(safety, 'offLimitsAreas')) return optionalQuestion('OFF_LIMITS_AREAS', 'Are any areas off-limits to the cleaning team?');
  if (!has(safety, 'fragileItems')) return optionalQuestion('FRAGILE_ITEMS', 'Are there fragile items the team should know about?');
  if (!has(safety, 'productRestrictions')) return optionalQuestion('PRODUCT_RESTRICTIONS', 'Are there any cleaning-product restrictions?');
  if (!has(safety, 'allergiesOrSensitivities')) return optionalQuestion('ALLERGIES_OR_SENSITIVITIES', 'Are there any allergies or sensitivities we should know about?');
  if (!has(safety, 'existingDamage')) return optionalQuestion('EXISTING_DAMAGE', 'Is there any existing damage the team should know about?');

  const notes = record(draft.notes);
  if (!has(notes, 'attentionAreas')) return optionalQuestion('ATTENTION_AREAS', 'Are there areas that need special attention?');
  if (!has(notes, 'renovationDust')) return optionalQuestion('RENOVATION_DUST', 'Is there renovation or construction dust we should know about?');
  if (!has(notes, 'applianceNotes')) return optionalQuestion('APPLIANCE_NOTES', 'Any appliance-related notes for this cleaning?');
  if (!has(notes, 'additionalNotes')) return optionalQuestion('ADDITIONAL_NOTES', 'Any other notes for the cleaning team?');

  if (!Array.isArray(draft.photos)) {
    return {
      id: 'PHOTOS',
      text: 'Quote photos are optional. Reply 0 to continue without photos. Secure photo-to-Quote attachment is handled separately and is not yet automated in this guided flow.',
    };
  }

  const customer = record(draft.customer);
  if (!nonEmpty(customer.fullName)) return { id: 'FULL_NAME', text: 'What is your full name? Reply with the name only.' };
  if (!nonEmpty(customer.email)) return { id: 'EMAIL', text: 'What email address should we use for this quote? Reply with the email address only.' };
  if (!nonEmpty(customer.mobile)) return { id: 'MOBILE', text: 'What mobile number should be linked to this quote? Reply in international format, for example +27821234567.' };
  if (!nonEmpty(customer.preferredContact)) {
    return {
      id: 'PREFERRED_CONTACT',
      text: 'How would you prefer us to contact you about this quote?\n1. Phone\n2. Email\n3. WhatsApp\nReply with the number only.',
    };
  }

  return null;
}

export function applyMessagingGuidedFinalDetailsAnswer(
  draft: MessagingQuoteDraftProgress,
  rawText: string | null | undefined,
): MessagingGuidedFinalDetailsAnswer {
  const question = nextMessagingGuidedFinalDetailsQuestion(draft);
  if (!question) return { kind: 'COMPLETE' };
  const text = rawText?.trim() ?? '';

  const safetyFields: Partial<Record<MessagingGuidedFinalDetailsQuestionId, string>> = {
    OFF_LIMITS_AREAS: 'offLimitsAreas',
    FRAGILE_ITEMS: 'fragileItems',
    PRODUCT_RESTRICTIONS: 'productRestrictions',
    ALLERGIES_OR_SENSITIVITIES: 'allergiesOrSensitivities',
    EXISTING_DAMAGE: 'existingDamage',
  };
  const safetyField = safetyFields[question.id];
  if (safetyField) {
    const value = optionalText(text);
    if (value === undefined) return { kind: 'INVALID', question };
    return { kind: 'ACCEPTED', patch: { safety: { [safetyField]: value ?? '' } } };
  }

  const noteFields: Partial<Record<MessagingGuidedFinalDetailsQuestionId, string>> = {
    ATTENTION_AREAS: 'attentionAreas',
    RENOVATION_DUST: 'renovationDust',
    APPLIANCE_NOTES: 'applianceNotes',
    ADDITIONAL_NOTES: 'additionalNotes',
  };
  const noteField = noteFields[question.id];
  if (noteField) {
    const value = optionalText(text);
    if (value === undefined) return { kind: 'INVALID', question };
    return { kind: 'ACCEPTED', patch: { notes: { [noteField]: value ?? '' } } };
  }

  if (question.id === 'PHOTOS') {
    if (text !== '0') return { kind: 'INVALID', question };
    return { kind: 'ACCEPTED', patch: { photos: [] } };
  }

  if (question.id === 'FULL_NAME') {
    if (!text) return { kind: 'INVALID', question };
    return { kind: 'ACCEPTED', patch: { customer: { fullName: text } } };
  }

  if (question.id === 'EMAIL') {
    if (!/^\S+@\S+\.\S+$/.test(text)) return { kind: 'INVALID', question };
    return { kind: 'ACCEPTED', patch: { customer: { email: text } } };
  }

  if (question.id === 'MOBILE') {
    if (!/^\+[1-9]\d{7,14}$/.test(text)) return { kind: 'INVALID', question };
    return { kind: 'ACCEPTED', patch: { customer: { mobile: text } } };
  }

  if (question.id === 'PREFERRED_CONTACT') {
    const preferredContact = ({ '1': 'PHONE', '2': 'EMAIL', '3': 'WHATSAPP' } as const)[text as '1'];
    if (!preferredContact) return { kind: 'INVALID', question };
    return { kind: 'ACCEPTED', patch: { customer: { preferredContact } } };
  }

  return { kind: 'INVALID', question };
}
