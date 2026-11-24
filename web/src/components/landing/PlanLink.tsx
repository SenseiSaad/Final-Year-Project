"use client";

import type { ReactNode } from "react";

/* Scrolls to the request form and preselects the plan */
export function PlanLink({ plan, primary, children }: { plan: "pilot" | "team"; primary?: boolean; children: ReactNode }) {
  return (
    <a
      href="#request"
      onClick={() => window.dispatchEvent(new CustomEvent("plan:select", { detail: plan }))}
      className={`inline-flex h-11 items-center rounded-[10px] px-5 text-[15px] font-medium transition-[background-color,color,transform] duration-150 active:scale-[0.98] ${
        primary ? "bg-btn text-on-btn hover:bg-btn-hover" : "border border-line-strong text-ink hover:bg-raised"
      }`}
    >
      {children}
    </a>
  );
}
