"use client";

import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";

import { Field, Select } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import type { Bootstrap } from "@/lib/workspace-api";

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

/* Short description of a choice, shown while its form is folded away */
export function accessLabel(boot: Bootstrap, value: AccessValue): string {
  if (!boot.capabilities.upload_scope) {
    return value.mode === "rbac" && boot.user.department ? `${boot.user.department.name} department` : "Only me";
  }
  if (value.mode === "rbac") {
    const department = boot.departments.find((item) => String(item.id) === value.departmentId);
    return department ? `Role-based, ${department.name}` : "Role-based, company-wide";
  }
  const count = value.roles.length + value.departments.length + value.personas.length;
  return count ? `Admin-defined, ${count} ${count === 1 ? "grant" : "grants"}` : "Admin-defined, owner only";
}

function toggle(list: number[], id: number): number[] {
  return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
}

const optionStyles =
  "flex cursor-pointer items-start gap-3 rounded-[10px] border border-line px-3.5 py-3 text-[14px] transition-colors duration-150 hover:bg-raised has-checked:border-ink";

function Option({
  name,
  checked,
  onSelect,
  title,
  text,
}: {
  name: string;
  checked: boolean;
  onSelect: () => void;
  title: string;
  text: string;
}) {
  return (
    <label className={optionStyles}>
      <input type="radio" name={name} checked={checked} onChange={onSelect} className="mt-[3px] size-4 shrink-0 accent-ink" />
      <span className="min-w-0">
        <span className="block font-medium">{title}</span>
        <span className="block text-[13px] leading-[20px] text-ink-3">{text}</span>
      </span>
    </label>
  );
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
  const listId = useId();
  return (
    <fieldset className="rounded-[10px] border border-line">
      <legend className="sr-only">{title}</legend>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={listId}
        className="flex h-10 w-full items-center justify-between gap-3 rounded-[10px] px-3.5 text-left text-[14px] transition-colors duration-150 hover:bg-raised"
      >
        <span className="font-medium">{title}</span>
        <span className="flex items-center gap-2 text-[13px] text-ink-3">
          {selected.length ? `${selected.length} selected` : "None"}
          <ChevronDown className={cn("size-4 transition-transform duration-300 ease-soft", open && "rotate-180")} strokeWidth={1.5} />
        </span>
      </button>
      <div id={listId} inert={!open} className={cn("grid transition-[grid-template-rows] duration-300 ease-soft", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
        <div className="min-h-0 overflow-hidden">
          {items.length === 0 ? (
            <p className="border-t border-line px-3.5 py-3 text-[13px] text-ink-3">Nothing to choose from yet.</p>
          ) : (
            <ul className="grid max-h-48 overflow-y-auto border-t border-line p-1.5">
              {items.map((item) => (
                <li key={item.id}>
                  <label className="flex h-10 cursor-pointer items-center gap-3 rounded-[8px] px-2 text-[14px] transition-colors duration-150 hover:bg-raised">
                    <input type="checkbox" checked={selected.includes(item.id)} onChange={() => onToggle(item.id)} className="size-4 accent-ink" />
                    <span className="min-w-0 truncate">{item.label}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
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
  const name = `${idPrefix}-mode`;

  if (!canScope) {
    return (
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-[14px]">Who can read it</legend>
        {own && (
          <Option
            name={name}
            checked={value.mode === "rbac"}
            onSelect={() => onChange({ ...value, mode: "rbac", departmentId: String(own.id) })}
            title={`${own.name} department`}
            text={`Members and managers assigned to ${own.name}.`}
          />
        )}
        <Option
          name={name}
          checked={value.mode === "scope"}
          onSelect={() => onChange({ ...value, mode: "scope", roles: [], departments: [], personas: [] })}
          title="Only me"
          text="Administrators with full document access can still open it."
        />
      </fieldset>
    );
  }

  return (
    <div className="grid gap-4">
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-[14px]">Access mode</legend>
        <Option
          name={name}
          checked={value.mode === "rbac"}
          onSelect={() => onChange({ ...value, mode: "rbac" })}
          title="Role-based policy"
          text="The document's department and its assigned managers. No department means company-wide."
        />
        <Option
          name={name}
          checked={value.mode === "scope"}
          onSelect={() => onChange({ ...value, mode: "scope" })}
          title="Admin-defined scope"
          text="Only the roles, departments and people you choose below, plus the owner."
        />
      </fieldset>

      {value.mode === "rbac" && allowDepartmentChange && (
        <Field label="Department" htmlFor={`${idPrefix}-department`}>
          <Select id={`${idPrefix}-department`} value={value.departmentId} onChange={(event) => onChange({ ...value, departmentId: event.target.value })}>
            <option value="">Company-wide</option>
            {boot.departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </Select>
        </Field>
      )}

      {value.mode === "scope" && (
        <div className="grid gap-2">
          <CheckGroup
            title="Roles"
            items={boot.roles.map((role) => ({ id: role.id, label: role.name }))}
            selected={value.roles}
            onToggle={(id) => onChange({ ...value, roles: toggle(value.roles, id) })}
          />
          <CheckGroup
            title="Departments"
            items={boot.departments.map((dept) => ({ id: dept.id, label: dept.name }))}
            selected={value.departments}
            onToggle={(id) => onChange({ ...value, departments: toggle(value.departments, id) })}
          />
          <CheckGroup
            title="People"
            items={boot.personas.map((person) => ({ id: person.id, label: `${person.display_name}, ${person.role.name}` }))}
            selected={value.personas}
            onToggle={(id) => onChange({ ...value, personas: toggle(value.personas, id) })}
          />
        </div>
      )}
    </div>
  );
}
