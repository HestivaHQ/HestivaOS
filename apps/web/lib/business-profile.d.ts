import { BusinessProfile } from './api';
export const CORE_BUSINESS_PROFILE_FIELDS: ReadonlyArray<keyof BusinessProfile>;
export function businessProfileCompleteness(profile: Partial<BusinessProfile>): number;
export function formatBusinessProfile(profile: Partial<BusinessProfile>): string;
