import { redirect } from 'next/navigation';
import { createAuthenticatedApi } from '../../lib/api-server';
import { AppFrame } from '../components/app-frame';
import { QuotesManager } from './quotes-manager';

export default async function QuotesPage() {
  const appUser = await (await createAuthenticatedApi()).syncUser();
  if (appUser.role !== 'ADMIN') redirect('/');
  return <AppFrame active="/quotes" email={appUser.email} user={appUser}><QuotesManager /></AppFrame>;
}
