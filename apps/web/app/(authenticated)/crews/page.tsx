import { createAuthenticatedApi } from '../../../lib/api-server';
import { CrewsManager } from '../../crews/crews-manager';

export default async function CrewsPage() {
  const appUser = await (await createAuthenticatedApi()).currentUser();
  return <><div className="fieldTeamWorkspace"><CrewsManager /></div></>;
}
