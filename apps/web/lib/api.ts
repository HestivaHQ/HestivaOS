const rawApiUrl =
  process.env.API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:4000";
const API_URL = rawApiUrl
  .trim()
  .replace(/\/+$/, "")
  .replace(/\/api\/v1$/, "");

export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};
export type UserRole =
  | "ADMIN"
  | "OPERATIONS_MANAGER"
  | "DISPATCHER"
  | "SUPERVISOR"
  | "TECHNICIAN";
export type AppUser = {
  id: string;
  authUserId: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string | null;
  phoneNumber: string | null;
  jobTitle: string | null;
  department: string | null;
  profilePhotoUrl: string | null;
  role: UserRole;
  status: "ACTIVE" | "INACTIVE";
};
export type SupervisorOperations = { generatedAt:string; workOrders:Array<{id:string;reference:string;status:string;scheduledAt:string|null;customerLabel:string;propertyLabel:string;serviceName:string;crewName:string|null;technicians:Array<{id:string;firstName:string;lastName:string}>;jobLeader:{id:string;firstName:string;lastName:string}|null;accessReadiness:string;execution:{started:boolean;completedSections:number;totalSections:number;evidenceCount:number;evidencePendingCount:number};completion:{acceptedAt:string|null;acknowledgedAt:string|null;acknowledgementRequired:boolean};incidents:Array<{id:string;category:string;status:string;fieldReportedAt:string}>;interruption:{interrupted:boolean};scopeMismatch:{count:number;requiresAdminResolution:boolean}}> };
export type AdminUser = Pick<
  AppUser,
  "id" | "email" | "firstName" | "lastName" | "displayName" | "role" | "status"
> & { createdAt: string; updatedAt: string };
export type EmployeeStatus = "ACTIVE" | "INACTIVE";
export type BusinessListType = "JOB_TITLE" | "DEPARTMENT" | "PROPERTY_TYPE";
export type BusinessListOption = {
  id: string;
  type: BusinessListType;
  label: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};
export type EmployeeRecord = {
  id: string;
  employeeReference: string;
  firstName: string;
  lastName: string;
  preferredName: string | null;
  phone: string | null;
  email: string | null;
  residentialAddress?: string | null;
  emergencyContactName?: string | null;
  emergencyRelationship?: string | null;
  emergencyContactPhone?: string | null;
  status: EmployeeStatus;
  jobTitle: string | null;
  department: string | null;
  jobTitleOptionId: string | null;
  departmentOptionId: string | null;
  jobTitleOption?: BusinessListOption | null;
  departmentOption?: BusinessListOption | null;
  startDate?: string | null;
  endDate?: string | null;
  internalNotes?: string | null;
  user: Pick<AppUser, "id" | "role" | "status" | "profilePhotoUrl"> | null;
  technician:
    | (Technician & {
        crewMembership: { crew: Pick<Crew, "id" | "name" | "status"> } | null;
      })
    | null;
  createdAt: string;
  updatedAt: string;
};
export type EmployeeInput = Pick<
  EmployeeRecord,
  "employeeReference" | "firstName" | "lastName" | "status"
> &
  Partial<
    Pick<
      EmployeeRecord,
      | "preferredName"
      | "phone"
      | "email"
      | "residentialAddress"
      | "emergencyContactName"
      | "emergencyRelationship"
      | "emergencyContactPhone"
      | "startDate"
      | "endDate"
      | "internalNotes"
    >
  > & {
    jobTitleOptionId?: string | null;
    departmentOptionId?: string | null;
    userId?: string | null;
    technicianId?: string | null;
  };
export type BusinessProfile = {
  registeredName: string | null;
  tradingName: string | null;
  registrationNumber: string | null;
  contactNumber: string | null;
  businessEmail: string | null;
  website: string | null;
  businessAddress: string | null;
  bankName: string | null;
  accountHolder: string | null;
  accountNumber: string | null;
  accountType: string | null;
  branchCode: string | null;
  paymentInstructions: string | null;
  taxNumber: string | null;
  vatNumber: string | null;
  officialIdentifiers: string | null;
  shareRegisteredName: boolean;
  shareTradingName: boolean;
  shareRegistrationNumber: boolean;
  shareContactNumber: boolean;
  shareBusinessEmail: boolean;
  shareWebsite: boolean;
  shareBusinessAddress: boolean;
  shareBankName: boolean;
  shareAccountHolder: boolean;
  shareAccountNumber: boolean;
  shareAccountType: boolean;
  shareBranchCode: boolean;
  sharePaymentInstructions: boolean;
  shareTaxNumber: boolean;
  shareVatNumber: boolean;
  shareOfficialIdentifiers: boolean;
};
export type CustomerSelectorOption = {
  id: string;
  name: string;
  contactName: string | null;
};
export type Customer = {
  id: string;
  ownerId: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  notes?: string | null;
  status: "ACTIVE" | "INACTIVE";
};
export type CustomerCleanupImpact = {
  customerName: string;
  customer: number;
  properties: number;
  recurringAgreements: number;
  workOrders: number;
  activities: number;
  checklistItems: number;
  photos: number;
  signOffs: number;
  shiftsToDetach: number;
};
export type CustomerCleanupResult = {
  customerDeleted: number;
  propertiesDeleted: number;
  recurringAgreementsDeleted: number;
  workOrdersDeleted: number;
  activitiesDeleted: number;
  checklistItemsDeleted: number;
  photosDeleted: number;
  signOffsDeleted: number;
  shiftsDetached: number;
  storageObjectsDeleted: boolean;
  possibleOrphanedStorage: boolean;
};
export type BedroomCount =
  | "STUDIO"
  | "ONE"
  | "TWO"
  | "THREE"
  | "FOUR"
  | "FIVE_PLUS"
  | "OTHER";
export type BathroomCount = "ONE" | "TWO" | "THREE" | "FOUR" | "FIVE_PLUS";
export type LivingAreaCount = "ONE" | "TWO" | "THREE" | "FOUR_PLUS";
export type StoreyCount =
  | "ONE"
  | "TWO"
  | "THREE_PLUS"
  | "THREE"
  | "FOUR_PLUS"
  | "UNKNOWN";
export type FloorSize =
  | "UNDER_80"
  | "FROM_80_TO_150"
  | "FROM_151_TO_250"
  | "OVER_250"
  | "UNDER_40"
  | "FROM_40_TO_59"
  | "FROM_60_TO_79"
  | "FROM_80_TO_99"
  | "FROM_100_TO_129"
  | "FROM_130_TO_169"
  | "FROM_170_TO_219"
  | "FROM_220_TO_299"
  | "FROM_300_UP"
  | "UNKNOWN";
