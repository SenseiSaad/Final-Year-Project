import { KeyRound, User, Users } from "lucide-react";

import { SectionHead } from "./SectionHead";

const roles = [
  {
    icon: User,
    title: "Employees",
    text: "See and cite documents from their own department, company-wide files and anything shared with them. Uploads can stay private.",
    points: ["Own department only", "Private uploads", "Own chat history"],
  },
  {
    icon: Users,
    title: "Managers",
    text: "Lead the departments explicitly assigned to them and the people who report to them. Being in a department never opens another one.",
    points: ["Assigned departments and sub-departments", "Direct and indirect reports", "Team rooms they create"],
  },
  {
    icon: KeyRound,
    title: "Admins and executives",
    text: "Define departments, roles and document scopes. Audit access is a separate permission that can be delegated to any role.",
    points: ["Role and permission editor", "Admin-defined document scopes", "Per-person audit timelines"],
  },
];

export function Roles() {
  return (
    <section id="roles" aria-labelledby="roles-title" className="py-28 md:py-36">
      <div className="container-page">
        <SectionHead
          id="roles-title"
          title="Access follows the role"
          lead="Every question is checked against role, department and explicit grants before a single passage is searched."
        />
        <div className="mt-14 grid overflow-hidden rounded-[20px] border border-line-strong md:grid-cols-3">
          {roles.map((role) => (
            <article
              key={role.title}
              data-reveal
              className="group border-line bg-surface p-7 transition-colors duration-300 ease-soft hover:bg-raised sm:p-9 [&:not(:last-child)]:border-b md:[&:not(:last-child)]:border-b-0 md:[&:not(:last-child)]:border-r"
            >
              <role.icon className="size-5 text-ink" strokeWidth={1.5} />
              <h3 className="mt-8 text-[20px] font-medium tracking-[-0.01em]">{role.title}</h3>
              <p className="mt-3 text-[15px] leading-[25px] text-ink-2">{role.text}</p>
              <ul className="tick-list mt-7 grid gap-2.5 border-t border-line pt-7 text-[14px] text-ink-2">
                {role.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
