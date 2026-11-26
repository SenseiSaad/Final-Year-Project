"use client";

import { ArrowRight, X } from "lucide-react";
import { useState } from "react";

import { TransitionLink } from "@/components/motion/TransitionLink";
import { cn } from "@/lib/cn";

/* A one-line notice above the navigation. Dismissing it is remembered in this browser. */
export function AnnouncementBar() {
  const [open, setOpen] = useState(true);

  function dismiss() {
    setOpen(false);
    try {
      localStorage.setItem("announce", "off");
    } catch {
      /* private mode: the notice simply returns next visit */
    }
  }

  return (
    <div
      role="region"
      aria-label="Announcement"
      className={cn("announce grid transition-[grid-template-rows] duration-300 ease-soft", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}
      inert={!open}
    >
      <div className="overflow-hidden">
        <div className="bg-ink text-on-ink">
          <div className="container-page flex min-h-10 items-center justify-center gap-3 py-1.5 text-[13px]">
            <p className="text-center">Early access is open to a small group of teams.</p>
            <TransitionLink href="/#request" className="group inline-flex shrink-0 items-center gap-1.5 font-medium underline decoration-on-ink/40 underline-offset-4 hover:decoration-on-ink">
              Request a place
              <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={1.5} />
            </TransitionLink>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss announcement"
              className="absolute right-3 grid size-8 place-items-center rounded-[8px] text-on-ink/70 transition-colors hover:bg-on-ink/10 hover:text-on-ink max-sm:static max-sm:ml-auto"
            >
              <X className="size-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
