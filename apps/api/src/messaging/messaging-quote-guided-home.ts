import type { MessagingQuoteDraftProgress } from './messaging-quote-draft';

export type MessagingGuidedHomeQuestionId =
  | 'PROPERTY_TYPE'
  | 'ADDRESS_LINE_1'
  | 'SUBURB'
  | 'COUNTRY_CONFIRMATION'
  | 'FLOOR_SIZE'
  | 'BEDROOMS'
  | 'BATHROOMS'
  | 'LIVING_AREAS'
  | 'APARTMENT_FLOOR'
  | 'APARTMENT_ACCESS'
  | 'OUTDOOR_AREA'
  | 'ESTATE_CLASSIFICATION';

export type MessagingGuidedHomeQuestion = {
  id: MessagingGuidedHomeQuestionId;
  text: string;
};

const PROPERTY_TYPES = {
  '1': 'APARTMENT',
  '2': 'TOWNHOUSE',
  '3': 'HOUSE',
  '4': 'DUPLEX',
  '5': 'OTHER',
} as const;

const FLOOR_SIZES = {
  '1': 'UNDER_40',
  '2': 'FROM_40_TO_59',
  '3': 'FROM_60_TO_79',
  '4': 'FROM_80_TO_99',
  '5': 'FROM_100_TO_129',
  '6': 'FROM_130_TO_169',
  '7': 'FROM_170_TO_219',
  '8': 'FROM_220_TO_299',
  '9': 'FROM_300_UP',
  '10': 'UNKNOWN',
} as const;

const BEDROOMS = {
  '1': 'STUDIO',
  '2': 'ONE',
  '3': 'TWO',
  '4': 'THREE',
  '5': 'FOUR',
  '6': 'FIVE_PLUS',
  '7': 'OTHER',
} as const;

const BATHROOMS = {
  '1': 'ONE',
  '2': 'TWO',
  '3': 'THREE',
  '4': 'FOUR',
  '5': 'FIVE_PLUS',
} as const;

const LIVING_AREAS = {
  '1': 'ONE',
  '2': 'TWO',
  '3': 'THREE',
  '4': 'FOUR_PLUS',
} as const;

const APARTMENT_ACCESS = {
  '1': 'ELEVATOR',
  '2': 'STAIRS',
  '3': 'ELEVATOR_AND_STAIRS',
} as const;

const OUTDOOR_AREAS = {
  '1': 'NONE',
  '2': 'BALCONY',
  '3': 'PATIO',
  '4': 'BOTH',
} as const;

const ESTATE_CLASSIFICATIONS = {
  '1': 'NONE',
  '2': 'ESTATE',
  '3': 'COMPLEX',
  '4': 'GATED_COMMUNITY',
} as const;

function propertyProgress(draft: MessagingQuoteDraftProgress): Record<string, unknown> {
  const value = draft.property;
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && Boolean(value.trim());
}

export function nextMessagingGuidedHomeQuestion(
  draft: MessagingQuoteDraftProgress,
): MessagingGuidedHomeQuestion | null {
  const property = propertyProgress(draft);

  if (!property.propertyType) {
    return {
      id: 'PROPERTY_TYPE',
      text: 'What type of property is it?\n1. Apartment\n2. Townhouse\n3. House\n4. Duplex\n5. Other\nReply with the number only.',
    };
  }
  if (!nonEmptyString(property.addressLine1)) {
    return { id: 'ADDRESS_LINE_1', text: 'What is the street address? Reply with the address only.' };
  }
  if (!nonEmptyString(property.suburb)) {
    return { id: 'SUBURB', text: 'What suburb is the property in? Reply with the suburb only.' };
  }
  if (property.country !== 'South Africa') {
    return {
      id: 'COUNTRY_CONFIRMATION',
      text: 'Is this property in South Africa? Reply YES exactly to continue with the automated quote.',
    };
  }
  if (!property.floorSize) {
    return {
      id: 'FLOOR_SIZE',
      text: 'Approximately how large is the property?\n1. Under 40 m²\n2. 40–59 m²\n3. 60–79 m²\n4. 80–99 m²\n5. 100–129 m²\n6. 130–169 m²\n7. 170–219 m²\n8. 220–299 m²\n9. 300+ m²\n10. Not sure\nReply with the number only.',
    };
  }
  if (!property.bedrooms) {
    const studio = property.propertyType === 'APARTMENT' ? '1. Studio\n' : '';
    return {
      id: 'BEDROOMS',
      text: `How many bedrooms?\n${studio}2. 1 bedroom\n3. 2 bedrooms\n4. 3 bedrooms\n5. 4 bedrooms\n6. 5+ bedrooms\n7. Other\nReply with the number only.`,
    };
  }
  if (!property.bathrooms) {
    return {
      id: 'BATHROOMS',
      text: 'How many bathrooms?\n1. 1 bathroom\n2. 2 bathrooms\n3. 3 bathrooms\n4. 4 bathrooms\n5. 5+ bathrooms\nReply with the number only.',
    };
  }
  if (!property.livingAreas) {
    return {
      id: 'LIVING_AREAS',
      text: 'How many living areas are there?\n1. 1\n2. 2\n3. 3\n4. 4+\nReply with the number only.',
    };
  }
  if (property.propertyType === 'APARTMENT' && !Number.isInteger(property.exactFloor)) {
    return {
      id: 'APARTMENT_FLOOR',
      text: 'Which floor is the apartment on? Reply with a whole number from 0 to 50. Use 0 for ground floor.',
    };
  }
  if (property.propertyType === 'APARTMENT' && !property.buildingAccess) {
    return {
      id: 'APARTMENT_ACCESS',
      text: 'How do cleaners reach the apartment?\n1. Elevator\n2. Stairs\n3. Elevator and stairs\nReply with the number only.',
    };
  }
  if (!property.outdoorArea) {
    return {
      id: 'OUTDOOR_AREA',
      text: 'Does the property have an outdoor area relevant to the cleaning?\n1. None\n2. Balcony\n3. Patio\n4. Both balcony and patio\nReply with the number only.',
    };
  }
  if (!property.estateClassification) {
    return {
      id: 'ESTATE_CLASSIFICATION',
      text: 'Is the property in an estate, complex or gated community?\n1. None\n2. Estate\n3. Complex\n4. Gated community\nReply with the number only.',
    };
  }

  return null;
}

