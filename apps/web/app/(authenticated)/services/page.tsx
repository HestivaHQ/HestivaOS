import { createAuthenticatedApi } from '../../../lib/api-server';
import { ServicesCatalogue } from '../../services/services-catalogue';

export default async function ServicesPage() {
  const appUser = await (await createAuthenticatedApi()).currentUser();
  return <><div className="catalogueWorkspace"><ServicesCatalogue /></div></>;
}
