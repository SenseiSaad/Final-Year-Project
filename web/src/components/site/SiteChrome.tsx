"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { Footer } from "./Footer";
import { Nav } from "./Nav";

/* Renders marketing header/footer on public pages; gives /dashboard/* a full-viewport app shell */
export function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isWorkspace = pathname?.startsWith("/dashboard");

  if (isWorkspace) {
    return (
      <main id="main" className="min-h-dvh flex-1">
        {children}
      </main>
    );
  }

  return (
    <>
      <Nav />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
    </>
  );
}
