import type { WebsiteQuoteSubmissionV1 } from './website-quote-contract';
import type { WebsiteQuoteSubmissionV2 } from './website-quote-contract-v2';

export type WebsiteQuoteSubmission = WebsiteQuoteSubmissionV1 | WebsiteQuoteSubmissionV2;

export const CLEANER_WAGE_MINOR_PER_HOUR = 3_327;
export const EMPLOYER_UIF_RATE = 0.01;
export const EQUIPMENT_RESERVE_MINOR_PER_CLEANER_HOUR = 200;
export const OVERHEAD_MINOR_PER_CLEANER_HOUR = 2_000;
export const DEPLOYMENT_MINOR_PER_ROUTE_KM = 182;
export const ABSOLUTE_MINIMUM_CONTRIBUTION_MINOR = 10_000;

const FLOOR_CLEANER_HOURS: Record<string, Record<string, number>> = {
  'Regular Home Cleaning': {
    UNDER_40: 4,
    FROM_40_TO_59: 5,
    FROM_60_TO_79: 6,
    FROM_80_TO_99: 8,
    FROM_100_TO_129: 10,
    FROM_130_TO_169: 11,
    FROM_170_TO_219: 12,
    FROM_220_TO_299: 13.5,
  },
  'Deep Cleaning': {
    UNDER_40: 12,
    FROM_40_TO_59: 12.5,
    FROM_60_TO_79: 14,
    FROM_80_TO_99: 15,
    FROM_100_TO_129: 16,
    FROM_130_TO_169: 18.5,
    FROM_170_TO_219: 20.5,
    FROM_220_TO_299: 23,
  },
  'Move-In Cleaning': {
    UNDER_40: 14.5,
    FROM_40_TO_59: 15,
    FROM_60_TO_79: 16,
    FROM_80_TO_99: 17.5,
    FROM_100_TO_129: 18.5,
    FROM_130_TO_169: 21,
    FROM_170_TO_219: 23,
    FROM_220_TO_299: 25.5,
  },
  'Move-Out Cleaning': {
    UNDER_40: 14.5,
    FROM_40_TO_59: 15,
    FROM_60_TO_79: 16,
    FROM_80_TO_99: 17.5,
    FROM_100_TO_129: 18.5,
    FROM_130_TO_169: 21,
    FROM_170_TO_219: 23,
    FROM_220_TO_299: 25.5,
  },
};

const COUNT_VALUE: Record<string, number> = {
  STUDIO: 1,
  ONE: 1,
  TWO: 2,
  THREE: 3,
  FOUR: 4,
  FIVE_PLUS: 5,
  FOUR_PLUS: 4,
};

export type CleanerHoursResolution =
  | { kind: 'READY'; cleanerHours: number; provenance: string }
  | { kind: 'NEEDS_ATTENTION'; reason: string; provenance: string };

