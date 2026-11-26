"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ArrowRight, FileText, Megaphone, NotebookPen, Pin, Plus } from "lucide-react";
import { useCallback, useRef, useState, useSyncExternalStore } from "react";

import { TransitionLink } from "@/components/motion/TransitionLink";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { useCountUp } from "@/hooks/useCountUp";
import { useResource } from "@/hooks/useResource";
import { cn } from "@/lib/cn";
import {
  errorMessage,
  formatBytes,
  formatWhen,
  type Announcement,
  type AuditEventItem,
  type DocumentItem,
  type Note,
} from "@/lib/workspace-api";

import { AnnouncementForm } from "../announcements/AnnouncementForm";
import { sortAnnouncements } from "../announcements/AnnouncementsView";
import { Avatar, Card, EmptyState, ErrorNote, Page, PageHeader, Skeleton, Tag } from "../ui";
import { useWorkspace } from "../WorkspaceContext";
import { describeEvent } from "./activity";

gsap.registerPlugin(useGSAP);

const subscribe = () => () => {};
const today = () => new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });

function Stat({ label, value, note }: { label: string; value: number | null; note: string }) {
  const shown = useCountUp(value ?? 0, 900, 150);
  return (
    <div data-rise className="rounded-[16px] border border-line-strong bg-surface p-5">
      <p className="text-[13px] text-ink-3">{label}</p>
      <p className="mt-3 font-serif text-[40px] leading-none tracking-[-0.02em] tabular-nums">{value === null ? "–" : Math.round(shown)}</p>
      <p className="mt-3 text-[12px] leading-[16px] text-ink-3">{note}</p>
    </div>
  );
}

function CardHead({ title, href, action }: { title: string; href?: string; action?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 pt-5 sm:px-6">
      <h2 className="text-[16px] font-medium">{title}</h2>
      {href && (
        <TransitionLink href={href} className="group inline-flex items-center gap-1.5 text-[13px] text-ink-2 transition-colors hover:text-ink">
          {action ?? "View all"}
          <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={1.5} />
        </TransitionLink>
      )}
    </div>
  );
}

