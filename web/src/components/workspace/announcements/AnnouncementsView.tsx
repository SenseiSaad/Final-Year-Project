"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ChevronDown, Megaphone, Pencil, Pin, PinOff, Plus, Trash2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { errorMessage, formatWhen, type Announcement } from "@/lib/workspace-api";
import { useResource } from "@/hooks/useResource";

import { Card, ConfirmModal, EmptyState, ErrorNote, Page, PageHeader, Skeleton, Tag } from "../ui";
import { useWorkspace } from "../WorkspaceContext";
import { AnnouncementForm } from "./AnnouncementForm";

gsap.registerPlugin(useGSAP);

export function AnnouncementsView() {
  const { request, boot } = useWorkspace();
  const { notify } = useToast();
  const params = useSearchParams();
  const root = useRef<HTMLDivElement>(null);
  const canManage = !!boot?.capabilities.manage_announcements;

  const load = useCallback((signal: AbortSignal) => request<{ announcements: Announcement[] }>("/announcements/", { signal }).then((d) => d.announcements), [request]);
  const { data, error, loading, reload, setData } = useResource(load);

  const [filter, setFilter] = useState(0);
  const [picked, setPicked] = useState<number | null | undefined>(undefined);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<Announcement | null>(null);
  const [busy, setBusy] = useState(false);

  // The search bar links to one announcement
  const linked = Number(params.get("open")) || null;
  const open = picked === undefined ? linked : picked;
  useEffect(() => {
    if (!linked || !data) return;
    const timer = window.setTimeout(() => document.getElementById(`ann-${linked}`)?.scrollIntoView({ block: "center", behavior: "smooth" }), 120);
    return () => window.clearTimeout(timer);
  }, [linked, data]);

  const items = useMemo(() => {
    const all = data ?? [];
    if (filter === 1) return all.filter((a) => a.pinned);
    if (filter === 2) return all.filter((a) => a.level === "important");
    return all;
  }, [data, filter]);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from("[data-item]", { autoAlpha: 0, y: 14, duration: 0.5, stagger: 0.05, ease: "power3.out", clearProps: "all" });
      });
      return () => mm.revert();
    },
    { scope: root, dependencies: [loading, filter] },
  );

  async function togglePin(item: Announcement) {
    try {
      const res = await request<{ announcement: Announcement }>(`/announcements/${item.id}/`, { method: "PATCH", json: { pinned: !item.pinned } });
      setData((prev) => sortAnnouncements((prev ?? []).map((a) => (a.id === item.id ? res.announcement : a))));
      notify(item.pinned ? "Unpinned" : "Pinned to the top");
    } catch (failure) {
      notify(errorMessage(failure), "error");
    }
  }

  async function remove() {
    if (!deleting) return;
    setBusy(true);
    try {
      await request(`/announcements/${deleting.id}/`, { method: "DELETE" });
      setData((prev) => (prev ?? []).filter((a) => a.id !== deleting.id));
      notify("Announcement deleted");
      setDeleting(null);
    } catch (failure) {
      notify(errorMessage(failure), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page>
      <PageHeader
        title="Announcements"
        description="Notices for the whole workspace. Pinned and important ones stay at the top."
        actions={
          canManage && (
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="size-4" strokeWidth={1.5} />
              New announcement
            </Button>
          )
        }
      />

      <div className="mt-8">
        <Segmented label="Show" options={["All", "Pinned", "Important"]} value={filter} onChange={setFilter} />
      </div>

      <div ref={root} className="mt-6">
        {error && <ErrorNote message={error} onRetry={reload} />}
        {loading && !data && (
          <div className="grid gap-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-24 rounded-[16px]" />
            ))}
          </div>
        )}
        {data && items.length === 0 && (
          <Card>
            <EmptyState icon={Megaphone} title={filter === 0 ? "No announcements yet" : "Nothing matches this filter"} text={canManage && filter === 0 ? "Post the first notice for everyone in the workspace." : undefined} />
          </Card>
        )}
        <ul className="grid grid-cols-1 gap-3">
          {items.map((item) => {
            const expanded = open === item.id;
            return (
              <li key={item.id} id={`ann-${item.id}`} data-item className="scroll-mt-24">
                <Card className={cn("overflow-hidden transition-colors duration-300", expanded && "bg-raised/40")}>
                  <button
                    type="button"
                    aria-expanded={expanded}
                    aria-controls={`ann-body-${item.id}`}
                    onClick={() => setPicked(expanded ? null : item.id)}
                    className="flex w-full items-start gap-4 p-5 text-left sm:p-6"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-[17px] font-medium leading-[1.35]">{item.title}</h2>
                        {item.level === "important" && <Tag tone="strong">Important</Tag>}
                        {item.pinned && (
                          <span className="inline-flex items-center gap-1 text-[12px] text-ink-3">
                            <Pin className="size-3.5" strokeWidth={1.5} />
                            Pinned
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-[13px] text-ink-3">
                        {item.author} · <span className="font-mono">{formatWhen(item.created_at)}</span>
                      </p>
                      {!expanded && item.body && <p className="mt-3 line-clamp-2 text-[14px] leading-[22px] text-ink-2">{item.body}</p>}
                    </div>
                    <ChevronDown className={cn("mt-1 size-[18px] shrink-0 text-ink-3 transition-transform duration-300 ease-soft", expanded && "rotate-180")} strokeWidth={1.5} />
                  </button>
                  <div
                    id={`ann-body-${item.id}`}
                    inert={!expanded}
                    className={cn("grid transition-[grid-template-rows] duration-400 ease-soft", expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}
                  >
                    <div className="overflow-hidden">
                      <div className="px-5 pb-5 sm:px-6 sm:pb-6">
                        {item.body ? <p className="max-w-[46rem] whitespace-pre-wrap text-[15px] leading-[25px] text-ink-2">{item.body}</p> : <p className="text-[14px] text-ink-3">No further message.</p>}
                        {canManage && (
                          <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
                            <Button variant="secondary" size="sm" onClick={() => { setEditing(item); setFormOpen(true); }}>
                              <Pencil className="size-3.5" strokeWidth={1.5} />
                              Edit
                            </Button>
                            <Button variant="secondary" size="sm" onClick={() => togglePin(item)}>
                              {item.pinned ? <PinOff className="size-3.5" strokeWidth={1.5} /> : <Pin className="size-3.5" strokeWidth={1.5} />}
                              {item.pinned ? "Unpin" : "Pin"}
                            </Button>
                            <Button variant="danger" size="sm" onClick={() => setDeleting(item)}>
                              <Trash2 className="size-3.5" strokeWidth={1.5} />
                              Delete
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      </div>

      <AnnouncementForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        initial={editing}
        onSaved={(saved) =>
          setData((prev) => {
            const list = prev ?? [];
            return sortAnnouncements(list.some((a) => a.id === saved.id) ? list.map((a) => (a.id === saved.id ? saved : a)) : [saved, ...list]);
          })
        }
      />
      <ConfirmModal
        open={!!deleting}
        title="Delete this announcement"
        text={deleting ? `“${deleting.title}” will be removed for everyone. This is recorded in the audit log.` : ""}
        busy={busy}
        onConfirm={remove}
        onClose={() => setDeleting(null)}
      />
    </Page>
  );
}

export function sortAnnouncements(list: Announcement[]) {
  return [...list].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.created_at.localeCompare(a.created_at));
}
