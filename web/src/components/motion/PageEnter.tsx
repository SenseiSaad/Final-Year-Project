import type { ReactNode } from "react";

/* Used by template.tsx: a short fade and rise whenever a page mounts. CSS only, so there is no flash. */
export function PageEnter({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`animate-[rise-in_460ms_var(--ease-soft)_both] ${className}`}>{children}</div>;
}
