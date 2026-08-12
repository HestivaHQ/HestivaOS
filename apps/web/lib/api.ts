const rawApiUrl = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const API_URL = rawApiUrl.trim().replace(/\/+$/, '').replace(/\/api\/v1$/, '');

export type PaginatedResponse<T> = { items: T[]; total: number; page: number; pageSize: number };
export type UserRole = 'ADMIN' | 'OPERATIONS_MANAGER' | 'DISPATCHER' | 'SUPERVISOR' | 'TECHNICIAN';
export type AppUser = { id: string; authUserId: string; email: string; firstName: string; lastName: string; displayName: string | null; phoneNumber: string | null; jobTitle: string | null; department: string | null; profilePhotoUrl: string | null; role: UserRole; status: 'ACTIVE' | 'INACTIVE' };
export type AdminUser = Pick<AppUser, 'id' | 'email' | 'firstName' | 'lastName' | 'displayName' | 'role' | 'status'> & { createdAt: string; updatedAt: string };
export type EmployeeStatus = 'ACTIVE' | 'INACTIVE';
export type BusinessListType = 'JOB_TITLE' | 'DEPARTMENT' | 'PROPERTY_TYPE';
export type BusinessListOption = { id: string; type: BusinessListType; label: string; isActive: boolean; sortOrder: number; createdAt: string; updatedAt: string };
export type EmployeeRecord = { id: string; employeeReference: string; firstName: string; lastName: string; preferredName: string | null; phone: string | null; email: string | null; residentialAddress?: string | null; emergencyContactName?: string | null; emergencyRelationship?: string | null; emergencyContactPhone?: string | null; status: EmployeeStatus; jobTitle: string | null; department: string | null; jobTitleOptionId: string | null; departmentOptionId: string | null; jobTitleOption?: BusinessListOption | null; departmentOption?: BusinessListOption | null; startDate?: string | null; endDate?: string | null; internalNotes?: string | null; user: Pick<AppUser, 'id' | 'role' | 'status' | 'profilePhotoUrl'> | null; technician: (Technician & { crewMembership: { crew: Pick<Crew, 'id' | 'name' | 'status'> } | null }) | null; createdAt: string; updatedAt: string };
export type EmployeeInput = Pick<EmployeeRecord, 'employeeReference' | 'firstName' | 'lastName' | 'status'> & Partial<Pick<EmployeeRecord, 'preferredName' | 'phone' | 'email' | 'residentialAddress' | 'emergencyContactName' | 'emergencyRelationship' | 'emergencyContactPhone' | 'startDate' | 'endDate' | 'internalNotes'>> & { jobTitleOptionId?: string | null; departmentOptionId?: string | null; userId?: string | null; technicianId?: string | null };
export type BusinessProfile = { registeredName: string | null; tradingName: string | null; registrationNumber: string | null; contactNumber: string | null; businessEmail: string | null; website: string | null; businessAddress: string | null; bankName: string | null; accountHolder: string | null; accountNumber: string | null; accountType: string | null; branchCode: string | null; paymentInstructions: string | null; taxNumber: string | null; vatNumber: string | null; officialIdentifiers: string | null; shareRegisteredName: boolean; shareTradingName: boolean; shareRegistrationNumber: boolean; shareContactNumber: boolean; shareBusinessEmail: boolean; shareWebsite: boolean; shareBusinessAddress: boolean; shareBankName: boolean; shareAccountHolder: boolean; shareAccountNumber: boolean; shareAccountType: boolean; shareBranchCode: boolean; sharePaymentInstructions: boolean; shareTaxNumber: boolean; shareVatNumber: boolean; shareOfficialIdentifiers: boolean };
export type CustomerSelectorOption = { id: string; name: string; contactName: string | null };
export type Customer = { id: string; ownerId: string; name: string; contactName: string | null; email: string | null; phone: string | null; notes?: string | null; status: 'ACTIVE' | 'INACTIVE' };
export type CustomerCleanupImpact = { customerName: string; customer: number; properties: number; recurringAgreements: number; workOrders: number; activities: number; checklistItems: number; photos: number; signOffs: number; shiftsToDetach: number };
export type CustomerCleanupResult = { customerDeleted: number; propertiesDeleted: number; recurringAgreementsDeleted: number; workOrdersDeleted: number; activitiesDeleted: number; checklistItemsDeleted: number; photosDeleted: number; signOffsDeleted: number; shiftsDetached: number; storageObjectsDeleted: boolean; possibleOrphanedStorage: boolean };
export type BedroomCount = 'STUDIO' | 'ONE' | 'TWO' | 'THREE' | 'FOUR' | 'FIVE_PLUS' | 'OTHER';
export type BathroomCount = 'ONE' | 'TWO' | 'THREE' | 'FOUR' | 'FIVE_PLUS';
export type LivingAreaCount = 'ONE' | 'TWO' | 'THREE' | 'FOUR_PLUS';
export type StoreyCount = 'ONE' | 'TWO' | 'THREE_PLUS' | 'THREE' | 'FOUR_PLUS' | 'UNKNOWN';
export type FloorSize = 'UNDER_80' | 'FROM_80_TO_150' | 'FROM_151_TO_250' | 'OVER_250' | 'UNDER_40' | 'FROM_40_TO_59' | 'FROM_60_TO_79' | 'FROM_80_TO_99' | 'FROM_100_TO_129' | 'FROM_130_TO_169' | 'FROM_170_TO_219' | 'FROM_220_TO_299' | 'FROM_300_UP' | 'UNKNOWN';
export type OutdoorArea = 'NONE' | 'BALCONY' | 'PATIO' | 'BOTH';
export type EstateClassification = 'NONE' | 'ESTATE' | 'COMPLEX' | 'GATED_COMMUNITY';
export type UnitFloor = 'GROUND' | 'FIRST' | 'SECOND' | 'THIRD' | 'FOURTH' | 'FIFTH_TO_NINTH' | 'TENTH_PLUS' | 'THIRD_PLUS' | 'UNKNOWN';
export type Property = { id: string; name: string; addressLine1: string; addressLine2?: string | null; city: string; province?: string | null; postalCode?: string | null; country: string; accessNotes?: string | null; propertyTypeOptionId: string | null; propertyTypeOption?: BusinessListOption | null; customerId: string; customer?: Customer; bedrooms?: BedroomCount | null; bathrooms?: BathroomCount | null; livingAreas?: LivingAreaCount | null; storeys?: StoreyCount | null; floorSize?: FloorSize | null; outdoorArea?: OutdoorArea | null; estateClassification?: EstateClassification | null; unitFloor?: UnitFloor | null; isEstateOrComplex?: boolean | null; requiresGateSecurityAccess?: boolean | null; parkingNotes?: string | null; hasPets?: boolean | null; petNotes?: string | null; hasCameras?: boolean | null; offLimitsNotes?: string | null; fragileItemNotes?: string | null; productRestrictionNotes?: string | null; allergyNotes?: string | null };
export type Technician = { id: string; firstName: string; lastName: string; email: string | null; phone: string | null; skills: string[]; notes: string | null; status: 'ACTIVE' | 'INACTIVE' };
export type CrewMember = { crewId: string; technicianId: string; technician: Technician; createdAt: string };
export type Crew = { id: string; name: string; description: string | null; leaderId: string | null; status: 'ACTIVE' | 'INACTIVE'; leader: Technician | null; members: CrewMember[]; _count?: { workOrders: number }; createdAt: string; updatedAt: string };
export type ShiftStatus = 'DRAFT' | 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
export type Shift = { id: string; title: string; startAt: string; endAt: string; unpaidBreakMinutes: number; grossMinutes: number; plannedMinutes: number; plannedHours: number; crewId: string | null; technicianId: string | null; workOrderId: string | null; location: string | null; notes: string | null; status: ShiftStatus; crew: Crew | null; technician: Technician | null; workOrder: (WorkOrder & { customer: Customer; property: Property }) | null; createdAt: string; updatedAt: string };
export type Service = { id: string; name: string; description: string | null; defaultDurationMinutes: number | null; status: 'ACTIVE' | 'INACTIVE'; type: 'PRIMARY' | 'ADD_ON' | 'BOTH'; createdAt: string; updatedAt: string };
export type CleaningJobTemplate = { id: string; name: string; description: string | null; estimatedDurationMinutes: number | null; status: 'ACTIVE' | 'INACTIVE'; services: Service[]; createdAt: string; updatedAt: string };
export type WorkOrderStatus = 'NEW' | 'ASSIGNED' | 'ACCEPTED' | 'TRAVELLING' | 'ON_SITE' | 'WAITING_FOR_PARTS' | 'COMPLETED' | 'CLOSED' | 'CANCELLED';
export type RecurringServiceStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'ENDED';
export type RecurrenceWeekday = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
export type PreferredTimeWindow = 'MORNING' | 'MIDDAY' | 'AFTERNOON' | 'FLEXIBLE';
export type WorkOrderFrequency = 'ONE_TIME' | 'WEEKLY' | 'EVERY_TWO_WEEKS' | 'MONTHLY' | 'CUSTOM';
export type HomeCondition = 'LIGHT_UPKEEP' | 'STANDARD' | 'EXTRA_ATTENTION' | 'HEAVY_BUILDUP' | 'RECENTLY_RENOVATED' | 'VACANT' | 'MOVE_IN_OUT';
export type AddOnSelectionInput = { serviceId: string; quantity: number; capacityApproved?: boolean };
export type WorkOrder = { id: string; customerId: string; propertyId: string; createdById: string; technicianId: string | null; crewId: string | null; serviceId: string | null; reference: string | null; title: string; service: Service | null; addOns: Array<{ serviceId: string; quantity: number; service: Service }>; frequency: WorkOrderFrequency | null; customFrequencyNote: string | null; homeCondition: HomeCondition | null; description?: string | null; status: WorkOrderStatus; priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'; scheduledAt: string | null; completedAt?: string | null; createdAt: string; customer: Customer; property: Property; technician: Technician | null; crew: Crew | null };
export type RecurringServiceAgreement = { id: string; propertyId: string; serviceId: string; frequency: Exclude<WorkOrderFrequency, 'ONE_TIME'>; status: RecurringServiceStatus; effectiveDate: string; endDate: string | null; weekday: RecurrenceWeekday | null; dayOfMonth: number | null; preferredTimeWindow: PreferredTimeWindow | null; customFrequencyNote: string | null; recurringInstructions: string | null; nextServiceDate: string | null; property: Property & { customer: Customer }; service: Service; addOns: Array<{ serviceId: string; quantity: number; service: Service }>; _count: { workOrders: number } };
export type RecurringServiceInput = { propertyId: string; serviceId: string; addOnIds?: string[]; addOns?: AddOnSelectionInput[]; frequency: Exclude<WorkOrderFrequency, 'ONE_TIME'>; effectiveDate: string; endDate?: string | null; weekday?: RecurrenceWeekday | null; dayOfMonth?: number | null; preferredTimeWindow?: PreferredTimeWindow | null; customFrequencyNote?: string | null; recurringInstructions?: string | null };
export type WorkOrderChecklistItem = { id: string; workOrderId: string; description: string; status: 'PENDING' | 'COMPLETED' | 'NOT_APPLICABLE'; sortOrder: number; createdAt: string; updatedAt: string };
export type WorkOrderPhoto = { id: string; workOrderId: string; category: 'BEFORE' | 'AFTER'; url: string; storagePath: string; uploadedBy: string; createdAt: string };
export type WorkOrderCustomerSignOff = { id: string; workOrderId: string; customerName: string; signatureDataUrl: string; note: string | null; acceptedAt: string };
export type WorkOrderActivity = { id: string; type: 'WORK_ORDER_CREATED' | 'STATUS_CHANGED' | 'TECHNICIAN_ASSIGNED' | 'TECHNICIAN_CHANGED' | 'TECHNICIAN_REMOVED' | 'CREW_ASSIGNED' | 'CREW_CHANGED' | 'CREW_REMOVED' | 'WORK_ORDER_CLOSED' | 'WORK_ORDER_CANCELLED'; previousStatus: WorkOrderStatus | null; newStatus: WorkOrderStatus | null; note: string | null; actor: AppUser | null; createdAt: string };
export type DashboardWorkOrderActivity = WorkOrderActivity & { workOrder: Pick<WorkOrder, 'id' | 'reference' | 'title'> };
export type DashboardOverview = {
  totals: { customers: number; properties: number; openWorkOrders: number; completedWorkOrders: number };
  statistics: { openWorkOrders: number; completedToday: number; overdueWorkOrders: number; activeTechnicians: number };
  alerts: { overdueWorkOrders: number; awaitingAssignment: number; waitingForParts: number; highPriorityJobs: number; todayUnassignedJobs: number };
  performanceMetrics: { averageCompletionTimeDays: number; completedToday: number; completedThisWeek: number; completedThisMonth: number; overduePercentage: number; onTimeCompletionRate: number; activeWorkOrders: number; averageJobsPerActiveTechnician: number };
  technicianWorkload: Array<{ technicianId: string; technicianName: string; status: string; activeWorkOrderCount: number; scheduledTodayCount: number; highPriorityCount: number }>;
  recentWorkOrderActivities: DashboardWorkOrderActivity[];
  todayScheduledWorkOrders: WorkOrder[];
  upcomingScheduledWorkOrders: WorkOrder[];
  overdueWorkOrdersList: Array<WorkOrder & { daysOverdue: number }>;
  statusBreakdown: Record<WorkOrderStatus, number>;
  operationalDashboard: {
    operationalDate: string;
    todayStatusBreakdown: Partial<Record<WorkOrderStatus, number>>;
    todayUnassignedJobs: number;
    actionableOverdueWorkOrders: Array<WorkOrder & { daysOverdue: number }>;
    upcomingWorkSummary: Array<{ date: string; jobCount: number; unassignedCount: number }>;
    upcomingJobCount: number;
    upcomingUnassignedCount: number;
  };
};

export type CustomerInput = { ownerId: string; name?: string; contactName: string; email?: string; phone?: string; notes?: string; status?: Customer['status'] };
export type PropertyInput = Omit<Property, 'id' | 'customer' | 'propertyTypeOption'>;
export type TechnicianInput = { firstName: string; lastName: string; email?: string; phone?: string; skills?: string[]; notes?: string; status?: Technician['status'] };
export type CrewInput = { name: string; description?: string; leaderId?: string | null; memberIds?: string[]; status?: Crew['status'] };
export type ShiftInput = { title: string; startAt: string; endAt: string; unpaidBreakMinutes?: number; crewId?: string | null; technicianId?: string | null; workOrderId?: string | null; location?: string; notes?: string; status?: ShiftStatus };
export type ServiceInput = { name: string; description?: string; defaultDurationMinutes?: number; status?: Service['status']; type?: Service['type'] };
export type CleaningJobTemplateInput = { name: string; description?: string; estimatedDurationMinutes?: number; status?: CleaningJobTemplate['status']; serviceIds?: string[] };
export type WorkOrderInput = { customerId: string; propertyId: string; createdById: string; technicianId?: string | null; crewId?: string | null; serviceId: string; addOnIds?: string[]; addOns?: AddOnSelectionInput[]; frequency?: WorkOrderFrequency | null; customFrequencyNote?: string | null; homeCondition?: HomeCondition | null; description?: string; status?: WorkOrder['status']; priority?: WorkOrder['priority']; scheduledAt?: string; completedAt?: string };

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) { super(message); this.name = 'ApiError'; }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (typeof window !== 'undefined' && !headers.has('Authorization')) {
    const { createClient } = await import('./supabase/client');
    const { data: { session } } = await createClient().auth.getSession();
    if (session?.access_token) headers.set('Authorization', `Bearer ${session.access_token}`);
  }
  const response = await fetch(`${API_URL}/api/v1${path}`, { cache: 'no-store', ...init, headers: { 'Content-Type': 'application/json', ...Object.fromEntries(headers.entries()) } });
  if (!response.ok) {
    const result = await response.json().catch(() => null) as { message?: string } | null;
    if (response.status === 403 && result?.message === 'Hestiva OS access is disabled.' && typeof window !== 'undefined') {
      const { createClient } = await import('./supabase/client');
      await createClient().auth.signOut();
      window.location.assign('/login?reason=access-disabled');
    }
    throw new ApiError(result?.message ?? `API request failed with status ${response.status}`, response.status);
  }
  if (response.status === 204) return undefined as T;
  const body = await response.text();
  if (!body.trim()) return null as T;
  return JSON.parse(body) as T;
}

