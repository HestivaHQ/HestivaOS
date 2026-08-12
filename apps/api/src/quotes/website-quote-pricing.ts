import type { WebsiteQuotePricingLineV1, WebsiteQuotePricingSnapshotV1, WebsiteQuoteSubmissionV1 } from './website-quote-contract';
import type { WebsiteQuoteSubmissionV2 } from './website-quote-contract-v2';
import { resolveLaundryRequest } from './laundry-operating-model';

export type WebsiteQuoteSubmission = WebsiteQuoteSubmissionV1 | WebsiteQuoteSubmissionV2;

export type WebsiteQuotePricingAttentionReason = {
  code: string;
  path: string;
  message: string;
};

export type WebsiteQuotePricingResult = {
  pricing: WebsiteQuotePricingSnapshotV1;
  attentionReasons: WebsiteQuotePricingAttentionReason[];
  requiresBreakEvenReview: true;
};

const FLOOR_PRICE_MINOR: Record<string, Record<string, number>> = {
  'Regular Home Cleaning': {
    UNDER_40: 65_000,
    FROM_40_TO_59: 70_000,
    FROM_60_TO_79: 75_000,
    FROM_80_TO_99: 80_000,
    FROM_100_TO_129: 87_500,
    FROM_130_TO_169: 97_500,
    FROM_170_TO_219: 105_000,
    FROM_220_TO_299: 120_000,
    FROM_300_UP: 135_000,
  },
  'Deep Cleaning': {
    UNDER_40: 100_000,
    FROM_40_TO_59: 105_000,
    FROM_60_TO_79: 115_000,
    FROM_80_TO_99: 125_000,
    FROM_100_TO_129: 135_000,
    FROM_130_TO_169: 155_000,
    FROM_170_TO_219: 170_000,
    FROM_220_TO_299: 190_000,
    FROM_300_UP: 220_000,
  },
  'Move-In Cleaning': {
    UNDER_40: 120_000,
    FROM_40_TO_59: 125_000,
    FROM_60_TO_79: 135_000,
    FROM_80_TO_99: 145_000,
    FROM_100_TO_129: 155_000,
    FROM_130_TO_169: 175_000,
    FROM_170_TO_219: 190_000,
    FROM_220_TO_299: 210_000,
    FROM_300_UP: 245_000,
  },
  'Move-Out Cleaning': {
    UNDER_40: 120_000,
    FROM_40_TO_59: 125_000,
    FROM_60_TO_79: 135_000,
    FROM_80_TO_99: 145_000,
    FROM_100_TO_129: 155_000,
    FROM_130_TO_169: 175_000,
    FROM_170_TO_219: 190_000,
    FROM_220_TO_299: 210_000,
    FROM_300_UP: 245_000,
  },
};

const COUNT_VALUE: Record<string, number> = {
  STUDIO: 1,
  ONE: 1,
  TWO: 2,
  THREE: 3,
  FOUR: 4,
  FOUR_PLUS: 4,
  FIVE_PLUS: 5,
};

function line(code: string, label: string, quantity: number, unitAmountMinor: number): WebsiteQuotePricingLineV1 {
  return {
    code,
    label,
    quantity,
    unitAmountMinor,
    lineAmountMinor: unitAmountMinor * quantity,
  };
}

function attention(code: string, path: string, message: string): WebsiteQuotePricingAttentionReason {
  return { code, path, message };
}

function addFloorPricedPrimary(
  submission: WebsiteQuoteSubmission,
  canonicalService: string,
  lines: WebsiteQuotePricingLineV1[],
  attentionReasons: WebsiteQuotePricingAttentionReason[],
) {
  const floorSize = submission.property.floorSize;
  if (floorSize === 'UNKNOWN') {
    attentionReasons.push(attention('FLOOR_SIZE_REQUIRED', 'property.floorSize', 'Floor size must be verified before this service can receive an authoritative price.'));
    return;
  }

  const amount = FLOOR_PRICE_MINOR[canonicalService]?.[floorSize];
  if (amount === undefined) {
    attentionReasons.push(attention('UNSUPPORTED_FLOOR_PRICE', 'property.floorSize', 'No canonical price exists for this service and floor-size combination.'));
    return;
  }

  lines.push(line(`PRIMARY_${canonicalService.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}`, canonicalService, 1, amount));

  if (floorSize === 'FROM_300_UP') {
    attentionReasons.push(attention('FROM_PRICE_REQUIRES_REVIEW', 'property.floorSize', '300+ m² uses a canonical from-price and requires final workload review.'));
  }

  if (canonicalService === 'Regular Home Cleaning') {
    attentionReasons.push(attention('ROOM_CONFIGURATION_REVIEW', 'property', 'Regular Cleaning room modifiers require comparison with the expected configuration for the floor-size band before final issue.'));
  }
}

