"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AdminUser, api, EmployeeRecord, Technician } from "../../lib/api";
import { createClient } from "../../lib/supabase/client";

async function accessToken() {
  const {
    data: { session },
  } = await createClient().auth.getSession();
  if (!session?.access_token) {
    throw new Error("Authenticated session is required.");
  }
  return session.access_token;
}

export function EmployeeWorkforceLinks() {
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [employeeId, setEmployeeId] = useState("");
  const [userId, setUserId] = useState("");
  const [technicianId, setTechnicianId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const selectedEmployee = useMemo(
    () => employees.find((employee) => employee.id === employeeId) ?? null,
    [employeeId, employees],
  );
  const selectedUser = useMemo(
    () => users.find((user) => user.id === userId) ?? null,
    [userId, users],
  );
  const selectedTechnician = useMemo(
    () => technicians.find((technician) => technician.id === technicianId) ?? null,
    [technicianId, technicians],
  );

  async function load() {
    try {
      const token = await accessToken();
      const [employeeRows, userRows, technicianRows] = await Promise.all([
        api.employees(token),
        api.adminUsers(token),
        api.technicians("?page=1&pageSize=100", token),
      ]);
      setEmployees(employeeRows);
      setUsers(userRows);
      setTechnicians(technicianRows.items);
      setError("");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to load workforce identity links.",
      );
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    setUserId(selectedEmployee?.user?.id ?? "");
    setTechnicianId(selectedEmployee?.technician?.id ?? "");
    setMessage("");
    setError("");
  }, [selectedEmployee?.id]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!employeeId || busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api.updateEmployee(await accessToken(), employeeId, {
        userId: userId || null,
        technicianId: technicianId || null,
      });
      await load();
      setMessage("Workforce identity links saved.");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to save workforce identity links.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel employeeSection" aria-labelledby="workforce-links-heading">
      <h3 id="workforce-links-heading">Workforce identity links</h3>
      <p>
        Link an Employee Record to an existing Hestiva OS account and, where the
        employee performs field work, to the authoritative Technician record.
        These links do not create accounts, change application roles, or change
        Technician status.
      </p>
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
      <form className="employeeForm" onSubmit={save}>
        <div className="employeeFields">
          <label>
            Employee record
            <select
              value={employeeId}
              onChange={(event) => setEmployeeId(event.target.value)}
            >
              <option value="">Select an employee</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.employeeReference} · {employee.firstName} {employee.lastName}
                </option>
              ))}
            </select>
          </label>
          <label>
            Linked OS user
            <select
              value={userId}
              disabled={!employeeId}
              onChange={(event) => setUserId(event.target.value)}
            >
              <option value="">No linked OS user</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.displayName || `${user.firstName} ${user.lastName}`.trim() || user.email} · {user.role} · {user.status === "ACTIVE" ? "Active" : "Disabled"}
                </option>
              ))}
            </select>
          </label>
          <label>
            Linked Technician
            <select
              value={technicianId}
              disabled={!employeeId}
              onChange={(event) => setTechnicianId(event.target.value)}
            >
              <option value="">No linked Technician</option>
              {technicians.map((technician) => (
                <option key={technician.id} value={technician.id}>
                  {technician.firstName} {technician.lastName} · {technician.status === "ACTIVE" ? "Active" : "Inactive"}
                </option>
              ))}
            </select>
          </label>
        </div>
        {employeeId ? (
          <div className="employeeLinkSummary">
            <p>
              OS account: {selectedUser ? `${selectedUser.role} · ${selectedUser.status}` : "None"}.
              {" "}Technician: {selectedTechnician ? `${selectedTechnician.firstName} ${selectedTechnician.lastName} · ${selectedTechnician.status}` : "None"}.
            </p>
            {selectedTechnician ? (
              <p>
                Technician field access additionally requires an ACTIVE linked
                OS user with the TECHNICIAN application role and an ACTIVE
                Employee Record; the server remains authoritative for every
                Technician request.
              </p>
            ) : null}
          </div>
        ) : null}
        <div className="formActions">
          <button className="primaryButton" disabled={!employeeId || busy}>
            {busy ? "Saving…" : "Save workforce links"}
          </button>
        </div>
      </form>
    </section>
  );
}
