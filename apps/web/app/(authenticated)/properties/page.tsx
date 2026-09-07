import { createAuthenticatedApi } from '../../../lib/api-server';
import { PropertiesManager } from '../../properties/properties-manager';

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; customerId?: string }>;
}) {
  const authenticatedApi = await createAuthenticatedApi();
  const params = await searchParams;
  const preselectedCustomerId = params.mode === 'create' ? params.customerId?.trim() : undefined;

  const [, properties, customers, preselectedCustomers, propertyTypes] = await Promise.all([
    authenticatedApi.currentUser(),
    authenticatedApi.properties('?page=1&pageSize=100'),
    authenticatedApi.customerSelectorOptions(),
    preselectedCustomerId ? authenticatedApi.customerSelectorOptions(preselectedCustomerId) : Promise.resolve([]),
    authenticatedApi.activeBusinessLists('PROPERTY_TYPE'),
  ]);

  const customerOptions = [...customers];
  for (const customer of preselectedCustomers) {
    if (!customerOptions.some((item) => item.id === customer.id)) customerOptions.push(customer);
  }

  return <><PropertiesManager initialItems={properties.items} initialCustomers={customerOptions} initialPropertyTypes={propertyTypes} /></>;
}
