"use client";

import {
  Info,
  LayoutGrid,
  LogOut,
  Megaphone,
  Menu,
  MessageSquare,
  MessagesSquare,
  FileText,
  NotebookPen,
  Search,
  ShieldCheck,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";

import { useTransitionRouter } from "@/components/motion/TransitionProvider";
import { TransitionLink } from "@/components/motion/TransitionLink";
import { Logo } from "@/components/site/Logo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/cn";

import { signOut, useSession } from "./session";
import { Avatar } from "./ui";
import { useWorkspace } from "./WorkspaceContext";
import { useWorkspaceSearch } from "./WorkspaceSearch";

type NavItem = { href: string; label: string; icon: LucideIcon; show: boolean };

const subscribe = () => () => {};
const isMac = () => /Mac|iPhone|iPad/.test(navigator.platform);

function useNav(): NavItem[][] {
  const { boot } = useWorkspace();
  const caps = boot?.capabilities;
  return [
    [
      { href: "/workspace", label: "Overview", icon: LayoutGrid, show: true },
      { href: "/workspace/chat", label: "AI chat", icon: MessageSquare, show: true },
      { href: "/workspace/team", label: "Team chat", icon: MessagesSquare, show: true },
      { href: "/workspace/documents", label: "Documents", icon: FileText, show: true },
    ],
    [
      { href: "/workspace/notes", label: "Notes", icon: NotebookPen, show: true },
      { href: "/workspace/announcements", label: "Announcements", icon: Megaphone, show: true },
    ],
    [
      { href: "/workspace/people", label: "People and roles", icon: Users, show: !!(caps?.manage_members || caps?.manage_roles || caps?.manage_departments) },
      { href: "/workspace/audit", label: "Audit log", icon: ShieldCheck, show: !!caps?.view_audit },
    ],
  ].map((group) => group.filter((item) => item.show)).filter((group) => group.length);
}

function Navigation({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const groups = useNav();
  const root = useRef<HTMLDivElement>(null);
  const [mark, setMark] = useState<{ top: number; height: number } | null>(null);

  const isActive = (href: string) => (href === "/workspace" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`));

  // A soft block slides to the current page
  useLayoutEffect(() => {
    const el = root.current?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!el || !root.current) return setMark(null);
    // Measured from the whole list, because the links sit inside separate groups
    setMark({ top: el.getBoundingClientRect().top - root.current.getBoundingClientRect().top, height: el.offsetHeight });
  }, [pathname, groups.length]);

  return (
    <nav aria-label="Workspace" ref={root} className="relative grid content-start gap-5">
      {mark && (
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 rounded-[10px] bg-raised transition-[transform,height] duration-500 ease-soft"
          style={{ height: mark.height, transform: `translateY(${mark.top}px)` }}
        />
      )}
      {groups.map((group, i) => (
        <ul key={i} className={cn("relative grid gap-0.5", i > 0 && "border-t border-line pt-5")}>
          {group.map((item) => (
            <li key={item.href}>
              <TransitionLink
                href={item.href}
                onClick={onNavigate}
                aria-current={isActive(item.href) ? "page" : undefined}
                className="relative flex h-10 items-center gap-3 rounded-[10px] px-3 text-[14px] text-ink-2 transition-colors duration-150 hover:text-ink aria-[current=page]:font-medium aria-[current=page]:text-ink"
              >
                <item.icon className="size-[18px] shrink-0" strokeWidth={1.5} />
                {item.label}
              </TransitionLink>
            </li>
          ))}
        </ul>
      ))}
    </nav>
  );
}

function Account() {
  const { boot } = useWorkspace();
  const { go } = useTransitionRouter();
  const user = boot?.user;
  return (
    <div className="flex items-center gap-3 rounded-[12px] p-2">
      <Avatar name={user?.display_name ?? "Admin"} className="size-9" />
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-[14px] font-medium">{user?.display_name ?? "Administrator"}</p>
        <p className="truncate text-[12px] text-ink-3">{user ? user.role.name : "Full control"}</p>
      </div>
      <button
        type="button"
        aria-label="Sign out"
        title="Sign out"
        onClick={() => {
          signOut();
          go("/login");
        }}
        className="grid size-9 place-items-center rounded-[10px] text-ink-2 transition-colors hover:bg-hover hover:text-ink"
      >
        <LogOut className="size-[18px]" strokeWidth={1.5} />
      </button>
    </div>
  );
}

function Notice() {
  const { boot } = useWorkspace();
  const [hidden, setHidden] = useState(false);
  const stored = useSyncExternalStore(
    subscribe,
    () => sessionStorage.getItem("docutrust:notice") === "off",
    () => true,
  );
  if (!boot?.demo_notice || hidden || stored) return null;
  return (
    <div role="region" aria-label="Notice" className="flex items-start gap-3 border-b border-line bg-deep px-5 py-2.5 text-[13px] leading-[20px] text-ink-2 sm:px-8">
      <Info className="mt-0.5 size-4 shrink-0" strokeWidth={1.5} />
      <p className="min-w-0 flex-1">{boot.demo_notice}</p>
      <button
        type="button"
        aria-label="Dismiss notice"
        onClick={() => {
          sessionStorage.setItem("docutrust:notice", "off");
          setHidden(true);
        }}
        className="-my-1 grid size-7 shrink-0 place-items-center rounded-[8px] text-ink-3 hover:bg-hover hover:text-ink"
      >
        <X className="size-4" strokeWidth={1.5} />
      </button>
    </div>
  );
}

function Gate({ children }: { children: ReactNode }) {
  const session = useSession();
  const { go } = useTransitionRouter();
  useEffect(() => {
    if (session === "out") go("/login", { replace: true });
  }, [session, go]);
  if (session !== "in") return <div className="grid min-h-dvh place-items-center" aria-busy="true" />;
  return <>{children}</>;
}

function Frame({ children }: { children: ReactNode }) {
  const { openSearch } = useWorkspaceSearch();
  const { error, refresh } = useWorkspace();
  const [drawer, setDrawer] = useState(false);
  const mac = useSyncExternalStore(subscribe, isMac, () => false);

  return (
    <div className="grid h-dvh grid-rows-[auto_1fr] lg:grid-cols-[272px_1fr] lg:grid-rows-1">
      <aside className="hidden flex-col gap-8 border-r border-line bg-deep px-4 py-5 lg:flex">
        <div className="px-2 pt-1">
          <Logo href="/workspace" />
        </div>
        <div className="flex-1 overflow-y-auto">
          <Navigation />
        </div>
        <Account />
      </aside>

      <Modal open={drawer} onClose={() => setDrawer(false)} label="Menu" className="inset-y-0 left-0 m-0 h-dvh w-[min(320px,86vw)]">
        <div className="flex h-dvh flex-col gap-8 border-r border-line-strong bg-deep px-4 py-5">
          <div className="flex items-center justify-between px-2">
            <Logo href="/workspace" />
            <button type="button" aria-label="Close menu" onClick={() => setDrawer(false)} className="grid size-9 place-items-center rounded-[10px] text-ink-2 hover:bg-hover">
              <X className="size-[18px]" strokeWidth={1.5} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <Navigation onNavigate={() => setDrawer(false)} />
          </div>
          <Account />
        </div>
      </Modal>

      <div className="flex min-h-0 min-w-0 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-line px-4 sm:px-8">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setDrawer(true)}
            className="grid size-10 place-items-center rounded-[10px] text-ink-2 hover:bg-hover lg:hidden"
          >
            <Menu className="size-[18px]" strokeWidth={1.5} />
          </button>
          <button
            type="button"
            onClick={openSearch}
            className="flex h-10 min-w-0 max-w-[520px] flex-1 items-center gap-3 rounded-[10px] border border-line-strong px-3 text-left text-[14px] text-ink-3 transition-colors hover:bg-hover hover:text-ink"
          >
            <Search className="size-4 shrink-0" strokeWidth={1.5} />
            <span className="min-w-0 flex-1 truncate">Search documents, notes and announcements</span>
            <span className="kbd hidden sm:inline-flex" aria-hidden="true">
              {mac ? "⌘K" : "Ctrl K"}
            </span>
          </button>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>
        <Notice />
        {error && (
          <div role="alert" className="flex flex-wrap items-center gap-3 border-b border-line bg-danger-soft px-5 py-2.5 text-[14px] text-danger sm:px-8">
            <span className="min-w-0 flex-1">{error}</span>
            <Button size="sm" variant="secondary" onClick={refresh}>
              Try again
            </Button>
          </div>
        )}
        <main id="main" tabIndex={-1} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {children}
        </main>
      </div>
    </div>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  return (
    <Gate>
      <Frame>{children}</Frame>
    </Gate>
  );
}
