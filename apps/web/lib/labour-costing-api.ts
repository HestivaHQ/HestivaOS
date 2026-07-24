import type { Shift, Technician } from './api';

const rawApiUrl = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const API_URL = rawApiUrl.trim().replace(/\/+$/, '').replace(/\/api\/v1$/, '');

export type WorkerPayType = 'DAILY' | 'HOURLY';
export type LabourAdjustmentKind = 'ALLOWANCE' | 'DEDUCTION';
export type LabourAdjustmentCalculation = 'FIXED' | 'PER_HOUR' | 'PER_DAY';

export type TechnicianRate = {
  id: string;
  technicianId: string;
  payType: WorkerPayType;
  dailyRate: number | null;
  hourlyRate: number | null;
  standardHoursPerDay: number;
  overtimeMultiplier: number;
  weekendMultiplier: number;
  publicHolidayMultiplier: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  reason: string | null;
  calculatedHourlyRate: number | null;
  createdAt: string;
};

export type LabourWorker = Technician & { activeRate: TechnicianRate | null; rates: TechnicianRate[] };
export type AdjustmentDefinition = { id: string; name: string; kind: LabourAdjustmentKind; calculation: LabourAdjustmentCalculation; amount: number; notes: string | null; isActive: boolean };
export type ShiftCostWorker = { technician: Technician; rate: TechnicianRate | null; plannedHours: number; derivedHourlyRate?: number; regularHours?: number; overtimeHours?: number; baseCost: number; overtimeCost: number; adjustments: Array<{ id: string; definition: AdjustmentDefinition; calculatedAmount: number }>; totalCost: number; warning?: string };
export type ShiftCost = { shift: Shift; plannedMinutes: number; plannedHours: number; workers: ShiftCostWorker[]; totalLabourCost: number };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (typeof window !== 'undefined') {
    const { createClient } = await import('./supabase/client');
    const { data: { session } } = await createClient().auth.getSession();
    if (session?.access_token) headers.set('Authorization', `Bearer ${session.access_token}`);
  }
  headers.set('Content-Type', 'application/json');
  const response = await fetch(`${API_URL}/api/v1${path}`, { cache: 'no-store', ...init, headers });
  if (!response.ok) {
    const result = await response.json().catch(() => null) as { message?: string } | null;
    throw new Error(result?.message ?? `API request failed with status ${response.status}`);
  }
  const body = await response.text();
  return (body.trim() ? JSON.parse(body) : null) as T;
}

const json = (value: unknown): RequestInit => ({ body: JSON.stringify(value) });

export const labourCostingApi = {
  workers: () => request<LabourWorker[]>('/labour-costing/workers'),
  createRate: (technicianId: string, input: Omit<TechnicianRate, 'id' | 'technicianId' | 'calculatedHourlyRate' | 'createdAt'>) => request<TechnicianRate>(`/labour-costing/workers/${technicianId}/rates`, { method: 'POST', ...json(input) }),
  deleteRate: (id: string) => request<void>(`/labour-costing/rates/${id}`, { method: 'DELETE' }),
  definitions: () => request<AdjustmentDefinition[]>('/labour-costing/adjustment-definitions'),
  createDefinition: (input: Omit<AdjustmentDefinition, 'id'>) => request<AdjustmentDefinition>('/labour-costing/adjustment-definitions', { method: 'POST', ...json(input) }),
  updateDefinition: (id: string, input: Partial<Omit<AdjustmentDefinition, 'id'>>) => request<AdjustmentDefinition>(`/labour-costing/adjustment-definitions/${id}`, { method: 'PATCH', ...json(input) }),
  shiftCost: (id: string) => request<ShiftCost>(`/labour-costing/shifts/${id}`),
  addShiftAdjustment: (shiftId: string, input: { technicianId: string; definitionId: string; amountOverride?: number | null; notes?: string }) => request(`/labour-costing/shifts/${shiftId}/adjustments`, { method: 'POST', ...json(input) }),
  deleteShiftAdjustment: (id: string) => request<void>(`/labour-costing/shift-adjustments/${id}`, { method: 'DELETE' }),
};