import { createAuthenticatedApi } from '../../lib/api-server';
import { AppFrame } from '../components/app-frame';
import { PropertiesManager } from './properties-manager';

export default async function PropertiesPage() {
  const appUser = await (await createAuthenticatedApi()).syncUser();
  return <AppFrame active="/properties" email={appUser.email} user={appUser}><PropertiesManager /></AppFrame>;
}
