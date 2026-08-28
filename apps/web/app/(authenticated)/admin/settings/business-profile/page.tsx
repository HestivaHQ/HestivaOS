import { redirect } from 'next/navigation';
import { createAuthenticatedApi } from '../../../../../lib/api-server';
import { canAccessAdminSettings } from '../../../../../lib/account-policy';
import { BusinessProfileManager } from '../../../../admin/settings/business-profile/business-profile-manager';

export default async function BusinessProfilePage() {
  const authenticatedApi = await createAuthenticatedApi();
  const appUser = await authenticatedApi.currentUser();
  if (!canAccessAdminSettings(appUser.role)) redirect('/');
  const profile = await authenticatedApi.businessProfile();
  return <><div className="businessProfileWorkspace"><BusinessProfileManager initialProfile={profile} /></div></>;
}
