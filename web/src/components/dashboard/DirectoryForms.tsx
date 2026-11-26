"use client";

import { useState } from "react";

import {
  errorMessage,
  type Bootstrap,
  type Department,
  type Member,
  type Role,
} from "@/lib/workspace-api";

import { btnPrimary, btnSecondary, ErrorNote, Field, inputClass, Modal } from "./ui";
import { useWorkspace } from "./WorkspaceContext";

type FormProps<T> = { target: "new" | T | null; onClose: () => void; onSaved: () => void };

function useSubmit(onDone: () => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      onDone();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, setError, submit };
}

function Actions({ busy, onClose, label, disabled }: { busy: boolean; onClose: () => void; label: string; disabled?: boolean }) {
  return (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <button type="button" onClick={onClose} className={btnSecondary}>
        Cancel
      </button>
      <button type="submit" disabled={busy || disabled} className={btnPrimary}>
        {busy ? "Saving…" : label}
      </button>
    </div>
  );
}

export function DepartmentForm({ target, onClose, onSaved, departments }: FormProps<Department> & { departments: Department[] }) {
  const { request } = useWorkspace();
  const department = target && target !== "new" ? target : null;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [parentId, setParentId] = useState("");
  const [seeded, setSeeded] = useState<typeof target>(null);
  const { busy, error, setError, submit } = useSubmit(onSaved);

  if (target !== seeded) {
    setSeeded(target);
    setError(null);
    setName(department?.name ?? "");
    setDescription(department?.description ?? "");
    setParentId(department?.parent_id ? String(department.parent_id) : "");
  }

  return (
    <Modal open={target !== null} onClose={onClose} title={department ? "Edit department" : "Add a department"}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const json = { name, description, parent_id: parentId ? Number(parentId) : null };
          void submit(() =>
            department ? request(`/departments/${department.id}/`, { method: "PATCH", json }) : request("/departments/", { method: "POST", json }),
          );
        }}
        className="grid gap-4"
      >
        <Field label="Name" htmlFor="dept-name">
          <input id="dept-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} required className={inputClass} />
        </Field>
        <Field label="Description (optional)" htmlFor="dept-desc">
          <input id="dept-desc" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} className={inputClass} />
        </Field>
        <Field label="Part of" htmlFor="dept-parent" hint="Nesting lets a manager assigned to the parent also lead this department.">
          <select id="dept-parent" value={parentId} onChange={(e) => setParentId(e.target.value)} className={inputClass}>
            <option value="">Top level</option>
            {departments
              .filter((d) => d.id !== department?.id)
              .map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
          </select>
        </Field>
        {error && <ErrorNote>{error}</ErrorNote>}
        <Actions busy={busy} onClose={onClose} label={department ? "Save department" : "Add department"} disabled={!name.trim()} />
      </form>
    </Modal>
  );
}

