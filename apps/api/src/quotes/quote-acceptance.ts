import { BadRequestException, ConflictException } from '@nestjs/common';
import {
  BathroomCount, BedroomCount, EstateClassification, FloorSize, HomeCondition,
  LivingAreaCount, OutdoorArea, PreferredTimeWindow, RecurrenceWeekday, StoreyCount, WorkOrderFrequency,
} from '@prisma/client';
import type { WebsiteQuoteSubmissionV1 } from './website-quote-contract';
import type { WebsiteQuoteSubmissionV2 } from './website-quote-contract-v2';

export type AcceptedSubmission = WebsiteQuoteSubmissionV1 | WebsiteQuoteSubmissionV2;

export type AcceptanceProjection = {
  primaryServiceName: string;
  addOns: Array<{ serviceName: string; quantity: number }>;
  frequency: WorkOrderFrequency;
  homeCondition: HomeCondition;
  scheduledAt: Date;
  description: string | null;
};

export type RecurringAcceptanceProjection = Omit<AcceptanceProjection, 'scheduledAt'> & {
  effectiveDate: Date;
  weekday: RecurrenceWeekday | null;
  dayOfMonth: number | null;
  preferredTimeWindow: PreferredTimeWindow;
  customFrequencyNote: string | null;
};

const propertyTypeLabels: Record<string, string> = {
  APARTMENT: 'Apartment', TOWNHOUSE: 'Townhouse', HOUSE: 'House', DUPLEX: 'Duplex', OTHER: 'Other',
};

export function projectAcceptedOneTimeSubmission(submission: AcceptedSubmission): AcceptanceProjection {
  if (submission.request.frequency !== 'ONE_TIME') throw new ConflictException('Recurring Quote conversion is not implemented.');
  const primaryServiceName = submission.request.primaryService.canonicalService?.trim();
  if (!primaryServiceName) throw new ConflictException('Quote requires a canonical primary Service before acceptance.');
  const addOns = submission.request.addOns.map((item) => ({ serviceName: item.canonicalService.trim(), quantity: item.quantity }));
  if (submission.schemaVersion === '2.0' && submission.request.laundry) {
    const { laundryLoads, ironingLoads } = submission.request.laundry;
    if (laundryLoads !== undefined) addOns.push({ serviceName: 'Laundry', quantity: laundryLoads });
    if (ironingLoads !== undefined) addOns.push({ serviceName: 'Ironing', quantity: ironingLoads });
  }
  if (addOns.some((item) => !item.serviceName || !Number.isInteger(item.quantity) || item.quantity < 1)) {
    throw new ConflictException('Quote contains an invalid operational add-on selection.');
  }
  const duplicate = addOns.find((item, index) => addOns.findIndex((other) => other.serviceName.toLocaleLowerCase('en-ZA') === item.serviceName.toLocaleLowerCase('en-ZA')) !== index);
  if (duplicate) throw new ConflictException(`Quote contains duplicate ${duplicate.serviceName} add-on selections.`);
  const scheduledAt = new Date(`${submission.visit.preferredDate}T00:00:00+02:00`);
  if (Number.isNaN(scheduledAt.getTime())) throw new ConflictException('Quote preferred service date is invalid.');
  const instructions = [submission.notes.attentionAreas, submission.notes.renovationDust, submission.notes.applianceNotes, submission.notes.additionalNotes]
    .map((value) => value?.trim()).filter(Boolean);
  return {
    primaryServiceName,
    addOns,
    frequency: WorkOrderFrequency.ONE_TIME,
    homeCondition: submission.request.homeCondition as HomeCondition,
    scheduledAt,
    description: instructions.length ? instructions.join('\n') : null,
  };
}