const json = (value: unknown): RequestInit => ({ body: JSON.stringify(value) });

export const api = {
  syncUser: (accessToken: string) => apiFetch<AppUser>('/users/sync', { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` } }),
  updateProfile: (accessToken: string, input: Partial<Pick<AppUser, 'firstName' | 'lastName' | 'displayName' | 'phoneNumber' | 'profilePhotoUrl'>>) => apiFetch<AppUser>('/users/me/profile', { method: 'PATCH', headers: { Authorization: `Bearer ${accessToken}` }, ...json(input) }),
  businessProfile: (accessToken: string) => apiFetch<BusinessProfile>('/admin/business-profile', { headers: { Authorization: `Bearer ${accessToken}` } }),
  updateBusinessProfile: (accessToken: string, input: Partial<BusinessProfile>) => apiFetch<BusinessProfile>('/admin/business-profile', { method: 'PATCH', headers: { Authorization: `Bearer ${accessToken}` }, ...json(input) }),
  adminUsers: (accessToken: string, search = '') => apiFetch<AdminUser[]>(`/users/admin${search ? `?search=${encodeURIComponent(search)}` : ''}`, { headers: { Authorization: `Bearer ${accessToken}` } }),
  updateUserRole: (accessToken: string, id: string, role: UserRole) => apiFetch<AdminUser>(`/users/${id}/role`, { method: 'PATCH', headers: { Authorization: `Bearer ${accessToken}` }, ...json({ role }) }),
  updateUserAccess: (accessToken: string, id: string, status: AppUser['status']) => apiFetch<AdminUser>(`/users/${id}/access`, { method: 'PATCH', headers: { Authorization: `Bearer ${accessToken}` }, ...json({ status }) }),
  dashboard: (accessToken?: string) => apiFetch<DashboardOverview>('/dashboard', accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined),
  activeBusinessLists: (type: BusinessListType) => apiFetch<BusinessListOption[]>(`/admin/business-lists?type=${encodeURIComponent(type)}`),
  businessLists: (accessToken: string, includeInactive = false) => apiFetch<BusinessListOption[]>(`/admin/business-lists${includeInactive ? '?includeInactive=true' : ''}`, { headers: { Authorization: `Bearer ${accessToken}` } }),
  createBusinessListOption: (accessToken: string, input: { type: BusinessListType; label: string }) => apiFetch<BusinessListOption>('/admin/business-lists', { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` }, ...json(input) }),
  updateBusinessListOption: (accessToken: string, id: string, input: { label?: string; isActive?: boolean }) => apiFetch<BusinessListOption>(`/admin/business-lists/${id}`, { method: 'PATCH', headers: { Authorization: `Bearer ${accessToken}` }, ...json(input) }),
  employees: (accessToken: string, query = '') => apiFetch<EmployeeRecord[]>(`/employees${query}`, { headers: { Authorization: `Bearer ${accessToken}` } }),
  employee: (accessToken: string, id: string) => apiFetch<EmployeeRecord>(`/employees/${id}`, { headers: { Authorization: `Bearer ${accessToken}` } }),
  createEmployee: (accessToken: string, input: EmployeeInput) => apiFetch<EmployeeRecord>('/employees', { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` }, ...json(input) }),
  updateEmployee: (accessToken: string, id: string, input: Partial<EmployeeInput>) => apiFetch<EmployeeRecord>(`/employees/${id}`, { method: 'PATCH', headers: { Authorization: `Bearer ${accessToken}` }, ...json(input) }),
  customerSelectorOptions: (search = '') => apiFetch<CustomerSelectorOption[]>(`/customers/selector-options${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  customers: (query = '') => apiFetch<PaginatedResponse<Customer>>(`/customers${query}`),
  createCustomer: (input: CustomerInput) => apiFetch<Customer>('/customers', { method: 'POST', ...json(input) }),
  updateCustomer: (id: string, input: Partial<Omit<CustomerInput, 'ownerId'>>) => apiFetch<Customer>(`/customers/${id}`, { method: 'PATCH', ...json(input) }),
  deleteCustomer: (id: string) => apiFetch<Customer>(`/customers/${id}`, { method: 'DELETE' }),
  customerCleanupImpact: (id: string) => apiFetch<CustomerCleanupImpact>(`/admin/customer-cleanup/${id}/impact`),
  customerCleanup: (id: string, confirmationName: string) => apiFetch<CustomerCleanupResult>(`/admin/customer-cleanup/${id}`, { method: 'DELETE', ...json({ confirmationName }) }),
  properties: (query = '') => apiFetch<PaginatedResponse<Property>>(`/properties${query}`),
  propertySelectorOptions: (customerId?: string) => apiFetch<Array<Pick<Property, 'id' | 'customerId' | 'name' | 'addressLine1' | 'city'>>>(`/properties/selector-options${customerId ? `?customerId=${encodeURIComponent(customerId)}` : ''}`),
  createProperty: (input: PropertyInput) => apiFetch<Property>('/properties', { method: 'POST', ...json(input) }),
  updateProperty: (id: string, input: Partial<PropertyInput>) => apiFetch<Property>(`/properties/${id}`, { method: 'PATCH', ...json(input) }),
  deleteProperty: (id: string) => apiFetch<Property>(`/properties/${id}`, { method: 'DELETE' }),
  technicians: (query = '') => apiFetch<PaginatedResponse<Technician>>(`/technicians${query}`),
  createTechnician: (input: TechnicianInput) => apiFetch<Technician>('/technicians', { method: 'POST', ...json(input) }),
  updateTechnician: (id: string, input: Partial<TechnicianInput>) => apiFetch<Technician>(`/technicians/${id}`, { method: 'PATCH', ...json(input) }),
  deleteTechnician: (id: string) => apiFetch<Technician>(`/technicians/${id}`, { method: 'DELETE' }),
  crews: (query = '') => apiFetch<PaginatedResponse<Crew>>(`/crews${query}`),
  crew: (id: string) => apiFetch<Crew>(`/crews/${id}`),
  createCrew: (input: CrewInput) => apiFetch<Crew>('/crews', { method: 'POST', ...json(input) }),
  updateCrew: (id: string, input: Partial<CrewInput>) => apiFetch<Crew>(`/crews/${id}`, { method: 'PATCH', ...json(input) }),
  deleteCrew: (id: string) => apiFetch<Crew>(`/crews/${id}`, { method: 'DELETE' }),
  shifts: (query = '') => apiFetch<PaginatedResponse<Shift>>(`/shifts${query}`),
  shift: (id: string) => apiFetch<Shift>(`/shifts/${id}`),
  createShift: (input: ShiftInput) => apiFetch<Shift>('/shifts', { method: 'POST', ...json(input) }),
  updateShift: (id: string, input: Partial<ShiftInput>) => apiFetch<Shift>(`/shifts/${id}`, { method: 'PATCH', ...json(input) }),
  copyShift: (id: string, input: Pick<ShiftInput, 'startAt' | 'endAt'>) => apiFetch<Shift>(`/shifts/${id}/copy`, { method: 'POST', ...json(input) }),
  deleteShift: (id: string) => apiFetch<Shift>(`/shifts/${id}`, { method: 'DELETE' }),
  services: (query = '') => apiFetch<PaginatedResponse<Service>>(`/services${query}`),
  createService: (input: ServiceInput) => apiFetch<Service>('/services', { method: 'POST', ...json(input) }),
  updateService: (id: string, input: Partial<ServiceInput>) => apiFetch<Service>(`/services/${id}`, { method: 'PATCH', ...json(input) }),
  cleaningJobTemplates: (query = '') => apiFetch<PaginatedResponse<CleaningJobTemplate>>(`/cleaning-job-templates${query}`),
  createCleaningJobTemplate: (input: CleaningJobTemplateInput) => apiFetch<CleaningJobTemplate>('/cleaning-job-templates', { method: 'POST', ...json(input) }),
  updateCleaningJobTemplate: (id: string, input: Partial<CleaningJobTemplateInput>) => apiFetch<CleaningJobTemplate>(`/cleaning-job-templates/${id}`, { method: 'PATCH', ...json(input) }),
  deleteCleaningJobTemplate: (id: string) => apiFetch<CleaningJobTemplate>(`/cleaning-job-templates/${id}`, { method: 'DELETE' }),
  recurringServices: () => apiFetch<RecurringServiceAgreement[]>('/recurring-services'),
  createRecurringService: (input: RecurringServiceInput) => apiFetch<RecurringServiceAgreement>('/recurring-services', { method: 'POST', ...json(input) }),
  updateRecurringServiceStatus: (id: string, status: RecurringServiceStatus) => apiFetch<RecurringServiceAgreement>(`/recurring-services/${id}/status`, { method: 'PATCH', ...json({ status }) }),
  generateRecurringService: (id: string) => apiFetch<WorkOrder | null>(`/recurring-services/${id}/generate`, { method: 'POST' }),
  workOrders: (query = '') => apiFetch<PaginatedResponse<WorkOrder>>(`/work-orders${query}`),
  workOrder: (id: string) => apiFetch<WorkOrder>(`/work-orders/${id}`),
  createWorkOrder: (input: WorkOrderInput) => apiFetch<WorkOrder>('/work-orders', { method: 'POST', ...json(input) }),
  updateWorkOrder: (id: string, input: Partial<Omit<WorkOrderInput, 'createdById'>>) => apiFetch<WorkOrder>(`/work-orders/${id}`, { method: 'PATCH', ...json(input) }),
  changeWorkOrderStatus: (id: string, input: { status: WorkOrderStatus; note?: string; actorId?: string }) => apiFetch<WorkOrder>(`/work-orders/${id}/status`, { method: 'PATCH', ...json(input) }),
  workOrderTimeline: (id: string) => apiFetch<WorkOrderActivity[]>(`/work-orders/${id}/timeline`),
  workOrderChecklist: (id: string) => apiFetch<WorkOrderChecklistItem[]>(`/work-orders/${id}/checklist`),
  createWorkOrderChecklistItem: (id: string, description: string) => apiFetch<WorkOrderChecklistItem>(`/work-orders/${id}/checklist`, { method: 'POST', ...json({ description }) }),
  updateWorkOrderChecklistItem: (workOrderId: string, itemId: string, input: Partial<Pick<WorkOrderChecklistItem, 'description' | 'status' | 'sortOrder'>>) => apiFetch<WorkOrderChecklistItem>(`/work-orders/${workOrderId}/checklist/${itemId}`, { method: 'PATCH', ...json(input) }),
  deleteWorkOrderChecklistItem: (workOrderId: string, itemId: string) => apiFetch<WorkOrderChecklistItem>(`/work-orders/${workOrderId}/checklist/${itemId}`, { method: 'DELETE' }),
  workOrderPhotos: (id: string) => apiFetch<WorkOrderPhoto[]>(`/work-orders/${id}/photos`),
  createWorkOrderPhoto: (id: string, input: Pick<WorkOrderPhoto, 'category' | 'url' | 'storagePath' | 'uploadedBy'>) => apiFetch<WorkOrderPhoto>(`/work-orders/${id}/photos`, { method: 'POST', ...json(input) }),
  deleteWorkOrderPhoto: (workOrderId: string, photoId: string) => apiFetch<WorkOrderPhoto>(`/work-orders/${workOrderId}/photos/${photoId}`, { method: 'DELETE' }),
  workOrderCustomerSignOff: (id: string) => apiFetch<WorkOrderCustomerSignOff | null>(`/work-orders/${id}/customer-sign-off`),
  createWorkOrderCustomerSignOff: (id: string, input: Pick<WorkOrderCustomerSignOff, 'customerName' | 'signatureDataUrl'> & { note?: string }) => apiFetch<WorkOrderCustomerSignOff>(`/work-orders/${id}/customer-sign-off`, { method: 'POST', ...json(input) }),
  deleteWorkOrder: (id: string) => apiFetch<WorkOrder>(`/work-orders/${id}`, { method: 'DELETE' }),
};