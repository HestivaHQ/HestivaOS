export function accountInitials(user, email) {
  return (user?.displayName || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || email)
    .split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}
export function canAccessAdminSettings(role) { return role === 'ADMIN'; }
export function canSeeAdminSettings(user) { return Boolean(user && canAccessAdminSettings(user.role)); }
