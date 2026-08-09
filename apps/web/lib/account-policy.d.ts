import type { AppUser } from './api';
export function accountInitials(user: AppUser | undefined, email: string): string;
export function canAccessAdminSettings(role: AppUser['role']): boolean;
export function canSeeAdminSettings(user: AppUser | undefined): boolean;
