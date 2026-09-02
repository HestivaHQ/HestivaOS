import { redirect } from 'next/navigation';
import { createAuthenticatedApi } from '../../../lib/api-server';
import { EmployeesManager } from '../../employees/employees-manager';
import { EmployeeWorkforceLinks } from '../../employees/employee-workforce-links';

export default async function EmployeesPage() {
  const authenticatedApi = await createAuthenticatedApi();
  const appUser = await authenticatedApi.currentUser();
  if (appUser.role !== 'ADMIN') redirect('/');

  return <div className="employeeWorkspace"><EmployeesManager /><EmployeeWorkforceLinks /></div>;
}
