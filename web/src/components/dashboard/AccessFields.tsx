"use client";

import { useState } from "react";

import type { Bootstrap } from "@/lib/workspace-api";

import { Field, inputClass } from "./ui";

export type AccessValue = {
  mode: "rbac" | "scope";
  departmentId: string;
  roles: number[];
  departments: number[];
  personas: number[];
};

export function emptyAccess(boot: Bootstrap): AccessValue {
  return {
    mode: "rbac",
    departmentId: boot.user.department ? String(boot.user.department.id) : "",
    roles: [],
    departments: [],
    personas: [],
  };
}

function toggle(list: number[], id: number): number[] {
  return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
}

function CheckGroup({
  title,
  items,
  selected,
  onToggle,
}: {
  title: string;
  items: { id: number; label: string }[];
  selected: number[];
  onToggle: (id: number) => void;
}) {
  const [open, setOpen] = useState(selected.length > 0);
  return (
    <fieldset className="rounded-lg border border-line">
      <legend className="sr-only">{title}</legend>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-10 w-full items-center justify-between px-3 text-left text-[13px] font-medium"
      >
        <span>{title}</span>
        <span className="text-ink-3">{selected.length ? `${selected.length} selected` : "None"}</span>
      </button>
      {open && (
        <ul className="grid max-h-44 gap-0.5 overflow-y-auto border-t border-line p-1.5">
          {items.map((item) => (
            <li key={item.id}>
              <label className="flex min-h-9 cursor-pointer items-center gap-2.5 rounded-md px-2 text-[14px] hover:bg-raised">
                <input
                  type="checkbox"
                  checked={selected.includes(item.id)}
                  onChange={() => onToggle(item.id)}
                  className="size-4 accent-[var(--accent)]"
                />
                <span className="min-w-0 truncate">{item.label}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </fieldset>
  );
}

/*
  Role-based policy: members of the document's department, plus managers
  assigned to it, can read it. Admin-defined scope: only the people, roles and
  departments chosen here (and the owner) can.
*/
export function AccessFields({
  boot,
  value,
  onChange,
  idPrefix,
  allowDepartmentChange = true,
}: {
  boot: Bootstrap;
  value: AccessValue;
  onChange: (next: AccessValue) => void;
  idPrefix: string;
  allowDepartmentChange?: boolean;
}) {
  const canScope = boot.capabilities.upload_scope;
  const own = boot.user.department;

  if (!canScope) {
    return (
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-[13px] font-medium">Who can read it</legend>
        {own && (
          <label className="flex cursor-pointer items-start gap-2.5 text-[14px]">
            <input
              type="radio"
              name={`${idPrefix}-mode`}
              checked={value.mode === "rbac"}
              onChange={() => onChange({ ...value, mode: "rbac", departmentId: String(own.id) })}
              className="mt-1 size-4 accent-[var(--accent)]"
            />
            <span>
              <span className="font-medium">{own.name} department</span>
              <span className="block text-[13px] text-ink-3">Members and managers assigned to {own.name}.</span>
            </span>
          </label>
        )}
        <label className="flex cursor-pointer items-start gap-2.5 text-[14px]">
          <input
            type="radio"
            name={`${idPrefix}-mode`}
            checked={value.mode === "scope"}
            onChange={() => onChange({ ...value, mode: "scope", roles: [], departments: [], personas: [] })}
            className="mt-1 size-4 accent-[var(--accent)]"
          />
          <span>
            <span className="font-medium">Only me</span>
            <span className="block text-[13px] text-ink-3">Administrators with full document access can still open it.</span>
          </span>
        </label>
      </fieldset>
    );
  }

  return (
    <div className="grid gap-4">
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-[13px] font-medium">Access mode</legend>
        <label className="flex cursor-pointer items-start gap-2.5 text-[14px]">
          <input
            type="radio"
            name={`${idPrefix}-mode`}
            checked={value.mode === "rbac"}
            onChange={() => onChange({ ...value, mode: "rbac" })}
            className="mt-1 size-4 accent-[var(--accent)]"
          />
          <span>
            <span className="font-medium">Role-based policy</span>
            <span className="block text-[13px] text-ink-3">The document&apos;s department and its assigned managers. No department means company-wide.</span>
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-2.5 text-[14px]">
          <input
            type="radio"
            name={`${idPrefix}-mode`}
            checked={value.mode === "scope"}
            onChange={() => onChange({ ...value, mode: "scope" })}
            className="mt-1 size-4 accent-[var(--accent)]"
          />
          <span>
            <span className="font-medium">Admin-defined scope</span>
            <span className="block text-[13px] text-ink-3">Only the roles, departments and people you choose below, plus the owner.</span>
          </span>
        </label>
      </fieldset>

      {value.mode === "rbac" && allowDepartmentChange && (
        <Field label="Department" htmlFor={`${idPrefix}-department`}>
          <select
            id={`${idPrefix}-department`}
            value={value.departmentId}
            onChange={(event) => onChange({ ...value, departmentId: event.target.value })}
            className={inputClass}
          >
            <option value="">Company-wide</option>
            {boot.departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
        </Field>
      )}

      {value.mode === "scope" && (
        <div className="grid gap-2">
          <CheckGroup
            title="Roles"
            items={boot.roles.map((r) => ({ id: r.id, label: r.name }))}
            selected={value.roles}
            onToggle={(id) => onChange({ ...value, roles: toggle(value.roles, id) })}
          />
          <CheckGroup
            title="Departments"
            items={boot.departments.map((d) => ({ id: d.id, label: d.name }))}
            selected={value.departments}
            onToggle={(id) => onChange({ ...value, departments: toggle(value.departments, id) })}
          />
          <CheckGroup
            title="People"
            items={boot.personas.map((p) => ({ id: p.id, label: `${p.display_name} · ${p.role.name}` }))}
            selected={value.personas}
            onToggle={(id) => onChange({ ...value, personas: toggle(value.personas, id) })}
          />
        </div>
      )}
    </div>
  );
}
