import { redirect } from 'next/navigation';
import { createAuthenticatedApi } from '../../lib/api-server';
import { AppFrame } from '../components/app-frame';
import { EmployeesManager } from './employees-manager';
export default async function EmployeesPage() {
  const authenticatedApi = await createAuthenticatedApi(); const appUser = await authenticatedApi.syncUser(); if (appUser.role !== 'ADMIN') redirect('/');
  return <AppFrame active="/employees" email={appUser.email} user={appUser}><EmployeesManager /></AppFrame>;
}
