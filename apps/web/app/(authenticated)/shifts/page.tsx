import { createAuthenticatedApi } from '../../../lib/api-server';
import { ShiftsManager } from '../../shifts/shifts-manager';

export default async function ShiftsPage() {
  const appUser = await (await createAuthenticatedApi()).currentUser();
  return <><div className="shiftWorkspace"><ShiftsManager /></div></>;
}
