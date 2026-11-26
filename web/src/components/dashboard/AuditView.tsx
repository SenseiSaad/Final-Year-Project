"use client";

import { ArrowLeft, CheckCircle2, ShieldAlert, ShieldCheck } from "lucide-react";
import { useCallback, useState } from "react";

import { useResource } from "@/hooks/useResource";
import {
  errorMessage,
  formatDateTime,
  type AuditEventItem,
  type AuditPerson,
} from "@/lib/workspace-api";

import { Avatar, btnPrimary, btnSecondary, EmptyState, ErrorNote, SkeletonRows } from "./ui";
import { useWorkspace } from "./WorkspaceContext";

type Page = { events: AuditEventItem[]; next_before: number | null; total: number };
type Verify = { valid: boolean; events_checked: number; first_invalid_sequence: number | null; head_hash: string };

const filters = [
  { value: "", label: "All activity" },
  { value: "chat.", label: "Questions and chats" },
  { value: "document.", label: "Documents" },
  { value: "team.", label: "Team chat" },
  { value: "department.", label: "Departments" },
  { value: "member.", label: "Members" },
  { value: "role.", label: "Roles" },
  { value: "audit.", label: "Audit access" },
];

export function AuditView() {
  const { boot, request } = useWorkspace();
  const [mode, setMode] = useState<"people" | "all">("people");
  const [person, setPerson] = useState<AuditPerson | null>(null);
  const [verify, setVerify] = useState<Verify | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  if (!boot?.capabilities.view_audit) {
    return <EmptyState title="Audit log is restricted">This persona does not hold the audit permission.</EmptyState>;
  }

  async function runVerify() {
    setVerifying(true);
    setVerifyError(null);
    try {
      setVerify(await request<Verify>("/audit/verify/"));
    } catch (error) {
      setVerifyError(errorMessage(error));
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1000px] pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Audit views" className="flex gap-1 border-b border-line">
          {(["people", "all"] as const).map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={mode === item && !person}
              onClick={() => {
                setMode(item);
                setPerson(null);
              }}
              className={`relative h-11 px-4 text-[14px] font-medium transition-colors ${mode === item && !person ? "text-ink" : "text-ink-3 hover:text-ink"}`}
            >
              {item === "people" ? "People" : "All activity"}
              {mode === item && !person && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-ink" />}
            </button>
          ))}
        </div>
        <button type="button" onClick={runVerify} disabled={verifying} className={btnPrimary}>
          <ShieldCheck className="size-4" strokeWidth={1.5} />
          {verifying ? "Verifying…" : "Verify integrity"}
        </button>
      </div>

      {verifyError && (
        <div className="mt-4">
          <ErrorNote>{verifyError}</ErrorNote>
        </div>
      )}
      {verify && (
        <div
          role="status"
          className={`mt-4 flex items-start gap-2.5 rounded-lg px-4 py-3 text-[14px] ${verify.valid ? "bg-deep text-ink" : "bg-btn text-on-btn"}`}
        >
          {verify.valid ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" strokeWidth={1.5} /> : <ShieldAlert className="mt-0.5 size-4 shrink-0" strokeWidth={1.5} />}
          <div className="min-w-0">
            <p className="font-medium">
              {verify.valid
                ? `Chain intact. ${verify.events_checked} events recomputed with SHA-256.`
                : `Chain broken at event #${verify.first_invalid_sequence}.`}
            </p>
            <p className="mt-0.5 break-all font-mono text-[12px] opacity-80">Head {verify.head_hash}</p>
          </div>
        </div>
      )}

      <div className="pt-5">
        {person ? (
          <PersonTimeline person={person} onBack={() => setPerson(null)} />
        ) : mode === "people" ? (
          <People onOpen={setPerson} />
        ) : (
          <AllActivity />
        )}
      </div>
    </div>
  );
}

