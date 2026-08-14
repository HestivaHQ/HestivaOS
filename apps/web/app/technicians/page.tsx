import { createAuthenticatedApi } from '../../lib/api-server';
import { AppFrame } from '../components/app-frame';
import { TechniciansManager } from './technicians-manager';

export default async function TechniciansPage() {
  const appUser = await (await createAuthenticatedApi()).syncUser();
  return <AppFrame active="/technicians" email={appUser.email} user={appUser}><TechniciansManager /></AppFrame>;
}