function addRoomServicePrimary(
  submission: WebsiteQuoteSubmission,
  canonicalService: string,
  lines: WebsiteQuotePricingLineV1[],
  attentionReasons: WebsiteQuotePricingAttentionReason[],
) {
  if (canonicalService === 'Bathroom Sanitisation') {
    const count = COUNT_VALUE[submission.property.bathrooms];
    lines.push(line('PRIMARY_BATHROOM_FIRST', 'Bathroom Sanitisation — first standard bathroom', 1, 55_000));
    if (count > 1) lines.push(line('PRIMARY_BATHROOM_ADDITIONAL', 'Additional standard bathroom', count - 1, 20_000));
    if (submission.property.bathrooms === 'FIVE_PLUS') {
      attentionReasons.push(attention('OPEN_ENDED_BATHROOM_COUNT', 'property.bathrooms', '5+ bathrooms requires Admin confirmation of the exact count.'));
    }
    attentionReasons.push(attention('BATHROOM_TYPE_REVIEW', 'property.bathrooms', 'Large/master bathroom modifiers cannot be inferred from the website payload.'));
    return;
  }

  if (canonicalService === 'Bedroom Cleaning') {
    const count = COUNT_VALUE[submission.property.bedrooms];
    if (!count || submission.property.bedrooms === 'OTHER') {
      attentionReasons.push(attention('BEDROOM_COUNT_REVIEW', 'property.bedrooms', 'Bedroom count must be verified before authoritative pricing.'));
      return;
    }
    lines.push(line('PRIMARY_BEDROOM_FIRST', 'Bedroom Cleaning — first standard bedroom', 1, 45_000));
    if (count > 1) lines.push(line('PRIMARY_BEDROOM_ADDITIONAL', 'Additional standard bedroom', count - 1, 15_000));
    if (submission.property.bedrooms === 'FIVE_PLUS') {
      attentionReasons.push(attention('OPEN_ENDED_BEDROOM_COUNT', 'property.bedrooms', '5+ bedrooms requires Admin confirmation of the exact count.'));
    }
    attentionReasons.push(attention('BEDROOM_TYPE_REVIEW', 'property.bedrooms', 'Large/master bedroom modifiers cannot be inferred from the website payload.'));
    return;
  }

  if (canonicalService === 'Living Area Cleaning') {
    const count = COUNT_VALUE[submission.property.livingAreas];
    lines.push(line('PRIMARY_LIVING_AREA_FIRST', 'Living Area Cleaning — first standard living area', 1, 45_000));
    if (count > 1) lines.push(line('PRIMARY_LIVING_AREA_ADDITIONAL', 'Additional standard living area', count - 1, 15_000));
    if (submission.property.livingAreas === 'FOUR_PLUS') {
      attentionReasons.push(attention('OPEN_ENDED_LIVING_AREA_COUNT', 'property.livingAreas', '4+ living areas requires Admin confirmation of the exact count.'));
    }
    attentionReasons.push(attention('LIVING_AREA_TYPE_REVIEW', 'property.livingAreas', 'Large/open-plan living-area modifiers cannot be inferred from the website payload.'));
  }
}