export type OutdoorArea = "NONE" | "BALCONY" | "PATIO" | "BOTH";
export type EstateClassification =
  | "NONE"
  | "ESTATE"
  | "COMPLEX"
  | "GATED_COMMUNITY";
export type UnitFloor =
  | "GROUND"
  | "FIRST"
  | "SECOND"
  | "THIRD"
  | "FOURTH"
  | "FIFTH_TO_NINTH"
  | "TENTH_PLUS"
  | "THIRD_PLUS"
  | "UNKNOWN";
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
  propertyTypeOptionId: string | null;
  propertyTypeOption?: BusinessListOption | null;
  customerId: string;
  customer?: Customer;
  bedrooms?: BedroomCount | null;
  bathrooms?: BathroomCount | null;
  livingAreas?: LivingAreaCount | null;
  storeys?: StoreyCount | null;
  floorSize?: FloorSize | null;
  outdoorArea?: OutdoorArea | null;
  estateClassification?: EstateClassification | null;
  unitFloor?: UnitFloor | null;
  isEstateOrComplex?: boolean | null;
  requiresGateSecurityAccess?: boolean | null;
  parkingNotes?: string | null;
  hasPets?: boolean | null;
  petNotes?: string | null;
  hasCameras?: boolean | null;
  offLimitsNotes?: string | null;
  fragileItemNotes?: string | null;
  productRestrictionNotes?: string | null;
  allergyNotes?: string | null;
};
export type Technician = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  skills: string[];
  notes: string | null;
  status: "ACTIVE" | "INACTIVE";
};
export type CrewMember = {
  crewId: string;
  technicianId: string;
  technician: Technician;
  createdAt: string;
};
export type Crew = {
  id: string;
  name: string;
  description: string | null;
  leaderId: string | null;
  status: "ACTIVE" | "INACTIVE";
  leader: Technician | null;
  members: CrewMember[];
  _count?: { workOrders: number };
  createdAt: string;
  updatedAt: string;
};
export type ShiftStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED";
export type Shift = {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  unpaidBreakMinutes: number;
  grossMinutes: number;
  plannedMinutes: number;
  plannedHours: number;
  crewId: string | null;
  technicianId: string | null;
  workOrderId: string | null;
  location: string | null;
  notes: string | null;
  status: ShiftStatus;
  crew: Crew | null;
  technician: Technician | null;
  workOrder: (WorkOrder & { customer: Customer; property: Property }) | null;
  createdAt: string;
  updatedAt: string;
};
export type Service = {
  id: string;
  name: string;
  description: string | null;
  defaultDurationMinutes: number | null;
  status: "ACTIVE" | "INACTIVE";
  type: "PRIMARY" | "ADD_ON" | "BOTH";
  createdAt: string;
  updatedAt: string;
};
export type CleaningJobTemplate = {
  id: string;
  name: string;
  description: string | null;
  estimatedDurationMinutes: number | null;
  status: "ACTIVE" | "INACTIVE";
  services: Service[];
  createdAt: string;
  updatedAt: string;
};
export type ScopeSectionInput = { stableKey:string; title:string; requirements:string[]; evidencePolicy:"NONE"|"ON_EXCEPTION"|"REQUIRED"; repeatByPropertyField:"bedrooms"|"bathrooms"|"livingAreas"|null; sortOrder:number };
export type ServiceScopeTemplateVersion = { id:string; version:number; status:"DRAFT"|"PUBLISHED"|"RETIRED"; publishedAt:string|null; retiredAt:string|null; sections:ScopeSectionInput[]; _count:{scopeRevisions:number} };
export type ServiceScopeTemplate = { id:string; name:string; serviceId:string; service:Pick<Service,"id"|"name"|"status">; versions:ServiceScopeTemplateVersion[] };
export type ScopeComparison = { workOrderId:string; currentRevision:{id:string;revision:number;templateVersionId:string;templateVersion:number}|null; target:{id:string;version:number;templateId:string;templateName:string}; added:ScopeSectionInput[]; removed:ScopeSectionInput[]; changed:Array<{stableKey:string;before:ScopeSectionInput;after:ScopeSectionInput}>; canAdopt:boolean; blockedReason:string|null; quoteDerived:boolean };
export type WorkOrderStatus =
  | "NEW"
  | "ASSIGNED"
  | "ACCEPTED"
  | "TRAVELLING"
  | "ON_SITE"
  | "WAITING_FOR_PARTS"
  | "COMPLETED"
  | "CLOSED"
  | "CANCELLED";
export type RecurringServiceStatus =
  | "ACTIVE"
  | "PAUSED"
  | "CANCELLED"
  | "ENDED";
export type RecurrenceWeekday =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";
export type PreferredTimeWindow =
  | "MORNING"
  | "MIDDAY"
  | "AFTERNOON"
  | "FLEXIBLE";
export type WorkOrderFrequency =
  | "ONE_TIME"
  | "WEEKLY"
  | "EVERY_TWO_WEEKS"
  | "MONTHLY"
  | "CUSTOM";
export type WorkOrderAccessReadiness = "REQUIRED_MISSING" | "RECEIVED" | "NEEDS_REVIEW" | "EXPIRED" | "ARRANGED_ANOTHER_WAY" | "NOT_REQUIRED";
export type WorkOrderAccessReadinessEvent = {
  id: string; previousState: WorkOrderAccessReadiness; newState: WorkOrderAccessReadiness; createdAt: string;
  actor: { id: string; firstName: string; lastName: string; displayName: string | null };
};
export type TemporaryAccessCredential = { id:string; workOrderId:string; type:"CODE"|"QR_IMAGE"|"QR_DOCUMENT"|"OTHER"; attachmentFileName:string|null; attachmentMediaType:string|null; derivedMetadata:Record<string,string>|null; validFrom:string|null; expiresAt:string|null; singleUse:boolean; revokedAt:string|null; reviewStatus:"PENDING_REVIEW"|"ACCEPTED"|"REJECTED"|"REVOKED"; createdAt:string; createdBy:{id:string;firstName:string;lastName:string;displayName:string|null}|null; events:Array<{id:string;type:string;reason:string|null;createdAt:string;actor:{id:string;firstName:string;lastName:string;displayName:string|null}}> };
export type HomeCondition =
  | "LIGHT_UPKEEP"
  | "STANDARD"
  | "EXTRA_ATTENTION"
  | "HEAVY_BUILDUP"
  | "RECENTLY_RENOVATED"
  | "VACANT"
  | "MOVE_IN_OUT";
