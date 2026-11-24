"use client";

import {
  ArrowLeft,
  CalendarCheck,
  CheckCircle2,
  CircleSlash,
  CornerDownLeft,
  FileText,
  KeyRound,
  LayoutDashboard,
  Lock,
  MessageSquare,
  Pin,
  ShieldCheck,
  User,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Mark } from "@/components/site/Logo";
import { LedgerDemo } from "@/components/tour/LedgerDemo";
import type { Facts } from "@/lib/facts";

import {
  DAILY_ATTENDANCE_CODE,
  initialDocs,
  initialUsers,
  qaCases,
  roleProfiles,
  type QaCase,
  type RoleKey,
} from "./dashboardData";

type TabKey = "overview" | "ask" | "documents" | "attendance" | "users" | "audit";

export function DashboardShell({ role, facts }: { role: RoleKey; facts: Facts }) {
  const isAdmin = role === "admin";
  const profile = roleProfiles[role];

  const [tab, setTab] = useState<TabKey>("overview");
  const [selectedQa, setSelectedQa] = useState<QaCase>(qaCases[0]);
  const [customQuery, setCustomQuery] = useState("");
  const [submittedQuestion, setSubmittedQuestion] = useState<string>(qaCases[0].question);
  const [docs, setDocs] = useState(initialDocs);
  const [okfNotice, setOkfNotice] = useState("");
  const [users, setUsers] = useState(initialUsers);
  const [codeInput, setCodeInput] = useState("");
  const [checkedIn, setCheckedIn] = useState(false);
  const [codeError, setCodeError] = useState("");

  const visibleDocs = isAdmin ? docs : docs.filter((d) => d.employeeAccess !== null);
  const hiddenCount = docs.length - visibleDocs.length;
  const pinnedOkfCount = docs.filter((d) => d.isOkf).length;

  const navItems: { id: TabKey; label: string; icon: typeof LayoutDashboard; adminOnly?: boolean }[] = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "ask", label: "Ask", icon: MessageSquare },
    { id: "documents", label: "Documents", icon: FileText },
    { id: "attendance", label: "Attendance", icon: CalendarCheck },
    { id: "users", label: "Users", icon: Users, adminOnly: true },
    { id: "audit", label: "Audit log", icon: ShieldCheck, adminOnly: true },
  ];

  const allowedNav = navItems.filter((item) => isAdmin || !item.adminOnly);
  const activeTab: TabKey = allowedNav.some((item) => item.id === tab) ? tab : "overview";

  const canReadSelectedDoc =
    selectedQa.requiredDocId !== null && visibleDocs.some((d) => d.id === selectedQa.requiredDocId);
  const okfActiveForQuestion =
    Boolean(selectedQa.okfDocId) &&
    visibleDocs.some((d) => d.id === selectedQa.okfDocId && d.isOkf);

  const displayedAnswer = okfActiveForQuestion && selectedQa.okfAnswerText ? selectedQa.okfAnswerText : selectedQa.answerText;
  const displayedFiles = okfActiveForQuestion && selectedQa.okfSourceFiles ? selectedQa.okfSourceFiles : selectedQa.sourceFiles;

  function pickPreset(item: QaCase) {
    setSelectedQa(item);
    setSubmittedQuestion(item.question);
    setCustomQuery("");
  }

  function runCustomQuestion(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = customQuery.trim();
    if (!trimmed) return;
    const lower = trimmed.toLowerCase();
    const matched =
      qaCases.find((c) => c.keywords.some((kw) => lower.includes(kw))) ?? qaCases[qaCases.length - 1];
    setSelectedQa(matched);
    setSubmittedQuestion(trimmed);
  }

  function toggleShareOwnDoc(id: string) {
    setDocs((prev) =>
      prev.map((d) =>
        d.id === id ? { ...d, visibility: d.visibility === "Private" ? "Shared" : "Private" } : d,
      ),
    );
  }

  function toggleOkfDoc(id: string) {
    if (!isAdmin) return;
    const target = docs.find((d) => d.id === id);
    if (!target) return;
    if (!target.isOkf && pinnedOkfCount >= facts.okfMaxDocs) {
      setOkfNotice(`OKF limit reached (${facts.okfMaxDocs} pinned documents). Unpin one first.`);
      return;
    }
    setOkfNotice("");
    setDocs((prev) => prev.map((d) => (d.id === id ? { ...d, isOkf: !d.isOkf } : d)));
  }

  function toggleUserActive(username: string) {
    setUsers((prev) =>
      prev.map((u) => (u.username === username ? { ...u, active: !u.active } : u)),
    );
  }

  function submitAttendance(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = codeInput.replace(/\s+/g, "");
    if (cleaned === DAILY_ATTENDANCE_CODE) {
      setCheckedIn(true);
      setCodeError("");
    } else {
      setCodeError(`Code did not match. Try today's test code: ${DAILY_ATTENDANCE_CODE}`);
    }
  }

  const employeeRow = users.find((u) => u.username === "a.khan")!;

  return (
    <div className="container-page py-8 md:py-10">
      {/* Top workspace header with 1-click dual account switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-6">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-[13px] text-ink-2 transition-colors hover:bg-raised hover:text-ink"
          >
            <ArrowLeft className="size-3.5" strokeWidth={1.5} />
            Home
          </Link>
          <span className="font-mono text-[12px] text-ink-3">Early access</span>
          <span className="rounded-md bg-accent-soft px-2 py-0.5 text-[12px] text-accent-ink">
            {profile.badge}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-lg border border-line bg-deep p-0.5" role="group" aria-label="Switch test account">
            <Link
              href="/dashboard/admin"
              aria-current={isAdmin ? "page" : undefined}
              className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium transition-colors ${
                isAdmin ? "bg-surface text-ink shadow-[0_0_0_1px_var(--line)]" : "text-ink-3 hover:text-ink"
              }`}
            >
              <KeyRound className="size-3.5" strokeWidth={1.5} />
              Admin
            </Link>
            <Link
              href="/dashboard/employee"
              aria-current={!isAdmin ? "page" : undefined}
              className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium transition-colors ${
                !isAdmin ? "bg-surface text-ink shadow-[0_0_0_1px_var(--line)]" : "text-ink-3 hover:text-ink"
              }`}
            >
              <User className="size-3.5" strokeWidth={1.5} />
              Employee
            </Link>
          </div>

          <div className="flex items-center gap-2.5 rounded-lg border border-line bg-surface px-3 py-1.5">
            <span className="grid size-6 place-items-center rounded-full bg-raised font-mono text-[11px] text-ink">
              {profile.initials}
            </span>
            <div className="leading-tight">
              <p className="text-[13px] font-medium text-ink">{profile.name}</p>
              <p className="font-mono text-[11px] text-ink-3">{profile.department}</p>
            </div>
          </div>
        </div>
      </div>

      {/* App layout: 220px sidebar + fluid workspace */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[220px_1fr] lg:items-start">
        <aside aria-label="Workspace sections" className="rounded-2xl border border-line bg-surface p-3">
          <p className="px-3 pb-2 pt-1 text-[12px] text-ink-3">Workspace</p>
          <nav className="flex gap-1 overflow-x-auto lg:flex-col">
            {allowedNav.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  aria-current={active ? "page" : undefined}
                  className={`flex h-9 shrink-0 items-center gap-2.5 rounded-lg px-3 text-[14px] transition-colors ${
                    active ? "bg-raised font-medium text-ink" : "text-ink-2 hover:bg-raised/60 hover:text-ink"
                  }`}
                >
                  <item.icon className="size-4 shrink-0 text-ink-3" strokeWidth={1.5} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {!isAdmin && (
            <div className="mt-4 hidden border-t border-line px-3 pt-3 lg:block">
              <p className="flex items-center gap-1.5 text-[12px] text-ink-3">
                <Lock className="size-3.5 shrink-0" strokeWidth={1.5} />
                Admin tabs hidden
              </p>
              <p className="mt-1 text-[12px] leading-[18px] text-ink-3">
                Switch to Admin above to test OKF pinning, Users and Audit log.
              </p>
            </div>
          )}
        </aside>

        <div className="min-w-0 space-y-6">
          {/* OVERVIEW */}
          {activeTab === "overview" && (
            <>
              <div className="rounded-2xl border border-line bg-surface p-6">
                <h1 className="text-[24px] font-medium tracking-[-0.015em] text-ink">
                  {isAdmin ? "Admin dashboard" : "Employee dashboard"}
                </h1>
                <p className="mt-1 text-[14px] text-ink-2">{profile.summary}</p>

                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-xl border border-line bg-bg/50 p-4">
                    <p className="text-[13px] text-ink-3">Searchable documents</p>
                    <p className="mt-2 font-mono text-[28px] font-medium leading-none tabular-nums text-ink">
                      {visibleDocs.length}
                      <span className="ml-1 text-[14px] font-normal text-ink-3">/ {docs.length}</span>
                    </p>
                    <p className="mt-2 text-[12px] text-ink-3">
                      {isAdmin ? "All departments indexed" : `${hiddenCount} restricted files hidden`}
                    </p>
                  </div>

                  <div className="rounded-xl border border-line bg-bg/50 p-4">
                    <p className="text-[13px] text-ink-3">OKF pinned notes</p>
                    <p className="mt-2 font-mono text-[28px] font-medium leading-none tabular-nums text-ink">
                      {pinnedOkfCount}
                      <span className="ml-1 text-[14px] font-normal text-ink-3">/ {facts.okfMaxDocs}</span>
                    </p>
                    <p className="mt-2 text-[12px] text-ink-3">
                      +{facts.okfBoost} boost · 1 reserved slot
                    </p>
                  </div>

                  <div className="rounded-xl border border-line bg-bg/50 p-4">
                    <p className="text-[13px] text-ink-3">{isAdmin ? "Today's attendance code" : "Attendance this month"}</p>
                    <p className="mt-2 font-mono text-[28px] font-medium leading-none tabular-nums text-ink">
                      {isAdmin
                        ? `${DAILY_ATTENDANCE_CODE.slice(0, 3)} ${DAILY_ATTENDANCE_CODE.slice(3)}`
                        : employeeRow.present + (checkedIn ? 1 : 0)}
                    </p>
                    <p className="mt-2 text-[12px] text-ink-3">
                      {isAdmin ? "Rotates daily via HMAC" : `${employeeRow.absent} absent · ${employeeRow.strikes} strikes`}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-line bg-surface p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-[16px] font-medium text-ink">Test OKF and permissions in Ask</h2>
                    <p className="mt-0.5 text-[13px] text-ink-3">
                      {isAdmin
                        ? "Try unpinning 2026-policy-updates.md in Documents to see the leave answer change with vs without OKF."
                        : "Compare how Employee vs Admin answers the HR salary notes question."}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        pickPreset(qaCases[0]);
                        setTab("ask");
                      }}
                      className="inline-flex h-9 items-center rounded-lg bg-btn px-4 text-[13px] font-medium text-on-btn hover:bg-btn-hover"
                    >
                      Test OKF leave answer
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        pickPreset(qaCases[2]);
                        setTab("ask");
                      }}
                      className="inline-flex h-9 items-center rounded-lg border border-line-strong px-4 text-[13px] font-medium text-ink hover:bg-raised"
                    >
                      Test HR salary notes
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ASK (Single column: Question -> Full Answer -> Source files beneath, no right side) */}
          {activeTab === "ask" && (
            <div className="overflow-hidden rounded-2xl border border-line bg-surface">
              <div className="flex h-11 items-center justify-between border-b border-line px-5">
                <span className="text-[13px] font-medium text-ink">Ask</span>
                <span className="font-mono text-[12px] text-ink-3">
                  {visibleDocs.length} permitted files · {pinnedOkfCount} OKF
                </span>
              </div>

              <div className="space-y-5 p-5 sm:p-6">
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Sample questions">
                  {qaCases.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => pickPreset(item)}
                      aria-pressed={selectedQa.id === item.id}
                      className={`h-8 rounded-md px-3 text-[12px] transition-colors ${
                        selectedQa.id === item.id
                          ? "bg-raised font-medium text-ink"
                          : "border border-line text-ink-3 hover:text-ink"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                {/* 1. Question */}
                <div className="flex gap-3 pt-2">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-raised font-mono text-[11px] text-ink-2">
                    {profile.initials}
                  </span>
                  <p className="pt-1 text-[14px] leading-[22px] text-ink">{submittedQuestion}</p>
                </div>

                {/* 2. Full Answer */}
                <div className="flex gap-3">
                  <Mark className="size-7 shrink-0" />
                  <div className="min-w-0 flex-1 pt-1">
                    {canReadSelectedDoc ? (
                      <>
                        <p className="text-[14px] leading-[24px] text-ink-2">{displayedAnswer}</p>

                        {/* 3. Source files beneath (filename with extension only) */}
                        {displayedFiles.length > 0 && (
                          <div className="mt-4 flex flex-wrap items-center gap-2" aria-label="Source files">
                            {displayedFiles.map((fileName) => {
                              const docMatch = docs.find((d) => d.name === fileName);
                              return (
                                <span
                                  key={fileName}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-bg/60 px-2.5 py-1 font-mono text-[12px] text-ink-2"
                                >
                                  <FileText className="size-3.5 shrink-0 text-accent-ink" strokeWidth={1.5} aria-hidden="true" />
                                  {fileName}
                                  {docMatch?.isOkf && (
                                    <span className="rounded bg-accent-soft px-1.5 py-0.5 text-[10px] font-medium text-accent-ink">
                                      OKF
                                    </span>
                                  )}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="rounded-xl border border-line-strong bg-raised p-4 text-[14px] leading-[24px] text-ink">
                        <p className="mb-1.5 flex items-center gap-2 text-[13px] font-medium">
                          <CircleSlash className="size-4 text-ink-2" strokeWidth={1.5} />
                          Refused · no permitted source found
                        </p>
                        <p className="text-ink-2">{selectedQa.refusal}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <form onSubmit={runCustomQuestion} className="flex items-center gap-2 border-t border-line px-4 py-3">
                <input
                  type="text"
                  value={customQuery}
                  onChange={(e) => setCustomQuery(e.target.value)}
                  placeholder="Try asking about leave, travel, salary or Wi-Fi..."
                  className="h-9 flex-1 bg-transparent px-2 text-[14px] text-ink placeholder:text-ink-3 focus:outline-none"
                />
                <button
                  type="submit"
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-btn px-3 text-[12px] font-medium text-on-btn hover:bg-btn-hover"
                >
                  Ask
                  <CornerDownLeft className="size-3.5" strokeWidth={1.5} />
                </button>
              </form>
            </div>
          )}

          {/* DOCUMENTS */}
          {activeTab === "documents" && (
            <div className="rounded-2xl border border-line bg-surface p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-[18px] font-medium text-ink">Documents</h2>
                  <p className="mt-0.5 text-[13px] text-ink-3">
                    {isAdmin
                      ? `Viewing all ${docs.length} workspace files. Pin up to ${facts.okfMaxDocs} trusted notes as OKF (+${facts.okfBoost} boost + 1 reserved slot).`
                      : `Showing ${visibleDocs.length} permitted files. ${hiddenCount} restricted files are excluded before search.`}
                  </p>
                </div>
                <span className="font-mono text-[12px] text-ink-3">
                  OKF {pinnedOkfCount}/{facts.okfMaxDocs} · Max {facts.maxFileMb} MB
                </span>
              </div>

              {okfNotice && <p className="mt-3 text-[13px] text-danger">{okfNotice}</p>}

              <ul className="mt-5 divide-y divide-line border-y border-line">
                {visibleDocs.map((doc) => (
                  <li key={doc.id} className="flex flex-wrap items-center gap-3 py-3.5">
                    <FileText className="size-4 shrink-0 text-ink-3" strokeWidth={1.5} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-mono text-[13px] text-ink">{doc.name}</p>
                        {doc.isOkf && (
                          <span className="inline-flex items-center gap-1 rounded bg-accent-soft px-1.5 py-0.5 font-mono text-[11px] text-accent-ink">
                            <Pin className="size-3" strokeWidth={1.5} />
                            OKF
                          </span>
                        )}
                      </div>
                      <p className="text-[12px] text-ink-3">
                        {doc.owner} · {doc.department} · {doc.chunks} chunks · {doc.updated}
                      </p>
                    </div>
                    <span className="rounded-md bg-raised px-2 py-0.5 text-[12px] text-ink-2">
                      {doc.visibility}
                    </span>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => toggleOkfDoc(doc.id)}
                        className={`h-7 rounded-md px-2.5 text-[12px] transition-colors ${
                          doc.isOkf
                            ? "border border-accent-line bg-accent-soft text-accent-ink hover:bg-raised"
                            : "border border-line-strong text-ink hover:bg-raised"
                        }`}
                      >
                        {doc.isOkf ? "Unpin OKF" : "Pin as OKF"}
                      </button>
                    )}
                    {!isAdmin && doc.employeeAccess === "Own" && (
                      <button
                        type="button"
                        onClick={() => toggleShareOwnDoc(doc.id)}
                        className="h-7 rounded-md border border-line-strong px-2.5 text-[12px] text-ink hover:bg-raised"
                      >
                        {doc.visibility === "Private" ? "Share with teammate" : "Revoke share"}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ATTENDANCE */}
          {activeTab === "attendance" && (
            <div className="space-y-6">
              {isAdmin ? (
                <div className="rounded-2xl border border-line bg-surface p-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h2 className="text-[18px] font-medium text-ink">Daily attendance code</h2>
                      <p className="mt-0.5 text-[13px] text-ink-3">
                        Employees enter this 6-digit code to mark themselves present today.
                      </p>
                    </div>
                    <div className="rounded-xl border border-accent-line bg-accent-soft px-4 py-2 font-mono text-[22px] font-medium tracking-[0.14em] tabular-nums text-accent-ink">
                      {DAILY_ATTENDANCE_CODE.slice(0, 3)} {DAILY_ATTENDANCE_CODE.slice(3)}
                    </div>
                  </div>

                  <div className="mt-6 overflow-x-auto">
                    <table className="w-full text-left text-[13px]">
                      <thead className="border-y border-line text-ink-3">
                        <tr>
                          <th className="py-2.5 font-normal">Person</th>
                          <th className="py-2.5 font-normal">Department</th>
                          <th className="py-2.5 text-right font-normal">Present</th>
                          <th className="py-2.5 text-right font-normal">Absent</th>
                          <th className="py-2.5 text-right font-normal">Excused</th>
                          <th className="py-2.5 text-right font-normal">Strikes (warn)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {users.map((u) => (
                          <tr key={u.username}>
                            <td className="py-3 font-medium text-ink">{u.name}</td>
                            <td className="py-3 text-ink-2">{u.department}</td>
                            <td className="py-3 text-right font-mono tabular-nums text-ink">{u.present}</td>
                            <td className="py-3 text-right font-mono tabular-nums text-ink">{u.absent}</td>
                            <td className="py-3 text-right font-mono tabular-nums text-ink">{u.excused}</td>
                            <td className="py-3 text-right font-mono tabular-nums">
                              <span
                                className={
                                  u.strikes > 0
                                    ? "rounded bg-danger-soft px-2 py-0.5 text-danger"
                                    : "text-ink-3"
                                }
                              >
                                {u.strikes}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-line bg-surface p-6">
                  <h2 className="text-[18px] font-medium text-ink">Daily check-in</h2>
                  <p className="mt-1 text-[14px] text-ink-2">
                    Enter today&apos;s 6-digit attendance code from your administrator (test code:{" "}
                    <span className="font-mono text-ink">{DAILY_ATTENDANCE_CODE}</span>).
                  </p>

                  {checkedIn ? (
                    <div className="mt-5 flex items-center gap-2.5 rounded-xl border border-accent-line bg-accent-soft p-4 text-[14px] text-accent-ink">
                      <CheckCircle2 className="size-4 shrink-0" strokeWidth={1.5} />
                      Marked present for today.
                    </div>
                  ) : (
                    <form onSubmit={submitAttendance} className="mt-5 flex flex-wrap items-center gap-3">
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={7}
                        value={codeInput}
                        onChange={(e) => setCodeInput(e.target.value)}
                        placeholder="482917"
                        className="h-10 w-40 rounded-lg border border-line-strong bg-bg px-3 font-mono text-[15px] tracking-[0.12em] text-ink"
                      />
                      <button
                        type="submit"
                        className="inline-flex h-10 items-center rounded-lg bg-btn px-4 text-[14px] font-medium text-on-btn hover:bg-btn-hover"
                      >
                        Mark present
                      </button>
                    </form>
                  )}
                  {codeError && <p className="mt-3 text-[13px] text-danger">{codeError}</p>}

                  <div className="mt-6 grid gap-3 border-t border-line pt-5 sm:grid-cols-3">
                    <div>
                      <p className="text-[12px] text-ink-3">Present</p>
                      <p className="mt-1 font-mono text-[20px] tabular-nums text-ink">
                        {employeeRow.present + (checkedIn ? 1 : 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[12px] text-ink-3">Absent</p>
                      <p className="mt-1 font-mono text-[20px] tabular-nums text-ink">{employeeRow.absent}</p>
                    </div>
                    <div>
                      <p className="text-[12px] text-ink-3">Strikes</p>
                      <p className="mt-1 font-mono text-[20px] tabular-nums text-ink">{employeeRow.strikes}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* USERS (Admin only) */}
          {activeTab === "users" && isAdmin && (
            <div className="rounded-2xl border border-line bg-surface p-6">
              <h2 className="text-[18px] font-medium text-ink">Users &amp; roles</h2>
              <p className="mt-0.5 text-[13px] text-ink-3">
                Lockout after {facts.maxFailedLogins} failed logins for {facts.lockoutMinutes} minutes.
              </p>

              <ul className="mt-5 divide-y divide-line border-y border-line">
                {users.map((u) => (
                  <li key={u.username} className="flex flex-wrap items-center gap-3 py-3.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-medium text-ink">{u.name}</p>
                      <p className="font-mono text-[12px] text-ink-3">
                        @{u.username} · {u.role} · {u.department}
                      </p>
                    </div>
                    <span
                      className={`rounded-md px-2 py-0.5 text-[12px] ${
                        u.active ? "bg-accent-soft text-accent-ink" : "bg-danger-soft text-danger"
                      }`}
                    >
                      {u.active ? "Active" : "Disabled"}
                    </span>
                    {u.username !== "admin" && (
                      <button
                        type="button"
                        onClick={() => toggleUserActive(u.username)}
                        className="h-7 rounded-md border border-line-strong px-2.5 text-[12px] text-ink hover:bg-raised"
                      >
                        {u.active ? "Disable" : "Enable"}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* AUDIT LOG (Admin only — reuses LedgerDemo) */}
          {activeTab === "audit" && isAdmin && (
            <div className="rounded-2xl border border-line bg-surface p-6">
              <div className="mb-5">
                <h2 className="text-[18px] font-medium text-ink">Audit log</h2>
                <p className="mt-0.5 text-[13px] text-ink-3">
                  Append-only activity ledger chained with SHA-256. Try editing a row to test integrity verification.
                </p>
              </div>
              <LedgerDemo />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
