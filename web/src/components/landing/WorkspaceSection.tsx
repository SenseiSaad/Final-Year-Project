"use client";

import { ArrowRight, FileText, FileUp, Hash, MessageSquare, MessagesSquare, Pin, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import useMeasure from "react-use-measure";

import { TextEffect } from "@/components/core/text-effect";
import { TransitionPanel } from "@/components/core/transition-panel";

const views = [
  {
    id: "chat",
    icon: MessageSquare,
    label: "Chat",
    summary: "Ask in English or Roman Urdu across permitted files. Answers appear in full prose with source files listed cleanly underneath.",
    lines: [
      { tag: "Question", text: "How many annual leave days do I get and how many carry over?" },
      { tag: "Answer", text: "As of January 2026, you get 18 annual leave days per year and can carry over up to 5 unused days until 31 March." },
      { tag: "Sources", text: "2026-policy-updates.md (OKF) · leave-policy.pdf" },
    ],
  },
  {
    id: "team",
    icon: MessagesSquare,
    label: "Team chat",
    summary: "Scoped channels for company-wide updates and department discussions so private HR or Finance threads stay separated.",
    lines: [
      { tag: "#general", text: "Administrator pinned 2026-policy-updates.md as OKF guidance." },
      { tag: "#finance", text: "Usman Tariq uploaded expense-policy.pdf for travel pre-approvals." },
      { tag: "#hr-private", text: "Restricted to HR & Admin — hidden from other departments." },
    ],
  },
  {
    id: "upload",
    icon: FileUp,
    label: "Document upload",
    summary: "Drop PDF, Word, Markdown or text files, pick visibility (Everyone, Department, or Private) and pin official OKF updates.",
    lines: [
      { tag: "OKF pinned", text: "2026-policy-updates.md · Company-wide · +0.15 priority boost" },
      { tag: "Department", text: "expense-policy.pdf · Finance · 9 passages indexed" },
      { tag: "Private", text: "q3-budget-notes.md · Owner only · instant share or revoke" },
    ],
  },
  {
    id: "audit",
    icon: ShieldCheck,
    label: "Audit log",
    summary: "Every upload, question, OKF change and account edit is appended to a SHA-256 hash chain with one-click verification and CSV export.",
    lines: [
      { tag: "08:45", text: "Administrator · OKF pinned · 2026-policy-updates.md" },
      { tag: "09:12", text: "Usman Tariq · File uploaded · expense-policy.pdf" },
      { tag: "10:05", text: "Ayesha Khan · Question asked · 1 permitted source" },
    ],
  },
] as const;

export function WorkspaceSection() {
  const [active, setActive] = useState(0);
  const [direction, setDirection] = useState(1);
  const [measureRef, bounds] = useMeasure();

  function select(index: number) {
    if (index === active) return;
    setDirection(index > active ? 1 : -1);
    setActive(index);
  }

  return (
    <section id="workspace" aria-labelledby="workspace-title" className="border-y border-line bg-deep py-24 md:py-32">
      <div className="container-page">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start lg:gap-16">
          <div>
            <h2 id="workspace-title" className="heading" aria-label="Workspace">
              <TextEffect per="char" preset="fade" stagger={0.03}>
                Workspace
              </TextEffect>
            </h2>
            <p data-reveal className="mt-4 max-w-[30rem] text-[17px] leading-[28px] text-ink-2">
              Open the workspace directly and try every feature—Chat, Team chat, Document upload, OKF pinning and the
              Audit log. No login setup needed.
            </p>

            <div data-reveal className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/dashboard"
                className="group inline-flex h-11 items-center gap-2 rounded-[10px] bg-btn px-5 text-[15px] font-medium text-on-btn transition-[background-color,transform] duration-150 hover:bg-btn-hover active:scale-[0.98]"
              >
                Open workspace
                <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={1.5} />
              </Link>
              <span className="text-[14px] text-ink-3">Direct access · no sign-in required</span>
            </div>
          </div>

          <div data-reveal>
            {/* Dynamic feature tabs — open underline rail, zero outer box */}
            <div role="tablist" aria-label="Workspace features" className="flex flex-wrap gap-1 border-b border-line">
              {views.map((view, idx) => {
                const selected = idx === active;
                return (
                  <button
                    key={view.id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => select(idx)}
                    className={`relative inline-flex h-11 items-center gap-2 px-3.5 text-[14px] font-medium transition-colors duration-150 ${
                      selected ? "text-ink" : "text-ink-3 hover:text-ink"
                    }`}
                  >
                    <view.icon className="size-4" strokeWidth={1.5} />
                    {view.label}
                    {selected && <span className="absolute inset-x-0 bottom-[-1px] h-[2px] bg-ink" />}
                  </button>
                );
              })}
            </div>

            {/* Dynamic preview content — slides between features at a measured height */}
            <TransitionPanel
              activeIndex={active}
              custom={direction}
              variants={{
                enter: (dir: number) => ({
                  x: dir > 0 ? 56 : -56,
                  opacity: 0,
                  height: bounds.height > 0 ? bounds.height : "auto",
                  position: "initial",
                }),
                center: {
                  zIndex: 1,
                  x: 0,
                  opacity: 1,
                  height: bounds.height > 0 ? bounds.height : "auto",
                },
                exit: (dir: number) => ({
                  zIndex: 0,
                  x: dir < 0 ? 56 : -56,
                  opacity: 0,
                  position: "absolute",
                  top: 0,
                  width: "100%",
                }),
              }}
              transition={{
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 },
              }}
              className="pt-6"
            >
              {views.map((view) => (
                <div key={view.id} ref={measureRef}>
                  <p className="text-[15px] leading-[25px] text-ink-2">{view.summary}</p>
                  <dl className="mt-6 divide-y divide-line border-y border-line">
                    {view.lines.map((row) => (
                      <div key={row.tag} className="grid gap-1 py-3.5 sm:grid-cols-[120px_1fr] sm:items-baseline sm:gap-4">
                        <dt className="flex items-center gap-1.5 text-[13px] font-medium text-ink">
                          {row.tag === "OKF pinned" && <Pin className="size-3.5 text-ink-2" strokeWidth={1.5} />}
                          {row.tag === "Sources" && <FileText className="size-3.5 text-ink-2" strokeWidth={1.5} />}
                          {row.tag.startsWith("#") && <Hash className="size-3.5 text-ink-2" strokeWidth={1.5} />}
                          {row.tag.replace(/^#/, "")}
                        </dt>
                        <dd className="text-[14px] leading-[22px] text-ink-2">{row.text}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </TransitionPanel>
          </div>
        </div>
      </div>
    </section>
  );
}