export type AddOnSelectionInput = {
  serviceId: string;
  quantity: number;
  capacityApproved?: boolean;
};
export type WorkOrder = {
  id: string;
  customerId: string;
  propertyId: string;
  createdById: string;
  technicianId: string | null;
  jobLeaderId: string | null;
  jobLeader: Technician | null;
  assignedTechnicians: Array<{ technicianId: string; technician: Technician }>;
  crewId: string | null;
  serviceId: string | null;
  reference: string | null;
  title: string;
  service: Service | null;
  addOns: Array<{ serviceId: string; quantity: number; service: Service }>;
  frequency: WorkOrderFrequency | null;
  customFrequencyNote: string | null;
  homeCondition: HomeCondition | null;
  description?: string | null;
  status: WorkOrderStatus;
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  scheduledAt: string | null;
  accessReadiness: WorkOrderAccessReadiness;
  completedAt?: string | null;
  completionOperationId?: string | null;
  fieldCompletedAt?: string | null;
  completionAcceptedAt?: string | null;
  completionAcknowledgedAt?: string | null;
  completionCorrespondenceEligibleAt?: string | null;
  createdAt: string;
  customer: Customer;
  property: Property;
  technician: Technician | null;
  crew: Crew | null;
  startedScopeRevision?: { id:string; sections:Array<{id:string;title:string;currentOutcome:SectionOutcome;evidencePolicy:EvidencePolicy;currentOutcomeEvent:{reason:string|null;note:string|null}|null;evidence:Array<{syncState:string}>}> } | null;
};
export type AccessRecoverySummary = {
  eligible:boolean;
  accessReadiness:WorkOrderAccessReadiness;
  availableChannels:Array<{id:string;channel:"WHATSAPP"|"MESSENGER"}>;
  attempts:Array<{id:string;status:"PENDING_SEND"|"SENT"|"SEND_FAILED"|"RESPONSE_REQUIRES_REVIEW"|"CLOSED";sentAt:string|null;createdAt:string;channel:"WHATSAPP"|"MESSENGER";responseRequiresReview:boolean;responseMessageId:string|null;responseHasAttachment:boolean}>;
};
export type RecurringServiceAgreement = {
  id: string;
  propertyId: string;
  serviceId: string;
  frequency: Exclude<WorkOrderFrequency, "ONE_TIME">;
  status: RecurringServiceStatus;
  effectiveDate: string;
  endDate: string | null;
  weekday: RecurrenceWeekday | null;
  dayOfMonth: number | null;
  preferredTimeWindow: PreferredTimeWindow | null;
  customFrequencyNote: string | null;
  recurringInstructions: string | null;
  nextServiceDate: string | null;
  autoResumeDate: string | null;
  property: Property & { customer: Customer };
  service: Service;
  addOns: Array<{ serviceId: string; quantity: number; service: Service }>;
  _count: { workOrders: number };
};
export type RecurringServiceInput = {
  propertyId: string;
  serviceId: string;
  addOnIds?: string[];
  addOns?: AddOnSelectionInput[];
  frequency: Exclude<WorkOrderFrequency, "ONE_TIME">;
  effectiveDate: string;
  endDate?: string | null;
  weekday?: RecurrenceWeekday | null;
  dayOfMonth?: number | null;
  preferredTimeWindow?: PreferredTimeWindow | null;
  customFrequencyNote?: string | null;
  recurringInstructions?: string | null;
};
export type WorkOrderChecklistItem = {
  id: string;
  workOrderId: string;
  description: string;
  status: "PENDING" | "COMPLETED" | "NOT_APPLICABLE";
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};
export type WorkOrderPhoto = {
  id: string;
  workOrderId: string;
  category: "BEFORE" | "AFTER";
  url: string;
  storagePath: string;
  uploadedBy: string;
  createdAt: string;
};
export type WorkOrderCustomerSignOff = {
  id: string;
  workOrderId: string;
  customerName: string;
  signatureDataUrl: string;
  note: string | null;
  acceptedAt: string;
};
export type WorkOrderActivity = {
  id: string;
  type:
    | "WORK_ORDER_CREATED"
    | "STATUS_CHANGED"
    | "TECHNICIAN_ASSIGNED"
    | "TECHNICIAN_CHANGED"
    | "TECHNICIAN_REMOVED"
    | "CREW_ASSIGNED"
    | "CREW_CHANGED"
    | "CREW_REMOVED"
    | "JOB_LEADER_CHANGED"
    | "WORK_ORDER_CLOSED"
    | "WORK_ORDER_CANCELLED";
  previousStatus: WorkOrderStatus | null;
  newStatus: WorkOrderStatus | null;
  note: string | null;
  actor: AppUser | null;
  createdAt: string;
};
export type QuoteStatus =
  | "SUBMITTED"
  | "ACCEPTED"
  | "DECLINED"
  | "EXPIRED"
  | "NEEDS_ATTENTION";
