import type { ReactNode } from 'react';
import { AppFrame } from '../components/app-frame';
import { createAuthenticatedApi } from '../../lib/api-server';

export default async function AuthenticatedLayout({ children }: { children: ReactNode }) {
  const user = await (await createAuthenticatedApi()).currentUser();
  return <AppFrame user={user}>{children}</AppFrame>;
}
