"use client";

import { Check, CornerDownRight, Pencil, Plus, Trash2, UserPlus, Users } from "lucide-react";
import { useCallback, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useResource } from "@/hooks/useResource";
import { cn } from "@/lib/cn";
import { errorMessage, type Bootstrap, type Department, type Member, type Role } from "@/lib/workspace-api";

import { Avatar, Card, ConfirmModal, EmptyState, ErrorNote, Page, PageHeader, Skeleton, Tag } from "../ui";
import { useWorkspace } from "../WorkspaceContext";
import { DepartmentSheet, MemberSheet, RoleSheet } from "./DirectoryForms";
import { buildDepartmentTree, type DepartmentNode } from "./tree";
import { useStaggerIn } from "./useStagger";
import { ViewTabs } from "./ViewTabs";

type Tab = "people" | "departments" | "roles";

const tabs: { id: Tab; label: string }[] = [
  { id: "people", label: "People" },
  { id: "departments", label: "Departments" },
  { id: "roles", label: "Roles" },
];

type Editing = { kind: "member"; target: "new" | Member } | { kind: "department"; target: "new" | Department } | { kind: "role"; target: "new" | Role } | null;
type Removing = { kind: "department"; item: Department } | { kind: "role"; item: Role } | null;

const description = "Who is in the workspace, how departments nest, and what each role may do.";

export function DirectoryView() {
  const { boot } = useWorkspace();
  if (!boot) {
    return (
      <Page>
        <PageHeader title="People and roles" description={description} />
        <Card className="mt-8 grid gap-1 p-2" aria-busy="true">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </Card>
      </Page>
    );
  }
  return <Directory boot={boot} />;
}

function Directory({ boot }: { boot: Bootstrap }) {
  const { request, refresh } = useWorkspace();
  const { notify } = useToast();
  const caps = boot.capabilities;
  const idPrefix = useId();
  const [tab, setTab] = useState<Tab>(caps.manage_members ? "people" : caps.manage_departments ? "departments" : "roles");
  const [editing, setEditing] = useState<Editing>(null);
  const [removing, setRemoving] = useState<Removing>(null);
  const [removeBusy, setRemoveBusy] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const loadMembers = useCallback((signal: AbortSignal) => request<{ members: Member[] }>("/members/", { signal }).then((r) => r.members), [request]);
  const loadDepartments = useCallback((signal: AbortSignal) => request<{ departments: Department[] }>("/departments/", { signal }).then((r) => r.departments), [request]);
  const loadRoles = useCallback((signal: AbortSignal) => request<{ roles: Role[] }>("/roles/", { signal }).then((r) => r.roles), [request]);
  const members = useResource(loadMembers);
  const departments = useResource(loadDepartments);
  const roles = useResource(loadRoles);

  const reloadAll = () => {
    members.reload();
    departments.reload();
    roles.reload();
    refresh();
  };

  function saved(message: string) {
    setEditing(null);
    reloadAll();
    notify(message);
  }

  async function confirmRemove() {
    if (!removing) return;
    setRemoveBusy(true);
    try {
      await request(`/${removing.kind === "department" ? "departments" : "roles"}/${removing.item.id}/`, { method: "DELETE" });
      notify(removing.kind === "department" ? "Department deleted" : "Role deleted");
      setRemoving(null);
      setRemoveError(null);
      reloadAll();
    } catch (failure) {
      // The modal closes so the reason sits next to the list it concerns
      const message = errorMessage(failure);
      setRemoving(null);
      setRemoveError(message);
      notify(message, "error");
    } finally {
      setRemoveBusy(false);
    }
  }

  const add =
    tab === "people" && caps.manage_members ? (
      <Button onClick={() => setEditing({ kind: "member", target: "new" })}>
        <UserPlus className="size-[18px]" strokeWidth={1.5} />
        Add person
      </Button>
    ) : tab === "departments" && caps.manage_departments ? (
      <Button onClick={() => setEditing({ kind: "department", target: "new" })}>
        <Plus className="size-[18px]" strokeWidth={1.5} />
        Add department
      </Button>
    ) : tab === "roles" && caps.manage_roles ? (
      <Button onClick={() => setEditing({ kind: "role", target: "new" })}>
        <Plus className="size-[18px]" strokeWidth={1.5} />
        Add role
      </Button>
    ) : null;

  const roleList = roles.data ?? boot.roles;
  const departmentList = departments.data ?? boot.departments;
  const memberList = members.data ?? [];

  return (
    <Page>
      <PageHeader title="People and roles" description={description} actions={add} />

      <div className="mt-8">
        <ViewTabs
          tabs={tabs}
          value={tab}
          onChange={(next) => {
            setTab(next);
            setRemoveError(null);
          }}
          label="Directory views"
          idPrefix={idPrefix}
        />
      </div>

      {removeError && (
        <div className="mt-4">
          <ErrorNote message={removeError} />
        </div>
      )}

      <div role="tabpanel" id={`${idPrefix}-panel`} aria-labelledby={`${idPrefix}-tab-${tab}`} tabIndex={0} className="mt-4 rounded-[16px]">
        {tab === "people" && (
          <PeoplePanel
            members={members}
            canEdit={caps.manage_members}
            onEdit={(member) => setEditing({ kind: "member", target: member })}
            departmentName={(id) => departmentList.find((d) => d.id === id)?.name ?? ""}
          />
        )}
        {tab === "departments" && (
          <DepartmentsPanel
            departments={departments}
            members={memberList}
            membersReady={!!members.data}
            canEdit={caps.manage_departments}
            onEdit={(department) => setEditing({ kind: "department", target: department })}
            onRemove={(department) => {
              setRemoveError(null);
              setRemoving({ kind: "department", item: department });
            }}
          />
        )}
        {tab === "roles" && (
          <RolesPanel
            roles={roles}
            boot={boot}
            canEdit={caps.manage_roles}
            onEdit={(role) => setEditing({ kind: "role", target: role })}
            onRemove={(role) => {
              setRemoveError(null);
              setRemoving({ kind: "role", item: role });
            }}
          />
        )}
      </div>

      <MemberSheet
        target={editing?.kind === "member" ? editing.target : null}
        roles={roleList}
        departments={departmentList}
        members={memberList}
        onClose={() => setEditing(null)}
        onSaved={saved}
      />
      <DepartmentSheet target={editing?.kind === "department" ? editing.target : null} departments={departmentList} onClose={() => setEditing(null)} onSaved={saved} />
      <RoleSheet target={editing?.kind === "role" ? editing.target : null} boot={boot} onClose={() => setEditing(null)} onSaved={saved} />

      <ConfirmModal
        open={removing !== null}
        title={`Delete ${removing?.item.name ?? ""}?`}
        text={
          removing?.kind === "role"
            ? "Roles that are assigned to people or used in document scopes cannot be deleted."
            : "Only departments without people, documents, rooms or sub-departments can be deleted."
        }
        confirmLabel={removing?.kind === "role" ? "Delete role" : "Delete department"}
        busy={removeBusy}
        onConfirm={confirmRemove}
        onClose={() => setRemoving(null)}
      />
    </Page>
  );
}

