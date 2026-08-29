import { createAuthenticatedApi } from '../../../lib/api-server';
import { TechniciansManager } from '../../technicians/technicians-manager';

export default async function TechniciansPage() {
  const appUser = await (await createAuthenticatedApi()).currentUser();
  return <><div className="fieldTeamWorkspace"><TechniciansManager /></div></>;
}