export function resolveApprovedCleanerHours(submission: WebsiteQuoteSubmission): CleanerHoursResolution {
  const service = submission.request.primaryService.canonicalService;
  const floorSize = submission.property.floorSize;

  if (!service) {
    return { kind: 'NEEDS_ATTENTION', reason: 'Primary service is not canonically resolved.', provenance: 'approved-cost-model:v1' };
  }

  if (floorSize === 'FROM_300_UP' && FLOOR_CLEANER_HOURS[service]) {
    return {
      kind: 'NEEDS_ATTENTION',
      reason: 'The Website contract groups 300+ m², while the approved labour matrices require 300–349 m² versus 350+ review.',
      provenance: 'approved-labour-matrix:v1',
    };
  }

  const floorHours = FLOOR_CLEANER_HOURS[service]?.[floorSize];
  if (floorHours !== undefined) {
    return { kind: 'READY', cleanerHours: floorHours, provenance: 'approved-labour-matrix:v1' };
  }

  if (service === 'Bathroom Sanitisation') {
    const count = COUNT_VALUE[submission.property.bathrooms];
    if (!count || submission.property.bathrooms === 'FIVE_PLUS') {
      return { kind: 'NEEDS_ATTENTION', reason: 'Exact bathroom count is required for 5+.', provenance: 'approved-component-workload:v1' };
    }
    return { kind: 'READY', cleanerHours: 6.5 + Math.max(0, count - 1) * 2.5, provenance: 'approved-component-workload:v1' };
  }

  if (service === 'Bedroom Cleaning') {
    const count = COUNT_VALUE[submission.property.bedrooms];
    if (!count || submission.property.bedrooms === 'FIVE_PLUS' || submission.property.bedrooms === 'OTHER') {
      return { kind: 'NEEDS_ATTENTION', reason: 'Exact supported bedroom count is required.', provenance: 'approved-component-workload:v1' };
    }
    return { kind: 'READY', cleanerHours: 5.5 + Math.max(0, count - 1) * 2, provenance: 'approved-component-workload:v1' };
  }

  if (service === 'Living Area Cleaning') {
    const count = COUNT_VALUE[submission.property.livingAreas];
    if (!count || submission.property.livingAreas === 'FOUR_PLUS') {
      return { kind: 'NEEDS_ATTENTION', reason: 'Exact living-area count is required for 4+.', provenance: 'approved-component-workload:v1' };
    }
    return { kind: 'READY', cleanerHours: 5.5 + Math.max(0, count - 1) * 2, provenance: 'approved-component-workload:v1' };
  }

  if (service === 'Interior Window Cleaning') {
    return {
      kind: 'NEEDS_ATTENTION',
      reason: 'The approved workload model requires exact standard/large window quantities.',
      provenance: 'approved-component-workload:v1',
    };
  }

  if (service === 'Kitchen Cleaning') {
    return {
      kind: 'NEEDS_ATTENTION',
      reason: 'The approved workload model requires kitchen size and Standard versus Deep/Detailed scope.',
      provenance: 'approved-component-workload:v1',
    };
  }

  return {
    kind: 'NEEDS_ATTENTION',
    reason: `No approved deterministic cleaner-hour adapter exists for ${service}.`,
    provenance: 'approved-cost-model:v1',
  };
}

export function calculateLabourMinor(cleanerHours: number, coidaRate: number): number {
  if (!Number.isFinite(cleanerHours) || cleanerHours <= 0) throw new Error('cleanerHours must be positive.');
  if (!Number.isFinite(coidaRate) || coidaRate < 0) throw new Error('coidaRate must be a non-negative decimal rate.');

  const wagesMinor = CLEANER_WAGE_MINOR_PER_HOUR * cleanerHours;
  const employerUifMinor = wagesMinor * EMPLOYER_UIF_RATE;
  const coidaMinor = wagesMinor * coidaRate;
  return Math.ceil(wagesMinor + employerUifMinor + coidaMinor);
}

export function calculateConsumablesMinor(service: string, cleanerHours: number): number {
  let fixedMinor = 1_000;
  let rateMinor = 400;

  if (service === 'Regular Home Cleaning') {
    fixedMinor = 1_000;
    rateMinor = 250;
  } else if (service === 'Deep Cleaning') {
    fixedMinor = 1_500;
    rateMinor = 400;
  } else if (service === 'Move-In Cleaning' || service === 'Move-Out Cleaning') {
    fixedMinor = 2_000;
    rateMinor = 450;
  } else if (service === 'Kitchen Cleaning' || service === 'Bathroom Sanitisation') {
    fixedMinor = 1_000;
    rateMinor = 500;
  }

  return Math.ceil(fixedMinor + cleanerHours * rateMinor);
}

export function calculateEquipmentReserveMinor(cleanerHours: number): number {
  return Math.ceil(cleanerHours * EQUIPMENT_RESERVE_MINOR_PER_CLEANER_HOUR);
}

export function calculateOverheadMinor(cleanerHours: number): number {
  return Math.ceil(cleanerHours * OVERHEAD_MINOR_PER_CLEANER_HOUR);
}

export function calculateDeploymentMinor(allocatedRouteKm: number): number {
  if (!Number.isFinite(allocatedRouteKm) || allocatedRouteKm < 0) throw new Error('allocatedRouteKm must be non-negative.');
  return Math.ceil(allocatedRouteKm * DEPLOYMENT_MINOR_PER_ROUTE_KM);
}

export function calculateMinimumContributionMinor(costTotalBeforeContributionMinor: number): number {
  if (!Number.isInteger(costTotalBeforeContributionMinor) || costTotalBeforeContributionMinor < 0) {
    throw new Error('costTotalBeforeContributionMinor must be a non-negative integer amount in ZAR minor units.');
  }
  // A 20% margin on final selling price means final price >= cost / 0.80,
  // equivalent to contribution >= 25% of cost before contribution.
  return Math.max(ABSOLUTE_MINIMUM_CONTRIBUTION_MINOR, Math.ceil(costTotalBeforeContributionMinor / 4));
}
