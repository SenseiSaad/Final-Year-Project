"use client";

import { Fragment, useSyncExternalStore, type ReactNode } from "react";

import type { DocumentItem } from "@/lib/workspace-api";

/* The API also sends these two fields; the shared type does not list them */
export type LibraryDocument = DocumentItem & { sha256?: string; mime_type?: string };

const desktopQuery = "(min-width: 1024px)";

function subscribe(callback: () => void) {
  const media = window.matchMedia(desktopQuery);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

/* True from the lg breakpoint up, where details sit beside the list instead of in a sheet */
export function useIsDesktop() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(desktopQuery).matches,
    () => false,
  );
}

/* Marks every word of the query inside a snippet */
export function Highlight({ text, query }: { text: string; query: string }): ReactNode {
  const terms = Array.from(new Set(query.split(/\s+/).filter((term) => term.length >= 2))).map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (!terms.length) return text;
  const parts = text.split(new RegExp(`(${terms.join("|")})`, "gi"));
  return parts.map((part, index) =>
    index % 2 === 1 ? (
      <mark key={index} className="rounded-[2px] bg-mark px-px text-ink">
        {part}
      </mark>
    ) : (
      <Fragment key={index}>{part}</Fragment>
    ),
  );
}

export function accessModeLabel(mode: DocumentItem["access_mode"]) {
  return mode === "rbac" ? "Role-based policy" : "Admin-defined scope";
}
