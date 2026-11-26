"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ArrowRight, FileUp, MessageSquare, MessagesSquare, NotebookPen, ShieldCheck, type LucideIcon } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";

import { TransitionLink } from "@/components/motion/TransitionLink";
import { buttonStyles } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

import { SectionHead } from "./SectionHead";

gsap.registerPlugin(useGSAP);

const views: { id: string; icon: LucideIcon; label: string; summary: string; lines: { tag: string; text: string }[] }[] = [
  {
    id: "home",
    icon: NotebookPen,
    label: "Search and notes",
    summary: "One search bar finds documents, notes and announcements. Notes stay private to you, and announcements reach everyone.",
    lines: [
      { tag: "Search", text: "Press Ctrl K anywhere in the workspace to jump to a file, a note or a notice." },
      { tag: "Notes", text: "Saved as you type, pinned when they matter, visible only to their author." },
      { tag: "Announcements", text: "Pinned and important notices rise to the top of every home screen." },
    ],
  },
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
];

export function WorkspaceSection() {
  const [active, setActive] = useState(0);
  const panel = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [mark, setMark] = useState({ left: 0, width: 0 });
  const view = views[active];

  useLayoutEffect(() => {
    const measure = () => {
      const el = tabRefs.current[active];
      if (el) setMark({ left: el.offsetLeft, width: el.offsetWidth });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [active]);

  useGSAP(
    () => {
      gsap.fromTo(panel.current?.children ?? [], { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.07, ease: "power3.out" });
    },
    { dependencies: [active], scope: panel },
  );

  return (
    <section id="workspace" aria-labelledby="workspace-title" className="border-y border-line bg-deep py-28 md:py-36">
      <div className="container-page grid gap-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-20">
        <div>
          <SectionHead
            id="workspace-title"
            title="Chat, files, teams and audit in one place"
            lead="Sign-in is open in this demo, and everyone enters as an administrator with full control. Everything you add is stored by the Django service."
          />
          <div data-reveal className="mt-9 flex flex-wrap items-center gap-4">
            <TransitionLink href="/login" className={buttonStyles({ size: "lg" })}>
              Open workspace
              <ArrowRight className="size-4" strokeWidth={1.5} />
            </TransitionLink>
            <span className="text-[14px] text-ink-3">Synthetic data only</span>
          </div>
        </div>

        <div data-reveal className="min-w-0">
          <div ref={rail} role="tablist" aria-label="Workspace features" className="relative flex gap-1 overflow-x-auto border-b border-line" data-lenis-prevent>
            {views.map((item, i) => (
              <button
                key={item.id}
                ref={(el) => {
                  tabRefs.current[i] = el;
                }}
                type="button"
                role="tab"
                id={`ws-tab-${item.id}`}
                aria-controls={`ws-panel-${item.id}`}
                aria-selected={i === active}
                tabIndex={i === active ? 0 : -1}
                onClick={() => setActive(i)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
                    event.preventDefault();
                    const next = (active + (event.key === "ArrowRight" ? 1 : -1) + views.length) % views.length;
                    setActive(next);
                    tabRefs.current[next]?.focus();
                  }
                }}
                className={cn(
                  "inline-flex h-12 shrink-0 items-center gap-2 px-3.5 text-[14px] font-medium transition-colors duration-150",
                  i === active ? "text-ink" : "text-ink-3 hover:text-ink",
                )}
              >
                <item.icon className="size-4" strokeWidth={1.5} />
                {item.label}
              </button>
            ))}
            <span
              aria-hidden="true"
              className="absolute bottom-0 h-0.5 bg-ink transition-[transform,width] duration-500 ease-soft"
              style={{ width: mark.width, transform: `translateX(${mark.left}px)` }}
            />
          </div>

          <div ref={panel} role="tabpanel" id={`ws-panel-${view.id}`} aria-labelledby={`ws-tab-${view.id}`} tabIndex={0} className="min-h-[300px] pt-8">
            <p className="max-w-[34rem] text-[18px] leading-[28px] text-ink">{view.summary}</p>
            <dl className="mt-8 divide-y divide-line border-y border-line">
              {view.lines.map((line) => (
                <div key={line.tag} className="grid gap-1 py-4 sm:grid-cols-[150px_1fr] sm:gap-6">
                  <dt className="font-mono text-[13px] text-ink-3">{line.tag}</dt>
                  <dd className="text-[15px] leading-[24px] text-ink-2">{line.text}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
