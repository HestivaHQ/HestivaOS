import { createAuthenticatedApi } from '../../../lib/api-server';
import { PropertiesManager } from '../../properties/properties-manager';

export default async function PropertiesPage() {
  const appUser = await (await createAuthenticatedApi()).currentUser();
  return <><PropertiesManager /></>;
}