type Loaded<T> = { data: T | undefined; error: string | undefined; loading: boolean; reload: () => void };

function ListSkeleton({ rows = 4, height = "h-16" }: { rows?: number; height?: string }) {
  return (
    <Card className="grid gap-1 p-2" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className={height} />
      ))}
    </Card>
  );
}

/* ------------------------------------------------------------------ people */

function PeoplePanel({
  members,
  canEdit,
  onEdit,
  departmentName,
}: {
  members: Loaded<Member[]>;
  canEdit: boolean;
  onEdit: (member: Member) => void;
  departmentName: (id: number) => string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const list = members.data ?? [];
  const nameOf = (id: number | null) => list.find((m) => m.id === id)?.display_name;
  useStaggerIn(ref, !!members.data, "[data-stagger]");

  return (
    <div ref={ref}>
      {members.error && <ErrorNote message={members.error} onRetry={members.reload} />}
      {members.loading && !members.data && <ListSkeleton />}
      {members.data && list.length === 0 && (
        <Card>
          <EmptyState icon={Users} title="No people yet" text="Add the first person to start assigning roles and departments." />
        </Card>
      )}
      {list.length > 0 && (
        <Card className="overflow-hidden">
          <table className="w-full table-fixed text-left">
            <caption className="sr-only">People in the workspace</caption>
            <colgroup>
              <col />
              <col className="hidden w-40 md:table-column" />
              <col className="hidden w-52 md:table-column" />
              <col className="hidden w-44 lg:table-column" />
              <col className="w-24" />
              {canEdit && <col className="w-14" />}
            </colgroup>
            <thead>
              <tr className="h-10 border-b border-line text-[13px] text-ink-3">
                <th scope="col" className="px-4 font-normal">
                  Person
                </th>
                <th scope="col" className="hidden px-3 font-normal md:table-cell">
                  Role
                </th>
                <th scope="col" className="hidden px-3 font-normal md:table-cell">
                  Department
                </th>
                <th scope="col" className="hidden px-3 font-normal lg:table-cell">
                  Reports to
                </th>
                <th scope="col" className="px-3 font-normal">
                  Status
                </th>
                {canEdit && (
                  <th scope="col" className="pr-2">
                    <span className="sr-only">Actions</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {list.map((member) => {
                const managed = member.managed_department_ids.map(departmentName).filter(Boolean);
                const manager = member.reports_to_id ? (nameOf(member.reports_to_id) ?? "") : "";
                return (
                  <tr key={member.id} data-stagger className="h-16 border-b border-line transition-colors duration-150 last:border-b-0 hover:bg-deep">
                    <th scope="row" className="px-4 text-left font-normal">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar name={member.display_name} />
                        <div className="min-w-0">
                          <p className="flex items-center gap-2">
                            <span className={cn("truncate text-[14px] font-medium", !member.is_active && "text-ink-3")}>{member.display_name}</span>
                            {member.is_protected && <Tag className="shrink-0 max-sm:hidden">Built in</Tag>}
                          </p>
                          <p className="truncate font-mono text-[12px] leading-5 text-ink-3 max-md:hidden">{member.username}</p>
                          <p className="truncate text-[12px] leading-5 text-ink-3 md:hidden">
                            {member.role.name} · {member.department?.name ?? "No department"}
                          </p>
                        </div>
                      </div>
                    </th>
                    <td className="hidden px-3 md:table-cell">
                      <Tag className="max-w-full">
                        <span className="truncate">{member.role.name}</span>
                      </Tag>
                    </td>
                    <td className="hidden px-3 md:table-cell">
                      <p className={cn("truncate text-[14px]", !member.department && "text-ink-3")}>{member.department?.name ?? "None"}</p>
                      {managed.length > 0 && (
                        <p className="truncate text-[12px] leading-5 text-ink-3" title={managed.join(", ")}>
                          Manages {managed.join(", ")}
                        </p>
                      )}
                    </td>
                    <td className="hidden px-3 lg:table-cell">
                      <p className={cn("truncate text-[14px]", !manager && "text-ink-3")}>{manager || (member.reports_to_id ? "…" : "Nobody")}</p>
                    </td>
                    <td className="px-3">
                      {member.is_active ? <span className="text-[13px] text-ink-2">Active</span> : <Tag>Inactive</Tag>}
                    </td>
                    {canEdit && (
                      <td className="pr-2 text-right">
                        <Button variant="ghost" size="icon" aria-label={`Edit ${member.display_name}`} onClick={() => onEdit(member)}>
                          <Pencil className="size-4" strokeWidth={1.5} />
                        </Button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

/* -------------------------------------------------------------- departments */

function DepartmentsPanel({
  departments,
  members,
  membersReady,
  canEdit,
  onEdit,
  onRemove,
}: {
  departments: Loaded<Department[]>;
  members: Member[];
  membersReady: boolean;
  canEdit: boolean;
  onEdit: (department: Department) => void;
  onRemove: (department: Department) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const list = departments.data ?? [];
  const tree = buildDepartmentTree(list);
  useStaggerIn(ref, !!departments.data, "[data-stagger]");

  const count = (id: number) => members.filter((m) => m.department?.id === id).length;

  function renderNodes(nodes: DepartmentNode[], depth: number) {
    return (
      <ul className={cn(depth > 0 && "ml-4 border-l border-line pl-2")}>
        {nodes.map(({ department, children }) => {
          const people = count(department.id);
          return (
            <li key={department.id}>
              <div data-stagger className="flex h-12 items-center gap-3 rounded-[8px] px-3 transition-colors duration-150 hover:bg-deep">
                {depth > 0 && <CornerDownRight aria-hidden="true" className="size-4 shrink-0 text-ink-3" strokeWidth={1.5} />}
                <span className="min-w-0 truncate text-[14px] font-medium">{department.name}</span>
                {department.description && <span className="min-w-0 flex-1 truncate text-[13px] text-ink-3 max-sm:hidden">{department.description}</span>}
                <span className="ml-auto shrink-0 sm:ml-0">
                  <Tag className="tabular-nums">{membersReady ? `${people} ${people === 1 ? "person" : "people"}` : "…"}</Tag>
                </span>
                {canEdit && (
                  <span className="flex shrink-0 items-center">
                    <Button variant="ghost" size="icon" className="size-8" aria-label={`Edit ${department.name}`} onClick={() => onEdit(department)}>
                      <Pencil className="size-4" strokeWidth={1.5} />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-8" aria-label={`Delete ${department.name}`} onClick={() => onRemove(department)}>
                      <Trash2 className="size-4" strokeWidth={1.5} />
                    </Button>
                  </span>
                )}
              </div>
              {children.length > 0 && renderNodes(children, depth + 1)}
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div ref={ref}>
      {departments.error && <ErrorNote message={departments.error} onRetry={departments.reload} />}
      {departments.loading && !departments.data && <ListSkeleton rows={3} height="h-12" />}
      {departments.data && list.length === 0 && (
        <Card>
          <EmptyState title="No departments" text="Departments group people and decide which documents a manager can see." />
        </Card>
      )}
      {list.length > 0 && (
        <Card className="p-2">
          <div role="group" aria-label="Departments, nested under the department they belong to">
            {renderNodes(tree, 0)}
          </div>
        </Card>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------- roles */

function RolesPanel({
  roles,
  boot,
  canEdit,
  onEdit,
  onRemove,
}: {
  roles: Loaded<Role[]>;
  boot: Bootstrap;
  canEdit: boolean;
  onEdit: (role: Role) => void;
  onRemove: (role: Role) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const list = roles.data ?? [];
  const selected = list.find((r) => r.id === selectedId) ?? list[0];
  useStaggerIn(ref, !!roles.data, "[data-stagger]");

  const everything = (role: Role) => role.permissions.includes("*");
  const summary = (role: Role) => (everything(role) ? "Every permission" : `${role.permissions.length} ${role.permissions.length === 1 ? "permission" : "permissions"}`);
  const unknown = selected ? selected.permissions.filter((key) => key !== "*" && !boot.permission_catalog.some((p) => p.key === key)) : [];

  return (
    <div ref={ref}>
      {roles.error && <ErrorNote message={roles.error} onRetry={roles.reload} />}
      {roles.loading && !roles.data && <ListSkeleton rows={4} height="h-14" />}
      {roles.data && list.length === 0 && (
        <Card>
          <EmptyState title="No roles" />
        </Card>
      )}
      {selected && (
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
          <Card className="p-2">
            <ul aria-label="Roles" className="grid grid-cols-1 gap-1">
              {list.map((role) => {
                const active = role.id === selected.id;
                return (
                  <li key={role.id} data-stagger>
                    <button
                      type="button"
                      aria-pressed={active}
                      onClick={() => setSelectedId(role.id)}
                      className={cn(
                        "flex h-14 w-full items-center gap-3 rounded-[8px] px-3 text-left transition-colors duration-150",
                        active ? "bg-raised" : "hover:bg-deep",
                      )}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-medium">{role.name}</span>
                        <span className="block truncate text-[12px] leading-5 text-ink-3">{summary(role)}</span>
                      </span>
                      {role.is_system && <Tag>Built in</Tag>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card key={selected.id} data-stagger className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="flex items-center gap-2 text-[16px] font-medium">
                  {selected.name}
                  {selected.is_system && <Tag>Built in</Tag>}
                </h2>
                <p className="mt-1 text-[14px] leading-[22px] text-ink-2">{selected.description || "No description"}</p>
              </div>
              {canEdit && (
                <div className="flex items-center gap-2">
                  {selected.code !== "admin" && (
                    <Button variant="secondary" size="sm" onClick={() => onEdit(selected)}>
                      <Pencil className="size-4" strokeWidth={1.5} />
                      Edit
                    </Button>
                  )}
                  {!selected.is_system && (
                    <Button variant="danger" size="sm" onClick={() => onRemove(selected)}>
                      <Trash2 className="size-4" strokeWidth={1.5} />
                      Delete
                    </Button>
                  )}
                </div>
              )}
            </div>
            {selected.is_system && (
              <p className="mt-3 text-[13px] leading-5 text-ink-3">
                {selected.code === "admin" ? "The Admin role is fixed: it holds every permission and cannot be edited or deleted." : "A built-in role. Its permissions can be changed, but it cannot be deleted."}
              </p>
            )}
            <h3 className="mt-5 text-[14px] font-medium">Permissions</h3>
            <ul className="mt-2 divide-y divide-line rounded-[12px] border border-line">
              {boot.permission_catalog.map((permission) => {
                const granted = everything(selected) || selected.permissions.includes(permission.key);
                return (
                  <li key={permission.key} className="flex items-start gap-3 px-3 py-2.5">
                    <span
                      aria-hidden="true"
                      className={cn("mt-0.5 grid size-4 shrink-0 place-items-center rounded-[4px] border", granted ? "border-ink bg-ink text-on-ink" : "border-line-strong")}
                    >
                      {granted && <Check className="size-3" strokeWidth={2} />}
                    </span>
                    <span className="min-w-0">
                      <span className={cn("block text-[14px] leading-5", !granted && "text-ink-3")}>
                        {permission.label}
                        <span className="sr-only">{granted ? ", granted" : ", not granted"}</span>
                      </span>
                      <span className="mt-0.5 block text-[13px] leading-5 text-ink-3">{permission.description}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
            {unknown.length > 0 && <p className="mt-3 text-[13px] leading-5 text-ink-3">Also holds {unknown.join(", ")}.</p>}
          </Card>
        </div>
      )}
    </div>
  );
}
