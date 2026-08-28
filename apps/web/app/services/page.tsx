import { createAuthenticatedApi } from '../../lib/api-server';
import { AppFrame } from '../components/app-frame';
import { ServicesCatalogue } from './services-catalogue';

export default async function ServicesPage() {
  const appUser = await (await createAuthenticatedApi()).syncUser();
  return <AppFrame active="/services" email={appUser.email} user={appUser}><div className="catalogueWorkspace"><ServicesCatalogue /></div></AppFrame>;
}
