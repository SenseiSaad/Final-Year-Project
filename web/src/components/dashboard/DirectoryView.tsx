"use client";

import { Plus } from "lucide-react";
import { useCallback, useId, useState } from "react";

import { useResource } from "@/hooks/useResource";
import type { Department, Member, Role } from "@/lib/workspace-api";
import { errorMessage } from "@/lib/workspace-api";

import { DepartmentForm, MemberForm, RoleForm } from "./DirectoryForms";
import { Avatar, btnGhost, btnSecondary, Chip, ConfirmModal, EmptyState, ErrorNote, SkeletonRows } from "./ui";
import { useWorkspace } from "./WorkspaceContext";

type Tab = "members" | "departments" | "roles";

export function DirectoryView() {
  const { boot } = useWorkspace();
  const caps = boot!.capabilities;
  const tabs: { id: Tab; label: string }[] = [
    { id: "members", label: "Members" },
    { id: "departments", label: "Departments" },
    { id: "roles", label: "Roles" },
  ];
  const [tab, setTab] = useState<Tab>(caps.manage_members ? "members" : caps.manage_departments ? "departments" : "roles");
  const baseId = useId();

  return (
    <div className="mx-auto w-full max-w-[1000px] pb-8">
      <div role="tablist" aria-label="Directory" className="flex gap-1 border-b border-line">
        {tabs.map((item) => {
          const selected = item.id === tab;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`${baseId}-${item.id}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel`}
              onClick={() => setTab(item.id)}
              className={`relative h-11 px-4 text-[14px] font-medium transition-colors ${selected ? "text-ink" : "text-ink-3 hover:text-ink"}`}
            >
              {item.label}
              {selected && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-ink" />}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" id={`${baseId}-panel`} aria-labelledby={`${baseId}-${tab}`} className="pt-5">
        {tab === "members" && <MembersPanel />}
        {tab === "departments" && <DepartmentsPanel />}
        {tab === "roles" && <RolesPanel />}
      </div>
    </div>
  );
}

function PanelHeader({ title, hint, action }: { title: string; hint: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 pb-3">
      <div>
        <h2 className="text-[16px] font-semibold">{title}</h2>
        <p className="text-[13px] text-ink-3">{hint}</p>
      </div>
      {action}
    </div>
  );
}

function MembersPanel() {
  const { boot, request, refresh } = useWorkspace();
  const b = boot!;
  const [editing, setEditing] = useState<"new" | Member | null>(null);
  const load = useCallback((signal: AbortSignal) => request<{ members: Member[] }>("/members/", { signal }).then((r) => r.members), [request]);
  const members = useResource(load);
  const list = members.data ?? [];
  const nameOf = (id: number | null) => list.find((m) => m.id === id)?.display_name;
  const departmentName = (id: number) => b.departments.find((d) => d.id === id)?.name ?? "";

  return (
    <>
      <PanelHeader
        title="Members"
        hint="Synthetic personas, their roles and who they report to."
        action={
          b.capabilities.manage_members && (
            <button type="button" onClick={() => setEditing("new")} className={btnSecondary}>
              <Plus className="size-4" strokeWidth={1.5} />
              Add member
            </button>
          )
        }
      />
      {members.error && <ErrorNote onRetry={members.reload}>{members.error}</ErrorNote>}
      {members.loading && !members.data && <SkeletonRows />}
      <ul className="divide-y divide-line border-y border-line">
        {list.map((member) => (
          <li key={member.id} className="flex flex-col gap-2 py-3.5 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <Avatar name={member.display_name} />
              <div className="min-w-0">
                <p className="truncate text-[15px] font-medium">
                  {member.display_name}
                  {!member.is_active && <span className="ml-2 text-[12px] font-normal text-ink-3">Inactive</span>}
                </p>
                <p className="text-[13px] leading-[20px] text-ink-3">
                  {member.role.name} · {member.department?.name ?? "No department"}
                  {member.reports_to_id ? ` · Reports to ${nameOf(member.reports_to_id) ?? "…"}` : ""}
                </p>
                {member.managed_department_ids.length > 0 && (
                  <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[13px] text-ink-2">
                    Manages
                    {member.managed_department_ids.map((id) => (
                      <Chip key={id}>{departmentName(id)}</Chip>
                    ))}
                  </p>
                )}
              </div>
            </div>
            {b.capabilities.manage_members && (
              <button type="button" onClick={() => setEditing(member)} className={btnSecondary}>
                Edit
              </button>
            )}
          </li>
        ))}
      </ul>
      <MemberForm
        target={editing}
        boot={b}
        members={list}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          members.reload();
          refresh();
        }}
      />
    </>
  );
}

function DepartmentsPanel() {
  const { boot, request, refresh } = useWorkspace();
  const b = boot!;
  const [editing, setEditing] = useState<"new" | Department | null>(null);
  const [removing, setRemoving] = useState<Department | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback((signal: AbortSignal) => request<{ departments: Department[] }>("/departments/", { signal }).then((r) => r.departments), [request]);
  const departments = useResource(load);
  const loadMembers = useCallback((signal: AbortSignal) => request<{ members: Member[] }>("/members/", { signal }).then((r) => r.members), [request]);
  const members = useResource(loadMembers);
  const list = departments.data ?? [];

  const ordered: { dept: Department; depth: number }[] = [];
  const walk = (parent: number | null, depth: number, seen: Set<number>) => {
    list
      .filter((d) => d.parent_id === parent && !seen.has(d.id))
      .forEach((dept) => {
        seen.add(dept.id);
        ordered.push({ dept, depth });
        walk(dept.id, depth + 1, seen);
      });
  };
  walk(null, 0, new Set());

  async function remove() {
    if (!removing) return;
    try {
      await request(`/departments/${removing.id}/`, { method: "DELETE" });
      setRemoving(null);
      setError(null);
      departments.reload();
      refresh();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <>
      <PanelHeader
        title="Departments"
        hint="Nested departments let a manager assigned to a parent also lead its children."
        action={
          b.capabilities.manage_departments && (
            <button type="button" onClick={() => setEditing("new")} className={btnSecondary}>
              <Plus className="size-4" strokeWidth={1.5} />
              Add department
            </button>
          )
        }
      />
      {departments.error && <ErrorNote onRetry={departments.reload}>{departments.error}</ErrorNote>}
      {departments.loading && !departments.data && <SkeletonRows rows={3} />}
      {departments.data && list.length === 0 && <EmptyState title="No departments" />}
      <ul className="divide-y divide-line border-y border-line">
        {ordered.map(({ dept, depth }) => {
          const people = members.data?.filter((m) => m.department?.id === dept.id) ?? [];
          return (
            <li key={dept.id} className="flex flex-col gap-2 py-3.5 sm:flex-row sm:items-center sm:gap-4" style={{ paddingLeft: depth * 20 }}>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-medium">{dept.name}</p>
                <p className="text-[13px] leading-[20px] text-ink-3">
                  {members.data ? `${people.length} ${people.length === 1 ? "member" : "members"}` : "…"}
                  {dept.description ? ` · ${dept.description}` : ""}
                </p>
              </div>
              {b.capabilities.manage_departments && (
                <div className="flex gap-1.5">
                  <button type="button" onClick={() => setEditing(dept)} className={btnSecondary}>
                    Edit
                  </button>
                  <button type="button" onClick={() => setRemoving(dept)} className={btnGhost}>
                    Delete
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <DepartmentForm
        target={editing}
        departments={list}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          departments.reload();
          refresh();
        }}
      />
      <ConfirmModal
        open={removing !== null}
        title={`Delete ${removing?.name ?? "department"}?`}
        description="Only departments without members, documents, rooms or sub-departments can be deleted."
        confirmLabel="Delete department"
        error={error}
        onConfirm={remove}
        onClose={() => {
          setRemoving(null);
          setError(null);
        }}
      />
    </>
  );
}

function RolesPanel() {
  const { boot, request, refresh } = useWorkspace();
  const b = boot!;
  const [editing, setEditing] = useState<"new" | Role | null>(null);
  const [removing, setRemoving] = useState<Role | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback((signal: AbortSignal) => request<{ roles: Role[] }>("/roles/", { signal }).then((r) => r.roles), [request]);
  const roles = useResource(load);
  const label = (key: string) => (key === "*" ? "Everything" : (b.permission_catalog.find((p) => p.key === key)?.label ?? key));

  async function remove() {
    if (!removing) return;
    try {
      await request(`/roles/${removing.id}/`, { method: "DELETE" });
      setRemoving(null);
      setError(null);
      roles.reload();
      refresh();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <>
      <PanelHeader
        title="Roles and permissions"
        hint="Permissions decide what a role can open and change. Audit access is its own permission."
        action={
          b.capabilities.manage_roles && (
            <button type="button" onClick={() => setEditing("new")} className={btnSecondary}>
              <Plus className="size-4" strokeWidth={1.5} />
              Add role
            </button>
          )
        }
      />
      {roles.error && <ErrorNote onRetry={roles.reload}>{roles.error}</ErrorNote>}
      {roles.loading && !roles.data && <SkeletonRows rows={3} />}
      <ul className="divide-y divide-line border-y border-line">
        {roles.data?.map((role) => (
          <li key={role.id} className="flex flex-col gap-2 py-3.5 sm:flex-row sm:items-start sm:gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-medium">
                {role.name}
                {role.is_system && <span className="ml-2 text-[12px] font-normal text-ink-3">Built in</span>}
              </p>
              {role.description && <p className="text-[13px] leading-[20px] text-ink-3">{role.description}</p>}
              <p className="mt-1.5 flex flex-wrap gap-1.5">
                {role.permissions.length === 0 ? <span className="text-[13px] text-ink-3">No special permissions</span> : role.permissions.map((p) => <Chip key={p}>{label(p)}</Chip>)}
              </p>
            </div>
            {b.capabilities.manage_roles && (
              <div className="flex gap-1.5">
                {role.code !== "admin" && (
                  <button type="button" onClick={() => setEditing(role)} className={btnSecondary}>
                    Edit
                  </button>
                )}
                {!role.is_system && (
                  <button type="button" onClick={() => setRemoving(role)} className={btnGhost}>
                    Delete
                  </button>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
      <RoleForm
        target={editing}
        boot={b}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          roles.reload();
          refresh();
        }}
      />
      <ConfirmModal
        open={removing !== null}
        title={`Delete ${removing?.name ?? "role"}?`}
        description="Roles that are assigned to members or used in document scopes cannot be deleted."
        confirmLabel="Delete role"
        error={error}
        onConfirm={remove}
        onClose={() => {
          setRemoving(null);
          setError(null);
        }}
      />
    </>
  );
}
