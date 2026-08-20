import { redirect } from 'next/navigation';
import { createAuthenticatedApi } from '../../../lib/api-server';
import { AppFrame } from '../../components/app-frame';
import { MessagingManager } from './messaging-manager';

export default async function MessagingPage() {
  const authenticatedApi = await createAuthenticatedApi();
  const user = await authenticatedApi.syncUser();
  if (user.role !== 'ADMIN') redirect('/');
  return <AppFrame active="/management" email={user.email} user={user}><MessagingManager /></AppFrame>;
}
