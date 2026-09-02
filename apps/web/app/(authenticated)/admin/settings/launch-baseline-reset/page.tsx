import { redirect } from 'next/navigation';
import { createAuthenticatedApi } from '../../../../../lib/api-server';
import { canAccessAdminSettings } from '../../../../../lib/account-policy';
import { LaunchBaselineResetManager } from '../../../../admin/settings/launch-baseline-reset/launch-baseline-reset-manager';

export default async function LaunchBaselineResetPage() {
  const appUser = await (await createAuthenticatedApi()).currentUser();
  if (!canAccessAdminSettings(appUser.role)) redirect('/');
  return <LaunchBaselineResetManager />;
}
