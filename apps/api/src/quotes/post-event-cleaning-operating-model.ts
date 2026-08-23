export const POST_EVENT_CLEANING_SERVICE = 'Post-Event Cleaning' as const;

export type PostEventFloorSize =
  | 'UNDER_40'
  | 'FROM_40_TO_59'
  | 'FROM_60_TO_79'
  | 'FROM_80_TO_99'
  | 'FROM_100_TO_129'
  | 'FROM_130_TO_169'
  | 'FROM_170_TO_219'
  | 'FROM_220_TO_299'
  | 'FROM_300_UP'
  | 'UNKNOWN';

export type PostEventGuestBand = 'ONE_TO_20' | 'FROM_21_TO_50' | 'FROM_51_TO_100' | 'FROM_101_TO_150' | 'FROM_150_UP';
export type PostEventDishwashing = 'NONE' | 'MODERATE' | 'HEAVY';
export type PostEventWasteLevel = 'LIGHT' | 'MODERATE' | 'HEAVY';
export type PostEventOutdoorArea = 'PATIO' | 'BALCONY' | 'BRAAI_AREA' | 'GARDEN_ENTERTAINMENT_AREA';

export type PostEventCleaningRequest = {
  floorSize: PostEventFloorSize;
  guestBand: PostEventGuestBand;
  bathrooms: number;
  kitchenSubstantiallyUsed: boolean;
  dishwashing: PostEventDishwashing;
  outdoorAreas: PostEventOutdoorArea[];
  wasteLevel: PostEventWasteLevel;
  significantOrdinarySoiling: boolean;
  lateNightOrOvernight: boolean;
  bulkWasteRemovalRequested: boolean;
  specialistContamination: boolean;
  specialistCarpetOrUpholstery: boolean;
  complexVenue: boolean;
};

export type PostEventReviewCode =
  | 'FLOOR_SIZE_REQUIRED'
  | 'FLOOR_SIZE_REVIEW'
  | 'GUEST_COUNT_REVIEW'
  | 'INVALID_BATHROOM_COUNT'
  | 'WORKLOAD_CEILING_EXCEEDED'
  | 'OVERNIGHT_REVIEW'
  | 'BULK_WASTE_REVIEW'
  | 'SPECIALIST_CONTAMINATION_REVIEW'
  | 'SPECIALIST_CARPET_UPHOLSTERY_REVIEW'
  | 'COMPLEX_VENUE_REVIEW';

export type PostEventReviewReason = {
  code: PostEventReviewCode;
  message: string;
};

export type ResolvedPostEventCleaning = {
  baseCleanerHours: number | null;
  additionalCleanerHours: number;
  totalCleanerHours: number | null;
  basePriceMinor: number | null;
  workloadAdjustmentMinor: number;
  preliminaryPriceMinor: number | null;
  reviewReasons: PostEventReviewReason[];
  automaticPricingAllowed: boolean;
};

const BASE_BY_FLOOR_SIZE: Partial<Record<PostEventFloorSize, { cleanerHours: number; priceMinor: number }>> = {
  UNDER_40: { cleanerHours: 5.5, priceMinor: 85_000 },
  FROM_40_TO_59: { cleanerHours: 6.5, priceMinor: 95_000 },
  FROM_60_TO_79: { cleanerHours: 7.5, priceMinor: 110_000 },
  FROM_80_TO_99: { cleanerHours: 8.5, priceMinor: 125_000 },
  FROM_100_TO_129: { cleanerHours: 10, priceMinor: 145_000 },
  FROM_130_TO_169: { cleanerHours: 12, priceMinor: 165_000 },
  FROM_170_TO_219: { cleanerHours: 14, priceMinor: 190_000 },
  FROM_220_TO_299: { cleanerHours: 16.5, priceMinor: 220_000 },
};

const GUEST_HOURS: Record<PostEventGuestBand, number | null> = {
  ONE_TO_20: 0,
  FROM_21_TO_50: 2,
  FROM_51_TO_100: 4,
  FROM_101_TO_150: 7,
  FROM_150_UP: null,
};

const OUTDOOR_HOURS: Record<PostEventOutdoorArea, number> = {
  PATIO: 1.5,
  BALCONY: 1.5,
  BRAAI_AREA: 1.5,
  GARDEN_ENTERTAINMENT_AREA: 2.5,
};

const CUSTOMER_PRICE_PER_ADDITIONAL_CLEANER_HOUR_MINOR = 10_000;
const AUTOMATIC_PRICING_CLEANER_HOUR_CEILING = 24;