export type MessagingGuidedHomeAnswer =
  | { kind: 'ACCEPTED'; patch: MessagingQuoteDraftProgress }
  | { kind: 'INVALID'; question: MessagingGuidedHomeQuestion }
  | { kind: 'COMPLETE' };

export function applyMessagingGuidedHomeAnswer(
  draft: MessagingQuoteDraftProgress,
  rawText: string | null | undefined,
): MessagingGuidedHomeAnswer {
  const question = nextMessagingGuidedHomeQuestion(draft);
  if (!question) return { kind: 'COMPLETE' };

  const text = rawText?.trim() ?? '';
  const property = propertyProgress(draft);
  let value: unknown;

  switch (question.id) {
    case 'PROPERTY_TYPE':
      value = PROPERTY_TYPES[text as keyof typeof PROPERTY_TYPES];
      break;
    case 'ADDRESS_LINE_1':
    case 'SUBURB':
      value = text || undefined;
      break;
    case 'COUNTRY_CONFIRMATION':
      value = text === 'YES' ? 'South Africa' : undefined;
      break;
    case 'FLOOR_SIZE':
      value = FLOOR_SIZES[text as keyof typeof FLOOR_SIZES];
      break;
    case 'BEDROOMS':
      value = BEDROOMS[text as keyof typeof BEDROOMS];
      if (value === 'STUDIO' && property.propertyType !== 'APARTMENT') value = undefined;
      break;
    case 'BATHROOMS':
      value = BATHROOMS[text as keyof typeof BATHROOMS];
      break;
    case 'LIVING_AREAS':
      value = LIVING_AREAS[text as keyof typeof LIVING_AREAS];
      break;
    case 'APARTMENT_FLOOR': {
      const parsed = /^\d{1,2}$/.test(text) ? Number(text) : Number.NaN;
      value = Number.isInteger(parsed) && parsed >= 0 && parsed <= 50 ? parsed : undefined;
      break;
    }
    case 'APARTMENT_ACCESS':
      value = APARTMENT_ACCESS[text as keyof typeof APARTMENT_ACCESS];
      break;
    case 'OUTDOOR_AREA':
      value = OUTDOOR_AREAS[text as keyof typeof OUTDOOR_AREAS];
      break;
    case 'ESTATE_CLASSIFICATION':
      value = ESTATE_CLASSIFICATIONS[text as keyof typeof ESTATE_CLASSIFICATIONS];
      break;
  }

  if (value === undefined) return { kind: 'INVALID', question };

  const keyByQuestion: Record<MessagingGuidedHomeQuestionId, string> = {
    PROPERTY_TYPE: 'propertyType',
    ADDRESS_LINE_1: 'addressLine1',
    SUBURB: 'suburb',
    COUNTRY_CONFIRMATION: 'country',
    FLOOR_SIZE: 'floorSize',
    BEDROOMS: 'bedrooms',
    BATHROOMS: 'bathrooms',
    LIVING_AREAS: 'livingAreas',
    APARTMENT_FLOOR: 'exactFloor',
    APARTMENT_ACCESS: 'buildingAccess',
    OUTDOOR_AREA: 'outdoorArea',
    ESTATE_CLASSIFICATION: 'estateClassification',
  };

  return {
    kind: 'ACCEPTED',
    patch: { property: { [keyByQuestion[question.id]]: value } },
  };
}
