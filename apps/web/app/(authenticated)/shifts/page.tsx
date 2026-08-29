import { createAuthenticatedApi } from '../../../lib/api-server';
import { defaultShiftDateRange, shiftRangeQuery } from '../../../lib/shift-date-range';
import { ShiftsManager } from '../../shifts/shifts-manager';

export default async function ShiftsPage() {
  const authenticatedApi = await createAuthenticatedApi();
  const initialRange = defaultShiftDateRange();
  const [, shifts] = await Promise.all([
    authenticatedApi.currentUser(),
    authenticatedApi.shifts(shiftRangeQuery(initialRange)),
  ]);
  return <div className="shiftWorkspace"><ShiftsManager initialItems={shifts.items} initialRange={initialRange} /></div>;
}
