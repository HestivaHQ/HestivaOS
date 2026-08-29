import { createAuthenticatedApi } from '../../../lib/api-server';
import { PropertiesManager } from '../../properties/properties-manager';

export default async function PropertiesPage() {
  const authenticatedApi = await createAuthenticatedApi();
  const [, properties, customers, propertyTypes] = await Promise.all([
    authenticatedApi.currentUser(),
    authenticatedApi.properties('?page=1&pageSize=100'),
    authenticatedApi.customerSelectorOptions(),
    authenticatedApi.activeBusinessLists('PROPERTY_TYPE'),
  ]);
  return <><PropertiesManager initialItems={properties.items} initialCustomers={customers} initialPropertyTypes={propertyTypes} /></>;
}
