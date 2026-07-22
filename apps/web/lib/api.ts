const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

export type AppUser = {
  id: string;
  authUserId: string;
  email: string;
  firstName: string;
  lastName: string;
};

export type Customer = {
  id: string;
  ownerId: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  notes?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
};

export type Property = {
  id: string;
  name: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  province?: string | null;
  postalCode?: string | null;
  country: string;
  accessNotes?: string | null;
  customerId: string;
  customer?: Customer;
};

export type WorkOrder = {
  id: string;
  customerId: string;
  propertyId: string;
  createdById: string;
  title: string;
  description?: string | null;
  status: 'DRAFT' | 'OPEN' | 'SCHEDULED' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  scheduledAt: string | null;
  completedAt?: string | null;
  customer: Customer;
  property: Property;
};

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}/api/v1${path}`, {
    cache: 'no-store',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string } | null;
    throw new Error(body?.message ?? `API request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

const body = (value: unknown): RequestInit => ({ body: JSON.stringify(value) });

export const api = {
  syncUser: (input: { authUserId: string; email: string; firstName?: string; lastName?: string }) =>
    apiFetch<AppUser>('/users/sync', { method: 'POST', ...body(input) }),

  customers: (query = '') => apiFetch<PaginatedResponse<Customer>>(`/customers${query}`),
  createCustomer: (input: Omit<Customer, 'id'>) => apiFetch<Customer>('/customers', { method: 'POST', ...body(input) }),
  updateCustomer: (id: string, input: Partial<Omit<Customer, 'id' | 'ownerId'>>) => apiFetch<Customer>(`/customers/${id}`, { method: 'PATCH', ...body(input) }),
  deleteCustomer: (id: string) => apiFetch<Customer>(`/customers/${id}`, { method: 'DELETE' }),

  properties: (query = '') => apiFetch<PaginatedResponse<Property>>(`/properties${query}`),
  createProperty: (input: Omit<Property, 'id' | 'customer'>) => apiFetch<Property>('/properties', { method: 'POST', ...body(input) }),
  updateProperty: (id: string, input: Partial<Omit<Property, 'id' | 'customer'>>) => apiFetch<Property>(`/properties/${id}`, { method: 'PATCH', ...body(input) }),
  deleteProperty: (id: string) => apiFetch<Property>(`/properties/${id}`, { method: 'DELETE' }),

  workOrders: (query = '') => apiFetch<PaginatedResponse<WorkOrder>>(`/work-orders${query}`),
  createWorkOrder: (input: Omit<WorkOrder, 'id' | 'customer' | 'property'>) => apiFetch<WorkOrder>('/work-orders', { method: 'POST', ...body(input) }),
  updateWorkOrder: (id: string, input: Partial<Omit<WorkOrder, 'id' | 'createdById' | 'customer' | 'property'>>) => apiFetch<WorkOrder>(`/work-orders/${id}`, { method: 'PATCH', ...body(input) }),
  deleteWorkOrder: (id: string) => apiFetch<WorkOrder>(`/work-orders/${id}`, { method: 'DELETE' }),
};
