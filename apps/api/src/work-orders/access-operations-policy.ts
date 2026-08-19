import {
  AttentionPriority,
  TemporaryAccessCredentialReviewStatus,
  WorkOrderAccessReadiness,
} from '@prisma/client';

export const ACCESS_HIGH_WINDOW_MS = 24 * 60 * 60 * 1000;
export const ACCESS_CRITICAL_WINDOW_MS = 4 * 60 * 60 * 1000;

export type TemporaryAccessUsabilityMetadata = {
  reviewStatus: TemporaryAccessCredentialReviewStatus;
  validFrom: Date | null;
  expiresAt: Date | null;
  revokedAt: Date | null;
};

export function accessAttentionPriority(
  scheduledAt: Date | null,
  now: Date,
): AttentionPriority {
  if (!scheduledAt) return AttentionPriority.NORMAL;
  const remaining = scheduledAt.getTime() - now.getTime();
  if (remaining < ACCESS_CRITICAL_WINDOW_MS) return AttentionPriority.CRITICAL;
  if (remaining <= ACCESS_HIGH_WINDOW_MS) return AttentionPriority.HIGH;
  return AttentionPriority.NORMAL;
}

export function isTemporaryAccessCredentialUsable(
  credential: TemporaryAccessUsabilityMetadata,
  now: Date,
): boolean {
  return credential.reviewStatus === TemporaryAccessCredentialReviewStatus.ACCEPTED
    && credential.revokedAt === null
    && (credential.validFrom === null || credential.validFrom <= now)
    && (credential.expiresAt === null || credential.expiresAt > now);
}

export function isAccessOperationallyResolved(
  readiness: WorkOrderAccessReadiness,
  credentials: TemporaryAccessUsabilityMetadata[],
  now: Date,
): boolean {
  if (
    readiness === WorkOrderAccessReadiness.NOT_REQUIRED
    || readiness === WorkOrderAccessReadiness.ARRANGED_ANOTHER_WAY
  ) return true;
  if (readiness !== WorkOrderAccessReadiness.RECEIVED) return false;
  return credentials.some((credential) => isTemporaryAccessCredentialUsable(credential, now));
}
