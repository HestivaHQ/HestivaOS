import { WorkOrderStatus } from '@prisma/client';
import { UpdateWorkOrderInput } from './work-orders.service';

export type MaterialChangeStage = 'PENDING' | 'FUTURE' | 'IMMINENT' | 'IN_PROGRESS' | 'HISTORICAL';

export type MaterialChangeField =
  | 'customerId'
  | 'propertyId'
  | 'serviceId'
  | 'addOns'
  | 'frequency'
  | 'homeCondition'
  | 'scheduledAt'
  | 'completedAt'
  | 'cancellation';

export type MaterialChangeConsequences = {
  schedulingReview: boolean;
  staffingReview: boolean;
  pricingReview: boolean;
  executionScopeReview: boolean;
  customerCorrespondenceEligible: boolean;
  financialReviewBoundary: boolean;
};

export type MaterialChangeAssessment = {
  stage: MaterialChangeStage;
  materialFields: MaterialChangeField[];
  allowed: boolean;
  overrideReasonRequired: boolean;
  blockedReason: string | null;
  consequences: MaterialChangeConsequences;
};

export function materialChangeStage(status: WorkOrderStatus): MaterialChangeStage {
  if (status === WorkOrderStatus.NEW) return 'PENDING';
  if (status === WorkOrderStatus.ASSIGNED) return 'FUTURE';
  if (status === WorkOrderStatus.ACCEPTED || status === WorkOrderStatus.TRAVELLING) return 'IMMINENT';
  if (status === WorkOrderStatus.ON_SITE || status === WorkOrderStatus.WAITING_FOR_PARTS) return 'IN_PROGRESS';
  return 'HISTORICAL';
}

export function materialFieldsFromUpdate(input: UpdateWorkOrderInput): MaterialChangeField[] {
  const fields: MaterialChangeField[] = [];
  if (input.customerId !== undefined) fields.push('customerId');
  if (input.propertyId !== undefined) fields.push('propertyId');
  if (input.serviceId !== undefined) fields.push('serviceId');
  if (input.addOns !== undefined || input.addOnIds !== undefined) fields.push('addOns');
  if (input.frequency !== undefined || input.customFrequencyNote !== undefined) fields.push('frequency');
  if (input.homeCondition !== undefined) fields.push('homeCondition');
  if (input.scheduledAt !== undefined) fields.push('scheduledAt');
  if (input.completedAt !== undefined) fields.push('completedAt');
  if (input.status === WorkOrderStatus.CANCELLED) fields.push('cancellation');
  return fields;
}

export function assessMaterialChange(status: WorkOrderStatus, input: UpdateWorkOrderInput): MaterialChangeAssessment {
  const stage = materialChangeStage(status);
  const materialFields = materialFieldsFromUpdate(input);
  const has = (field: MaterialChangeField) => materialFields.includes(field);
  const scopeChanged = has('serviceId') || has('addOns') || has('frequency') || has('homeCondition');
  const schedulingChanged = has('scheduledAt') || has('propertyId') || has('customerId') || has('cancellation');

  const consequences: MaterialChangeConsequences = {
    schedulingReview: schedulingChanged || scopeChanged,
    staffingReview: schedulingChanged || scopeChanged,
    pricingReview: scopeChanged,
    executionScopeReview: scopeChanged || has('propertyId'),
    customerCorrespondenceEligible: materialFields.length > 0,
    financialReviewBoundary: scopeChanged || has('cancellation'),
  };

  if (!materialFields.length) {
    return { stage, materialFields, allowed: true, overrideReasonRequired: false, blockedReason: null, consequences };
  }

  if (has('completedAt')) {
    return {
      stage,
      materialFields,
      allowed: false,
      overrideReasonRequired: false,
      blockedReason: 'Completion timestamps are authoritative execution history and cannot be edited through a booking change.',
      consequences,
    };
  }

  if (stage === 'IN_PROGRESS') {
    return {
      stage,
      materialFields,
      allowed: false,
      overrideReasonRequired: false,
      blockedReason: 'The job is already in progress. Preserve the booked scope and use the in-service scope-difference workflow.',
      consequences,
    };
  }

  if (stage === 'HISTORICAL') {
    return {
      stage,
      materialFields,
      allowed: false,
      overrideReasonRequired: false,
      blockedReason: 'Completed, closed, or cancelled Work Orders are historical operational truth and cannot be materially rewritten.',
      consequences,
    };
  }

  return {
    stage,
    materialFields,
    allowed: true,
    overrideReasonRequired: stage === 'IMMINENT',
    blockedReason: null,
    consequences,
  };
}
