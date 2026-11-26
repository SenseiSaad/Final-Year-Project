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
    <section aria-labelledby="roles-title" className="section-fit">
      <div className="container-page w-full">
        <SectionHead
          id="roles-title"
          title="Access follows the role"
          lead="Switch demo personas in the workspace to see the same question return different sources."
        />
        <div className="mt-10 grid gap-8 md:grid-cols-3 md:gap-10 lg:mt-14">
          {roles.map((role) => (
            <article key={role.title} data-reveal className="border-t border-line pt-6">
              <role.icon className="size-[18px] text-ink" strokeWidth={1.5} />
              <h3 className="mt-5 text-[18px] font-medium text-ink">{role.title}</h3>
              <p className="mt-2 text-[15px] leading-[24px] text-ink-2">{role.text}</p>
              <ul className="tick-list mt-6 grid gap-2.5 text-[14px] text-ink-2">
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
