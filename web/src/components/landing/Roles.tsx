import { KeyRound, User, Users } from "lucide-react";

import type { Facts } from "@/lib/facts";

import { SectionHead } from "./SectionHead";

export function Roles({ facts }: { facts: Facts }) {
  const roles = [
    {
      icon: User,
      title: "Employee",
      text: "Uploads their own files, asks across everything they can open, and shares a single document with one teammate.",
      points: [`Up to ${facts.maxDocs} documents`, "Revoke a share at any time", "Personal question history"],
    },
    {
      icon: Users,
      title: "Department",
      text: "Handbooks and team documents stay inside the department. Members find them in search, other departments do not.",
      points: ["Department-scoped documents", "One department and team per person", "Nothing crosses department lines"],
    },
    {
      icon: KeyRound,
      title: "Administrator",
      text: "Adds people, assigns roles and departments, disables accounts and checks that the activity ledger is intact.",
      points: ["User and department management", "Ledger verification and CSV export", "Usage and answer statistics"],
    },
  ];

  return (
    <section aria-labelledby="roles-title" className="py-24 md:py-32">
      <div className="container-page">
        <SectionHead
          id="roles-title"
          title="Three roles with clear boundaries"
          lead="Everyone signs in with their own account. What they can find depends on who they are, not on what they type."
        />
        <div className="mt-14 grid overflow-hidden rounded-2xl border border-line md:grid-cols-3">
          {roles.map((role) => (
            <article
              key={role.title}
              data-reveal
              className="border-line bg-surface p-6 sm:p-8 [&:not(:last-child)]:border-b md:[&:not(:last-child)]:border-b-0 md:[&:not(:last-child)]:border-r"
            >
              <role.icon className="size-[18px] text-ink-2" strokeWidth={1.5} />
              <h3 className="mt-6 text-[18px] font-medium">{role.title}</h3>
              <p className="mt-2 text-[15px] leading-[24px] text-ink-2">{role.text}</p>
              <ul className="tick-list mt-6 grid gap-2.5 border-t border-line pt-6 text-[14px] text-ink-2">
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
