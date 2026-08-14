import { createAuthenticatedApi } from '../../lib/api-server';
import { AppFrame } from '../components/app-frame';
import { RecurringServicesManager } from './recurring-services-manager';

export default async function RecurringServicesPage() {
  const appUser = await (await createAuthenticatedApi()).syncUser();
  return <AppFrame active="/recurring-services" email={appUser.email} user={appUser}><RecurringServicesManager /></AppFrame>;
}
