import { createAuthenticatedApi } from '../../../lib/api-server';
import { ServicesCatalogue } from '../../services/services-catalogue';

export default async function ServicesPage() {
  const authenticatedApi = await createAuthenticatedApi();
  const initialItems = (await authenticatedApi.services('?page=1&pageSize=100&status=ACTIVE&search=')).items;
  return <><div className="catalogueWorkspace"><ServicesCatalogue initialItems={initialItems} /></div></>;
}
