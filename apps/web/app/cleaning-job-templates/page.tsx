import { createAuthenticatedApi } from '../../lib/api-server';
import { AppFrame } from '../components/app-frame';
import { CleaningJobTemplatesManager } from './cleaning-job-templates-manager';

export default async function CleaningJobTemplatesPage() {
  const appUser = await (await createAuthenticatedApi()).syncUser();
  return <AppFrame active="/cleaning-job-templates" email={appUser.email} user={appUser}><div className="templateWorkspace"><CleaningJobTemplatesManager /></div></AppFrame>;
}
