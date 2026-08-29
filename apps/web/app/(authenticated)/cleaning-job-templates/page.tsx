import { createAuthenticatedApi } from '../../../lib/api-server';
import { CleaningJobTemplatesManager } from '../../cleaning-job-templates/cleaning-job-templates-manager';

export default async function CleaningJobTemplatesPage() {
  const appUser = await (await createAuthenticatedApi()).currentUser();
  return <><div className="templateWorkspace"><CleaningJobTemplatesManager /></div></>;
}
