import type { Department, Member } from "@/lib/workspace-api";

export type DepartmentNode = { department: Department; children: DepartmentNode[] };

/* Departments as a forest. A department whose parent is missing is treated as top level. */
export function buildDepartmentTree(list: Department[]): DepartmentNode[] {
  const ids = new Set(list.map((d) => d.id));
  const seen = new Set<number>();
  const build = (parent: number | null): DepartmentNode[] =>
    list
      .filter((d) => (parent === null ? d.parent_id === null || !ids.has(d.parent_id) : d.parent_id === parent) && !seen.has(d.id))
      .map((department) => {
        seen.add(department.id);
        return { department, children: build(department.id) };
      });
  return build(null);
}

/* The department itself and everything nested under it */
export function departmentBranch(list: Department[], id: number): Set<number> {
  const found = new Set([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const d of list) {
      if (d.parent_id !== null && found.has(d.parent_id) && !found.has(d.id)) {
        found.add(d.id);
        grew = true;
      }
    }
  }
  return found;
}

/* The person and everyone who reports to them, directly or not */
export function reportingBranch(list: Member[], id: number): Set<number> {
  const found = new Set([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const m of list) {
      if (m.reports_to_id !== null && found.has(m.reports_to_id) && !found.has(m.id)) {
        found.add(m.id);
        grew = true;
      }
    }
  }
  return found;
}
