export const LAUNDRY_ELIGIBLE_PRIMARY_SERVICES = [
  'Regular Home Cleaning',
  'Deep Cleaning',
] as const;

export const LAUNDRY_PRICE_MINOR = {
  WASH_DRY_FOLD: 17_500,
  WASH_HANG: 12_500,
  IRONING: 15_000,
} as const;

export type LaundryFacilities = 'WASHER_DRYER' | 'WASHER_LINE' | 'NO_WASHER';
export type LaundryOutcome = 'WASH_DRY_FOLD' | 'WASH_HANG';

export type LaundryRequest = {
  primaryService: string | null;
  facilities?: LaundryFacilities;
  laundryLoads?: number;
  ironingLoads?: number;
};

export type LaundryRequestError = {
  path: 'primaryService' | 'facilities' | 'laundryLoads' | 'ironingLoads';
  code:
    | 'INELIGIBLE_PRIMARY_SERVICE'
    | 'FACILITIES_REQUIRED'
    | 'NO_WASHER'
    | 'INVALID_LOAD_QUANTITY';
  message: string;
};

export type ResolvedLaundryRequest = {
  outcome?: LaundryOutcome;
  laundryLoads: number;
  ironingLoads: number;
  laundryUnitAmountMinor?: number;
  ironingUnitAmountMinor?: number;
  requestedLaundryAmountMinor: number;
  requestedIroningAmountMinor: number;
};

export function isLaundryEligiblePrimary(primaryService: string | null): boolean {
  return LAUNDRY_ELIGIBLE_PRIMARY_SERVICES.includes(
    primaryService as (typeof LAUNDRY_ELIGIBLE_PRIMARY_SERVICES)[number],
  );
}

function validLoadQuantity(value: number | undefined): value is number {
  return Number.isInteger(value) && (value as number) >= 1;
}

export function resolveLaundryRequest(request: LaundryRequest): {
  errors: LaundryRequestError[];
  resolved: ResolvedLaundryRequest;
} {
  const errors: LaundryRequestError[] = [];
  const wantsLaundry = request.laundryLoads !== undefined;
  const wantsIroning = request.ironingLoads !== undefined;

  if ((wantsLaundry || wantsIroning) && !isLaundryEligiblePrimary(request.primaryService)) {
    errors.push({
      path: 'primaryService',
      code: 'INELIGIBLE_PRIMARY_SERVICE',
      message: 'Laundry and ironing require Regular Home Cleaning or Deep Cleaning.',
    });
  }

  if (wantsLaundry && !request.facilities) {
    errors.push({
      path: 'facilities',
      code: 'FACILITIES_REQUIRED',
      message: 'Laundry facilities are required when laundry is requested.',
    });
  }

  if (wantsLaundry && request.facilities === 'NO_WASHER') {
    errors.push({
      path: 'facilities',
      code: 'NO_WASHER',
      message: 'Laundry is unavailable without a working washing machine at the property.',
    });
  }

  if (wantsLaundry && !validLoadQuantity(request.laundryLoads)) {
    errors.push({
      path: 'laundryLoads',
      code: 'INVALID_LOAD_QUANTITY',
      message: 'Laundry load quantity must be a positive integer.',
    });
  }

  if (wantsIroning && !validLoadQuantity(request.ironingLoads)) {
    errors.push({
      path: 'ironingLoads',
      code: 'INVALID_LOAD_QUANTITY',
      message: 'Ironing load quantity must be a positive integer.',
    });
  }

  let outcome: LaundryOutcome | undefined;
  let laundryUnitAmountMinor: number | undefined;
  if (wantsLaundry && request.facilities === 'WASHER_DRYER') {
    outcome = 'WASH_DRY_FOLD';
    laundryUnitAmountMinor = LAUNDRY_PRICE_MINOR.WASH_DRY_FOLD;
  } else if (wantsLaundry && request.facilities === 'WASHER_LINE') {
    outcome = 'WASH_HANG';
    laundryUnitAmountMinor = LAUNDRY_PRICE_MINOR.WASH_HANG;
  }

  const laundryLoads = validLoadQuantity(request.laundryLoads) ? request.laundryLoads : 0;
  const ironingLoads = validLoadQuantity(request.ironingLoads) ? request.ironingLoads : 0;

  return {
    errors,
    resolved: {
      outcome,
      laundryLoads,
      ironingLoads,
      laundryUnitAmountMinor,
      ironingUnitAmountMinor: wantsIroning ? LAUNDRY_PRICE_MINOR.IRONING : undefined,
      requestedLaundryAmountMinor: laundryUnitAmountMinor ? laundryUnitAmountMinor * laundryLoads : 0,
      requestedIroningAmountMinor: wantsIroning ? LAUNDRY_PRICE_MINOR.IRONING * ironingLoads : 0,
    },
  };
}