function addStructuredLaundry(
  submission: WebsiteQuoteSubmission,
  lines: WebsiteQuotePricingLineV1[],
  attentionReasons: WebsiteQuotePricingAttentionReason[],
) {
  if (submission.schemaVersion !== '2.0' || !submission.request.laundry) return;

  const resolved = resolveLaundryRequest({
    primaryService: submission.request.primaryService.canonicalService,
    facilities: submission.request.laundry.facilities,
    laundryLoads: submission.request.laundry.laundryLoads,
    ironingLoads: submission.request.laundry.ironingLoads,
  });

  if (resolved.errors.length) {
    resolved.errors.forEach((error) => {
      attentionReasons.push(attention(error.code, `request.laundry.${error.path}`, error.message));
    });
    return;
  }

  if (resolved.resolved.laundryLoads && resolved.resolved.laundryUnitAmountMinor && resolved.resolved.outcome) {
    lines.push(line(
      resolved.resolved.outcome === 'WASH_DRY_FOLD' ? 'ADDON_LAUNDRY_WASH_DRY_FOLD' : 'ADDON_LAUNDRY_WASH_HANG',
      resolved.resolved.outcome === 'WASH_DRY_FOLD' ? 'Wash, Dry & Fold' : 'Wash & Hang',
      resolved.resolved.laundryLoads,
      resolved.resolved.laundryUnitAmountMinor,
    ));
    attentionReasons.push(attention('LAUNDRY_CAPACITY_REVIEW', 'request.laundry.laundryLoads', 'Requested laundry loads require labour/time-capacity approval before operational acceptance.'));
  }

  if (resolved.resolved.ironingLoads && resolved.resolved.ironingUnitAmountMinor) {
    lines.push(line('ADDON_IRONING', 'Ironing', resolved.resolved.ironingLoads, resolved.resolved.ironingUnitAmountMinor));
    attentionReasons.push(attention('IRONING_CAPACITY_REVIEW', 'request.laundry.ironingLoads', 'Requested ironing loads require labour/time-capacity approval before operational acceptance.'));
  }
}

export function calculateWebsiteQuotePricing(submission: WebsiteQuoteSubmission): WebsiteQuotePricingResult {
  const lines: WebsiteQuotePricingLineV1[] = [];
  const attentionReasons: WebsiteQuotePricingAttentionReason[] = [];
  const primary = submission.request.primaryService.canonicalService;

  if (!primary) {
    attentionReasons.push(attention('PRIMARY_SERVICE_REVIEW', 'request.primaryService', 'The selected primary-service path requires Admin mapping/review.'));
  } else if (FLOOR_PRICE_MINOR[primary]) {
    addFloorPricedPrimary(submission, primary, lines, attentionReasons);
  } else if (primary === 'Bathroom Sanitisation' || primary === 'Bedroom Cleaning' || primary === 'Living Area Cleaning') {
    addRoomServicePrimary(submission, primary, lines, attentionReasons);
  } else if (primary === 'Post-Renovation Cleaning') {
    attentionReasons.push(attention('ASSESSMENT_REQUIRED', 'request.primaryService', 'Post-Renovation Cleaning is assessment/quote-required and is not automatically priced in v1.'));
  } else if (primary === 'Kitchen Cleaning') {
    attentionReasons.push(attention('KITCHEN_SCOPE_REQUIRED', 'request.primaryService', 'Kitchen size and Standard vs Deep/Detailed scope are required before authoritative pricing.'));
  } else if (primary === 'Interior Window Cleaning') {
    lines.push(line('PRIMARY_INTERIOR_WINDOWS_MINIMUM', 'Interior Window Cleaning — minimum up to 6 standard accessible windows', 1, 40_000));
    attentionReasons.push(attention('WINDOW_COUNT_REVIEW', 'request.primaryService', 'Exact standard/large window quantities are required before final pricing.'));
  } else {
    attentionReasons.push(attention('UNSUPPORTED_PRIMARY_PRICING', 'request.primaryService', `No deterministic v1 pricing adapter exists for ${primary}.`));
  }

  submission.request.addOns.forEach((addOn, index) => {
    attentionReasons.push(attention(
      'ADD_ON_DETAIL_REQUIRED',
      `request.addOns.${index}`,
      `${addOn.canonicalService} requires canonical size/condition/scope detail before authoritative pricing and cannot be guessed from the generic website add-on value.`,
    ));
  });

  addStructuredLaundry(submission, lines, attentionReasons);

  if (submission.request.ecoFriendlyProducts) {
    lines.push(line('PREFERENCE_ECO_FRIENDLY', 'Eco-friendly products preference', 1, 0));
  }

  const subtotalMinor = lines.reduce((sum, item) => sum + item.lineAmountMinor, 0);

  // The canonical model requires a universal internal break-even/contribution check.
  // Website Quote v1/v2 does not carry authoritative labour, deployment, consumables,
  // vehicle/equipment reserve or overhead costs, so ingestion must retain Admin review
  // until the HestivaOS cost engine can prove the profitability floor.
  attentionReasons.push(attention(
    'BREAK_EVEN_REVIEW_REQUIRED',
    '$',
    'Universal break-even protection requires HestivaOS operational cost inputs before the customer price can be finalised.',
  ));

  return {
    pricing: {
      currency: 'ZAR',
      subtotalMinor,
      adjustmentsMinor: 0,
      totalMinor: subtotalMinor,
      lines,
    },
    attentionReasons,
    requiresBreakEvenReview: true,
  };
}