export type QuoteResolutionDecision = "USE_EXISTING" | "CREATE_NEW";
export type QuoteSummary = {
  customerName: string;
  customerEmail: string;
  customerMobile: string;
  primaryService: string;
  frequency: WorkOrderFrequency;
  preferredDate: string;
  submittedAt: string;
};
export type QuoteListItem = {
  id: string;
  reference: string;
  status: QuoteStatus;
  currentRevisionNumber: number;
  validUntil: string;
  acceptedAt: string | null;
  declinedAt: string | null;
  customerId: string | null;
  propertyId: string | null;
  workOrderId: string | null;
  recurringAgreementId: string | null;
  createdAt: string;
  updatedAt: string;
  summary: QuoteSummary | null;
};
export type QuoteLineItem = {
  id: string;
  type: "PRIMARY_SERVICE" | "ADD_ON" | "ADJUSTMENT";
  code: string | null;
  label: string;
  description: string | null;
  quantity: number;
  unitAmountMinor: number;
  lineTotalMinor: number;
  sortOrder: number;
};
export type QuoteRevision = {
  id: string;
  revisionNumber: number;
  origin: "CUSTOMER_SUBMISSION" | "ADMIN_REVISION";
  structuredData: Record<string, any>;
  currency: string;
  subtotalMinor: number;
  discountMinor: number;
  discountReason: string | null;
  taxEnabled: boolean;
  taxMinor: number;
  totalMinor: number;
  lineItems: QuoteLineItem[];
  createdAt: string;
};
export type QuoteMatch = {
  state: string;
  readiness: "READY" | "REVIEW_REQUIRED" | "BLOCKED";
  candidates: Array<{
    id: string;
    displayName: string;
    evidence: string[];
    context?: string;
  }>;
};
export type QuotePhoto = {
  id: string;
  quoteRevisionId: string | null;
  source: "CUSTOMER" | "ADMIN";
  status: "PENDING" | "STORED" | "FAILED";
  originalFileName: string;
  mimeType: string;
  sizeBytes: number | null;
  url: string | null;
  createdAt: string;
};
export type QuoteActivity = {
  id: string;
  type: string;
  previousStatus: QuoteStatus | null;
  newStatus: QuoteStatus | null;
  note: string | null;
  actorUserId: string | null;
  createdAt: string;
};
export type QuoteDetail = QuoteListItem & {
  acceptedByUserId: string | null;
  declinedByUserId: string | null;
  customerResolution: QuoteResolutionDecision | null;
  propertyResolution: QuoteResolutionDecision | null;
  resolutionRevisionNumber: number | null;
  acceptedRevision: QuoteRevision | null;
  currentRevision: QuoteRevision;
  photos: QuotePhoto[];
  activities: QuoteActivity[];
  resolution: { customer: QuoteMatch; property: QuoteMatch };
  customer: Pick<
    Customer,
    "id" | "name" | "contactName" | "email" | "phone"
  > | null;
  property: Pick<
    Property,
    | "id"
    | "name"
    | "addressLine1"
    | "city"
    | "postalCode"
    | "country"
    | "customerId"
  > | null;
  workOrder: { id: string; reference: string | null; title: string } | null;
  recurringAgreement: { id: string } | null;
  actors: Array<{
    id: string;
    firstName: string;
    lastName: string;
    displayName: string | null;
    email: string;
  }>;
};
export type QuotePreflight = {
  quoteId: string;
  quoteReference: string;
  currentRevisionNumber: number;
  expectedRevisionNumber: number;
  resolution: QuoteDetail["resolution"];
  resolutionReady: boolean;
  eligibleForAcceptance: boolean;
  blockers: Array<{
    code: string;
    message: string;
    resolvableInCurrentSlice: boolean;
  }>;
};
export type DashboardWorkOrderActivity = WorkOrderActivity & {
  workOrder: Pick<WorkOrder, "id" | "reference" | "title">;
};
export type DashboardOverview = {
  totals: {
    customers: number;
    properties: number;
    openWorkOrders: number;
    completedWorkOrders: number;
  };
  statistics: {
    openWorkOrders: number;
    completedToday: number;
    overdueWorkOrders: number;
    activeTechnicians: number;
  };
  alerts: {
    overdueWorkOrders: number;
    awaitingAssignment: number;
    waitingForParts: number;
    highPriorityJobs: number;
    todayUnassignedJobs: number;
  };
  performanceMetrics: {
    averageCompletionTimeDays: number;
    completedToday: number;
    completedThisWeek: number;
    completedThisMonth: number;
    overduePercentage: number;
    onTimeCompletionRate: number;
    activeWorkOrders: number;
    averageJobsPerActiveTechnician: number;
  };
  technicianWorkload: Array<{
    technicianId: string;
    technicianName: string;
    status: string;
    activeWorkOrderCount: number;
    scheduledTodayCount: number;
    highPriorityCount: number;
  }>;
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
    upcomingWorkSummary: Array<{
      date: string;
      jobCount: number;
      unassignedCount: number;
    }>;
    upcomingJobCount: number;
    upcomingUnassignedCount: number;
  };
};

export type CustomerInput = {
  ownerId: string;
  name?: string;
  contactName: string;
  email?: string;
  phone?: string;
  notes?: string;
  status?: Customer["status"];
};
export type PropertyInput = Omit<
  Property,
  "id" | "customer" | "propertyTypeOption"
>;
export type TechnicianInput = {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  skills?: string[];
  notes?: string;
  status?: Technician["status"];
};
export type CrewInput = {
  name: string;
  description?: string;
  leaderId?: string | null;
  memberIds?: string[];
  status?: Crew["status"];
};
export type ShiftInput = {
  title: string;
  startAt: string;
  endAt: string;
  unpaidBreakMinutes?: number;
  crewId?: string | null;
  technicianId?: string | null;
  workOrderId?: string | null;
  location?: string;
  notes?: string;
  status?: ShiftStatus;
};
export type ServiceInput = {
  name: string;
  description?: string;
  defaultDurationMinutes?: number;
  status?: Service["status"];
  type?: Service["type"];
};
export type CleaningJobTemplateInput = {
  name: string;
  description?: string;
  estimatedDurationMinutes?: number;
  status?: CleaningJobTemplate["status"];
  serviceIds?: string[];
};
export type WorkOrderInput = {
  customerId: string;
  propertyId: string;
  createdById: string;
  technicianId?: string | null;
  technicianIds?: string[];
  crewId?: string | null;
  serviceId: string;
  addOnIds?: string[];
  addOns?: AddOnSelectionInput[];
  frequency?: WorkOrderFrequency | null;
  customFrequencyNote?: string | null;
  homeCondition?: HomeCondition | null;
  description?: string;
  status?: WorkOrder["status"];
  priority?: WorkOrder["priority"];
  scheduledAt?: string;
  completedAt?: string;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (typeof window !== "undefined" && !headers.has("Authorization")) {
    const { createClient } = await import("./supabase/client");
    const {
      data: { session },
    } = await createClient().auth.getSession();
    if (session?.access_token)
      headers.set("Authorization", `Bearer ${session.access_token}`);
  }
  const response = await fetch(`${API_URL}/api/v1${path}`, {
    cache: "no-store",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...Object.fromEntries(headers.entries()),
    },
  });
  if (!response.ok) {
    const result = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;
    if (
      response.status === 403 &&
      result?.message === "Hestiva OS access is disabled." &&
      typeof window !== "undefined"
    ) {
      const { createClient } = await import("./supabase/client");
      await createClient().auth.signOut();
      window.location.assign("/login?reason=access-disabled");
    }
    throw new ApiError(
      result?.message ?? `API request failed with status ${response.status}`,
      response.status,
    );
  }
  if (response.status === 204) return undefined as T;
  const body = await response.text();
  if (!body.trim()) return null as T;
  return JSON.parse(body) as T;
}

const json = (value: unknown): RequestInit => ({ body: JSON.stringify(value) });

