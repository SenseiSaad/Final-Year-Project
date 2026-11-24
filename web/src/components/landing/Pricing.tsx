import Link from "next/link";

import type { Facts } from "@/lib/facts";

import { SectionHead } from "./SectionHead";

export function Pricing({ facts }: { facts: Facts }) {
  return (
    <section id="pricing" aria-labelledby="pricing-title" className="py-24 md:py-32">
      <div className="container-page">
        <SectionHead
          id="pricing-title"
          title="Early access"
          lead="Try the workspace immediately using our ready-made Admin and Employee test accounts. No payment details or sign-up required."
        />
        <div className="mt-14 grid gap-6 md:grid-cols-[3fr_2fr]">
          <article data-reveal className="flex flex-col rounded-2xl border border-accent-line bg-surface p-6 sm:p-8">
            <div className="flex items-baseline justify-between gap-4">
              <h3 className="text-[18px] font-medium">Pilot</h3>
              <span className="rounded-md bg-accent-soft px-2 py-0.5 text-[12px] text-accent-ink">Open now</span>
            </div>
            <p className="mt-6 flex items-baseline gap-2">
              <span className="text-[32px] font-medium leading-none tracking-[-0.02em]">Free</span>
              <span className="text-[14px] text-ink-3">during early access</span>
            </p>
            <p className="mt-4 max-w-[30rem] text-[15px] leading-[24px] text-ink-2">
              For one team that wants answers from its own documents now and is happy to test both permission levels.
            </p>
            <ul className="tick-list mt-8 grid gap-3 border-t border-line pt-8 text-[14px] text-ink-2 sm:grid-cols-2">
              <li>
                {facts.maxDocs} documents per person, {facts.maxFileMb} MB per file
              </li>
              <li>PDF, Word, Markdown and text</li>
              <li>Questions in English and Roman Urdu</li>
              <li>Three roles, departments and teams</li>
              <li>Private sharing with revoke</li>
              <li>Activity ledger with CSV export</li>
            </ul>
            <div className="mt-auto flex flex-wrap gap-3 pt-10">
              <Link
                href="/dashboard/admin"
                className="inline-flex h-11 items-center rounded-[10px] bg-btn px-5 text-[15px] font-medium text-on-btn transition-[background-color,transform] duration-150 hover:bg-btn-hover active:scale-[0.98]"
              >
                Test as Admin
              </Link>
              <Link
                href="/dashboard/employee"
                className="inline-flex h-11 items-center rounded-[10px] border border-line-strong px-5 text-[15px] font-medium text-ink transition-[background-color,transform] duration-150 hover:bg-raised active:scale-[0.98]"
              >
                Test as Employee
              </Link>
            </div>
          </article>

          <article data-reveal className="flex flex-col rounded-2xl border border-line bg-surface p-6 sm:p-8">
            <h3 className="text-[18px] font-medium">Team</h3>
            <p className="mt-6 text-[32px] font-medium leading-none tracking-[-0.02em]">At launch</p>
            <p className="mt-4 text-[15px] leading-[24px] text-ink-2">
              For organisations planning to run DocuTrust across several departments after the pilot.
            </p>
            <ul className="tick-list mt-8 grid gap-3 border-t border-line pt-8 text-[14px] text-ink-2">
              <li>Everything in Pilot</li>
              <li>Several departments on one workspace</li>
              <li>Help planning the move to daily use</li>
            </ul>
            <div className="mt-auto pt-10">
              <Link
                href="#early-access"
                className="inline-flex h-11 items-center rounded-[10px] border border-line-strong px-5 text-[15px] font-medium text-ink transition-[background-color,transform] duration-150 hover:bg-raised active:scale-[0.98]"
              >
                Compare test accounts
              </Link>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