export function projectAcceptedRecurringSubmission(submission: AcceptedSubmission): RecurringAcceptanceProjection {
  if (submission.request.frequency === 'ONE_TIME') throw new ConflictException('ONE_TIME Quotes require the one-time conversion path.');
  const frequency = submission.request.frequency;
  if (!([WorkOrderFrequency.WEEKLY, WorkOrderFrequency.EVERY_TWO_WEEKS, WorkOrderFrequency.MONTHLY, WorkOrderFrequency.CUSTOM] as string[]).includes(frequency)) {
    throw new ConflictException('Quote recurring frequency is not supported.');
  }
  const oneTimeShape = projectAcceptedOneTimeSubmission({ ...submission, request: { ...submission.request, frequency: 'ONE_TIME' } } as AcceptedSubmission);
  const effectiveDate = new Date(`${submission.visit.preferredDate}T00:00:00.000Z`);
  if (Number.isNaN(effectiveDate.valueOf()) || effectiveDate.toISOString().slice(0, 10) !== submission.visit.preferredDate) throw new ConflictException('Quote preferred service date is invalid.');
  const weekdays: RecurrenceWeekday[] = [RecurrenceWeekday.SUNDAY, RecurrenceWeekday.MONDAY, RecurrenceWeekday.TUESDAY, RecurrenceWeekday.WEDNESDAY, RecurrenceWeekday.THURSDAY, RecurrenceWeekday.FRIDAY, RecurrenceWeekday.SATURDAY];
  const customFrequencyNote = submission.request.customFrequencyNote?.trim() || null;
  if (frequency === WorkOrderFrequency.CUSTOM && !customFrequencyNote) throw new ConflictException('CUSTOM frequency requires a descriptive note.');
  return {
    ...oneTimeShape,
    frequency,
    effectiveDate,
    weekday: frequency === WorkOrderFrequency.WEEKLY || frequency === WorkOrderFrequency.EVERY_TWO_WEEKS ? weekdays[effectiveDate.getUTCDay()] : null,
    dayOfMonth: frequency === WorkOrderFrequency.MONTHLY ? effectiveDate.getUTCDate() : null,
    preferredTimeWindow: submission.visit.preferredTime as PreferredTimeWindow,
    customFrequencyNote,
  };
}

export function newCustomerData(submission: AcceptedSubmission, ownerId: string) {
  const contactName = submission.customer.fullName.trim();
  if (!contactName) throw new BadRequestException('Quote Customer name is required.');
  return {
    ownerId,
    name: contactName,
    contactName,
    email: submission.customer.email.trim().toLowerCase() || null,
    phone: submission.customer.mobile.trim() || null,
  };
}

export function newPropertyData(submission: AcceptedSubmission, customerId: string, propertyTypeOptionId: string) {
  const property = submission.property;
  if (!property.addressLine1.trim() || !property.suburb.trim()) throw new BadRequestException('Quote Property address and suburb are required.');
  return {
    customerId,
    name: `${property.addressLine1.trim()}, ${property.suburb.trim()}`,
    addressLine1: property.addressLine1.trim(),
    city: property.suburb.trim(),
    postalCode: property.postalCode?.trim() || null,
    country: property.country,
    propertyTypeOptionId,
    bedrooms: property.bedrooms as BedroomCount,
    bathrooms: property.bathrooms as BathroomCount,
    livingAreas: property.livingAreas as LivingAreaCount,
    storeys: property.storeys as StoreyCount | undefined,
    floorSize: property.floorSize as FloorSize,
    outdoorArea: property.outdoorArea as OutdoorArea,
    estateClassification: property.estateClassification as EstateClassification,
    hasPets: submission.household.hasPets,
    petNotes: [submission.household.petType, submission.household.petTemperament].filter(Boolean).join(' — ') || null,
    offLimitsNotes: submission.safety.offLimitsAreas?.trim() || null,
    fragileItemNotes: submission.safety.fragileItems?.trim() || null,
    productRestrictionNotes: submission.safety.productRestrictions?.trim() || null,
    allergyNotes: submission.safety.allergiesOrSensitivities?.trim() || null,
  };
}

export function propertyTypeLabel(submission: AcceptedSubmission) {
  return propertyTypeLabels[submission.property.propertyType];
}