function People({ onOpen }: { onOpen: (person: AuditPerson) => void }) {
  const { request } = useWorkspace();
  const load = useCallback(
    (signal: AbortSignal) => request<{ people: AuditPerson[]; total_events: number }>("/audit/summary/", { signal }),
    [request],
  );
  const summary = useResource(load);

  return (
    <>
      <p className="pb-3 text-[13px] text-ink-3">
        {summary.data ? `${summary.data.total_events} events recorded. Open a person to see their full timeline.` : "Loading…"}
      </p>
      {summary.error && <ErrorNote onRetry={summary.reload}>{summary.error}</ErrorNote>}
      {summary.loading && !summary.data && <SkeletonRows />}
      <ul className="divide-y divide-line border-y border-line">
        {summary.data?.people.map((person) => (
          <li key={person.id}>
            <button
              type="button"
              onClick={() => onOpen(person)}
              className="grid w-full gap-2 py-3.5 text-left transition-colors hover:bg-deep/60 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-6 sm:px-2"
            >
              <span className="flex min-w-0 items-center gap-3">
                <Avatar name={person.display_name} />
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-medium">{person.display_name}</span>
                  <span className="block truncate text-[13px] text-ink-3">
                    {person.role.name} · {person.department?.name ?? "No department"}
                    {person.last_active ? ` · Last active ${formatDateTime(person.last_active)}` : " · No activity yet"}
                  </span>
                </span>
              </span>
              <span className="grid grid-cols-4 gap-4 pl-11 text-[13px] tabular-nums sm:pl-0">
                <Count label="Searches" value={person.searches} />
                <Count label="Uploads" value={person.uploads} />
                <Count label="Shares" value={person.shares} />
                <Count label="Events" value={person.events} />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <span className="text-center sm:min-w-14">
      <span className="block text-[15px] font-medium text-ink">{value}</span>
      <span className="block text-[11px] text-ink-3">{label}</span>
    </span>
  );
}

function PersonTimeline({ person, onBack }: { person: AuditPerson; onBack: () => void }) {
  return (
    <>
      <button type="button" onClick={onBack} className={`${btnSecondary} mb-4`}>
        <ArrowLeft className="size-4" strokeWidth={1.5} />
        All people
      </button>
      <div className="mb-4 flex items-center gap-3">
        <Avatar name={person.display_name} className="size-10" />
        <div className="min-w-0">
          <h2 className="truncate text-[17px] font-semibold">{person.display_name}</h2>
          <p className="truncate text-[13px] text-ink-3">
            {person.role.name} · {person.department?.name ?? "No department"} · {person.searches} searches · {person.uploads} uploads · {person.shares} shares
          </p>
        </div>
      </div>
      <Feed key={person.id} path={`/audit/users/${person.id}/`} showActor={false} />
    </>
  );
}

function AllActivity() {
  const [type, setType] = useState("");
  return (
    <>
      <div className="pb-4">
        <label htmlFor="audit-type" className="sr-only">
          Filter activity
        </label>
        <select
          id="audit-type"
          value={type}
          onChange={(event) => setType(event.target.value)}
          className="h-10 w-full rounded-lg border border-line-strong bg-surface px-3 text-[14px] sm:w-64"
        >
          {filters.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>
      <Feed key={type} path="/audit/" query={type ? `type=${encodeURIComponent(type)}` : ""} showActor />
    </>
  );
}

function Feed({ path, query = "", showActor }: { path: string; query?: string; showActor: boolean }) {
  const { request } = useWorkspace();
  const base = `${path}?limit=40${query ? `&${query}` : ""}`;
  const load = useCallback((signal: AbortSignal) => request<Page>(base, { signal }), [request, base]);
  const first = useResource(load);
  const [more, setMore] = useState<{ events: AuditEventItem[]; next: number | null | undefined }>({ events: [], next: undefined });
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState<string | null>(null);

  const events = [...(first.data?.events ?? []), ...more.events];
  const next = more.next === undefined ? first.data?.next_before ?? null : more.next;

  async function loadMore() {
    if (!next) return;
    setLoadingMore(true);
    setMoreError(null);
    try {
      const page = await request<Page>(`${base}&before=${next}`);
      setMore((prev) => ({ events: [...prev.events, ...page.events], next: page.next_before }));
    } catch (error) {
      setMoreError(errorMessage(error));
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <>
      {first.error && <ErrorNote onRetry={first.reload}>{first.error}</ErrorNote>}
      {first.loading && !first.data && <SkeletonRows />}
      {first.data && events.length === 0 && <EmptyState title="No activity yet">Actions appear here as soon as they happen.</EmptyState>}
      {events.length > 0 && (
        <>
          <p className="pb-2 text-[13px] text-ink-3">{first.data?.total} events, newest first</p>
          <ol className="divide-y divide-line border-y border-line">
            {events.map((event) => (
              <EventRow key={event.sequence} event={event} showActor={showActor} />
            ))}
          </ol>
        </>
      )}
      {moreError && (
        <div className="mt-3">
          <ErrorNote>{moreError}</ErrorNote>
        </div>
      )}
      {next && (
        <div className="mt-4 flex justify-center">
          <button type="button" onClick={loadMore} disabled={loadingMore} className={btnSecondary}>
            {loadingMore ? "Loading…" : "Load older events"}
          </button>
        </div>
      )}
    </>
  );
}

function str(value: unknown): string {
  return typeof value === "string" ? value : typeof value === "number" ? String(value) : "";
}

function describe(event: AuditEventItem): { label: string; body: string; chips: string[] } {
  const d = event.details;
  const list = (value: unknown) => (Array.isArray(value) ? value.map((v) => (typeof v === "string" ? v : str((v as { title?: unknown })?.title))).filter(Boolean) : []);
  switch (event.event_type) {
    case "chat.question": {
      const outcome = str(d.outcome).replace("_", " ");
      return {
        label: "Asked a question",
        body: str(d.question),
        chips: [outcome, `${str(d.provider)} · ${str(d.model)}`, ...(list(d.cited).length ? [`Cited ${list(d.cited).join(", ")}`] : [])].filter(Boolean),
      };
    }
    case "document.search":
      return { label: "Searched documents", body: `“${str(d.query)}”`, chips: [`${list(d.results).length} results`, ...list(d.results).slice(0, 3)] };
    case "document.upload":
      return { label: "Uploaded a document", body: str(d.title), chips: [str(d.filename), str(d.department), str(d.access_mode) === "scope" ? "Admin-defined scope" : "Role-based", `${str(d.chunks)} passages`].filter(Boolean) };
    case "document.access.update":
      return { label: "Changed document access", body: str(d.title), chips: [`${str(d.previous_access)} → ${str(d.access)}`] };
    case "document.delete":
      return { label: "Deleted a document", body: str(d.title), chips: [] };
    case "document.view":
    case "document.download":
      return { label: event.event_type === "document.view" ? "Opened a document" : "Downloaded a document", body: str(d.title), chips: [] };
    case "team.message.create":
      return { label: "Posted in a room", body: str(d.room), chips: [] };
    case "audit.verify":
      return { label: "Verified the audit chain", body: d.valid ? "Chain intact" : "Chain broken", chips: [] };
    case "audit.history.view":
      return { label: "Opened a person's timeline", body: str(d.viewed), chips: [] };
    default: {
      const text = event.event_type.replace(/[._]/g, " ");
      const name = str(d.name) || str(d.username) || str(d.code) || str(d.title) || str(d.room);
      return { label: text.charAt(0).toUpperCase() + text.slice(1), body: name, chips: [] };
    }
  }
}

function EventRow({ event, showActor }: { event: AuditEventItem; showActor: boolean }) {
  const { label, body, chips } = describe(event);
  return (
    <li className="py-3.5">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className="text-[14px] font-medium">{label}</span>
        {showActor && (
          <span className="text-[13px] text-ink-2">
            by {event.actor} <span className="text-ink-3">· {event.role}</span>
          </span>
        )}
        <time dateTime={event.timestamp} className="ml-auto text-[12px] tabular-nums text-ink-3">
          {formatDateTime(event.timestamp)}
        </time>
      </div>
      {body && <p className="mt-1 whitespace-pre-wrap break-words text-[14px] leading-[22px] text-ink-2">{body}</p>}
      {chips.length > 0 && (
        <p className="mt-1.5 flex flex-wrap gap-1.5">
          {chips.map((chip) => (
            <span key={chip} className="inline-flex max-w-full items-center rounded-md border border-line px-2 py-0.5 text-[12px] text-ink-2">
              <span className="truncate">{chip}</span>
            </span>
          ))}
        </p>
      )}
      <p className="mt-1.5 font-mono text-[11px] text-ink-3" title={event.event_hash}>
        #{event.sequence} · {event.event_hash.slice(0, 16)}… ← {event.previous_hash.slice(0, 8)}…
      </p>
    </li>
  );
}
