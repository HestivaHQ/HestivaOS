import { createAuthenticatedApi } from '../../lib/api-server';
import { AppFrame } from '../components/app-frame';
import { CrewsManager } from './crews-manager';

export default async function CrewsPage() {
  const appUser = await (await createAuthenticatedApi()).syncUser();
  return <AppFrame active="/crews" email={appUser.email} user={appUser}><CrewsManager /></AppFrame>;
}
