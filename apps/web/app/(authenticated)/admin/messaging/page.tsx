import { redirect } from 'next/navigation';
import { createAuthenticatedApi } from '../../../../lib/api-server';
import { MessagingManager } from '../../../admin/messaging/messaging-manager';

export default async function MessagingPage() {
  const authenticatedApi = await createAuthenticatedApi();
  const user = await authenticatedApi.currentUser();
  if (user.role !== 'ADMIN') redirect('/');
  return <><div className="v2Workspace"><MessagingManager ownerId={user.id} /></div></>;
}
