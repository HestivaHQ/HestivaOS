import { createAuthenticatedApi } from '../../../lib/api-server';
import { ProfileManager } from '../../profile/profile-manager';

export default async function ProfilePage() {
  const appUser = await (await createAuthenticatedApi()).currentUser();
  return <><div className="profileWorkspace"><ProfileManager user={appUser} authenticatedEmail={appUser.email} /></div></>;
}
