export const scopeMismatchResolutions = [
  'NO_CHANGE_REQUIRED',
  'NON_CHARGEABLE_ADJUSTMENT',
  'CHARGEABLE_ADDITIONAL_WORK',
  'DECLINE_ADDITIONAL_WORK',
] as const;
export type ScopeMismatchResolution = typeof scopeMismatchResolutions[number];

export const customerApprovalStatuses = ['NOT_REQUIRED', 'PENDING', 'APPROVED', 'DECLINED'] as const;
export type CustomerApprovalStatus = typeof customerApprovalStatuses[number];

export const customerApprovalMethods = ['PHONE', 'WHATSAPP', 'EMAIL', 'IN_PERSON', 'OTHER'] as const;
export type CustomerApprovalMethod = typeof customerApprovalMethods[number];

export type ScopeMismatchResolutionInput = {
  resolution: ScopeMismatchResolution;
  customerApprovalStatus?: CustomerApprovalStatus;
  customerApprovalMethod?: CustomerApprovalMethod;
  customerApprovedAt?: string;
  proposedAmountMinor?: number;
  capacityReviewed?: boolean;
  note?: string;
};

export function validateScopeMismatchResolution(input: ScopeMismatchResolutionInput) {
  if (!scopeMismatchResolutions.includes(input.resolution)) throw new Error('Choose a valid scope mismatch resolution.');
  const note = input.note?.trim();
  if (note && (note.length < 3 || note.length > 1000)) throw new Error('Resolution note must be between 3 and 1000 characters.');

  const chargeable = input.resolution === 'CHARGEABLE_ADDITIONAL_WORK';
  const approvalStatus: CustomerApprovalStatus = chargeable
    ? (input.customerApprovalStatus ?? 'PENDING')
    : input.resolution === 'DECLINE_ADDITIONAL_WORK'
      ? 'DECLINED'
      : 'NOT_REQUIRED';

  if (chargeable) {
    if (!Number.isInteger(input.proposedAmountMinor) || (input.proposedAmountMinor ?? 0) <= 0) {
      throw new Error('Chargeable additional work requires a positive proposed amount.');
    }
    if (input.capacityReviewed !== true) throw new Error('Capacity must be reviewed before chargeable additional work can be approved.');
    if (!customerApprovalStatuses.includes(approvalStatus)) throw new Error('Choose a valid customer approval status.');
  } else if (input.proposedAmountMinor !== undefined) {
    throw new Error('A proposed amount is only allowed for chargeable additional work.');
  }

  let approvedAt: Date | null = null;
  if (approvalStatus === 'APPROVED') {
    if (!input.customerApprovalMethod || !customerApprovalMethods.includes(input.customerApprovalMethod)) {
      throw new Error('Record how the customer approved the additional work.');
    }
    approvedAt = new Date(input.customerApprovedAt ?? '');
    if (!Number.isFinite(approvedAt.getTime()) || approvedAt.getTime() > Date.now() + 5 * 60_000) {
      throw new Error('Record a valid customer approval time.');
    }
  } else if (input.customerApprovalMethod || input.customerApprovedAt) {
    throw new Error('Customer approval evidence is only allowed when approval is recorded as approved.');
  }

  return {
    resolution: input.resolution,
    customerApprovalStatus: approvalStatus,
    customerApprovalMethod: approvalStatus === 'APPROVED' ? input.customerApprovalMethod! : null,
    customerApprovedAt: approvedAt,
    proposedAmountMinor: chargeable ? input.proposedAmountMinor! : null,
    capacityReviewed: chargeable ? true : input.capacityReviewed === true,
    note: note || null,
    additionalWorkMayBegin: chargeable && approvalStatus === 'APPROVED',
  };
}
