const rawApiUrl = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const API_URL = rawApiUrl.trim().replace(/\/+$/, '').replace(/\/api\/v1$/, '');

export type PaginatedResponse<T> = { items: T[]; total: number; page: number; pageSize: number };
export type AppUser = { id: string; authUserId: string; email: string; firstName: string; lastName: string };
export type Customer = { id: string; ownerId: string; name: string; contactName: string | null; email: string | null; phone: string | null; notes?: string | null; status: 'ACTIVE' | 'INACTIVE' };
export type Property = { id: string; name: string; addressLine1: string; addressLine2?: string | null; city: string; province?: string | null; postalCode?: string | null; country: string; accessNotes?: string | null; customerId: string; customer?: Customer };
export type Technician = { id: string; firstName: string; lastName: string; email: string | null; phone: string | null; skills: string[]; notes: string | null; status: 'ACTIVE' | 'INACTIVE' };
export type WorkOrderStatus = 'NEW' | 'ASSIGNED' | 'ACCEPTED' | 'TRAVELLING' | 'ON_SITE' | 'WAITING_FOR_PARTS' | 'COMPLETED' | 'CLOSED' | 'CANCELLED';
export type WorkOrder = { id: string; customerId: string; propertyId: string; createdById: string; technicianId: string | null; title: string; description?: string | null; status: WorkOrderStatus; priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'; scheduledAt: string | null; completedAt?: string | null; createdAt: string; customer: Customer; property: Property; technician: Technician | null };
export type WorkOrderActivity = { id: string; type: 'WORK_ORDER_CREATED' | 'STATUS_CHANGED' | 'TECHNICIAN_ASSIGNED' | 'TECHNICIAN_CHANGED' | 'TECHNICIAN_REMOVED' | 'WORK_ORDER_CLOSED' | 'WORK_ORDER_CANCELLED'; previousStatus: WorkOrderStatus | null; newStatus: WorkOrderStatus | null; note: string | null; actor: AppUser | null; createdAt: string };
export type DashboardOverview = {
  totals: { customers: number; properties: number; openWorkOrders: number; completedWorkOrders: number };
  recentWorkOrders: WorkOrder[];
  statusBreakdown: Record<WorkOrderStatus, number>;
};

export type CustomerInput = { ownerId: string; name: string; contactName?: string; email?: string; phone?: string; notes?: string; status?: Customer['status'] };
export type PropertyInput = { customerId: string; name: string; addressLine1: string; addressLine2?: string; city: string; province?: string; postalCode?: string; country?: string; accessNotes?: string };
export type TechnicianInput = { firstName: string; lastName: string; email?: string; phone?: string; skills?: string[]; notes?: string; status?: Technician['status'] };
export type WorkOrderInput = { customerId: string; propertyId: string; createdById: string; technicianId?: string | null; title: string; description?: string; status?: WorkOrder['status']; priority?: WorkOrder['priority']; scheduledAt?: string; completedAt?: string };

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}/api/v1${path}`, {
    cache: 'no-store',
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!response.ok) {
    const result = await response.json().catch(() => null) as { message?: string } | null;
    throw new Error(result?.message ?? `API request failed with status ${response.status}`);
  }
  return response.json() as Promise<T>;
}

const json = (value: unknown): RequestInit => ({ body: JSON.stringify(value) });

export const api = {
  syncUser: (input: { authUserId: string; email: string; firstName?: string; lastName?: string }) => apiFetch<AppUser>('/users/sync', { method: 'POST', ...json(input) }),
  dashboard: () => apiFetch<DashboardOverview>('/dashboard'),
  customers: (query = '') => apiFetch<PaginatedResponse<Customer>>(`/customers${query}`),
  createCustomer: (input: CustomerInput) => apiFetch<Customer>('/customers', { method: 'POST', ...json(input) }),
  updateCustomer: (id: string, input: Partial<Omit<CustomerInput, 'ownerId'>>) => apiFetch<Customer>(`/customers/${id}`, { method: 'PATCH', ...json(input) }),
  deleteCustomer: (id: string) => apiFetch<Customer>(`/customers/${id}`, { method: 'DELETE' }),
  properties: (query = '') => apiFetch<PaginatedResponse<Property>>(`/properties${query}`),
  createProperty: (input: PropertyInput) => apiFetch<Property>('/properties', { method: 'POST', ...json(input) }),
  updateProperty: (id: string, input: Partial<PropertyInput>) => apiFetch<Property>(`/properties/${id}`, { method: 'PATCH', ...json(input) }),
  deleteProperty: (id: string) => apiFetch<Property>(`/properties/${id}`, { method: 'DELETE' }),
  technicians: (query = '') => apiFetch<PaginatedResponse<Technician>>(`/technicians${query}`),
  createTechnician: (input: TechnicianInput) => apiFetch<Technician>('/technicians', { method: 'POST', ...json(input) }),
  updateTechnician: (id: string, input: Partial<TechnicianInput>) => apiFetch<Technician>(`/technicians/${id}`, { method: 'PATCH', ...json(input) }),
  deleteTechnician: (id: string) => apiFetch<Technician>(`/technicians/${id}`, { method: 'DELETE' }),
  workOrders: (query = '') => apiFetch<PaginatedResponse<WorkOrder>>(`/work-orders${query}`),
  createWorkOrder: (input: WorkOrderInput) => apiFetch<WorkOrder>('/work-orders', { method: 'POST', ...json(input) }),
  updateWorkOrder: (id: string, input: Partial<Omit<WorkOrderInput, 'createdById'>>) => apiFetch<WorkOrder>(`/work-orders/${id}`, { method: 'PATCH', ...json(input) }),
  changeWorkOrderStatus: (id: string, input: { status: WorkOrderStatus; note?: string; actorId?: string }) => apiFetch<WorkOrder>(`/work-orders/${id}/status`, { method: 'PATCH', ...json(input) }),
  workOrderTimeline: (id: string) => apiFetch<WorkOrderActivity[]>(`/work-orders/${id}/timeline`),
  deleteWorkOrder: (id: string) => apiFetch<WorkOrder>(`/work-orders/${id}`, { method: 'DELETE' }),
};
