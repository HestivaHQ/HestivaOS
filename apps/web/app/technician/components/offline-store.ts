import type {
  SectionOutcomeOperation,
  StartJobOperation,
  CompleteJobOperation,
  IncidentOperation,
  TechnicianJob,
} from "../../../lib/api";
export type PendingStart = StartJobOperation & {
  workOrderId: string;
  kind: "START_JOB";
  queuedAt: string;
};
export type PendingOutcome = SectionOutcomeOperation & {
  kind: "SECTION_OUTCOME";
  queuedAt: string;
};
export type PendingCompletion = CompleteJobOperation & { workOrderId:string; jobLeaderTechnicianId:string; kind:"COMPLETE_JOB"; queuedAt:string; localSyncState:"SYNC_PENDING"|"ACKNOWLEDGED"|"NEEDS_REVIEW"; acknowledgedAt?:string; lastError?:string };
export type PendingIncident = IncidentOperation & {kind:"REPORT_INCIDENT";queuedAt:string;localSyncState:"SYNC_PENDING"|"ACKNOWLEDGED"|"NEEDS_REVIEW";lastError?:string};
export type EvidenceSyncState =
  | "CAPTURED_LOCAL"
  | "QUEUED"
  | "UPLOADING"
  | "SERVER_ACKNOWLEDGED"
  | "RETRY_PENDING";
export type LocalEvidence = {
  evidenceId: string;
  workOrderId: string;
  scopeRevisionId: string;
  sectionId: string;
  technicianId: string;
  purpose: "REQUIRED_SECTION_EVIDENCE" | "EXCEPTION_EVIDENCE" | "INCIDENT_EVIDENCE";
  capturedAt: string;
  syncState: EvidenceSyncState;
  storagePath: string;
  blob: Blob | null;
  lastError?: string;
  serverEvidenceId?: string;
  acknowledgedAt?: string;
};
const DB = "homent-technician";
export const VERSION = 5;
function open() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB, VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("jobs"))
        db.createObjectStore("jobs", { keyPath: "id" });
      if (!db.objectStoreNames.contains("operations"))
        db.createObjectStore("operations", { keyPath: "operationId" });
      if (!db.objectStoreNames.contains("evidence")) {
        const evidence = db.createObjectStore("evidence", {
          keyPath: "evidenceId",
        });
        evidence.createIndex("syncState", "syncState");
        evidence.createIndex("workOrderId", "workOrderId");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function transaction<T>(
  storeName: "jobs" | "operations" | "evidence",
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
) {
  const db = await open();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const request = run(tx.objectStore(storeName));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}
export async function cacheJobs(jobs: TechnicianJob[]) {
  const db = await open();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("jobs", "readwrite");
    for (const job of jobs) tx.objectStore("jobs").put(job);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

export async function replaceAssignedCache(jobs: TechnicianJob[]) {
  const [existing, pending] = await Promise.all([
    cachedJobs(),
    pendingStarts(),
  ]);
  const keep = new Set([
    ...jobs.map((job) => job.id),
    ...pending.map((operation) => operation.workOrderId),
  ]);
  const db = await open();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("jobs", "readwrite");
    const store = tx.objectStore("jobs");
    for (const job of existing) if (!keep.has(job.id)) store.delete(job.id);
    for (const job of jobs) store.put(job);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

export const cachedJobs = () =>
  transaction<TechnicianJob[]>("jobs", "readonly", (store) => store.getAll());
export const cachedJob = (id: string) =>
  transaction<TechnicianJob | undefined>("jobs", "readonly", (store) =>
    store.get(id),
  );
export const savePendingStart = (operation: PendingStart) =>
  transaction<IDBValidKey>("operations", "readwrite", (store) =>
    store.add(operation),
  );
export const pendingStarts = async () =>
  (
    await transaction<Array<PendingStart | PendingOutcome | PendingCompletion>>(
      "operations",
      "readonly",
      (store) => store.getAll(),
    )
  ).filter((x) => x.kind === "START_JOB") as PendingStart[];
export const savePendingOutcome = (operation: PendingOutcome) =>
  transaction<IDBValidKey>("operations", "readwrite", (store) =>
    store.add(operation),
  );
export const pendingOutcomes = async () =>
  (
    await transaction<Array<PendingStart | PendingOutcome | PendingCompletion>>(
      "operations",
      "readonly",
      (store) => store.getAll(),
    )
  ).filter((x) => x.kind === "SECTION_OUTCOME") as PendingOutcome[];
export const removePendingStart = (id: string) =>
  transaction<undefined>(
    "operations",
    "readwrite",
    (store) => store.delete(id) as IDBRequest<undefined>,
  );
export const saveCompletion = (operation: PendingCompletion) => transaction<IDBValidKey>("operations", "readwrite", (store) => store.put(operation));
export const completions = async () => ((await transaction<Array<PendingStart|PendingOutcome|PendingCompletion>>("operations","readonly",store=>store.getAll())).filter(x=>x.kind==="COMPLETE_JOB") as PendingCompletion[]);
export const pendingCompletions = async () => (await completions()).filter(x=>x.localSyncState==="SYNC_PENDING");
export const completionForJob = async (workOrderId:string) => (await completions()).find(x=>x.workOrderId===workOrderId);
export const saveIncident = (operation:PendingIncident)=>transaction<IDBValidKey>("operations","readwrite",store=>store.put(operation));
export const incidents = async()=>((await transaction<Array<PendingStart|PendingOutcome|PendingCompletion|PendingIncident>>("operations","readonly",store=>store.getAll())).filter(x=>x.kind==="REPORT_INCIDENT") as PendingIncident[]);
export const pendingIncidents=async()=>(await incidents()).filter(x=>x.localSyncState==="SYNC_PENDING");

export const removeCachedJob = (id: string) =>
  transaction<undefined>(
    "jobs",
    "readwrite",
    (store) => store.delete(id) as IDBRequest<undefined>,
  );

export const saveEvidence = (evidence: LocalEvidence) =>
  transaction<IDBValidKey>("evidence", "readwrite", (store) =>
    store.put(evidence),
  );
export const evidenceForJob = async (workOrderId: string) =>
  (
    await transaction<LocalEvidence[]>("evidence", "readonly", (store) =>
      store.getAll(),
    )
  ).filter((item) => item.workOrderId === workOrderId);
export const pendingEvidence = async () =>
  (
    await transaction<LocalEvidence[]>("evidence", "readonly", (store) =>
      store.getAll(),
    )
  ).filter((item) => item.syncState !== "SERVER_ACKNOWLEDGED");
export async function updateEvidence(
  evidenceId: string,
  patch: Partial<LocalEvidence>,
) {
  const current = await transaction<LocalEvidence | undefined>(
    "evidence",
    "readonly",
    (store) => store.get(evidenceId),
  );
  if (!current) return;
  await saveEvidence({ ...current, ...patch });
}
export async function cleanupAcknowledgedBlobs(limit = 10) {
  const all = await transaction<LocalEvidence[]>(
    "evidence",
    "readonly",
    (store) => store.getAll(),
  );
  for (const item of all
    .filter((x) => x.syncState === "SERVER_ACKNOWLEDGED" && x.blob)
    .slice(0, limit))
    await saveEvidence({ ...item, blob: null });
}
export const removeLocalEvidence = (id: string) =>
  transaction<undefined>(
    "evidence",
    "readwrite",
    (store) => store.delete(id) as IDBRequest<undefined>,
  );
