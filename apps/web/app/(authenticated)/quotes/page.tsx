import { redirect } from 'next/navigation';
import { createAuthenticatedApi } from '../../../lib/api-server';
import { QuotesManager } from '../../quotes/quotes-manager';

export default async function QuotesPage() {
  const appUser = await (await createAuthenticatedApi()).currentUser();
  if (appUser.role !== 'ADMIN') redirect('/');
  return <><QuotesManager /></>;
}
