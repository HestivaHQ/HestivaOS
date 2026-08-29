import { createAuthenticatedApi } from '../../../lib/api-server';
import { RecurringServicesManager } from '../../recurring-services/recurring-services-manager';

export default async function RecurringServicesPage() {
  const authenticatedApi = await createAuthenticatedApi();
  const [, agreements] = await Promise.all([
    authenticatedApi.currentUser(),
    authenticatedApi.recurringServices(),
  ]);
  return <div className="recurringServiceWorkspace"><RecurringServicesManager initialItems={agreements} /></div>;
}
