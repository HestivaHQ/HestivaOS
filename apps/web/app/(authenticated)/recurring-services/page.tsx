import { createAuthenticatedApi } from '../../../lib/api-server';
import { RecurringServicesManager } from '../../recurring-services/recurring-services-manager';

export default async function RecurringServicesPage() {
  const appUser = await (await createAuthenticatedApi()).currentUser();
  return <><div className="recurringServiceWorkspace"><RecurringServicesManager /></div></>;
}
