import type { QuotePricingSubmission } from './quote-operational-cost-source';

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

export function resolveApprovedCleanerHours(submission: QuotePricingSubmission): CleanerHoursResolution {
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
      return { kind: 'NEEDS_ATTENTION', reason: 'Exact bedroom count is required for 5+ or other bedroom layouts.', provenance: 'approved-component-workload:v1' };
    }
    return { kind: 'READY', cleanerHours: 4 + Math.max(0, count - 1) * 1.5, provenance: 'approved-component-workload:v1' };
  }

  if (service === 'Living Area Cleaning') {
    const count = COUNT_VALUE[submission.property.livingAreas];
    if (!count || submission.property.livingAreas === 'FOUR_PLUS') {
      return { kind: 'NEEDS_ATTENTION', reason: 'Exact living-area count is required for 4+.', provenance: 'approved-component-workload:v1' };
    }
    return { kind: 'READY', cleanerHours: 4 + Math.max(0, count - 1) * 1.5, provenance: 'approved-component-workload:v1' };
  }

  if (service === 'Kitchen Cleaning') {
    return { kind: 'READY', cleanerHours: 7, provenance: 'approved-component-workload:v1' };
  }

  if (service === 'Interior Window Cleaning') {
    return { kind: 'NEEDS_ATTENTION', reason: 'Window pane or window count is not captured by the current quote contract.', provenance: 'approved-component-workload:v1' };
  }

  if (service === 'Laundry Folding') {
    return { kind: 'NEEDS_ATTENTION', reason: 'Laundry workload must be resolved by the laundry operating model.', provenance: 'approved-component-workload:v1' };
  }

  return { kind: 'NEEDS_ATTENTION', reason: 'No approved cleaner-hours model is available for this service.', provenance: 'approved-cost-model:v1' };
}

export function calculateLabourMinor(cleanerHours: number, coidaRate: number): number {
  return Math.round(CLEANER_WAGE_MINOR_PER_HOUR * cleanerHours * (1 + EMPLOYER_UIF_RATE + coidaRate));
}

export function calculateDeploymentMinor(allocatedRouteKm: number): number {
  return Math.round(allocatedRouteKm * DEPLOYMENT_MINOR_PER_ROUTE_KM);
}

export function calculateConsumablesMinor(serviceName: string, cleanerHours: number): number {
  const rate = serviceName === 'Deep Cleaning' || serviceName === 'Move-In Cleaning' || serviceName === 'Move-Out Cleaning' ? 175 : 125;
  return Math.round(cleanerHours * rate);
}

export function calculateEquipmentReserveMinor(cleanerHours: number): number {
  return Math.round(cleanerHours * EQUIPMENT_RESERVE_MINOR_PER_CLEANER_HOUR);
}

export function calculateOverheadMinor(cleanerHours: number): number {
  return Math.round(cleanerHours * OVERHEAD_MINOR_PER_CLEANER_HOUR);
}

export function calculateMinimumContributionMinor(costTotalMinor: number): number {
  const percentageContribution = Math.ceil(costTotalMinor / 4);
  return Math.max(ABSOLUTE_MINIMUM_CONTRIBUTION_MINOR, percentageContribution);
}
