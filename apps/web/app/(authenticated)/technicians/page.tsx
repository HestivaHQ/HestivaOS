import { createAuthenticatedApi } from '../../../lib/api-server';
import { TechniciansManager } from '../../technicians/technicians-manager';

export default async function TechniciansPage() {
  const authenticatedApi = await createAuthenticatedApi();
  const initialItems = (await authenticatedApi.technicians('?page=1&pageSize=100')).items;
  return <><div className="fieldTeamWorkspace"><TechniciansManager initialItems={initialItems} /></div></>;
}
