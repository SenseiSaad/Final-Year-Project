"use client";

import {
  ArrowLeft,
  FileText,
  Menu,
  MessageSquare,
  MessagesSquare,
  ShieldCheck,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import { Logo } from "@/components/site/Logo";
import { ThemeToggle } from "@/components/site/ThemeToggle";

import { AuditView } from "./AuditView";
import { ChatView } from "./ChatView";
import { DirectoryView } from "./DirectoryView";
import { DocumentsView } from "./DocumentsView";
import { TeamChatView } from "./TeamChatView";
import { ErrorNote } from "./ui";
import { useWorkspace, WorkspaceProvider } from "./WorkspaceContext";

type TabKey = "chat" | "team" | "documents" | "directory" | "audit";

const titles: Record<TabKey, { title: string; subtitle: string }> = {
  chat: { title: "AI chat", subtitle: "Questions answered only from documents this persona may open" },
  team: { title: "Team chat", subtitle: "Rooms limited by department or membership" },
  documents: { title: "Documents", subtitle: "Upload, search and control who can read each file" },
  directory: { title: "People & roles", subtitle: "Departments, reporting lines and role permissions" },
  audit: { title: "Audit log", subtitle: "Hash-chained history of searches, uploads, shares and more" },
};

export function DashboardShell({ initialPersona = "admin" }: { initialPersona?: string }) {
  return (
    <WorkspaceProvider initialPersona={initialPersona}>
      <Shell />
    </WorkspaceProvider>
  );
}

function Shell() {
  const { persona, boot, switching, error, refresh } = useWorkspace();
  const [tab, setTab] = useState<TabKey>("chat");
  const [drawer, setDrawer] = useState(false);
  const [noticeHidden, setNoticeHidden] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!drawer) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setDrawer(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [drawer]);

  const caps = boot?.capabilities;
  const showDirectory = !!caps && (caps.manage_departments || caps.manage_members || caps.manage_roles);
  const nav: { id: TabKey; label: string; icon: LucideIcon; show: boolean }[] = [
    { id: "chat", label: "AI chat", icon: MessageSquare, show: true },
    { id: "team", label: "Team chat", icon: MessagesSquare, show: true },
    { id: "documents", label: "Documents", icon: FileText, show: true },
    { id: "directory", label: "People & roles", icon: Users, show: showDirectory },
    { id: "audit", label: "Audit log", icon: ShieldCheck, show: !!caps?.view_audit },
  ];
  const allowed = nav.filter((item) => item.show).map((item) => item.id);
  const activeTab: TabKey = allowed.includes(tab) ? tab : "chat";

  function select(next: TabKey) {
    setTab(next);
    setDrawer(false);
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-line px-4">
        <Logo />
        <button
          ref={closeRef}
          type="button"
          onClick={() => setDrawer(false)}
          aria-label="Close menu"
          className="grid size-9 place-items-center rounded-lg text-ink-2 hover:bg-raised lg:hidden"
        >
          <X className="size-4" strokeWidth={1.5} />
        </button>
      </div>

      <nav aria-label="Workspace" className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="grid gap-1">
          {nav
            .filter((item) => item.show)
            .map((item, index, visible) => {
              const active = activeTab === item.id;
              const divider = item.id === "directory" || (item.id === "audit" && visible[index - 1]?.id !== "directory");
              return (
                <li key={item.id} className={divider ? "mt-3 border-t border-line pt-4" : undefined}>
                  <button
                    type="button"
                    onClick={() => select(item.id)}
                    aria-current={active ? "page" : undefined}
                    className={`flex h-10 w-full items-center gap-2.5 rounded-lg px-3 text-[14px] transition-colors duration-150 ${
                      active ? "bg-btn font-medium text-on-btn" : "text-ink-2 hover:bg-raised hover:text-ink"
                    }`}
                  >
                    <item.icon className="size-4 shrink-0" strokeWidth={1.5} />
                    <span className="truncate">{item.label}</span>
                  </button>
                </li>
              );
            })}
        </ul>
      </nav>

      <div className="shrink-0 space-y-3 border-t border-line p-3">
        <PersonaSelect />
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium text-ink-2 transition-colors hover:bg-raised hover:text-ink"
          >
            <ArrowLeft className="size-3.5" strokeWidth={1.5} />
            Home
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </div>
  );

  let content;
  if (!boot) {
    content = error ? (
      <div className="mx-auto max-w-[32rem] py-16">
        <ErrorNote onRetry={refresh}>{error}</ErrorNote>
        <p className="mt-4 text-[14px] leading-[22px] text-ink-3">
          The workspace needs its Django service. Locally run{" "}
          <code className="rounded bg-raised px-1.5 py-0.5 font-mono text-[13px]">python manage.py runserver 127.0.0.1:8300</code>.
        </p>
      </div>
    ) : (
      <p role="status" className="py-16 text-center text-[14px] text-ink-3">
        Connecting to the workspace…
      </p>
    );
  } else if (switching) {
    content = (
      <p role="status" className="py-16 text-center text-[14px] text-ink-3">
        Switching persona…
      </p>
    );
  } else {
    content = (
      <div key={persona} className="h-full">
        {activeTab === "chat" && <ChatView goToDocuments={() => select("documents")} />}
        {activeTab === "team" && <TeamChatView />}
        {activeTab === "documents" && <DocumentsView />}
        {activeTab === "directory" && <DirectoryView />}
        {activeTab === "audit" && <AuditView />}
      </div>
    );
  }

  const fixedHeight = activeTab === "chat" || activeTab === "team";

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-bg text-ink">
      <aside className="hidden w-[248px] shrink-0 border-r border-line bg-deep lg:block">{sidebar}</aside>

      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Workspace menu">
          <button
            type="button"
            tabIndex={-1}
            aria-label="Dismiss menu"
            onClick={() => setDrawer(false)}
            className="absolute inset-0 bg-black/50"
          />
          <aside className="relative h-full w-[min(280px,86vw)] border-r border-line bg-deep">{sidebar}</aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-bg px-3 sm:px-6">
          <button
            type="button"
            onClick={() => setDrawer(true)}
            aria-label="Open menu"
            className="grid size-10 place-items-center rounded-lg text-ink-2 hover:bg-raised lg:hidden"
          >
            <Menu className="size-[18px]" strokeWidth={1.5} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[16px] font-semibold leading-tight">{titles[activeTab].title}</h1>
            <p className="hidden truncate text-[13px] text-ink-3 sm:block">{titles[activeTab].subtitle}</p>
          </div>
          {boot && (
            <span className="inline-flex h-8 max-w-[45%] shrink-0 items-center gap-1.5 truncate rounded-lg border border-line px-2.5 text-[12px] text-ink-2 sm:max-w-none">
              <span className="truncate font-medium text-ink">{boot.personas.find((p) => p.username === persona)?.display_name ?? persona}</span>
              <span className="hidden text-ink-3 sm:inline">· demo persona</span>
            </span>
          )}
        </header>

        {boot && !noticeHidden && (
          <div className="flex shrink-0 items-start gap-2 border-b border-line bg-deep px-3 py-2 text-[12px] leading-[18px] text-ink-2 sm:px-6">
            <p className="min-w-0 flex-1">{boot.demo_notice}</p>
            <button
              type="button"
              onClick={() => setNoticeHidden(true)}
              aria-label="Dismiss notice"
              className="-my-1 grid size-6 shrink-0 place-items-center rounded text-ink-3 hover:text-ink"
            >
              <X className="size-3.5" strokeWidth={1.5} />
            </button>
          </div>
        )}

        <div className={`min-h-0 flex-1 px-3 py-4 sm:px-6 sm:py-5 ${fixedHeight ? "overflow-hidden" : "overflow-y-auto"}`}>
          {content}
        </div>
      </div>
    </div>
  );
}

function PersonaSelect() {
  const { persona, setPersona, boot } = useWorkspace();
  const selectId = useId();
  return (
    <div>
      <label htmlFor={selectId} className="text-[12px] font-medium text-ink-2">
        Demo persona
      </label>
      <select
        id={selectId}
        value={persona}
        onChange={(event) => setPersona(event.target.value)}
        disabled={!boot}
        className="mt-1.5 h-10 w-full rounded-lg border border-line-strong bg-surface px-2.5 text-[14px] text-ink"
      >
        {(boot?.personas ?? [{ username: persona, display_name: persona, role: { name: "" } }]).map((p) => (
          <option key={p.username} value={p.username}>
            {p.display_name} · {p.role.name}
          </option>
        ))}
      </select>
      <p className="mt-1.5 text-[12px] leading-[17px] text-ink-3">Preview only. This is not sign-in.</p>
    </div>
  );
}