export const api = {
  currentUser: (accessToken: string) =>
    apiFetch<AppUser>("/users/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  syncUser: (accessToken: string) =>
    apiFetch<AppUser>("/users/sync", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  updateProfile: (
    accessToken: string,
    input: Partial<
      Pick<
        AppUser,
        | "firstName"
        | "lastName"
        | "displayName"
        | "phoneNumber"
        | "profilePhotoUrl"
      >
    >,
  ) =>
    apiFetch<AppUser>("/users/me/profile", {
      method: "PATCH",
      headers: { Authorization: `Bearer ${accessToken}` },
      ...json(input),
    }),
  businessProfile: (accessToken: string) =>
    apiFetch<BusinessProfile>("/admin/business-profile", {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  updateBusinessProfile: (
    accessToken: string,
    input: Partial<BusinessProfile>,
  ) =>
    apiFetch<BusinessProfile>("/admin/business-profile", {
      method: "PATCH",
      headers: { Authorization: `Bearer ${accessToken}` },
      ...json(input),
    }),
  adminUsers: (accessToken: string, search = "") =>
    apiFetch<AdminUser[]>(
      `/users/admin${search ? `?search=${encodeURIComponent(search)}` : ""}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    ),
  updateUserRole: (accessToken: string, id: string, role: UserRole) =>
    apiFetch<AdminUser>(`/users/${id}/role`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${accessToken}` },
      ...json({ role }),
    }),
  updateUserAccess: (
    accessToken: string,
    id: string,
    status: AppUser["status"],
  ) =>
    apiFetch<AdminUser>(`/users/${id}/access`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${accessToken}` },
      ...json({ status }),
    }),
  dashboard: (accessToken?: string) =>
    apiFetch<DashboardOverview>(
      "/dashboard",
      accessToken
        ? { headers: { Authorization: `Bearer ${accessToken}` } }
        : undefined,
    ),
  supervisorOperations: (accessToken: string) => apiFetch<SupervisorOperations>('/supervisor/operations', { headers: { Authorization: `Bearer ${accessToken}` } }),
  activeBusinessLists: (type: BusinessListType, accessToken?: string) =>
    apiFetch<BusinessListOption[]>(
      `/admin/business-lists?type=${encodeURIComponent(type)}`,
      accessToken
        ? { headers: { Authorization: `Bearer ${accessToken}` } }
        : undefined,
    ),
  businessLists: (accessToken: string, includeInactive = false) =>
    apiFetch<BusinessListOption[]>(
      `/admin/business-lists${includeInactive ? "?includeInactive=true" : ""}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    ),
  createBusinessListOption: (
    accessToken: string,
    input: { type: BusinessListType; label: string },
  ) =>
    apiFetch<BusinessListOption>("/admin/business-lists", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      ...json(input),
    }),
  updateBusinessListOption: (
    accessToken: string,
    id: string,
    input: { label?: string; isActive?: boolean },
  ) =>
    apiFetch<BusinessListOption>(`/admin/business-lists/${id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${accessToken}` },
      ...json(input),
    }),
  employees: (accessToken: string, query = "") =>
    apiFetch<EmployeeRecord[]>(`/employees${query}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  employee: (accessToken: string, id: string) =>
    apiFetch<EmployeeRecord>(`/employees/${id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  createEmployee: (accessToken: string, input: EmployeeInput) =>
    apiFetch<EmployeeRecord>("/employees", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      ...json(input),
    }),
  updateEmployee: (
    accessToken: string,
    id: string,
    input: Partial<EmployeeInput>,
  ) =>
    apiFetch<EmployeeRecord>(`/employees/${id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${accessToken}` },
      ...json(input),
    }),
  customerSelectorOptions: (search = "", accessToken?: string) =>
    apiFetch<CustomerSelectorOption[]>(
      `/customers/selector-options${search ? `?search=${encodeURIComponent(search)}` : ""}`,
      accessToken
        ? { headers: { Authorization: `Bearer ${accessToken}` } }
        : undefined,
    ),
  customers: (query = "", accessToken?: string) =>
    apiFetch<PaginatedResponse<Customer>>(
      `/customers${query}`,
      accessToken
        ? { headers: { Authorization: `Bearer ${accessToken}` } }
        : undefined,
    ),
  createCustomer: (input: CustomerInput) =>
    apiFetch<Customer>("/customers", { method: "POST", ...json(input) }),
  updateCustomer: (
    id: string,
    input: Partial<Omit<CustomerInput, "ownerId">>,
  ) =>
    apiFetch<Customer>(`/customers/${id}`, { method: "PATCH", ...json(input) }),
  deleteCustomer: (id: string) =>
    apiFetch<Customer>(`/customers/${id}`, { method: "DELETE" }),
  customerCleanupImpact: (id: string) =>
    apiFetch<CustomerCleanupImpact>(`/admin/customer-cleanup/${id}/impact`),
  customerCleanup: (id: string, confirmationName: string) =>
    apiFetch<CustomerCleanupResult>(`/admin/customer-cleanup/${id}`, {
      method: "DELETE",
      ...json({ confirmationName }),
    }),
  properties: (query = "", accessToken?: string) =>
    apiFetch<PaginatedResponse<Property>>(
      `/properties${query}`,
      accessToken
        ? { headers: { Authorization: `Bearer ${accessToken}` } }
        : undefined,
    ),
  propertySelectorOptions: (customerId?: string) =>
    apiFetch<
      Array<
        Pick<Property, "id" | "customerId" | "name" | "addressLine1" | "city">
      >
    >(
      `/properties/selector-options${customerId ? `?customerId=${encodeURIComponent(customerId)}` : ""}`,
    ),
  createProperty: (input: PropertyInput) =>
    apiFetch<Property>("/properties", { method: "POST", ...json(input) }),
  updateProperty: (id: string, input: Partial<PropertyInput>) =>
    apiFetch<Property>(`/properties/${id}`, {
      method: "PATCH",
      ...json(input),
    }),
  deleteProperty: (id: string) =>
    apiFetch<Property>(`/properties/${id}`, { method: "DELETE" }),
  technicians: (query = "", accessToken?: string) =>
    apiFetch<PaginatedResponse<Technician>>(`/technicians${query}`, accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined),
  createTechnician: (input: TechnicianInput) =>
    apiFetch<Technician>("/technicians", { method: "POST", ...json(input) }),
  updateTechnician: (id: string, input: Partial<TechnicianInput>) =>
    apiFetch<Technician>(`/technicians/${id}`, {
      method: "PATCH",
      ...json(input),
    }),
  deleteTechnician: (id: string) =>
    apiFetch<Technician>(`/technicians/${id}`, { method: "DELETE" }),
  crews: (query = "", accessToken?: string) => apiFetch<PaginatedResponse<Crew>>(`/crews${query}`, accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined),
  crew: (id: string) => apiFetch<Crew>(`/crews/${id}`),
  createCrew: (input: CrewInput) =>
    apiFetch<Crew>("/crews", { method: "POST", ...json(input) }),
  updateCrew: (id: string, input: Partial<CrewInput>) =>
    apiFetch<Crew>(`/crews/${id}`, { method: "PATCH", ...json(input) }),
  deleteCrew: (id: string) =>
    apiFetch<Crew>(`/crews/${id}`, { method: "DELETE" }),
  shifts: (query = "", accessToken?: string) => apiFetch<PaginatedResponse<Shift>>(`/shifts${query}`, accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined),
  shift: (id: string) => apiFetch<Shift>(`/shifts/${id}`),
  createShift: (input: ShiftInput) =>
    apiFetch<Shift>("/shifts", { method: "POST", ...json(input) }),
  updateShift: (id: string, input: Partial<ShiftInput>) =>
    apiFetch<Shift>(`/shifts/${id}`, { method: "PATCH", ...json(input) }),
  copyShift: (id: string, input: Pick<ShiftInput, "startAt" | "endAt">) =>
    apiFetch<Shift>(`/shifts/${id}/copy`, { method: "POST", ...json(input) }),
  deleteShift: (id: string) =>
    apiFetch<Shift>(`/shifts/${id}`, { method: "DELETE" }),
  services: (query = "", accessToken?: string) =>
    apiFetch<PaginatedResponse<Service>>(`/services${query}`, accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined),
  createService: (input: ServiceInput) =>
    apiFetch<Service>("/services", { method: "POST", ...json(input) }),
  updateService: (id: string, input: Partial<ServiceInput>) =>
    apiFetch<Service>(`/services/${id}`, { method: "PATCH", ...json(input) }),
  cleaningJobTemplates: (query = "") =>
    apiFetch<PaginatedResponse<CleaningJobTemplate>>(
      `/cleaning-job-templates${query}`,
    ),
  createCleaningJobTemplate: (input: CleaningJobTemplateInput) =>
    apiFetch<CleaningJobTemplate>("/cleaning-job-templates", {
      method: "POST",
      ...json(input),
    }),
  updateCleaningJobTemplate: (
    id: string,
    input: Partial<CleaningJobTemplateInput>,
  ) =>
    apiFetch<CleaningJobTemplate>(`/cleaning-job-templates/${id}`, {
      method: "PATCH",
      ...json(input),
    }),
  deleteCleaningJobTemplate: (id: string) =>
    apiFetch<CleaningJobTemplate>(`/cleaning-job-templates/${id}`, {
      method: "DELETE",
    }),
  serviceScopeTemplates: (query = "") => apiFetch<ServiceScopeTemplate[]>(`/service-scope-templates${query}`),
  createServiceScopeTemplate: (serviceId:string,input:{name:string;sections:ScopeSectionInput[]}) => apiFetch<ServiceScopeTemplate>(`/services/${serviceId}/scope-templates`,{method:"POST",...json(input)}),
  createServiceScopeVersion: (templateId:string,sections:ScopeSectionInput[]) => apiFetch<ServiceScopeTemplateVersion>(`/service-scope-templates/${templateId}/versions`,{method:"POST",...json({sections})}),
  publishServiceScopeVersion: (id:string) => apiFetch<ServiceScopeTemplateVersion>(`/service-scope-template-versions/${id}/publish`,{method:"PATCH"}),
  retireServiceScopeVersion: (id:string) => apiFetch<ServiceScopeTemplateVersion>(`/service-scope-template-versions/${id}/retire`,{method:"PATCH"}),
  compareWorkOrderScope: (workOrderId:string,versionId:string) => apiFetch<ScopeComparison>(`/work-orders/${workOrderId}/execution-scope-comparison?templateVersionId=${encodeURIComponent(versionId)}`),
  adoptWorkOrderScope: (workOrderId:string,templateVersionId:string) => apiFetch<ExecutionScope>(`/work-orders/${workOrderId}/execution-scope-revisions`,{method:"POST",...json({templateVersionId})}),
  recurringServices: (accessToken?: string) =>
    apiFetch<RecurringServiceAgreement[]>("/recurring-services", accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined),
  createRecurringService: (input: RecurringServiceInput) =>
    apiFetch<RecurringServiceAgreement>("/recurring-services", {
      method: "POST",
      ...json(input),
    }),
  updateRecurringServiceStatus: (id: string, status: RecurringServiceStatus, autoResumeDate?: string | null) =>
    apiFetch<RecurringServiceAgreement>(`/recurring-services/${id}/status`, {
      method: "PATCH",
      ...json({ status, ...(autoResumeDate !== undefined ? { autoResumeDate } : {}) }),
    }),
  generateRecurringService: (id: string) =>
    apiFetch<WorkOrder | null>(`/recurring-services/${id}/generate`, {
      method: "POST",
    }),
  quotes: (query = "", accessToken?: string) =>
    apiFetch<PaginatedResponse<QuoteListItem>>(`/quotes${query}`, accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined),
  quote: (id: string) => apiFetch<QuoteDetail>(`/quotes/${id}`),
  quotePreflight: (id: string, expectedRevisionNumber: number) =>
    apiFetch<QuotePreflight>(
      `/quotes/${id}/preflight?expectedRevisionNumber=${expectedRevisionNumber}`,
    ),
  resolveQuote: (
    id: string,
    input: {
      expectedRevisionNumber: number;
      customer: { decision: QuoteResolutionDecision; customerId?: string };
      property: { decision: QuoteResolutionDecision; propertyId?: string };
    },
  ) =>
    apiFetch<QuoteDetail>(`/quotes/${id}/resolution`, {
      method: "PATCH",
      ...json(input),
    }),
  acceptQuote: (id: string, expectedRevisionNumber: number) =>
    apiFetch<QuoteDetail>(`/quotes/${id}/accept`, {
      method: "PATCH",
      ...json({ expectedRevisionNumber }),
    }),
  declineQuote: (id: string, expectedRevisionNumber: number, reason: string) =>
    apiFetch<QuoteDetail>(`/quotes/${id}/decline`, {
      method: "PATCH",
      ...json({ expectedRevisionNumber, reason }),
    }),
  workOrders: (query = "", accessToken?: string) =>
    apiFetch<PaginatedResponse<WorkOrder>>(
      `/work-orders${query}`,
      accessToken
        ? { headers: { Authorization: `Bearer ${accessToken}` } }
        : undefined,
    ),
  workOrder: (id: string) => apiFetch<WorkOrder>(`/work-orders/${id}`),
  workOrderAccessReadinessHistory: (id: string) => apiFetch<WorkOrderAccessReadinessEvent[]>(`/work-orders/${id}/access-readiness/history`),
  updateWorkOrderAccessReadiness: (id: string, state: WorkOrderAccessReadiness) => apiFetch<{id:string;accessReadiness:WorkOrderAccessReadiness}>(`/work-orders/${id}/access-readiness`, { method: "PATCH", ...json({ state }) }),
  temporaryAccessCredentials: (id:string) => apiFetch<TemporaryAccessCredential[]>(`/work-orders/${id}/temporary-access-credentials`),
  createTemporaryAccessCredential: (id:string,input:Record<string,unknown>) => apiFetch<TemporaryAccessCredential>(`/work-orders/${id}/temporary-access-credentials`,{method:"POST",...json(input)}),
  reviewTemporaryAccessCredential: (workOrderId:string,id:string,decision:"ACCEPT"|"REJECT",reason?:string) => apiFetch<TemporaryAccessCredential>(`/work-orders/${workOrderId}/temporary-access-credentials/${id}/review`,{method:"POST",...json({decision,reason})}),
  revokeTemporaryAccessCredential: (workOrderId:string,id:string,reason?:string) => apiFetch<TemporaryAccessCredential>(`/work-orders/${workOrderId}/temporary-access-credentials/${id}/revoke`,{method:"POST",...json({reason})}),
  revealTemporaryAccessCredential: (workOrderId:string,id:string) => apiFetch<{id:string;protectedText:string|null;attachmentStoragePath:string|null}>(`/work-orders/${workOrderId}/temporary-access-credentials/${id}/reveal`,{method:"POST"}),
  accessRecovery: (id:string) => apiFetch<AccessRecoverySummary>(`/work-orders/${id}/access-recovery`),
  initiateAccessRecovery: (id:string,input:{requestId:string;conversationId:string}) => apiFetch<unknown>(`/work-orders/${id}/access-recovery`,{method:"POST",...json(input)}),
  registerAccessRecoveryCandidate: (workOrderId:string,recoveryId:string,type:TemporaryAccessCredential["type"]) => apiFetch<TemporaryAccessCredential>(`/work-orders/${workOrderId}/access-recovery/${recoveryId}/credential-candidate`,{method:"POST",...json({type})}),
  createWorkOrder: (input: WorkOrderInput) =>
    apiFetch<WorkOrder>("/work-orders", { method: "POST", ...json(input) }),
  updateWorkOrder: (
    id: string,
    input: Partial<Omit<WorkOrderInput, "createdById">>,
  ) =>
    apiFetch<WorkOrder>(`/work-orders/${id}`, {
      method: "PATCH",
      ...json(input),
    }),
  assignWorkOrderTechnicians: (
    id: string,
    input: {
      technicianIds: string[];
      crewId?: string | null;
      jobLeaderId?: string | null;
    },
  ) =>
    apiFetch<WorkOrder>(`/work-orders/${id}/assignment`, {
      method: "PATCH",
      ...json(input),
    }),
  changeWorkOrderStatus: (
    id: string,
    input: { status: WorkOrderStatus; note?: string; actorId?: string },
  ) =>
    apiFetch<WorkOrder>(`/work-orders/${id}/status`, {
      method: "PATCH",
      ...json(input),
    }),
  acknowledgeWorkOrderCompletion: (id: string) => apiFetch(`/work-orders/${id}/completion/acknowledge`, { method: "POST" }),
  completionCorrections: (id:string) => apiFetch<CompletionCorrection[]>(`/work-orders/${id}/completion-corrections`),
  authorizeCompletionCorrection: (id:string,input:{operationId:string;reason:string;sectionIds:string[]}) => apiFetch<CompletionCorrection>(`/work-orders/${id}/completion-corrections`,{method:"POST",...json(input)}),
  workOrderTimeline: (id: string) =>
    apiFetch<WorkOrderActivity[]>(`/work-orders/${id}/timeline`),
  workOrderChecklist: (id: string) =>
    apiFetch<WorkOrderChecklistItem[]>(`/work-orders/${id}/checklist`),
  createWorkOrderChecklistItem: (id: string, description: string) =>
    apiFetch<WorkOrderChecklistItem>(`/work-orders/${id}/checklist`, {
      method: "POST",
      ...json({ description }),
    }),
  updateWorkOrderChecklistItem: (
    workOrderId: string,
    itemId: string,
    input: Partial<
      Pick<WorkOrderChecklistItem, "description" | "status" | "sortOrder">
    >,
  ) =>
    apiFetch<WorkOrderChecklistItem>(
      `/work-orders/${workOrderId}/checklist/${itemId}`,
      { method: "PATCH", ...json(input) },
    ),
  deleteWorkOrderChecklistItem: (workOrderId: string, itemId: string) =>
    apiFetch<WorkOrderChecklistItem>(
      `/work-orders/${workOrderId}/checklist/${itemId}`,
      { method: "DELETE" },
    ),
  workOrderPhotos: (id: string) =>
    apiFetch<WorkOrderPhoto[]>(`/work-orders/${id}/photos`),
  createWorkOrderPhoto: (
    id: string,
    input: Pick<
      WorkOrderPhoto,
      "category" | "url" | "storagePath" | "uploadedBy"
    >,
  ) =>
    apiFetch<WorkOrderPhoto>(`/work-orders/${id}/photos`, {
      method: "POST",
      ...json(input),
    }),
  deleteWorkOrderPhoto: (workOrderId: string, photoId: string) =>
    apiFetch<WorkOrderPhoto>(`/work-orders/${workOrderId}/photos/${photoId}`, {
      method: "DELETE",
    }),
  workOrderCustomerSignOff: (id: string) =>
    apiFetch<WorkOrderCustomerSignOff | null>(
      `/work-orders/${id}/customer-sign-off`,
    ),
  createWorkOrderCustomerSignOff: (
    id: string,
    input: Pick<
      WorkOrderCustomerSignOff,
      "customerName" | "signatureDataUrl"
    > & { note?: string },
  ) =>
    apiFetch<WorkOrderCustomerSignOff>(`/work-orders/${id}/customer-sign-off`, {
      method: "POST",
      ...json(input),
    }),
  deleteWorkOrder: (id: string) =>
    apiFetch<WorkOrder>(`/work-orders/${id}`, { method: "DELETE" }),
};

