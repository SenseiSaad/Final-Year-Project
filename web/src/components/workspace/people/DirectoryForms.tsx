"use client";

import { useId, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import type { Bootstrap, Department, Member, Role } from "@/lib/workspace-api";

import { departmentBranch, reportingBranch } from "./tree";
import { CheckGroup, CheckRow, FormSheet, routeError, SheetForm, useSubmit } from "./FormSheet";
import { ErrorNote, Tag } from "../ui";
import { useWorkspace } from "../WorkspaceContext";

type Target<T> = "new" | T | null;
type SheetProps<T> = { target: Target<T>; onClose: () => void; onSaved: (message: string) => void };

function Actions({ busy, onClose, label }: { busy: boolean; onClose: () => void; label: string }) {
  return (
    <>
      <Button variant="ghost" onClick={onClose}>
        Cancel
      </Button>
      <Button type="submit" loading={busy}>
        {label}
      </Button>
    </>
  );
}

const invalid = (error?: string) => ({ "aria-invalid": error ? true : undefined });

/* ------------------------------------------------------------- departments */

export function DepartmentSheet({ target, onClose, onSaved, departments }: SheetProps<Department> & { departments: Department[] }) {
  const department = target && target !== "new" ? target : null;
  return (
    <FormSheet
      open={target !== null}
      onClose={onClose}
      title={department ? `Edit ${department.name}` : "Add a department"}
      description="Nesting lets a manager assigned to the parent also lead this department."
    >
      {target !== null && <DepartmentBody key={department?.id ?? "new"} department={department} departments={departments} onClose={onClose} onSaved={onSaved} />}
    </FormSheet>
  );
}

function DepartmentBody({
  department,
  departments,
  onClose,
  onSaved,
}: {
  department: Department | null;
  departments: Department[];
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const { request } = useWorkspace();
  const id = useId();
  const [name, setName] = useState(department?.name ?? "");
  const [description, setDescription] = useState(department?.description ?? "");
  const [parentId, setParentId] = useState(department?.parent_id ? String(department.parent_id) : "");
  const [nameError, setNameError] = useState<string>();
  const { busy, error, submit } = useSubmit(() => onSaved(department ? "Department saved" : "Department added"));
  const routed = routeError(error, { name: /^name\b/i, parent: /ancestor|department not found/i });
  const blocked = department ? departmentBranch(departments, department.id) : new Set<number>();

  return (
    <SheetForm
      onSubmit={() => {
        if (!name.trim()) {
          setNameError("Enter a name");
          return;
        }
        setNameError(undefined);
        const json = { name, description, parent_id: parentId ? Number(parentId) : null };
        void submit(() => (department ? request(`/departments/${department.id}/`, { method: "PATCH", json }) : request("/departments/", { method: "POST", json })));
      }}
      footer={<Actions busy={busy} onClose={onClose} label={department ? "Save department" : "Add department"} />}
    >
      <Field htmlFor={`${id}-name`} label="Name" error={nameError ?? (routed.field === "name" ? routed.message! : undefined)}>
        <Input
          id={`${id}-name`}
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={100}
          {...invalid(nameError ?? (routed.field === "name" ? "x" : undefined))}
          aria-describedby={nameError || routed.field === "name" ? `${id}-name-error` : undefined}
        />
      </Field>
      <Field htmlFor={`${id}-description`} label="Description" hint="Optional">
        <Input id={`${id}-description`} value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} />
      </Field>
      <Field htmlFor={`${id}-parent`} label="Part of" error={routed.field === "parent" ? routed.message! : undefined}>
        <Select
          id={`${id}-parent`}
          value={parentId}
          onChange={(event) => setParentId(event.target.value)}
          {...invalid(routed.field === "parent" ? "x" : undefined)}
          aria-describedby={routed.field === "parent" ? `${id}-parent-error` : undefined}
        >
          <option value="">Top level</option>
          {departments
            .filter((d) => !blocked.has(d.id))
            .map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
        </Select>
      </Field>
      {error && !routed.field && <ErrorNote message={error} />}
    </SheetForm>
  );
}

/* ------------------------------------------------------------------- roles */

export function RoleSheet({ target, onClose, onSaved, boot }: SheetProps<Role> & { boot: Bootstrap }) {
  const role = target && target !== "new" ? target : null;
  return (
    <FormSheet
      open={target !== null}
      onClose={onClose}
      title={role ? `Edit ${role.name}` : "Add a role"}
      description="A role is a set of permissions you assign to people."
    >
      {target !== null && <RoleBody key={role?.id ?? "new"} role={role} boot={boot} onClose={onClose} onSaved={onSaved} />}
    </FormSheet>
  );
}

function RoleBody({ role, boot, onClose, onSaved }: { role: Role | null; boot: Bootstrap; onClose: () => void; onSaved: (message: string) => void }) {
  const { request } = useWorkspace();
  const id = useId();
  const [name, setName] = useState(role?.name ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [permissions, setPermissions] = useState<string[]>(role?.permissions ?? []);
  const [nameError, setNameError] = useState<string>();
  const { busy, error, submit } = useSubmit(() => onSaved(role ? "Role saved" : "Role added"));
  const routed = routeError(error, { name: /^name\b/i });
  const fixed = role?.code === "admin";

  return (
    <SheetForm
      onSubmit={() => {
        if (fixed) return;
        if (!name.trim()) {
          setNameError("Enter a name");
          return;
        }
        setNameError(undefined);
        const json = { name, description, permissions };
        void submit(() => (role ? request(`/roles/${role.id}/`, { method: "PATCH", json }) : request("/roles/", { method: "POST", json })));
      }}
      footer={
        fixed ? (
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        ) : (
          <Actions busy={busy} onClose={onClose} label={role ? "Save role" : "Add role"} />
        )
      }
    >
      <Field htmlFor={`${id}-name`} label="Name" error={nameError ?? (routed.field === "name" ? routed.message! : undefined)}>
        <Input
          id={`${id}-name`}
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={80}
          disabled={fixed}
          {...invalid(nameError ?? (routed.field === "name" ? "x" : undefined))}
          aria-describedby={nameError || routed.field === "name" ? `${id}-name-error` : undefined}
        />
      </Field>
      <Field htmlFor={`${id}-description`} label="Description" hint="Optional">
        <Input id={`${id}-description`} value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} disabled={fixed} />
      </Field>
      {fixed ? (
        <p className="text-[14px] leading-[22px] text-ink-2">Admin holds every permission and cannot be edited.</p>
      ) : (
        <CheckGroup legend="Permissions" hint="You can only grant permissions your own role holds.">
          {boot.permission_catalog.map((permission) => (
            <CheckRow
              key={permission.key}
              checked={permissions.includes(permission.key)}
              onChange={(checked) => setPermissions((prev) => (checked ? [...prev, permission.key] : prev.filter((p) => p !== permission.key)))}
              label={permission.label}
              description={permission.description}
            />
          ))}
        </CheckGroup>
      )}
      {error && !routed.field && <ErrorNote message={error} />}
    </SheetForm>
  );
}

/* ----------------------------------------------------------------- members */

export function MemberSheet({
  target,
  onClose,
  onSaved,
  roles,
  departments,
  members,
}: SheetProps<Member> & { roles: Role[]; departments: Department[]; members: Member[] }) {
  const member = target && target !== "new" ? target : null;
  return (
    <FormSheet
      open={target !== null}
      onClose={onClose}
      title={member ? `Edit ${member.display_name}` : "Add a person"}
      description="People here are synthetic personas for this workspace."
    >
      {target !== null && (
        <MemberBody key={member?.id ?? "new"} member={member} roles={roles} departments={departments} members={members} onClose={onClose} onSaved={onSaved} />
      )}
    </FormSheet>
  );
}

function MemberBody({
  member,
  roles,
  departments,
  members,
  onClose,
  onSaved,
}: {
  member: Member | null;
  roles: Role[];
  departments: Department[];
  members: Member[];
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const { request } = useWorkspace();
  const id = useId();
  const [displayName, setDisplayName] = useState(member?.display_name ?? "");
  const [username, setUsername] = useState("");
  const [roleCode, setRoleCode] = useState(member?.role.code ?? roles.find((r) => r.code === "employee")?.code ?? roles[0]?.code ?? "");
  const [departmentId, setDepartmentId] = useState(member?.department ? String(member.department.id) : "");
  const [reportsTo, setReportsTo] = useState(member?.reports_to_id ? String(member.reports_to_id) : "");
  const [managed, setManaged] = useState<number[]>(member?.managed_department_ids ?? []);
  const [active, setActive] = useState(member?.is_active ?? true);
  const [nameError, setNameError] = useState<string>();
  const { busy, error, submit } = useSubmit(() => onSaved(member ? "Person saved" : "Person added"));
  const routed = routeError(error, {
    name: /^name\b/i,
    username: /^username\b/i,
    role: /role/i,
    department: /^department\b/i,
    reports: /manager|reporting|loop/i,
  });
  // The built-in Admin keeps the Admin role and cannot be switched off
  const isAdmin = member?.username === "admin";
  const blocked = member ? reportingBranch(members, member.id) : new Set<number>();

  const fieldError = (key: "name" | "username" | "role" | "department" | "reports") => (key === "name" && nameError) || (routed.field === key ? routed.message! : undefined);
  const describe = (key: "name" | "username" | "role" | "department" | "reports") => (fieldError(key) ? `${id}-${key}-error` : undefined);

  return (
    <SheetForm
      onSubmit={() => {
        if (!displayName.trim()) {
          setNameError("Enter a name");
          return;
        }
        setNameError(undefined);
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
      footer={<Actions busy={busy} onClose={onClose} label={member ? "Save person" : "Add person"} />}
    >
      {member?.is_protected && (
        <p className="flex items-center gap-2 text-[13px] leading-5 text-ink-2">
          <Tag>Built in</Tag>
          {isAdmin ? "The Admin account keeps its role and stays active." : "A built-in account. It can be edited but not removed."}
        </p>
      )}
      <Field htmlFor={`${id}-name`} label="Name" error={fieldError("name")}>
        <Input
          id={`${id}-name`}
          autoFocus
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          maxLength={120}
          {...invalid(fieldError("name"))}
          aria-describedby={describe("name")}
        />
      </Field>
      {!member && (
        <Field htmlFor={`${id}-username`} label="Username" hint="Optional" error={fieldError("username")}>
          <Input
            id={`${id}-username`}
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            maxLength={80}
            placeholder="Taken from the name if empty"
            {...invalid(fieldError("username"))}
            aria-describedby={describe("username")}
          />
        </Field>
      )}
      <Field htmlFor={`${id}-role`} label="Role" error={fieldError("role")}>
        <Select
          id={`${id}-role`}
          value={roleCode}
          onChange={(event) => setRoleCode(event.target.value)}
          disabled={isAdmin}
          {...invalid(fieldError("role"))}
          aria-describedby={describe("role")}
        >
          {roles.map((role) => (
            <option key={role.id} value={role.code}>
              {role.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field htmlFor={`${id}-department`} label="Department" error={fieldError("department")}>
        <Select
          id={`${id}-department`}
          value={departmentId}
          onChange={(event) => setDepartmentId(event.target.value)}
          {...invalid(fieldError("department"))}
          aria-describedby={describe("department")}
        >
          <option value="">None</option>
          {departments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field htmlFor={`${id}-reports`} label="Reports to" error={fieldError("reports")}>
        <Select
          id={`${id}-reports`}
          value={reportsTo}
          onChange={(event) => setReportsTo(event.target.value)}
          {...invalid(fieldError("reports"))}
          aria-describedby={describe("reports")}
        >
          <option value="">Nobody</option>
          {members
            .filter((m) => !blocked.has(m.id))
            .map((m) => (
              <option key={m.id} value={m.id}>
                {m.display_name}
              </option>
            ))}
        </Select>
      </Field>
      <CheckGroup legend="Departments they manage" hint="Managers see documents of the departments assigned here and of people who report to them, nothing else.">
        {departments.map((department) => (
          <CheckRow
            key={department.id}
            checked={managed.includes(department.id)}
            onChange={(checked) => setManaged((prev) => (checked ? [...prev, department.id] : prev.filter((d) => d !== department.id)))}
            label={department.name}
          />
        ))}
        {departments.length === 0 && <li className="px-3 py-2.5 text-[14px] text-ink-3">No departments yet</li>}
      </CheckGroup>
      {member && (
        <ul className="rounded-[12px] border border-line-strong p-1">
          <CheckRow checked={active} onChange={setActive} disabled={isAdmin} label="Active" description="Inactive people stay on record but no longer take part in the workspace." />
        </ul>
      )}
      {error && !routed.field && <ErrorNote message={error} />}
    </SheetForm>
  );
}
