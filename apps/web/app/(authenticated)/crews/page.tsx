import { createAuthenticatedApi } from '../../../lib/api-server';
import { CrewsManager } from '../../crews/crews-manager';

export default async function CrewsPage() {
  const authenticatedApi = await createAuthenticatedApi();
  const [crews, technicians] = await Promise.all([
    authenticatedApi.crews('?page=1&pageSize=100'),
    authenticatedApi.technicians('?page=1&pageSize=100'),
  ]);
  return <><div className="fieldTeamWorkspace"><CrewsManager initialItems={crews.items} initialTechnicians={technicians.items} /></div></>;
}
