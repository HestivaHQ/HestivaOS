"use client";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  api,
  BusinessListOption,
  BusinessListType,
  EmployeeInput,
  EmployeeRecord,
} from "../../lib/api";
import { createClient } from "../../lib/supabase/client";
const blank: EmployeeInput = {
  employeeReference: "",
  firstName: "",
  lastName: "",
  preferredName: "",
  phone: "",
  email: "",
  residentialAddress: "",
  emergencyContactName: "",
  emergencyRelationship: "",
  emergencyContactPhone: "",
  status: "ACTIVE",
  jobTitleOptionId: null,
  departmentOptionId: null,
  startDate: "",
  endDate: "",
  internalNotes: "",
};
async function token() {
  const {
    data: { session },
  } = await createClient().auth.getSession();
  if (!session?.access_token)
    throw new Error("Authenticated session is required.");
  return session.access_token;
}
const value = (record: EmployeeRecord): EmployeeInput => ({
  employeeReference: record.employeeReference,
  firstName: record.firstName,
  lastName: record.lastName,
  preferredName: record.preferredName ?? "",
  phone: record.phone ?? "",
  email: record.email ?? "",
  residentialAddress: record.residentialAddress ?? "",
  emergencyContactName: record.emergencyContactName ?? "",
  emergencyRelationship: record.emergencyRelationship ?? "",
  emergencyContactPhone: record.emergencyContactPhone ?? "",
  status: record.status,
  jobTitleOptionId: record.jobTitleOptionId,
  departmentOptionId: record.departmentOptionId,
  startDate: record.startDate?.slice(0, 10) ?? "",
  endDate: record.endDate?.slice(0, 10) ?? "",
  internalNotes: record.internalNotes ?? "",
});
export function EmployeesManager() {
  const [items, setItems] = useState<EmployeeRecord[]>([]),
    [options, setOptions] = useState<BusinessListOption[]>([]),
    [newOption, setNewOption] = useState({
      type: "JOB_TITLE" as BusinessListType,
      label: "",
    }),
    [form, setForm] = useState<EmployeeInput>(blank);
  const [editing, setEditing] = useState<EmployeeRecord | null>(null),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState("ALL"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  async function load() {
    try {
      const accessToken = await token();
      setOptions(await api.businessLists(accessToken, true));
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (status !== "ALL") params.set("status", status);
      setItems(
        await api.employees(accessToken, params.size ? `?${params}` : ""),
      );
      setError("");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to load employee records.",
      );
    }
  }
  useEffect(() => {
    const timeout = setTimeout(() => void load(), 200);
    return () => clearTimeout(timeout);
  }, [search, status]);
  async function addOption() {
    if (!newOption.label.trim()) return;
    try {
      await api.createBusinessListOption(await token(), newOption);
      setNewOption((current) => ({ ...current, label: "" }));
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to add business list option.",
      );
    }
  }
  async function toggleOption(option: BusinessListOption) {
    try {
      await api.updateBusinessListOption(await token(), option.id, {
        isActive: !option.isActive,
      });
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to update business list option.",
      );
    }
  }
  const selected = useMemo(
    () =>
      editing ? (items.find((x) => x.id === editing.id) ?? editing) : null,
    [editing, items],
  );
  function field<K extends keyof EmployeeInput>(key: K, val: EmployeeInput[K]) {
    setForm((current) => ({ ...current, [key]: val }));
  }
  function begin(record: EmployeeRecord) {
    setEditing(record);
    setForm(value(record));
    setMessage("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const saved = editing
        ? await api.updateEmployee(await token(), editing.id, form)
        : await api.createEmployee(await token(), form);
      await load();
      setEditing(saved);
      setForm(value(saved));
      setMessage(
        editing ? "Employee record saved." : "Employee record created.",
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to save employee record.",
      );
    } finally {
      setBusy(false);
    }
  }
  const input = (key: keyof EmployeeInput, label: string, type = "text") => (
    <label>
      {label}
      <input
        type={type}
        value={(form[key] as string) ?? ""}
        onChange={(e) => field(key, e.target.value as never)}
      />
    </label>
  );
  return (
    <>
      <header className="pageHeader">
        <div>
          <p className="eyebrow">Administration</p>
          <h2>Employee Records</h2>
          <p>
            Lean workforce records, kept separate from personal profiles and OS
            access.
          </p>
        </div>
        <button
          type="button"
          className="primaryButton"
          onClick={() => {
            setEditing(null);
            setForm(blank);
          }}
        >
          New employee
        </button>
      </header>
      {error ? (
        <p className="errorBanner" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="successBanner" role="status">
          {message}
        </p>
      ) : null}
      <div className="employeeLayout">
        <form className="employeeForm" onSubmit={save}>
          <section className="panel employeeSection">
            <h3>Identity</h3>
            <div className="employeeFields">
              {input("employeeReference", "Employee reference")}
              {input("firstName", "First name")}
              {input("lastName", "Last name")}
              {input("preferredName", "Preferred / display name")}
            </div>
          </section>
          <section className="panel employeeSection">
            <h3>Contact</h3>
            <div className="employeeFields">
              {input("phone", "Primary phone", "tel")}
              {input("email", "Contact email", "email")}
              <label className="wideField">
                Residential / home address
                <textarea
                  rows={3}
                  value={form.residentialAddress ?? ""}
                  onChange={(e) => field("residentialAddress", e.target.value)}
                />
              </label>
            </div>
          </section>
          <section className="panel employeeSection">
            <h3>Emergency Contact</h3>
            <p>One primary contact for operational emergencies.</p>
            <div className="employeeFields">
              {input("emergencyContactName", "Full name")}
              {input("emergencyRelationship", "Relationship")}
              {input("emergencyContactPhone", "Phone number", "tel")}
            </div>
          </section>
          <section className="panel employeeSection">
            <h3>Employment</h3>
            <div className="employeeFields">
              <label>
                Employment status
                <select
                  value={form.status}
                  onChange={(e) =>
                    field("status", e.target.value as EmployeeInput["status"])
                  }
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </label>
              <label>
                Job title / position
                <select
                  value={form.jobTitleOptionId ?? ""}
                  onChange={(e) =>
                    field("jobTitleOptionId", e.target.value || null)
                  }
                >
                  <option value="">
                    {editing?.jobTitle && !editing.jobTitleOptionId
                      ? `Historical: ${editing.jobTitle}`
                      : "Select a job title"}
                  </option>
                  {options
                    .filter((x) => x.type === "JOB_TITLE" && x.isActive)
                    .map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.label}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Department / operational area
                <select
                  value={form.departmentOptionId ?? ""}
                  onChange={(e) =>
                    field("departmentOptionId", e.target.value || null)
                  }
                >
                  <option value="">
                    {editing?.department && !editing.departmentOptionId
                      ? `Historical: ${editing.department}`
                      : "Select a department"}
                  </option>
                  {options
                    .filter((x) => x.type === "DEPARTMENT" && x.isActive)
                    .map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.label}
                      </option>
                    ))}
                </select>
              </label>
              {input("startDate", "Start date", "date")}
              {input("endDate", "End date", "date")}
            </div>
          </section>
          <section className="panel employeeSection">
            <h3>Operations</h3>
            <p>
              {selected?.technician
                ? `Linked technician: ${selected.technician.firstName} ${selected.technician.lastName}. Crew: ${selected.technician.crewMembership?.crew.name ?? "None"}. Existing shifts and work assignments remain in Operations.`
                : "No Technician record linked. Office employees do not require a Technician record."}
            </p>
          </section>
          <section className="panel employeeSection">
            <h3>OS Access</h3>
            {selected?.user ? (
              <>
                <p>
                  <strong>
                    {selected.user.status === "ACTIVE" ? "Active" : "Disabled"}
                  </strong>{" "}
                  · Role: {selected.user.role}
                </p>
                <Link href="/admin/settings/user-access">Manage access</Link>
              </>
            ) : (
              <>
                <p>
                  <strong>None</strong> — this employee has no linked Hestiva OS
                  account.
                </p>
                <Link href="/admin/settings/user-access">
                  Go to User Access
                </Link>
              </>
            )}
          </section>
          <section className="panel employeeSection">
            <h3>Internal Notes</h3>
            <p>
              Operational or employment context only. Never enter secrets,
              financial PINs, or medical records.
            </p>
            <textarea
              rows={4}
              value={form.internalNotes ?? ""}
              onChange={(e) => field("internalNotes", e.target.value)}
            />
          </section>
          <div className="saveProfileBar">
            <p>
              {editing
                ? "Editing an existing employee record."
                : "Creating a workforce record does not create OS access."}
            </p>
            <button className="primaryButton" disabled={busy}>
              {busy ? "Saving…" : "Save changes"}
            </button>
          </div>
          <section className="panel employeeSection">
            <h3>Business Lists</h3>
            <p>
              Admins control the job titles and departments available for new
              assignments. Deactivated values remain visible on existing
              records.
            </p>
            <div className="employeeFields">
              <label>
                List
                <select
                  value={newOption.type}
                  onChange={(e) =>
                    setNewOption((current) => ({
                      ...current,
                      type: e.target.value as BusinessListType,
                    }))
                  }
                >
                  <option value="JOB_TITLE">Job Titles</option>
                  <option value="DEPARTMENT">Departments</option>
                </select>
              </label>
              <label>
                New option
                <input
                  value={newOption.label}
                  onChange={(e) =>
                    setNewOption((current) => ({
                      ...current,
                      label: e.target.value,
                    }))
                  }
                />
              </label>
              <button
                type="button"
                className="primaryButton"
                onClick={() => void addOption()}
              >
                Add option
              </button>
            </div>
            {options.map((option) => (
              <div className="lookupOption" key={option.id}>
                <span>
                  {option.type === "JOB_TITLE" ? "Job Title" : "Department"} ·{" "}
                  {option.label}
                </span>
                <button type="button" onClick={() => void toggleOption(option)}>
                  {option.isActive ? "Deactivate" : "Reactivate"}
                </button>
              </div>
            ))}
          </section>
        </form>
        <aside className="panel employeeList">
          <div className="employeeFilters">
            <label>
              Search
              <input
                type="search"
                placeholder="Name, phone or email"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <label>
              Status
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="ALL">All</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </label>
          </div>
          {items.map((item) => (
            <article className="employeeCard" key={item.id}>
              <div>
                <strong>
                  {item.preferredName || `${item.firstName} ${item.lastName}`}
                </strong>
                <p>
                  {item.jobTitle || "No job title"} ·{" "}
                  {item.technician?.crewMembership?.crew.name || "No crew"}
                </p>
                <p>
                  OS Access:{" "}
                  {item.user
                    ? item.user.status === "ACTIVE"
                      ? `Active · ${item.user.role}`
                      : `Disabled · ${item.user.role}`
                    : "None"}
                </p>
              </div>
              <div>
                <span className="statusPill">{item.status}</span>
                <button type="button" onClick={() => begin(item)}>
                  Manage
                </button>
              </div>
            </article>
          ))}
          {!items.length ? (
            <p className="emptyState">No employee records found.</p>
          ) : null}
        </aside>
      </div>
    </>
  );
}
