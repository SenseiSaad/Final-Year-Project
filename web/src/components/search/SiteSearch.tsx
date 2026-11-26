"use client";

import { Boxes, CircleHelp, FileText, Gauge, Layers, LogIn, Moon, Scale, ShieldCheck, Sun, UserPlus, Workflow } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { useTransitionRouter } from "@/components/motion/TransitionProvider";
import { useLiquidTheme } from "@/components/theme/useLiquidTheme";
import { openEarlyAccess } from "@/lib/early-access";
import { FAQ } from "@/lib/faq";

import { CommandPalette, type PaletteItem } from "./CommandPalette";

const SearchContext = createContext<{ openSearch: () => void } | null>(null);

export function useSiteSearch() {
  const value = useContext(SearchContext);
  if (!value) throw new Error("useSiteSearch must be used inside SiteSearchProvider");
  return value;
}

/* Search for the public site: sections, pages and every FAQ question. Opens with Ctrl or Cmd + K, or "/". */
export function SiteSearchProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { go } = useTransitionRouter();
  const { dark, next, toggle } = useLiquidTheme();

  const openSearch = useCallback(() => setOpen(true), []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const typing = (event.target as HTMLElement)?.closest?.("input, textarea, select, [contenteditable]");
      if ((event.key === "k" && (event.metaKey || event.ctrlKey)) || (event.key === "/" && !typing)) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const items = useMemo<PaletteItem[]>(() => {
    const jump = (hash: string) => () => go(`/${hash}`);
    const section = (id: string, label: string, hash: string, icon: PaletteItem["icon"], keywords: string): PaletteItem => ({
      id, label, hint: "Section", icon, keywords, perform: jump(hash),
    });
    return [
      section("product", "Product tour", "#product", Layers, "search refuse permissions ledger demo"),
      section("how", "How it works", "#how", Workflow, "upload ask check steps"),
      section("workspace", "Workspace overview", "#workspace", Boxes, "chat files teams notes announcements audit"),
      section("roles", "Roles and access", "#roles", Gauge, "employee manager administrator department"),
      section("security", "What stays where", "#security", ShieldCheck, "local cloud privacy keys"),
      { id: "early", label: "Request early access", hint: "Action", icon: UserPlus, keywords: "form contact join waitlist pilot", perform: openEarlyAccess },
      ...FAQ.map((entry, i) => ({
        id: `faq-${i}`,
        label: entry.q,
        hint: "FAQ",
        icon: CircleHelp,
        perform: () => {
          go("/#faq");
          window.setTimeout(() => window.dispatchEvent(new CustomEvent("faq:open", { detail: i })), 700);
        },
      })),
      { id: "privacy", label: "Privacy policy", hint: "Page", icon: FileText, keywords: "data cookies personal", perform: () => go("/privacy") },
      { id: "terms", label: "Terms of service", hint: "Page", icon: Scale, keywords: "legal agreement", perform: () => go("/terms") },
      { id: "signin", label: "Open the workspace", hint: "Page", icon: LogIn, keywords: "login workspace", perform: () => go("/login") },
      { id: "theme", label: `Switch to ${next} theme`, hint: "Action", icon: dark ? Sun : Moon, keywords: "dark light black white appearance", perform: () => toggle() },
    ].filter((item, index, all) => all.findIndex((other) => other.label === item.label) === index);
  }, [dark, go, next, toggle]);

  const value = useMemo(() => ({ openSearch }), [openSearch]);

  return (
    <SearchContext.Provider value={value}>
      {children}
      <CommandPalette open={open} onClose={() => setOpen(false)} items={items} placeholder="Search sections, pages and questions" />
    </SearchContext.Provider>
  );
}
