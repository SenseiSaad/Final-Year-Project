"use client";

import { ArrowRight, FileUp, MessageSquare, MessagesSquare, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import useMeasure from "react-use-measure";

import { TextEffect } from "@/components/core/text-effect";
import { TransitionPanel } from "@/components/core/transition-panel";

const views = [
  {
    id: "chat",
    icon: MessageSquare,
    label: "AI chat",
    summary: "Conversations are saved per person. Each answer cites the passages it used, and a question with no permitted source is refused.",
    lines: [
      { tag: "Models", text: "Pick Local, Gemini or Hosted per question; cloud choices ask for confirmation first." },
      { tag: "Sources", text: "Expand a citation to read the exact passage and page." },
      { tag: "History", text: "New chat, reopen or delete earlier conversations." },
    ],
  },
  {
    id: "team",
    icon: MessagesSquare,
    label: "Team chat",
    summary: "A General room exists from the start. Add rooms for everyone, one department or a chosen set of members.",
    lines: [
      { tag: "General", text: "Open to the whole workspace." },
      { tag: "Department", text: "Visible to that department and the managers assigned to it." },
      { tag: "Members", text: "Only the people you select can see the room." },
    ],
  },
  {
    id: "upload",
    icon: FileUp,
    label: "Documents",
    summary: "Drop files in, watch them upload and index, then search the library or open the access settings for any file.",
    lines: [
      { tag: "Role-based", text: "Department members and assigned managers can read it." },
      { tag: "Admin scope", text: "Only the roles, departments and people an admin picks." },
      { tag: "Search", text: "Filter by name or search inside the text of permitted files." },
    ],
  },
  {
    id: "audit",
    icon: ShieldCheck,
    label: "Audit log",
    summary: "Admins, executives and anyone granted the audit permission can open a full timeline for each person.",
    lines: [
      { tag: "Timeline", text: "Questions, searches, uploads, shares and room activity." },
      { tag: "Verify", text: "Recompute the SHA-256 chain on the server and see where it breaks." },
      { tag: "Access", text: "Hidden entirely from roles without the permission." },
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
    <section id="workspace" aria-labelledby="workspace-title" className="section-fit border-y border-line bg-deep">
      <div className="w-full">
        <div className="container-page grid w-full gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start lg:gap-16">
          <div>
            <h2 id="workspace-title" className="heading" aria-label="Chat, files, teams and audit in one place">
              <TextEffect per="char" preset="fade" staggerSeconds={0.012}>
                Chat, files, teams and audit in one place
              </TextEffect>
            </h2>
            <p data-reveal className="mt-4 max-w-[30rem] text-[17px] leading-[28px] text-ink-2">
              Open the workspace without signing in and switch demo personas to see how access changes. Everything you
              add is stored by the Django service.
            </p>

            <div data-reveal className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/dashboard"
                className="group inline-flex h-11 items-center gap-2 rounded-[10px] bg-btn px-5 text-[15px] font-medium text-on-btn transition-[background-color,transform] duration-150 hover:bg-btn-hover active:scale-[0.98]"
              >
                Open workspace
                <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={1.5} />
              </Link>
              <span className="text-[14px] text-ink-3">No sign-in · synthetic data only</span>
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
                      <div key={row.tag} className="grid gap-1 py-3.5 sm:grid-cols-[110px_1fr] sm:items-baseline sm:gap-4">
                        <dt className="flex items-center gap-1.5 text-[13px] font-medium text-ink">
                          {row.tag}
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
