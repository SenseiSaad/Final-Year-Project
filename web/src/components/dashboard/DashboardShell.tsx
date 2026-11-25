"use client";

import {
  ArrowLeft,
  FileUp,
  KeyRound,
  Menu,
  MessageSquare,
  MessagesSquare,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  User,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Logo, Mark } from "@/components/site/Logo";
import { ThemeToggle } from "@/components/site/ThemeToggle";
import type { Facts } from "@/lib/facts";

import { AdminAnnouncement } from "./AdminAnnouncement";
import { ChatView } from "./ChatView";
import {
  initialAuditRows,
  initialDocs,
  initialTeamMessages,
  initialUsers,
  nowTime,
  qaCases,
  roleProfiles,
  type AuditRow,
  type ChatTurn,
  type DocVisibility,
  type RoleKey,
  type TeamMessage,
  type WorkspaceDoc,
} from "./dashboardData";
import { DocumentsView } from "./DocumentsView";
import { AuditView, UsersView } from "./GovernanceViews";
import { TeamChatView } from "./TeamChatView";

type TabKey = "chat" | "team" | "documents" | "audit" | "users";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DashboardShell({ role, facts }: { role: RoleKey; facts: Facts }) {
  const [viewRole, setViewRole] = useState<RoleKey>(role);
  const isAdmin = viewRole === "admin";
  const profile = roleProfiles[viewRole];

  const [tab, setTab] = useState<TabKey>("chat");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const [docs, setDocs] = useState<WorkspaceDoc[]>(initialDocs);
  const [okfNotice, setOkfNotice] = useState("");
  const [users, setUsers] = useState(initialUsers);
  const [teamMessages, setTeamMessages] = useState<TeamMessage[]>(initialTeamMessages);
  const [auditRows, setAuditRows] = useState<AuditRow[]>(initialAuditRows);
  const [turns, setTurns] = useState<ChatTurn[]>([
    {
      id: "init-1",
      question: qaCases[0].question,
      answer: qaCases[0].okfAnswerText ?? qaCases[0].answerText,
      files: qaCases[0].okfSourceFiles ?? qaCases[0].sourceFiles,
      refused: false,
      time: "09:30",
    },
  ]);

  const visibleDocs = isAdmin ? docs : docs.filter((d) => d.employeeAccess !== null);
  const pinnedOkfCount = docs.filter((d) => d.isOkf).length;

  function appendAudit(action: string, target: string, detail: string) {
    setAuditRows((prev) => [
      ...prev,
      {
        id: (prev[prev.length - 1]?.id ?? 0) + 1,
        time: nowTime(),
        actor: profile.name,
        action,
        target,
        detail,
      },
    ]);
  }

  function handleAppendTurn(turn: ChatTurn) {
    setTurns((prev) => [...prev, turn]);
    appendAudit(
      "Question asked",
      turn.files[0] ?? "No matching file",
      turn.refused ? "Refused · no permitted source" : `Answered · ${turn.files.length} source(s)`,
    );
  }

  function handleSendTeamMessage(msg: TeamMessage) {
    setTeamMessages((prev) => [...prev, msg]);
    appendAudit("Team message", `#${msg.channelId}`, "Posted message");
  }

  function handleUploadFile(file: File, visibility: DocVisibility) {
    const newDoc: WorkspaceDoc = {
      id: `upload-${Date.now()}`,
      name: file.name,
      sizeLabel: formatSize(file.size),
      owner: profile.name,
      department: isAdmin ? "Company-wide" : profile.department,
      visibility,
      chunks: Math.max(1, Math.min(24, Math.ceil(file.size / 12000))),
      updated: `Today · ${nowTime()}`,
      employeeAccess: visibility === "Everyone" ? "Everyone" : "Own",
      isOkf: false,
    };
    setDocs((prev) => [newDoc, ...prev]);
    appendAudit("File uploaded", file.name, `${visibility} · ${newDoc.chunks} chunks indexed`);
  }

  function handleToggleOkf(id: string) {
    if (!isAdmin) return;
    const target = docs.find((d) => d.id === id);
    if (!target) return;
    if (!target.isOkf && pinnedOkfCount >= facts.okfMaxDocs) {
      setOkfNotice(`OKF limit reached (${facts.okfMaxDocs} pinned documents). Unpin one first.`);
      return;
    }
    setOkfNotice("");
    const next = !target.isOkf;
    setDocs((prev) => prev.map((d) => (d.id === id ? { ...d, isOkf: next } : d)));
    appendAudit(next ? "OKF pinned" : "OKF unpinned", target.name, next ? `Pinned (+${facts.okfBoost} boost)` : "Removed OKF pin");
  }

  function handleToggleShare(id: string) {
    const target = docs.find((d) => d.id === id);
    if (!target) return;
    const nextVis: DocVisibility = target.visibility === "Private" ? "Shared" : "Private";
    setDocs((prev) => prev.map((d) => (d.id === id ? { ...d, visibility: nextVis } : d)));
    appendAudit(nextVis === "Shared" ? "File shared" : "Share revoked", target.name, `Visibility changed to ${nextVis}`);
  }

  function handleDeleteDoc(id: string) {
    const target = docs.find((d) => d.id === id);
    if (!target) return;
    setDocs((prev) => prev.filter((d) => d.id !== id));
    appendAudit("File deleted", target.name, "Removed uploaded document");
  }

  function handleToggleUser(username: string) {
    const target = users.find((u) => u.username === username);
    if (!target) return;
    const nextActive = !target.active;
    setUsers((prev) => prev.map((u) => (u.username === username ? { ...u, active: nextActive } : u)));
    appendAudit(nextActive ? "User enabled" : "User disabled", username, nextActive ? "Re-enabled account" : "Disabled account");
  }

  const workspaceNav: { id: TabKey; label: string; icon: typeof MessageSquare; count?: string }[] = [
    { id: "chat", label: "Chat", icon: MessageSquare },
    { id: "team", label: "Team chat", icon: MessagesSquare, count: String(teamMessages.length) },
    { id: "documents", label: "Document upload", icon: FileUp, count: String(visibleDocs.length) },
  ];

  const governanceNav: { id: TabKey; label: string; icon: typeof ShieldCheck; count?: string }[] = [
    { id: "audit", label: "Audit log", icon: ShieldCheck, count: String(auditRows.length) },
    { id: "users", label: "Team & roles", icon: Users, count: String(users.length) },
  ];

  const allowedIds: TabKey[] = isAdmin
    ? ["chat", "team", "documents", "audit", "users"]
    : ["chat", "team", "documents"];
  const activeTab: TabKey = allowedIds.includes(tab) ? tab : "chat";

  const metaByTab: Record<TabKey, { title: string; subtitle: string }> = {
    chat: {
      title: "Chat",
      subtitle: `${visibleDocs.length} permitted documents · ${pinnedOkfCount} OKF pinned`,
    },
    team: {
      title: "Team chat",
      subtitle: isAdmin ? "3 workspace channels" : "2 permitted channels",
    },
    documents: {
      title: "Document upload",
      subtitle: `${visibleDocs.length} indexed · max ${facts.maxFileMb} MB per file`,
    },
    audit: {
      title: "Audit log",
      subtitle: `${auditRows.length} append-only verified events`,
    },
    users: {
      title: "Team & roles",
      subtitle: `${users.filter((u) => u.active).length} active of ${users.length} accounts`,
    },
  };

  function selectTab(next: TabKey) {
    setTab(next);
    setMobileOpen(false);
  }

  const sidebarContent = (isCompact: boolean) => (
    <div className="flex h-full flex-col">
      {/* Brand + Collapse */}
      <div className={`flex h-16 items-center border-b border-line ${isCompact ? "justify-center px-2" : "justify-between px-4"}`}>
        {isCompact ? (
          <Link href="/" aria-label="DocuTrust AI home">
            <Mark className="size-7" />
          </Link>
        ) : (
          <Logo />
        )}
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          aria-label={isCompact ? "Expand sidebar" : "Collapse sidebar"}
          className="hidden size-8 place-items-center rounded-lg text-ink-2 transition-colors hover:bg-raised hover:text-ink lg:grid"
        >
          {isCompact ? <PanelLeftOpen className="size-4" strokeWidth={1.5} /> : <PanelLeftClose className="size-4" strokeWidth={1.5} />}
        </button>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          aria-label="Close sidebar"
          className="grid size-8 place-items-center rounded-lg text-ink-2 hover:bg-raised hover:text-ink lg:hidden"
        >
          <X className="size-4" strokeWidth={1.5} />
        </button>
      </div>

      {/* Navigation groups */}
      <div className="flex-1 overflow-y-auto px-3 py-5">
        {!isCompact && <p className="px-3 pb-2 text-[13px] font-medium text-ink-3">Workspace</p>}
        <nav aria-label="Workspace navigation" className="grid gap-1">
          {workspaceNav.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                title={isCompact ? item.label : undefined}
                onClick={() => selectTab(item.id)}
                aria-current={active ? "page" : undefined}
                className={`flex h-10 items-center rounded-lg text-[14px] transition-colors duration-150 ${
                  isCompact ? "justify-center px-0" : "gap-2.5 px-3"
                } ${active ? "bg-btn font-medium text-on-btn" : "text-ink-2 hover:bg-raised hover:text-ink"}`}
              >
                <item.icon className="size-4 shrink-0" strokeWidth={1.5} />
                {!isCompact && (
                  <>
                    <span className="truncate">{item.label}</span>
                    {item.count && (
                      <span className={`ml-auto text-[12px] tabular-nums ${active ? "opacity-80" : "text-ink-3"}`}>
                        {item.count}
                      </span>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </nav>

        {isAdmin && (
          <>
            {!isCompact && <p className="mt-6 px-3 pb-2 text-[13px] font-medium text-ink-3">Governance</p>}
            <nav aria-label="Governance navigation" className={`grid gap-1 ${isCompact ? "mt-4 border-t border-line pt-4" : ""}`}>
              {governanceNav.map((item) => {
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    title={isCompact ? item.label : undefined}
                    onClick={() => selectTab(item.id)}
                    aria-current={active ? "page" : undefined}
                    className={`flex h-10 items-center rounded-lg text-[14px] transition-colors duration-150 ${
                      isCompact ? "justify-center px-0" : "gap-2.5 px-3"
                    } ${active ? "bg-btn font-medium text-on-btn" : "text-ink-2 hover:bg-raised hover:text-ink"}`}
                  >
                    <item.icon className="size-4 shrink-0" strokeWidth={1.5} />
                    {!isCompact && (
                      <>
                        <span className="truncate">{item.label}</span>
                        {item.count && (
                          <span className={`ml-auto text-[12px] tabular-nums ${active ? "opacity-80" : "text-ink-3"}`}>
                            {item.count}
                          </span>
                        )}
                      </>
                    )}
                  </button>
                );
              })}
            </nav>
          </>
        )}
      </div>

      {/* Bottom instant permission preview & theme toggle (no login setup) */}
      <div className="space-y-3 border-t border-line p-3">
        {!isCompact && (
          <div className="grid grid-cols-2 rounded-lg bg-bg p-0.5" role="group" aria-label="Preview permission level">
            <button
              type="button"
              onClick={() => setViewRole("admin")}
              className={`flex h-8 items-center justify-center gap-1.5 rounded-md text-[13px] font-medium transition-colors ${
                isAdmin ? "bg-btn text-on-btn" : "text-ink-2 hover:text-ink"
              }`}
            >
              <KeyRound className="size-3.5" strokeWidth={1.5} />
              Admin
            </button>
            <button
              type="button"
              onClick={() => setViewRole("employee")}
              className={`flex h-8 items-center justify-center gap-1.5 rounded-md text-[13px] font-medium transition-colors ${
                !isAdmin ? "bg-btn text-on-btn" : "text-ink-2 hover:text-ink"
              }`}
            >
              <User className="size-3.5" strokeWidth={1.5} />
              Employee
            </button>
          </div>
        )}

        <div className={`flex items-center ${isCompact ? "flex-col gap-2" : "justify-between gap-2 px-1"}`}>
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-raised text-[12px] font-medium text-ink">
              {profile.initials}
            </span>
            {!isCompact && (
              <div className="min-w-0 leading-tight">
                <p className="truncate text-[14px] font-medium text-ink">{profile.name}</p>
                <p className="truncate text-[12px] text-ink-3">{profile.department}</p>
              </div>
            )}
          </div>
          <ThemeToggle />
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-bg text-ink">
      {/* Desktop sidebar */}
      <aside
        className={`hidden shrink-0 border-r border-line bg-deep transition-[width] duration-200 ease-[var(--ease-out-soft)] lg:block ${
          collapsed ? "w-[72px]" : "w-[260px]"
        }`}
      >
        {sidebarContent(collapsed)}
      </aside>

      {/* Mobile slide-over drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <button
            type="button"
            aria-label="Dismiss menu"
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 bg-black/50"
          />
          <aside className="relative z-10 h-full w-[268px] border-r border-line bg-deep">
            {sidebarContent(false)}
          </aside>
        </div>
      )}

      {/* Main workspace column */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Clean flat header bar */}
        <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-line bg-bg px-5 sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open sidebar"
              className="grid size-9 place-items-center rounded-lg text-ink-2 hover:bg-raised lg:hidden"
            >
              <Menu className="size-[18px]" strokeWidth={1.5} />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-[16px] font-semibold leading-tight text-ink">
                {metaByTab[activeTab].title}
              </h1>
              <p className="truncate text-[13px] text-ink-3">{metaByTab[activeTab].subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <AdminAnnouncement
                onAnnounce={(text) => {
                  handleSendTeamMessage({
                    id: `m-${Date.now()}`,
                    channelId: "general",
                    author: profile.name,
                    initials: profile.initials,
                    role: "Admin",
                    time: nowTime(),
                    text,
                  });
                  setTab("team");
                }}
              />
            )}
            <Link
              href="/"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium text-ink-2 transition-colors hover:bg-raised hover:text-ink"
            >
              <ArrowLeft className="size-3.5" strokeWidth={1.5} />
              Home
            </Link>
          </div>
        </header>

        {/* Open fluid workspace canvas */}
        <div
          key={activeTab}
          className="flex-1 overflow-y-auto px-5 py-6 animate-[fade-up_200ms_var(--ease-out-soft)] sm:px-8"
        >
          {activeTab === "chat" && (
            <ChatView
              profile={profile}
              visibleDocs={visibleDocs}
              turns={turns}
              onAppendTurn={handleAppendTurn}
              onClearTurns={() => setTurns([])}
            />
          )}
          {activeTab === "team" && (
            <TeamChatView
              isAdmin={isAdmin}
              profile={profile}
              messages={teamMessages}
              onSendMessage={handleSendTeamMessage}
            />
          )}
          {activeTab === "documents" && (
            <DocumentsView
              isAdmin={isAdmin}
              profile={profile}
              facts={facts}
              docs={docs}
              visibleDocs={visibleDocs}
              pinnedOkfCount={pinnedOkfCount}
              okfNotice={okfNotice}
              onUploadFile={handleUploadFile}
              onToggleOkf={handleToggleOkf}
              onToggleShare={handleToggleShare}
              onDeleteDoc={handleDeleteDoc}
            />
          )}
          {activeTab === "audit" && isAdmin && <AuditView rows={auditRows} />}
          {activeTab === "users" && isAdmin && (
            <UsersView users={users} facts={facts} onToggleActive={handleToggleUser} />
          )}
        </div>
      </div>
    </div>
  );
}
