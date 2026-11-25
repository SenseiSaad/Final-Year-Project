"use client";

import { AlertTriangle, CheckCircle2, Download, Search, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";

import type { Facts } from "@/lib/facts";

import { chainHash, type AuditRow, type WorkspaceUser } from "./dashboardData";

/* -------- AUDIT LOG (frameless open ledger) -------- */
export function AuditView({ rows }: { rows: AuditRow[] }) {
  const [filter, setFilter] = useState("");
  const [tamperedId, setTamperedId] = useState<number | null>(null);
  const [verified, setVerified] = useState<"idle" | "ok" | "broken">("idle");

  const chained = useMemo(() => {
    const out: (AuditRow & { hash: string; broken: boolean })[] = [];
    let prev = "000000000000";
    for (const row of rows) {
      const originalHash = chainHash(prev, `${row.time}|${row.actor}|${row.action}|${row.target}|${row.detail}`);
      const detail = tamperedId === row.id ? "Edited entry (tampered)" : row.detail;
      const recomputed = chainHash(prev, `${row.time}|${row.actor}|${row.action}|${row.target}|${detail}`);
      out.push({ ...row, detail, hash: originalHash, broken: recomputed !== originalHash });
      prev = originalHash;
    }
    return out;
  }, [rows, tamperedId]);

  const firstBrokenIdx = chained.findIndex((r) => r.broken);

  const visible = chained.filter((r) => {
    const q = filter.trim().toLowerCase();
    if (!q) return true;
    return (
      r.actor.toLowerCase().includes(q) ||
      r.action.toLowerCase().includes(q) ||
      r.target.toLowerCase().includes(q) ||
      r.detail.toLowerCase().includes(q)
    );
  });

  function exportCsv() {
    const header = "id,time,actor,action,target,detail,hash";
    const body = chained
      .map((r) =>
        [r.id, r.time, r.actor, r.action, r.target, r.detail, r.hash]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(","),
      )
      .join("\n");
    const blob = new Blob([`${header}\n${body}\n`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "docutrust-audit-log.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto w-full max-w-[1040px] space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" strokeWidth={1.5} />
          <input
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by user, action or file"
            className="h-9 w-full rounded-lg border border-line bg-surface pl-9 pr-3 text-[14px] text-ink placeholder:text-ink-3"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setTamperedId((prev) => (prev ? null : rows[Math.min(2, rows.length - 1)]?.id ?? null));
              setVerified("idle");
            }}
            className="h-9 rounded-lg border border-line-strong px-3.5 text-[13px] font-medium text-ink transition-colors hover:bg-raised"
          >
            {tamperedId ? "Restore row" : "Simulate edit"}
          </button>
          <button
            type="button"
            onClick={() => setVerified(firstBrokenIdx >= 0 ? "broken" : "ok")}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-btn px-3.5 text-[13px] font-medium text-on-btn transition-colors hover:bg-btn-hover"
          >
            <ShieldCheck className="size-4" strokeWidth={1.5} />
            Verify integrity
          </button>
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong px-3.5 text-[13px] font-medium text-ink transition-colors hover:bg-raised"
          >
            <Download className="size-4" strokeWidth={1.5} />
            Export CSV
          </button>
        </div>
      </div>

      {verified !== "idle" && (
        <div
          className={`flex items-center gap-2.5 rounded-lg px-4 py-3 text-[14px] font-medium ${
            verified === "ok" ? "bg-deep text-ink" : "bg-btn text-on-btn"
          }`}
        >
          {verified === "ok" ? (
            <>
              <CheckCircle2 className="size-4 shrink-0" strokeWidth={1.5} />
              Chain intact across all {chained.length} append-only entries.
            </>
          ) : (
            <>
              <AlertTriangle className="size-4 shrink-0" strokeWidth={1.5} />
              Hash mismatch detected at entry #{chained[firstBrokenIdx].id}. Chain broken from that row onward.
            </>
          )}
        </div>
      )}

      <div className="overflow-x-auto border-y border-line">
        <table className="w-full text-left text-[14px]">
          <thead className="border-b border-line text-ink-3">
            <tr>
              <th className="py-3 pr-4 font-medium">Time</th>
              <th className="py-3 pr-4 font-medium">User</th>
              <th className="py-3 pr-4 font-medium">Action</th>
              <th className="py-3 pr-4 font-medium">Target &amp; detail</th>
              <th className="py-3 text-right font-medium">Hash</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {visible.map((row) => {
              const flagged = firstBrokenIdx >= 0 && chained.findIndex((c) => c.id === row.id) >= firstBrokenIdx;
              return (
                <tr key={row.id} className={flagged ? "bg-raised" : "hover:bg-deep/50"}>
                  <td className="py-3.5 pr-4 tabular-nums text-ink-3">{row.time}</td>
                  <td className="py-3.5 pr-4 font-medium text-ink">{row.actor}</td>
                  <td className="py-3.5 pr-4 text-ink-2">{row.action}</td>
                  <td className="py-3.5 pr-4 text-ink-2">
                    <span className="font-medium text-ink">{row.target}</span>
                    <span className="mx-1.5 text-ink-3">·</span>
                    <span className={row.broken ? "font-semibold underline" : ""}>{row.detail}</span>
                  </td>
                  <td className="py-3.5 text-right tabular-nums text-[13px] text-ink-3">
                    {flagged ? "Mismatch" : row.hash}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* -------- USERS & ROLES (open frameless roster) -------- */
export function UsersView({
  users,
  facts,
  onToggleActive,
}: {
  users: WorkspaceUser[];
  facts: Facts;
  onToggleActive: (username: string) => void;
}) {
  return (
    <div className="mx-auto w-full max-w-[1040px]">
      <div className="pb-4">
        <h2 className="text-[16px] font-semibold text-ink">Team &amp; roles</h2>
        <p className="mt-0.5 text-[13px] text-ink-3">
          Policy ready for auth rollout: lockout after {facts.maxFailedLogins} failed attempts for {facts.lockoutMinutes} minutes.
        </p>
      </div>
      <ul className="divide-y divide-line border-y border-line">
        {users.map((u) => (
          <li key={u.username} className="flex flex-wrap items-center gap-3 px-2 py-4 transition-colors hover:bg-deep/50">
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-medium text-ink">{u.name}</p>
              <p className="text-[13px] text-ink-3">
                {u.username} · {u.role} · {u.department}
              </p>
            </div>
            <span
              className={`rounded-md px-2.5 py-0.5 text-[13px] font-medium ${
                u.active ? "bg-btn text-on-btn" : "text-ink-3"
              }`}
            >
              {u.active ? "Active" : "Disabled"}
            </span>
            {u.username !== "admin" && (
              <button
                type="button"
                onClick={() => onToggleActive(u.username)}
                className="h-8 rounded-lg border border-line-strong px-3 text-[13px] font-medium text-ink transition-colors hover:bg-raised"
              >
                {u.active ? "Disable" : "Enable"}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
