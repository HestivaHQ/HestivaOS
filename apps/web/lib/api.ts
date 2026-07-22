const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

export type Customer = {
  id: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  status: 'ACTIVE' | 'INACTIVE';
};

export type Property = {
  id: string;
  name: string;
  city: string;
  customerId: string;
  customer?: Customer;
};

export type WorkOrder = {
  id: string;
  title: string;
  status: 'DRAFT' | 'OPEN' | 'SCHEDULED' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  scheduledAt: string | null;
  customer: Customer;
  property: Property;
};

async function apiFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}/api/v1${path}`, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  customers: (query = '') => apiFetch<PaginatedResponse<Customer>>(`/customers${query}`),
  properties: (query = '') => apiFetch<PaginatedResponse<Property>>(`/properties${query}`),
  workOrders: (query = '') => apiFetch<PaginatedResponse<WorkOrder>>(`/work-orders${query}`),
};