function review(code: PostEventReviewCode, message: string): PostEventReviewReason {
  return { code, message };
}

export function resolvePostEventCleaning(request: PostEventCleaningRequest): ResolvedPostEventCleaning {
  const reviewReasons: PostEventReviewReason[] = [];
  const base = BASE_BY_FLOOR_SIZE[request.floorSize];

  if (request.floorSize === 'UNKNOWN') {
    reviewReasons.push(review('FLOOR_SIZE_REQUIRED', 'Floor size must be known before Post-Event Cleaning can be priced automatically.'));
  } else if (request.floorSize === 'FROM_300_UP') {
    reviewReasons.push(review('FLOOR_SIZE_REVIEW', 'Properties of 300 m² or more require deliberate Post-Event workload assessment.'));
  }

  const guestHours = GUEST_HOURS[request.guestBand];
  if (guestHours === null) {
    reviewReasons.push(review('GUEST_COUNT_REVIEW', 'Events with 150+ guests require deliberate workload assessment.'));
  }

  if (!Number.isInteger(request.bathrooms) || request.bathrooms < 1) {
    reviewReasons.push(review('INVALID_BATHROOM_COUNT', 'Post-Event Cleaning requires an exact positive bathroom count.'));
  }

  let additionalCleanerHours = guestHours ?? 0;
  if (Number.isInteger(request.bathrooms) && request.bathrooms > 1) {
    additionalCleanerHours += (request.bathrooms - 1) * 1.5;
  }
  if (request.kitchenSubstantiallyUsed) additionalCleanerHours += 2;
  if (request.dishwashing === 'MODERATE') additionalCleanerHours += 2;
  if (request.dishwashing === 'HEAVY') additionalCleanerHours += 4;

  // outdoorAreas contains concrete subtypes only, so no generic outdoor flag can
  // double-count the same physical workload. Duplicate subtypes are ignored.
  for (const area of new Set(request.outdoorAreas)) {
    additionalCleanerHours += OUTDOOR_HOURS[area];
  }

  if (request.wasteLevel === 'MODERATE') additionalCleanerHours += 1.5;
  if (request.wasteLevel === 'HEAVY') additionalCleanerHours += 3;
  if (request.significantOrdinarySoiling) additionalCleanerHours += 2;

  const totalCleanerHours = base ? base.cleanerHours + additionalCleanerHours : null;
  if (totalCleanerHours !== null && totalCleanerHours > AUTOMATIC_PRICING_CLEANER_HOUR_CEILING) {
    reviewReasons.push(review('WORKLOAD_CEILING_EXCEEDED', 'Calculated Post-Event workload exceeds the 24 cleaner-hour automatic-pricing ceiling.'));
  }

  if (request.lateNightOrOvernight) {
    reviewReasons.push(review('OVERNIGHT_REVIEW', 'Late-night or overnight Post-Event work requires staffing and commercial review.'));
  }
  if (request.bulkWasteRemovalRequested) {
    reviewReasons.push(review('BULK_WASTE_REVIEW', 'Bulk or off-site waste removal is outside the automatic Post-Event pricing boundary.'));
  }
  if (request.specialistContamination) {
    reviewReasons.push(review('SPECIALIST_CONTAMINATION_REVIEW', 'Hazardous, biohazard or specialist contamination cannot be automatically priced as ordinary Post-Event Cleaning.'));
  }
  if (request.specialistCarpetOrUpholstery) {
    reviewReasons.push(review('SPECIALIST_CARPET_UPHOLSTERY_REVIEW', 'Specialist carpet or upholstery treatment requires separate review.'));
  }
  if (request.complexVenue) {
    reviewReasons.push(review('COMPLEX_VENUE_REVIEW', 'Large or complex commercial/event venues require deliberate workload assessment.'));
  }

  const workloadAdjustmentMinor = additionalCleanerHours * CUSTOMER_PRICE_PER_ADDITIONAL_CLEANER_HOUR_MINOR;
  const preliminaryPriceMinor = base ? base.priceMinor + workloadAdjustmentMinor : null;

  return {
    baseCleanerHours: base?.cleanerHours ?? null,
    additionalCleanerHours,
    totalCleanerHours,
    basePriceMinor: base?.priceMinor ?? null,
    workloadAdjustmentMinor,
    preliminaryPriceMinor,
    reviewReasons,
    automaticPricingAllowed: reviewReasons.length === 0 && preliminaryPriceMinor !== null,
  };
}
