import { createAuthenticatedApi } from '../../lib/api-server';
import { AppFrame } from '../components/app-frame';
import { ProfileManager } from './profile-manager';

export default async function ProfilePage() {
  const appUser = await (await createAuthenticatedApi()).syncUser();
  return <AppFrame active="/profile" email={appUser.email} user={appUser}><ProfileManager user={appUser} authenticatedEmail={appUser.email} /></AppFrame>;
}
