"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ArrowLeft, NotebookPen, Pin, PinOff, Plus, Search, Trash2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { useResource } from "@/hooks/useResource";
import { cn } from "@/lib/cn";
import { errorMessage, formatWhen, type Note } from "@/lib/workspace-api";

import { ConfirmModal, EmptyState, ErrorNote, Skeleton } from "../ui";
import { useWorkspace } from "../WorkspaceContext";

gsap.registerPlugin(useGSAP);

type Status = "idle" | "saving" | "saved" | "error";

const sortNotes = (list: Note[]) => [...list].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updated_at.localeCompare(a.updated_at));
const heading = (note: Note) => note.title.trim() || note.body.trim().split("\n")[0]?.slice(0, 60) || "Untitled note";
const isEmpty = (note: Note) => !note.title.trim() && !note.body.trim();

/*
  Private notes: a list on the left, an editor on the right. Changes are saved a moment
  after you stop typing, and a note you leave empty is removed when you move away from it.
*/
export function NotesView() {
  const { request } = useWorkspace();
  const params = useSearchParams();
  const load = useCallback((signal: AbortSignal) => request<{ notes: Note[] }>("/notes/", { signal }).then((d) => d.notes), [request]);
  const resource = useResource(load);

  if (!resource.data) {
    return (
      <div className="grid h-[calc(100dvh-3.5rem)] min-h-[520px] place-items-center p-6">
        {resource.error ? (
          <div className="w-full max-w-md">
            <ErrorNote message={resource.error} onRetry={resource.reload} />
          </div>
        ) : (
          <div className="grid w-full max-w-md gap-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        )}
      </div>
    );
  }
  return <NotesWorkspace notes={resource.data} setData={resource.setData} reload={resource.reload} error={resource.error} linkedNote={Number(params.get("note")) || null} wantsNew={params.get("new") === "1"} />;
}

type Resource = ReturnType<typeof useResource<Note[]>>;

function NotesWorkspace({
  notes,
  setData,
  reload,
  error,
  linkedNote,
  wantsNew,
}: {
  notes: Note[];
  setData: Resource["setData"];
  reload: () => void;
  error?: string;
  linkedNote: number | null;
  wantsNew: boolean;
}) {
  const { request } = useWorkspace();
  const { notify } = useToast();
  const listRef = useRef<HTMLUListElement>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const linked = linkedNote ? notes.find((n) => n.id === linkedNote) : undefined;

  // Browsers without `field-sizing` need the title field sized by hand so long titles wrap instead of clipping
  useLayoutEffect(() => {
    const el = titleRef.current;
    if (!el || CSS.supports("field-sizing", "content")) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  });

  const [selectedId, setSelectedId] = useState<number | null>(linked?.id ?? null);
  const [title, setTitle] = useState(linked?.title ?? "");
  const [body, setBody] = useState(linked?.body ?? "");
  const [status, setStatus] = useState<Status>("idle");
  const [query, setQuery] = useState("");
  const [showEditor, setShowEditor] = useState(!!linked);
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);

  const pending = useRef<{ id: number; title: string; body: string } | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const selected = notes.find((n) => n.id === selectedId) ?? null;

  const flush = useCallback(async () => {
    window.clearTimeout(timer.current);
    const job = pending.current;
    if (!job) return;
    pending.current = null;
    setStatus("saving");
    try {
      const res = await request<{ note: Note }>(`/notes/${job.id}/`, { method: "PATCH", json: { title: job.title, body: job.body } });
      setData((prev) => sortNotes((prev ?? []).map((n) => (n.id === job.id ? res.note : n))));
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }, [request, setData]);

  const open = useCallback(
    async (note: Note | null) => {
      await flush();
      // A note left empty is not worth keeping
      if (selected && selected.id !== note?.id && isEmpty({ ...selected, title, body })) {
        request(`/notes/${selected.id}/`, { method: "DELETE" }).catch(() => undefined);
        setData((prev) => (prev ?? []).filter((n) => n.id !== selected.id));
      }
      setSelectedId(note?.id ?? null);
      setTitle(note?.title ?? "");
      setBody(note?.body ?? "");
      setStatus("idle");
      setShowEditor(!!note);
    },
    [body, flush, request, selected, setData, title],
  );

  async function create(initialBody = "") {
    try {
      const res = await request<{ note: Note }>("/notes/", { method: "POST", json: { title: "", body: initialBody } });
      setData((prev) => sortNotes([res.note, ...(prev ?? [])]));
      await open(res.note);
      window.setTimeout(() => titleRef.current?.focus(), 60);
    } catch (failure) {
      notify(errorMessage(failure), "error");
    }
  }

  // "New note" from the search bar: create one as soon as the page opens
  const started = useRef(false);
  useEffect(() => {
    if (!wantsNew || started.current) return;
    started.current = true;
    const timer = window.setTimeout(() => void create(), 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantsNew]);

  // Save whatever is pending when leaving the page
  useEffect(() => () => void flush(), [flush]);

  function edit(next: { title?: string; body?: string }) {
    if (!selected) return;
    const t = next.title ?? title;
    const b = next.body ?? body;
    setTitle(t);
    setBody(b);
    setStatus("idle");
    pending.current = { id: selected.id, title: t, body: b };
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(flush, 800);
  }

  async function togglePin() {
    if (!selected) return;
    try {
      const res = await request<{ note: Note }>(`/notes/${selected.id}/`, { method: "PATCH", json: { pinned: !selected.pinned } });
      setData((prev) => sortNotes((prev ?? []).map((n) => (n.id === selected.id ? res.note : n))));
    } catch (failure) {
      notify(errorMessage(failure), "error");
    }
  }

  async function remove() {
    if (!selected) return;
    setBusy(true);
    pending.current = null;
    try {
      await request(`/notes/${selected.id}/`, { method: "DELETE" });
      setData((prev) => (prev ?? []).filter((n) => n.id !== selected.id));
      setSelectedId(null);
      setShowEditor(false);
      setDeleting(false);
      notify("Note deleted");
    } catch (failure) {
      notify(errorMessage(failure), "error");
    } finally {
      setBusy(false);
    }
  }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? notes.filter((n) => `${n.title} ${n.body}`.toLowerCase().includes(q)) : notes;
  }, [notes, query]);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from("[data-note-row]", { autoAlpha: 0, y: 10, duration: 0.45, stagger: 0.04, ease: "power3.out", clearProps: "all" });
      });
      return () => mm.revert();
    },
    { scope: listRef },
  );

  return (
    <div className="grid h-[calc(100dvh-3.5rem)] min-h-[520px] lg:grid-cols-[340px_1fr]">
      {/* List */}
      <section aria-label="Notes" className={cn("flex min-h-0 flex-col border-line lg:border-r", showEditor && "max-lg:hidden")}>
        <div className="flex items-center justify-between gap-3 px-5 pb-4 pt-6 sm:px-6">
          <h1 className="font-serif text-[30px] leading-none tracking-[-0.02em]">Notes</h1>
          <Button size="sm" onClick={() => create()}>
            <Plus className="size-4" strokeWidth={1.5} />
            New note
          </Button>
        </div>
        <div className="relative px-5 pb-4 sm:px-6">
          <Search className="pointer-events-none absolute left-8 top-1/2 size-4 -translate-y-[calc(50%+8px)] text-ink-3 sm:left-9" strokeWidth={1.5} />
          <Input aria-label="Filter notes" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter notes" className="h-10 pl-9" />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto border-t border-line">
          {error && <div className="p-4"><ErrorNote message={error} onRetry={reload} /></div>}
          {notes.length === 0 && (
            <EmptyState icon={NotebookPen} title="No notes yet" text="Notes are private to you. Capture a thought, a checklist or a draft." />
          )}
          {notes.length > 0 && visible.length === 0 && <p className="px-6 py-10 text-center text-[14px] text-ink-3">No note matches “{query}”.</p>}
          <ul ref={listRef} className="divide-y divide-line">
            {visible.map((note) => (
              <li key={note.id} data-note-row>
                <button
                  type="button"
                  onClick={() => void open(note)}
                  aria-current={note.id === selectedId ? "true" : undefined}
                  className={cn("block w-full px-5 py-4 text-left transition-colors duration-150 hover:bg-hover/60 sm:px-6", note.id === selectedId && "bg-raised")}
                >
                  <span className="flex items-center gap-2">
                    {note.pinned && <Pin className="size-3.5 shrink-0 text-ink-3" strokeWidth={1.5} />}
                    <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{heading(note)}</span>
                    <span className="shrink-0 font-mono text-[12px] text-ink-3">{formatWhen(note.updated_at)}</span>
                  </span>
                  <span className="mt-1 line-clamp-2 text-[13px] leading-[19px] text-ink-3">{note.body.replace(/\s+/g, " ").trim() || "No text"}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Editor */}
      <section aria-label="Note editor" className={cn("flex min-h-0 min-w-0 flex-col", !showEditor && "max-lg:hidden")}>
        {selected ? (
          <>
            <div className="flex items-center gap-2 border-b border-line px-4 py-3 sm:px-8">
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Back to notes" onClick={() => void open(null)}>
                <ArrowLeft className="size-[18px]" strokeWidth={1.5} />
              </Button>
              <p aria-live="polite" className="flex-1 font-mono text-[12px] text-ink-3">
                {status === "saving" ? "Saving" : status === "saved" ? "Saved" : status === "error" ? "Could not save, will retry on the next change" : `Edited ${formatWhen(selected.updated_at)}`}
              </p>
              <Button variant="ghost" size="sm" onClick={togglePin} aria-pressed={selected.pinned}>
                {selected.pinned ? <PinOff className="size-4" strokeWidth={1.5} /> : <Pin className="size-4" strokeWidth={1.5} />}
                {selected.pinned ? "Unpin" : "Pin"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setDeleting(true)}>
                <Trash2 className="size-4" strokeWidth={1.5} />
                Delete
              </Button>
            </div>
            <div key={selected.id} className="min-h-0 flex-1 animate-[fade-in_300ms_var(--ease-soft)_both] overflow-y-auto px-5 py-8 sm:px-10">
              <div className="mx-auto max-w-[44rem]">
                <label htmlFor="note-title" className="sr-only">
                  Title
                </label>
                <textarea
                  id="note-title"
                  ref={titleRef}
                  rows={1}
                  value={title}
                  maxLength={160}
                  onChange={(e) => edit({ title: e.target.value.replace(/\n/g, " ") })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      document.getElementById("note-body")?.focus();
                    }
                  }}
                  placeholder="Untitled note"
                  className="w-full resize-none overflow-hidden bg-transparent font-serif text-[34px] leading-[1.15] tracking-[-0.02em] [field-sizing:content] placeholder:text-ink-3 focus:outline-none"
                />
                <label htmlFor="note-body" className="sr-only">
                  Note
                </label>
                <textarea
                  id="note-body"
                  value={body}
                  onChange={(e) => edit({ body: e.target.value })}
                  placeholder="Start writing"
                  rows={18}
                  className="mt-5 min-h-[50dvh] w-full resize-none bg-transparent text-[16px] leading-[28px] text-ink-2 placeholder:text-ink-3 focus:outline-none"
                />
              </div>
            </div>
          </>
        ) : (
          <EmptyState
            className="my-auto"
            icon={NotebookPen}
            title={notes.length ? "Select a note" : "Write your first note"}
            text={notes.length ? "Choose a note from the list, or start a new one." : "Notes are private to you and saved as you type."}
            action={
              <Button onClick={() => create()}>
                <Plus className="size-4" strokeWidth={1.5} />
                New note
              </Button>
            }
          />
        )}
      </section>

      <ConfirmModal open={deleting} title="Delete this note" text="This note will be removed permanently." busy={busy} onConfirm={remove} onClose={() => setDeleting(false)} />
    </div>
  );
}
