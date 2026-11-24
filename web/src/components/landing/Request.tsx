import { ArrowRight, KeyRound, User } from "lucide-react";
import Link from "next/link";

const accounts = [
  {
    href: "/dashboard/admin",
    icon: KeyRound,
    badge: "Highest permission",
    title: "Admin account",
    identity: "Administrator · All departments",
    description: "Inspect every document across Finance, HR and Operations, manage user accounts, view today's attendance code and verify the SHA-256 audit ledger.",
    points: [
      "All 6 sample documents visible in Ask and search",
      "Daily attendance code, monthly summary and strike review",
      "User management and tamper-evident audit log",
    ],
    cta: "Open Admin dashboard",
    primary: true,
  },
  {
    href: "/dashboard/employee",
    icon: User,
    badge: "Average permission",
    title: "Employee account",
    identity: "Ayesha Khan · Finance",
    description: "Test standard day-to-day permissions: ask across Finance and shared files only, see private HR files refused before ranking, and check in for attendance.",
    points: [
      "Only Finance and shared documents appear in search",
      "Private HR and Operations files are refused honestly",
      "Daily 6-digit attendance check-in and private sharing",
    ],
    cta: "Open Employee dashboard",
    primary: false,
  },
];

export function Request() {
  return (
    <section id="early-access" aria-labelledby="early-access-title" className="border-y border-line bg-deep/60 py-24 md:py-32">
      <div className="container-page">
        <div data-reveal className="max-w-[42rem]">
          <h2 id="early-access-title" className="heading">
            Early access
          </h2>
          <p className="mt-4 text-[17px] leading-[28px] text-ink-2">
            No sign-up form required. Pick a ready-made test account below to open the workspace in one click and compare
            what each permission level can see.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {accounts.map((acc) => (
            <article
              key={acc.href}
              data-reveal
              className={`flex flex-col rounded-2xl border bg-surface p-6 shadow-window sm:p-8 ${
                acc.primary ? "border-accent-line" : "border-line"
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-lg bg-raised text-ink">
                    <acc.icon className="size-[18px]" strokeWidth={1.5} aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="text-[18px] font-medium text-ink">{acc.title}</h3>
                    <p className="font-mono text-[12px] text-ink-3">{acc.identity}</p>
                  </div>
                </div>
                <span className="rounded-md bg-accent-soft px-2 py-0.5 text-[12px] text-accent-ink">{acc.badge}</span>
              </div>

              <p className="mt-5 text-[15px] leading-[24px] text-ink-2">{acc.description}</p>

              <ul className="tick-list mt-6 grid gap-2.5 border-t border-line pt-6 text-[14px] text-ink-2">
                {acc.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>

              <div className="mt-auto pt-8">
                <Link
                  href={acc.href}
                  className={`group inline-flex h-11 w-full items-center justify-center gap-2 rounded-[10px] px-5 text-[15px] font-medium transition-[background-color,color,transform] duration-150 active:scale-[0.98] sm:w-auto ${
                    acc.primary
                      ? "bg-btn text-on-btn hover:bg-btn-hover"
                      : "border border-line-strong text-ink hover:bg-raised"
                  }`}
                >
                  {acc.cta}
                  <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={1.5} />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