export function HomeView() {
  const { request, boot } = useWorkspace();
  const { notify } = useToast();
  const root = useRef<HTMLDivElement>(null);
  const date = useSyncExternalStore(subscribe, today, () => "");
  const caps = boot?.capabilities;
  const canAudit = !!caps?.view_audit;

  const docs = useResource(useCallback((signal: AbortSignal) => request<{ documents: DocumentItem[] }>("/documents/", { signal }).then((d) => d.documents), [request]));
  const rooms = useResource(useCallback((signal: AbortSignal) => request<{ rooms: unknown[] }>("/rooms/", { signal }).then((d) => d.rooms), [request]));
  const notices = useResource(useCallback((signal: AbortSignal) => request<{ announcements: Announcement[] }>("/announcements/", { signal }).then((d) => d.announcements), [request]));
  const notes = useResource(useCallback((signal: AbortSignal) => request<{ notes: Note[] }>("/notes/", { signal }).then((d) => d.notes), [request]));
  const audit = useResource(
    useCallback(
      (signal: AbortSignal) =>
        canAudit ? request<{ events: AuditEventItem[]; total: number }>("/audit/?limit=6", { signal }) : Promise.resolve({ events: [] as AuditEventItem[], total: 0 }),
      [request, canAudit],
    ),
  );

  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [composer, setComposer] = useState(false);

  const people = boot?.personas.filter((p) => p.is_active).length ?? null;
  const departments = new Set(docs.data?.map((d) => d.department?.name ?? "Company-wide")).size;

  async function saveNote() {
    const text = draft.trim();
    if (!text) return;
    setSaving(true);
    try {
      const [first, ...rest] = text.split("\n");
      const long = first.length > 60;
      const res = await request<{ note: Note }>("/notes/", { method: "POST", json: { title: long ? "" : first, body: long ? text : rest.join("\n").trim() } });
      notes.setData((prev) => [res.note, ...(prev ?? [])]);
      setDraft("");
      notify("Note saved");
    } catch (failure) {
      notify(errorMessage(failure), "error");
    } finally {
      setSaving(false);
    }
  }

  const ready = !docs.loading && !notices.loading && !notes.loading;
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from("[data-rise]", { autoAlpha: 0, y: 18, duration: 0.7, stagger: 0.06, ease: "power3.out", clearProps: "all" });
      });
      return () => mm.revert();
    },
    { scope: root, dependencies: [ready] },
  );

  const latest = sortAnnouncements(notices.data ?? []).slice(0, 3);
  const recentDocs = (docs.data ?? []).slice(0, 5);
  const recentNotes = (notes.data ?? []).slice(0, 4);

  return (
    <Page>
      <PageHeader
        title="Overview"
        description={`${date}${boot?.user.department ? ` · ${boot.user.department.name}` : ""}`}
        actions={
          caps?.manage_announcements && (
            <Button variant="secondary" onClick={() => setComposer(true)}>
              <Megaphone className="size-4" strokeWidth={1.5} />
              New announcement
            </Button>
          )
        }
      />

      <div ref={root}>
        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label="Documents" value={docs.data ? docs.data.length : null} note={docs.data ? `Across ${departments} ${departments === 1 ? "department" : "departments"}` : "Loading"} />
          <Stat label="People" value={people} note={boot ? `${boot.roles.length} roles` : "Loading"} />
          <Stat label="Team rooms" value={rooms.data ? rooms.data.length : null} note="Everyone, department or members" />
          {canAudit ? (
            <Stat label="Audit entries" value={audit.data ? audit.data.total : null} note="Hash-chained, verified on request" />
          ) : (
            <Stat label="Notes" value={notes.data ? notes.data.length : null} note="Private to you" />
          )}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <div className="grid grid-cols-1 content-start gap-6">
            <Card data-rise>
              <CardHead title="Announcements" href="/workspace/announcements" />
              <div className="px-5 pb-3 pt-2 sm:px-6">
                {notices.error && <ErrorNote message={notices.error} onRetry={notices.reload} />}
                {notices.loading && !notices.data && <Skeleton className="my-3 h-24" />}
                {notices.data && latest.length === 0 && <EmptyState icon={Megaphone} title="No announcements yet" className="py-8" />}
                <ul className="divide-y divide-line">
                  {latest.map((item) => (
                    <li key={item.id}>
                      <TransitionLink href={`/workspace/announcements?open=${item.id}`} className="group block py-4">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-[15px] font-medium transition-colors group-hover:text-ink">{item.title}</span>
                          {item.level === "important" && <Tag tone="strong">Important</Tag>}
                          {item.pinned && <Pin className="size-3.5 text-ink-3" strokeWidth={1.5} aria-label="Pinned" />}
                        </span>
                        <span className="mt-1 block text-[12px] text-ink-3">
                          {item.author} · <span className="font-mono">{formatWhen(item.created_at)}</span>
                        </span>
                        {item.body && <span className="mt-2 line-clamp-2 text-[14px] leading-[22px] text-ink-2">{item.body}</span>}
                      </TransitionLink>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>

            <Card data-rise>
              <CardHead title="Recent documents" href="/workspace/documents" action="Open library" />
              <div className="px-5 pb-3 pt-2 sm:px-6">
                {docs.error && <ErrorNote message={docs.error} onRetry={docs.reload} />}
                {docs.loading && !docs.data && <Skeleton className="my-3 h-32" />}
                {docs.data && recentDocs.length === 0 && <EmptyState icon={FileText} title="No documents yet" text="Upload a file to start asking questions." className="py-8" />}
                <ul className="divide-y divide-line">
                  {recentDocs.map((doc) => (
                    <li key={doc.id}>
                      <TransitionLink href={`/workspace/documents?open=${doc.id}`} className="group flex h-16 items-center gap-4">
                        <FileText className="size-[18px] shrink-0 text-ink-3" strokeWidth={1.5} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] font-medium">{doc.title}</span>
                          <span className="block truncate text-[12px] text-ink-3">
                            {doc.department?.name ?? "Company-wide"} · {doc.owner}
                          </span>
                        </span>
                        <span className="hidden shrink-0 text-right font-mono text-[12px] text-ink-3 sm:block">
                          {formatBytes(doc.size_bytes)}
                          <span className="block">{formatWhen(doc.created_at)}</span>
                        </span>
                      </TransitionLink>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 content-start gap-6">
            <Card data-rise>
              <CardHead title="Notes" href="/workspace/notes" />
              <div className="px-5 pb-5 pt-3 sm:px-6">
                <label htmlFor="quick-note" className="sr-only">
                  Write a note
                </label>
                <Textarea
                  id="quick-note"
                  rows={3}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") void saveNote();
                  }}
                  placeholder="Write a note"
                  className="min-h-[88px]"
                />
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="text-[12px] text-ink-3">Private to you</span>
                  <Button size="sm" onClick={saveNote} loading={saving} disabled={!draft.trim()}>
                    <Plus className="size-3.5" strokeWidth={1.5} />
                    Save note
                  </Button>
                </div>
                {notes.error && <div className="mt-4"><ErrorNote message={notes.error} onRetry={notes.reload} /></div>}
                {recentNotes.length > 0 && (
                  <ul className="mt-4 divide-y divide-line border-t border-line">
                    {recentNotes.map((note) => (
                      <li key={note.id} className="animate-[rise-in_320ms_var(--ease-soft)_both]">
                        <TransitionLink href={`/workspace/notes?note=${note.id}`} className="flex items-start gap-3 py-3">
                          <NotebookPen className="mt-0.5 size-4 shrink-0 text-ink-3" strokeWidth={1.5} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[14px] font-medium">{note.title.trim() || note.body.trim().split("\n")[0]?.slice(0, 60) || "Untitled note"}</span>
                            <span className="block truncate text-[12px] text-ink-3">{note.body.replace(/\s+/g, " ").trim() || "No text"}</span>
                          </span>
                          <span className="shrink-0 font-mono text-[12px] text-ink-3">{formatWhen(note.updated_at)}</span>
                        </TransitionLink>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Card>

            {canAudit && (
              <Card data-rise>
                <CardHead title="Recent activity" href="/workspace/audit" action="Open audit log" />
                <div className="px-5 pb-3 pt-2 sm:px-6">
                  {audit.error && <ErrorNote message={audit.error} onRetry={audit.reload} />}
                  {audit.loading && !audit.data && <Skeleton className="my-3 h-40" />}
                  <ul className="divide-y divide-line">
                    {(audit.data?.events ?? []).map((event) => {
                      const { verb, subject } = describeEvent(event);
                      return (
                        <li key={event.sequence} className="flex items-start gap-3 py-3">
                          <Avatar name={event.actor} className="mt-0.5 size-7 text-[10px]" />
                          <p className="min-w-0 flex-1 text-[13px] leading-[20px] text-ink-2">
                            <span className="font-medium text-ink">{event.actor}</span> {verb}
                            {subject && <> <span className="text-ink">{subject}</span></>}
                          </p>
                          <span className={cn("shrink-0 font-mono text-[12px] text-ink-3")}>{formatWhen(event.timestamp)}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      <AnnouncementForm open={composer} onClose={() => setComposer(false)} onSaved={(saved) => notices.setData((prev) => sortAnnouncements([saved, ...(prev ?? [])]))} />
    </Page>
  );
}