export function RoleForm({ target, onClose, onSaved, boot }: FormProps<Role> & { boot: Bootstrap }) {
  const { request } = useWorkspace();
  const role = target && target !== "new" ? target : null;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [permissions, setPermissions] = useState<string[]>([]);
  const [seeded, setSeeded] = useState<typeof target>(null);
  const { busy, error, setError, submit } = useSubmit(onSaved);

  if (target !== seeded) {
    setSeeded(target);
    setError(null);
    setName(role?.name ?? "");
    setDescription(role?.description ?? "");
    setPermissions(role?.permissions ?? []);
  }

  const fixed = role?.code === "admin";
  return (
    <Modal open={target !== null} onClose={onClose} title={role ? `Edit ${role.name}` : "Add a role"} description="Roles are collections of permissions you assign to members." wide>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const json = { name, description, permissions };
          void submit(() => (role ? request(`/roles/${role.id}/`, { method: "PATCH", json }) : request("/roles/", { method: "POST", json })));
        }}
        className="grid gap-4"
      >
        <Field label="Name" htmlFor="role-name">
          <input id="role-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required disabled={fixed} className={inputClass} />
        </Field>
        <Field label="Description (optional)" htmlFor="role-desc">
          <input id="role-desc" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} disabled={fixed} className={inputClass} />
        </Field>
        <fieldset>
          <legend className="mb-1.5 text-[13px] font-medium">Permissions</legend>
          {fixed ? (
            <p className="text-[14px] text-ink-3">Admin holds every permission and cannot be edited.</p>
          ) : (
            <ul className="grid gap-0.5 rounded-lg border border-line p-1.5">
              {boot.permission_catalog.map((perm) => (
                <li key={perm.key}>
                  <label className="flex cursor-pointer items-start gap-2.5 rounded-md px-2 py-2 hover:bg-raised">
                    <input
                      type="checkbox"
                      checked={permissions.includes(perm.key)}
                      onChange={() => setPermissions((prev) => (prev.includes(perm.key) ? prev.filter((p) => p !== perm.key) : [...prev, perm.key]))}
                      className="mt-1 size-4 accent-[var(--accent)]"
                    />
                    <span className="min-w-0 text-[14px]">
                      <span className="font-medium">{perm.label}</span>
                      <span className="block text-[13px] leading-[19px] text-ink-3">{perm.description}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-1.5 text-[12px] text-ink-3">You can only grant permissions your own role holds.</p>
        </fieldset>
        {error && <ErrorNote>{error}</ErrorNote>}
        <Actions busy={busy} onClose={onClose} label={role ? "Save role" : "Add role"} disabled={!name.trim() || fixed} />
      </form>
    </Modal>
  );
}

export function MemberForm({
  target,
  onClose,
  onSaved,
  boot,
  members,
}: FormProps<Member> & { boot: Bootstrap; members: Member[] }) {
  const { request } = useWorkspace();
  const member = target && target !== "new" ? target : null;
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [roleCode, setRoleCode] = useState("employee");
  const [departmentId, setDepartmentId] = useState("");
  const [reportsTo, setReportsTo] = useState("");
  const [managed, setManaged] = useState<number[]>([]);
  const [active, setActive] = useState(true);
  const [seeded, setSeeded] = useState<typeof target>(null);
  const { busy, error, setError, submit } = useSubmit(onSaved);

  if (target !== seeded) {
    setSeeded(target);
    setError(null);
    setDisplayName(member?.display_name ?? "");
    setUsername("");
    setRoleCode(member?.role.code ?? "employee");
    setDepartmentId(member?.department ? String(member.department.id) : "");
    setReportsTo(member?.reports_to_id ? String(member.reports_to_id) : "");
    setManaged(member?.managed_department_ids ?? []);
    setActive(member?.is_active ?? true);
  }

  return (
    <Modal open={target !== null} onClose={onClose} title={member ? `Edit ${member.display_name}` : "Add a member"} description="Members are synthetic personas you can preview the workspace as." wide>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const json: Record<string, unknown> = {
            display_name: displayName,
            role: roleCode,
            department_id: departmentId ? Number(departmentId) : null,
            reports_to_id: reportsTo ? Number(reportsTo) : null,
            managed_department_ids: managed,
          };
          if (member) json.is_active = active;
          else if (username.trim()) json.username = username;
          void submit(() => (member ? request(`/members/${member.id}/`, { method: "PATCH", json }) : request("/members/", { method: "POST", json })));
        }}
        className="grid gap-4"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="member-name">
            <input id="member-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={120} required className={inputClass} />
          </Field>
          {!member && (
            <Field label="Username (optional)" htmlFor="member-username" hint="Used by the persona selector.">
              <input id="member-username" value={username} onChange={(e) => setUsername(e.target.value)} maxLength={80} className={inputClass} />
            </Field>
          )}
          <Field label="Role" htmlFor="member-role">
            <select id="member-role" value={roleCode} onChange={(e) => setRoleCode(e.target.value)} disabled={member?.username === "admin"} className={inputClass}>
              {boot.roles.map((role) => (
                <option key={role.id} value={role.code}>
                  {role.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Department" htmlFor="member-dept">
            <select id="member-dept" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className={inputClass}>
              <option value="">None</option>
              {boot.departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Reports to" htmlFor="member-reports">
            <select id="member-reports" value={reportsTo} onChange={(e) => setReportsTo(e.target.value)} className={inputClass}>
              <option value="">Nobody</option>
              {members
                .filter((m) => m.id !== member?.id)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.display_name}
                  </option>
                ))}
            </select>
          </Field>
        </div>
        <fieldset>
          <legend className="mb-1.5 text-[13px] font-medium">Departments they manage</legend>
          <ul className="grid gap-0.5 rounded-lg border border-line p-1.5 sm:grid-cols-2">
            {boot.departments.map((dept) => (
              <li key={dept.id}>
                <label className="flex min-h-9 cursor-pointer items-center gap-2.5 rounded-md px-2 text-[14px] hover:bg-raised">
                  <input
                    type="checkbox"
                    checked={managed.includes(dept.id)}
                    onChange={() => setManaged((prev) => (prev.includes(dept.id) ? prev.filter((id) => id !== dept.id) : [...prev, dept.id]))}
                    className="size-4 accent-[var(--accent)]"
                  />
                  {dept.name}
                </label>
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-[12px] text-ink-3">Managers see documents of the departments assigned here and of people who report to them, nothing else.</p>
        </fieldset>
        {member && (
          <label className="flex min-h-10 cursor-pointer items-center gap-2.5 text-[14px]">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} disabled={member.username === "admin"} className="size-4 accent-[var(--accent)]" />
            Active (can be previewed)
          </label>
        )}
        {error && <ErrorNote>{error}</ErrorNote>}
        <Actions busy={busy} onClose={onClose} label={member ? "Save member" : "Add member"} disabled={!displayName.trim()} />
      </form>
    </Modal>
  );
}

