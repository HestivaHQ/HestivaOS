"use client";
import Link from "next/link";
import { ChangeEvent, useCallback, useEffect, useState } from "react";
import {
  ApiError,
  JobReview,
  SectionOutcome,
  technicianApi,
  TechnicianJob,
} from "../../../lib/api";
import {
  cleanupAcknowledgedBlobs,
  cachedJob,
  cacheJobs,
  evidenceForJob,
  LocalEvidence,
  pendingEvidence,
  pendingOutcomes,
  pendingStarts,
  removeCachedJob,
  removePendingStart,
  saveEvidence,
  savePendingOutcome,
  savePendingStart,
  updateEvidence,
} from "./offline-store";
import { compressPhoto } from "../../../lib/photo-compression";
import { createClient } from "../../../lib/supabase/client";
const reasons = [
  ["CUSTOMER_DECLINED", "Customer declined"],
  ["INACCESSIBLE", "Area/item inaccessible"],
  ["SAFETY_CONCERN", "Safety concern"],
  ["PRE_EXISTING_CONDITION_OR_DAMAGE", "Existing condition or damage"],
  ["REQUIRED_RESOURCE_UNAVAILABLE", "Required resource unavailable"],
  ["SCOPE_OR_CONDITION_MISMATCH", "Scope or condition mismatch"],
  ["OTHER", "Other"],
];
export function JobBrief({ id }: { id: string }) {
  const [job, setJob] = useState<TechnicianJob | null>(null),
    [offline, setOffline] = useState(false),
    [pending, setPending] = useState(0),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [exception, setException] = useState<string | null>(null),
    [reason, setReason] = useState(""),
    [note, setNote] = useState(""),
    [review, setReview] = useState<JobReview | null>(null),
    [evidence, setEvidence] = useState<LocalEvidence[]>([]);
  const reconcile = useCallback(async () => {
    try {
      for (const item of await pendingEvidence()) {
        if (!item.blob) continue;
        try {
          await updateEvidence(item.evidenceId, {
            syncState: "UPLOADING",
            lastError: undefined,
          });
          const supabase = createClient(),
            bucket =
              process.env.NEXT_PUBLIC_SUPABASE_WORK_ORDER_PHOTOS_BUCKET ||
              "work-order-photos";
          const { error } = await supabase.storage
            .from(bucket)
            .upload(item.storagePath, item.blob, {
              contentType: "image/webp",
              upsert: true,
            });
          if (error) throw error;
          const ack = await technicianApi.acknowledgeEvidence(item);
          await updateEvidence(item.evidenceId, {
            syncState: "SERVER_ACKNOWLEDGED",
            serverEvidenceId: ack.id,
            acknowledgedAt: ack.serverAcknowledgedAt,
          });
          await cleanupAcknowledgedBlobs(1);
        } catch (error) {
          await updateEvidence(item.evidenceId, {
            syncState: "RETRY_PENDING",
            lastError:
              error instanceof Error
                ? error.message
                : "Upload could not be confirmed.",
          });
        }
      }
      for (const op of await pendingStarts()) {
        try {
          await technicianApi.start(op.workOrderId, op);
          await removePendingStart(op.operationId);
        } catch {}
      }
      for (const op of await pendingOutcomes()) {
        try {
          await technicianApi.outcome(op);
          await removePendingStart(op.operationId);
        } catch {}
      }
      const fresh = await technicianApi.job(id);
      await cacheJobs([fresh]);
      setJob(fresh);
      setOffline(false);
    } catch (error) {
      if (
        error instanceof ApiError &&
        (error.status === 403 || error.status === 404)
      ) {
        setMessage(
          "This job is no longer assigned. Photos remain protected on this device for support.",
        );
        setOffline(false);
      } else {
        setJob((await cachedJob(id)) ?? null);
        setOffline(true);
      }
    } finally {
      setEvidence(await evidenceForJob(id));
      setPending(
        (await pendingStarts()).length +
          (await pendingOutcomes()).length +
          (await pendingEvidence()).length,
      );
    }
  }, [id]);
  useEffect(() => {
    void reconcile();
    const online = () => void reconcile();
    window.addEventListener("online", online);
    return () => window.removeEventListener("online", online);
  }, [reconcile]);
  async function start() {
    if (!job?.canStart || !job.executionScope) return;
    setBusy(true);
    const operation = {
      kind: "START_JOB" as const,
      workOrderId: id,
      operationId: crypto.randomUUID(),
      startedAt: new Date().toISOString(),
      expectedVersion: job.updatedAt,
      expectedScopeRevisionId: job.executionScope.id,
      queuedAt: new Date().toISOString(),
    };
    try {
      await savePendingStart(operation);
      const local = {
        ...job,
        startedAt: operation.startedAt,
        startedScopeRevisionId: job.executionScope.id,
        canStart: false,
        status: "ON_SITE" as const,
      };
      await cacheJobs([local]);
      setJob(local);
      setMessage("Job started on this device · Sync pending");
      if (navigator.onLine) await reconcile();
    } catch {
      setMessage("Could not safely save the start. Try again.");
    } finally {
      setBusy(false);
    }
  }
  async function capture(
    event: ChangeEvent<HTMLInputElement>,
    sectionId: string,
    purpose: LocalEvidence["purpose"],
  ) {
    const original = event.target.files?.[0];
    if (!original || !job?.executionScope) return;
    setBusy(true);
    try {
      const blob = await compressPhoto(original),
        evidenceId = crypto.randomUUID(),
        storagePath = `${id}/${job.executionScope.id}/${sectionId}/${evidenceId}.webp`;
      await saveEvidence({
        evidenceId,
        workOrderId: id,
        scopeRevisionId: job.executionScope.id,
        sectionId,
        technicianId: job.technicianId,
        purpose,
        capturedAt: new Date().toISOString(),
        syncState: "QUEUED",
        storagePath,
        blob,
      });
      setEvidence(await evidenceForJob(id));
      setMessage("✓ Photo saved on device · Upload pending");
      event.target.value = "";
      if (navigator.onLine) void reconcile();
    } catch (error) {
      setMessage(
        error instanceof DOMException && error.name === "QuotaExceededError"
          ? "Device storage is full. The photo was not saved; free space and try again."
          : error instanceof Error
            ? error.message
            : "The photo could not be safely saved.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function outcome(sectionId: string, value: SectionOutcome) {
    if (!job?.executionScope) return;
    const section = job.executionScope.sections.find((s) => s.id === sectionId);
    if (!section) return;
    const captures = evidence.filter((e) => e.sectionId === sectionId);
    const requires =
      section.evidencePolicy === "REQUIRED" ||
      (section.evidencePolicy === "ON_EXCEPTION" && value === "NOT_COMPLETED");
    if (requires && !captures.length) {
      setMessage("Add and save the required photo on this device first.");
      return;
    }
    const operation = {
      kind: "SECTION_OUTCOME" as const,
      queuedAt: new Date().toISOString(),
      operationId: crypto.randomUUID(),
      workOrderId: id,
      sectionId,
      scopeRevisionId: job.executionScope.id,
      outcome: value,
      reason: value === "NOT_COMPLETED" ? reason : undefined,
      note: value === "NOT_COMPLETED" ? note : undefined,
      fieldRecordedAt: new Date().toISOString(),
      expectedSectionVersion: section.currentVersion,
      evidence: captures.map((item) => ({
        localEvidenceId: item.evidenceId,
        capturedAt: item.capturedAt,
        syncState:
          item.syncState === "RETRY_PENDING"
            ? ("RETRY_PENDING" as const)
            : ("QUEUED" as const),
      })),
    };
    try {
      await savePendingOutcome(operation);
      const updated = {
        ...job,
        executionScope: {
          ...job.executionScope,
          sections: job.executionScope.sections.map((s) =>
            s.id === sectionId
              ? {
                  ...s,
                  currentOutcome: value,
                  currentVersion: s.currentVersion + 1,
                }
              : s,
          ),
        },
      };
      await cacheJobs([updated]);
      setJob(updated);
      setException(null);
      setReason("");
      setNote("");
      setMessage("Saved on this device · Sync pending");
      if (navigator.onLine) await reconcile();
    } catch {
      setMessage("Could not safely save this outcome. Try again.");
    }
  }
  async function loadReview() {
    try {
      setReview(await technicianApi.review(id));
    } catch {
      setMessage(
        offline
          ? "Review needs a connection for authoritative checks."
          : "Review is available only to the Job Leader.",
      );
    }
  }
  if (!job)
    return (
      <section className="technicianPage">
        <Link href="/technician">← Today</Link>
        <p>
          {offline
            ? "This job is not available offline on this device."
            : "Loading Job Brief…"}
        </p>
      </section>
    );
  const scope = job.executionScope;
  return (
    <section className="technicianPage jobBrief">
      <Link href="/technician">← Assigned jobs</Link>
      <div className="technicianHeading">
        <p className="eyebrow">Job brief</p>
        <h1>{job.service?.name ?? job.title}</h1>
        <span className={`syncBadge ${offline || pending ? "pending" : ""}`}>
          {offline
            ? "Offline · Saved on device"
            : pending
              ? `${pending} update waiting to sync`
              : "Synced"}
        </span>
      </div>
      {message ? <p className="syncNotice">{message}</p> : null}
      <article>
        <h2>Job</h2>
        <p>
          <strong>{job.reference ?? "Work order"}</strong>
          <br />
          {job.property.addressLine1}, {job.property.city}
          <br />
          <span className="statusPill">{job.status.replaceAll("_", " ")}</span>
        </p>
      </article>
      <article>
        <h2>Team</h2>
        {job.assignedTechnicians.map((x) => (
          <p key={x.technicianId}>
            {x.technician.firstName} {x.technician.lastName}
            {x.technicianId === job.jobLeaderId ? " · Job Leader" : ""}
          </p>
        ))}
      </article>
      {scope ? (
        <article className="executionChecklist">
          <h2>Execution scope · revision {scope.revision}</h2>
          {scope.additions.length ? (
            <p>
              <strong>Additions:</strong> {scope.additions.join(" · ")}
            </p>
          ) : null}
          {scope.exclusions.length ? (
            <p>
              <strong>Exclusions:</strong> {scope.exclusions.join(" · ")}
            </p>
          ) : null}
          {scope.sections.map((section) => (
            <div className="executionSection" key={section.id}>
              <div>
                <strong>
                  {section.currentOutcome === "COMPLETED"
                    ? "✓ "
                    : section.currentOutcome === "NOT_COMPLETED"
                      ? "! "
                      : "○ "}
                  {section.title}
                </strong>
                <span>{section.currentOutcome.replaceAll("_", " ")}</span>
              </div>
              <details>
                <summary>Expected work</summary>
                <ul>
                  {section.requirements.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
                <p>
                  Evidence:{" "}
                  {section.evidencePolicy === "NONE"
                    ? "not normally required"
                    : section.evidencePolicy === "ON_EXCEPTION"
                      ? "required for exceptions"
                      : "required before completion"}
                </p>
              </details>
              {job.startedAt ? (
                <div className="sectionActions">
                  {section.evidencePolicy === "REQUIRED" ? (
                    <label>
                      Add required photo
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        capture="environment"
                        disabled={busy}
                        onChange={(event) =>
                          void capture(
                            event,
                            section.id,
                            "REQUIRED_SECTION_EVIDENCE",
                          )
                        }
                      />
                    </label>
                  ) : null}
                  {evidence
                    .filter((item) => item.sectionId === section.id)
                    .map((item) => (
                      <small key={item.evidenceId}>
                        ✓ Photo saved on device ·{" "}
                        {item.syncState === "SERVER_ACKNOWLEDGED"
                          ? "Synced"
                          : item.syncState === "RETRY_PENDING"
                            ? "Upload retry pending"
                            : "Upload pending"}
                      </small>
                    ))}
                  <button onClick={() => void outcome(section.id, "COMPLETED")}>
                    Completed
                  </button>
                  <button onClick={() => setException(section.id)}>
                    Not completed
                  </button>
                </div>
              ) : null}
              {exception === section.id ? (
                <div className="exceptionForm">
                  <label>
                    Reason
                    <select
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    >
                      <option value="">Choose a reason</option>
                      {reasons.map((r) => (
                        <option value={r[0]} key={r[0]}>
                          {r[1]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Short note
                    <textarea
                      maxLength={300}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />
                  </label>
                  {section.evidencePolicy === "ON_EXCEPTION" ? (
                    <label>
                      Add supporting photo
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        capture="environment"
                        disabled={busy}
                        onChange={(event) =>
                          void capture(event, section.id, "EXCEPTION_EVIDENCE")
                        }
                      />
                    </label>
                  ) : null}
                  <button
                    disabled={!reason || !note.trim()}
                    onClick={() => void outcome(section.id, "NOT_COMPLETED")}
                  >
                    Save not completed
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </article>
      ) : (
        <p className="waitingState">
          Execution Scope has not been prepared. The job cannot start.
        </p>
      )}
      {job.canStart ? (
        <button
          className="technicianStart"
          disabled={busy || !scope}
          onClick={() => void start()}
        >
          {busy ? "Saving…" : "Start Job"}
        </button>
      ) : job.waitingForJobLeader ? (
        <p className="waitingState">Waiting for Job Leader to start the job</p>
      ) : null}
      {job.isJobLeader && job.startedAt ? (
        <article className="jobReview">
          <h2>Review job</h2>
          <button onClick={() => void loadReview()}>Check readiness</button>
          {review ? (
            <>
              <p>
                <strong>
                  {review.accountedFor} of {review.totalSections}
                </strong>{" "}
                sections accounted for
              </p>
              <p>{review.syncPending} evidence item(s) sync pending</p>
              {review.attention.length ? (
                <ul>
                  {review.attention.map((a, i) => (
                    <li key={`${a.sectionId}-${i}`}>
                      <strong>{a.title}</strong> — {a.message}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="reviewReady">Ready to complete later</p>
              )}
            </>
          ) : null}
        </article>
      ) : null}
    </section>
  );
}