export type CompletionCorrection={id:string;status:"AUTHORIZED"|"IN_PROGRESS"|"RESUBMITTED";reason:string;affectedSectionIds:string[];createdAt:string;firstCorrectedAt:string|null;resubmittedAt:string|null;fieldResubmittedAt:string|null;originalCompletionOperationId:string;originalFieldCompletedAt:string;originalCompletionAcceptedAt:string;priorAcknowledgedAt:string|null;priorCorrespondenceEligibleAt:string|null;authorizedBy:{id:string;firstName:string;lastName:string};technician:{id:string;firstName:string;lastName:string};correctedOutcomes:Array<{id:string;outcome:string;reason:string|null;note:string|null;fieldRecordedAt:string;serverReceivedAt:string;section:{id:string;stableKey:string;title:string}}>};

export type TechnicianJob = {
  technicianId: string;
  id: string;
  reference: string | null;
  title: string;
  description: string | null;
  status: WorkOrderStatus;
  scheduledAt: string | null;
  accessReadiness: WorkOrderAccessReadiness;
  accessOperationallyResolved: boolean;
  preferredTimeWindow: PreferredTimeWindow | null;
  updatedAt: string;
  startedAt: string | null;
  jobLeaderId: string | null;
  isJobLeader: boolean;
  canStart: boolean;
  waitingForJobLeader: boolean;
  cacheable: boolean;
  service: { name: string; description: string | null } | null;
  addOns: Array<{ quantity: number; service: { name: string } }>;
  assignedTechnicians: Array<{
    technicianId: string;
    technician: Pick<Technician, "id" | "firstName" | "lastName">;
  }>;
  property: Pick<
    Property,
    | "name"
    | "addressLine1"
    | "addressLine2"
    | "city"
    | "province"
    | "postalCode"
    | "accessNotes"
    | "parkingNotes"
    | "bedrooms"
    | "bathrooms"
    | "livingAreas"
    | "storeys"
    | "floorSize"
    | "outdoorArea"
    | "hasPets"
    | "petNotes"
    | "hasCameras"
    | "offLimitsNotes"
    | "fragileItemNotes"
    | "productRestrictionNotes"
    | "allergyNotes"
  >;
  accessInstructions: string | null;
  parkingInstructions: string | null;
  keyHandover: string | null;
  keyHandoverDetails: string | null;
  someonePresent: boolean | null;
  ecoFriendlyProducts: boolean | null;
  customerDeclaredExistingDamage: string | null;
  startedScopeRevisionId: string | null;
  executionScope: ExecutionScope | null;
  localCompletion?: { operationId: string; syncState: "SYNC_PENDING" | "ACKNOWLEDGED" | "NEEDS_REVIEW"; fieldCompletedAt: string; lastError?: string };
  activeCompletionCorrection?: { id:string;status:"AUTHORIZED"|"IN_PROGRESS";reason:string;affectedSectionIds:string[];firstCorrectedAt:string|null;createdAt:string } | null;
};
export type EvidencePolicy = "NONE" | "ON_EXCEPTION" | "REQUIRED";
export type SectionOutcome = "PENDING" | "COMPLETED" | "NOT_COMPLETED";
export type ExecutionSection = {
  id: string;
  stableKey: string;
  title: string;
  quantity: number | null;
  requirements: string[];
  evidencePolicy: EvidencePolicy;
  currentOutcome: SectionOutcome;
  currentVersion: number;
  currentOutcomeEvent: {
    technicianId: string;
    reason: string | null;
    note: string | null;
    attentionLevel: string;
    fieldRecordedAt: string;
  } | null;
  evidence: Array<{
    localEvidenceId: string;
    syncState: string;
    capturedAt: string;
    serverAcknowledgedAt: string | null;
  }>;
};
export type ExecutionScope = {
  id: string;
  revision: number;
  additions: string[];
  exclusions: string[];
  createdAt: string;
  sections: ExecutionSection[];
};
export type TechnicianJobList = {
  technicianId: string;
  view: "today" | "upcoming" | "recent" | "cache";
  jobs: TechnicianJob[];
  serverTime: string;
};
export type StartJobOperation = {
  operationId: string;
  startedAt: string;
  expectedVersion: string;
  expectedScopeRevisionId: string;
};
export type SectionOutcomeOperation = {
  operationId: string;
  workOrderId: string;
  sectionId: string;
  scopeRevisionId: string;
  outcome: SectionOutcome;
  reason?: string;
  note?: string;
  fieldRecordedAt: string;
  expectedSectionVersion: number;
  correctionId?: string;
  evidence?: Array<{
    localEvidenceId: string;
    capturedAt: string;
    syncState: "CAPTURED_LOCAL" | "QUEUED" | "RETRY_PENDING";
  }>;
};
export type EvidenceAcknowledgement = {
  id: string;
  localEvidenceId: string;
  storagePath: string;
  syncState: "SERVER_ACKNOWLEDGED";
  serverAcknowledgedAt: string;
};
export type CompleteJobOperation = { operationId: string; scopeRevisionId: string; fieldCompletedAt: string; expectedVersion: string; expectedStatus: "ON_SITE" | "WAITING_FOR_PARTS" };
export type IncidentOperation = { operationId:string; workOrderId:string; category:"SAFETY_CRITICAL_STOP"|"PROPERTY_OR_ITEM_DAMAGE"|"CUSTOMER_OR_PROPERTY_CONDITION"|"OPERATIONAL_INCIDENT"; fieldReportedAt:string; sectionId?:string; note:string; evidence?:Array<{localEvidenceId:string;capturedAt:string;syncState:"CAPTURED_LOCAL"|"QUEUED"|"RETRY_PENDING"}> };
export type JobReview = {
  scopeRevisionId: string | null;
  accountedFor: number;
  totalSections: number;
  syncPending: number;
  attention: Array<{
    sectionId: string;
    title: string;
    code: string;
    message: string;
  }>;
  ready: boolean;
};

