import { redirect } from 'next/navigation';
import { createAuthenticatedApi } from '../../../lib/api-server';
import { QuotesManager } from '../../quotes/quotes-manager';

export default async function QuotesPage() {
  const authenticatedApi = await createAuthenticatedApi();
  const appUser = await authenticatedApi.currentUser();
  if (appUser.role !== 'ADMIN') redirect('/');
  const quotes = await authenticatedApi.quotes('?pageSize=100');
  return <QuotesManager initialItems={quotes.items} />;
}
