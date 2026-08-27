import { createAuthenticatedApi } from '../../lib/api-server';
import { AppFrame } from '../components/app-frame';
import { ShiftsManager } from './shifts-manager';

export default async function ShiftsPage() {
  const appUser = await (await createAuthenticatedApi()).syncUser();
  return <AppFrame active="/shifts" email={appUser.email} user={appUser}><div className="shiftWorkspace"><ShiftsManager /></div></AppFrame>;
}