export const technicianApi = {
  jobs: (view: TechnicianJobList["view"]) =>
    apiFetch<TechnicianJobList>(`/technician/jobs?view=${view}`),
  job: (id: string) => apiFetch<TechnicianJob>(`/technician/jobs/${id}`),
  start: (id: string, operation: StartJobOperation) =>
    apiFetch<TechnicianJob>(`/technician/jobs/${id}/start`, {
      method: "POST",
      ...json(operation),
    }),
  outcome: (operation: SectionOutcomeOperation) =>
    apiFetch(
      operation.correctionId ? `/technician/jobs/${operation.workOrderId}/completion-corrections/${operation.correctionId}/sections/${operation.sectionId}/outcomes` : `/technician/jobs/${operation.workOrderId}/sections/${operation.sectionId}/outcomes`,
      { method: "POST", ...json(operation) },
    ),
  acknowledgeEvidence: (evidence: {
    evidenceId: string;
    workOrderId: string;
    scopeRevisionId: string;
    sectionId: string;
    purpose: string;
    capturedAt: string;
    storagePath: string;
  }) =>
    apiFetch<EvidenceAcknowledgement>(
      `/technician/jobs/${evidence.workOrderId}/sections/${evidence.sectionId}/evidence/${evidence.evidenceId}/acknowledge`,
      { method: "POST", ...json(evidence) },
    ),
  review: (id: string) => apiFetch<JobReview>(`/technician/jobs/${id}/review`),
  complete: (id: string, operation: CompleteJobOperation) => apiFetch<{id:string;status:"COMPLETED";completionOperationId:string;fieldCompletedAt:string;completionAcceptedAt:string}>(`/technician/jobs/${id}/complete`, { method: "POST", ...json(operation) }),
  resubmitCorrection: (workOrderId:string,correctionId:string,operation:{operationId:string;fieldResubmittedAt:string}) => apiFetch(`/technician/jobs/${workOrderId}/completion-corrections/${correctionId}/resubmit`,{method:"POST",...json(operation)}),
  reportIncident: (operation:IncidentOperation) => apiFetch(`/technician/jobs/${operation.workOrderId}/incidents`,{method:"POST",...json(operation)}),
};
