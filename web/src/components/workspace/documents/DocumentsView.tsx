"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ArrowDown, Download, FileText, Search, Trash2, X } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Cite } from "@/components/ui/Cite";
import { Input } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { ConfirmModal, EmptyState, ErrorNote, Page, PageHeader, Skeleton, Tag } from "@/components/workspace/ui";
import { useWorkspace } from "@/components/workspace/WorkspaceContext";
import { useResource } from "@/hooks/useResource";
import { cn } from "@/lib/cn";
import { downloadDocument, errorMessage, formatBytes, formatWhen, type Bootstrap, type SearchHit } from "@/lib/workspace-api";

import { DocumentDetails } from "./DocumentDetails";
import { Highlight, useIsDesktop, type LibraryDocument } from "./support";
import { Uploader } from "./Uploader";

gsap.registerPlugin(useGSAP);

const INSIDE_MIN = 4;

/* Stacked rows below 768px, six columns up to 1024px, all eight above (measured on the list, not the window) */
const GRID =
  "grid-cols-[minmax(0,1fr)_auto] @3xl:grid-cols-[minmax(0,1fr)_120px_152px_104px_76px] @5xl:grid-cols-[minmax(0,1fr)_120px_104px_160px_64px_112px_64px_76px]";

type SortKey = "title" | "added";
type Sort = { key: SortKey; dir: "asc" | "desc" };

export function DocumentsView() {
  const { boot } = useWorkspace();
  if (!boot) return <LoadingShell />;
  return <Library boot={boot} />;
}

function LoadingShell() {
  return (
    <Page aria-busy="true">
      <PageHeader title="Documents" description="Files you can open, who else can read each one, and how many passages are indexed." />
      <Skeleton className="mt-8 h-[88px] rounded-[16px]" />
      <Skeleton className="mt-10 h-[280px] rounded-[16px]" />
    </Page>
  );
}

function Library({ boot }: { boot: Bootstrap }) {
  const { request, persona } = useWorkspace();
  const { notify } = useToast();
  const params = useSearchParams();
  const pathname = usePathname();
  const desktop = useIsDesktop();

  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState<Sort>({ key: "added", dir: "desc" });
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [hits, setHits] = useState<{ query: string; results: SearchHit[] } | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<LibraryDocument | null>(null);
  const [removeBusy, setRemoveBusy] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [fresh, setFresh] = useState<ReadonlySet<number>>(new Set());
  const [uploadFocus, setUploadFocus] = useState(0);
  const [flash, setFlash] = useState<{ id: number; n: number } | null>(null);
  const [seenParams, setSeenParams] = useState("");
  const tableRef = useRef<HTMLDivElement>(null);
  const searchRun = useRef(0);
  const flashed = useRef(0);

  const load = useCallback(
    (signal: AbortSignal) => request<{ documents: LibraryDocument[] }>("/documents/", { signal }).then((result) => result.documents),
    [request],
  );
  const library = useResource(load);

  /* Deep links from the global search: ?open=<id>, ?upload=1, ?q=<text> */
  const paramString = params.toString();
  if (paramString !== seenParams) {
    setSeenParams(paramString);
    const openId = Number(params.get("open"));
    const query = params.get("q");
    if (query !== null) setFilter(query);
    else if (openId) setFilter("");
    if (openId) {
      setSelectedId(openId);
      setFlash((previous) => ({ id: openId, n: (previous?.n ?? 0) + 1 }));
    }
    if (params.get("upload")) setUploadFocus((value) => value + 1);
  }

  // Keep the URL tidy once the parameters have been used
  useEffect(() => {
    const next = new URLSearchParams(paramString);
    const used = ["open", "upload", "q"].filter((key) => next.has(key));
    if (!used.length) return;
    used.forEach((key) => next.delete(key));
    const rest = next.toString();
    window.history.replaceState(null, "", rest ? `${pathname}?${rest}` : pathname);
  }, [paramString, pathname]);

  const total = library.data?.length ?? 0;
  const needle = filter.trim().toLowerCase();

  const docs = useMemo(() => {
    const list = (library.data ?? []).filter(
      (doc) => !needle || [doc.title, doc.filename, doc.owner, doc.access_summary, doc.department?.name ?? ""].some((text) => text.toLowerCase().includes(needle)),
    );
    const factor = sort.dir === "asc" ? 1 : -1;
    return list.sort((a, b) =>
      sort.key === "title" ? factor * a.title.localeCompare(b.title, undefined, { sensitivity: "base" }) : factor * (Date.parse(a.created_at) - Date.parse(b.created_at)),
    );
  }, [library.data, needle, sort]);

  const selected = library.data?.find((doc) => doc.id === selectedId) ?? null;
  const byId = useMemo(() => new Map((library.data ?? []).map((doc) => [doc.id, doc])), [library.data]);

  // Bring a document opened from a link into view and mark it for a moment
  useEffect(() => {
    if (!flash || !library.data || flashed.current === flash.n) return;
    flashed.current = flash.n;
    const row = tableRef.current?.querySelector<HTMLElement>(`[data-doc-id="${flash.id}"]`);
    if (!library.data.some((doc) => doc.id === flash.id)) {
      notify("That document is not available to you.", "error");
      return;
    }
    if (!row) return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    row.scrollIntoView({ block: "center", behavior: calm ? "auto" : "smooth" });
    row.dataset.flash = "true";
    window.setTimeout(() => delete row.dataset.flash, 1800);
  }, [flash, library.data, notify]);

  // Rows come in once on load and again when the filter or sort changes
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const rows = Array.from(tableRef.current?.querySelectorAll<HTMLElement>("[data-row]") ?? []).slice(0, 14);
        if (!rows.length) return;
        gsap.from(rows, { opacity: 0, y: 8, duration: 0.4, ease: "power3.out", stagger: 0.03, clearProps: "opacity,transform" });
      });
      return () => mm.revert();
    },
    { scope: tableRef, dependencies: [needle, sort.key, sort.dir, library.data ? "ready" : "loading"], revertOnUpdate: true },
  );

  const onUploaded = useCallback(
    (doc: LibraryDocument) => {
      setFresh((previous) => new Set(previous).add(doc.id));
      library.setData((previous) => [doc, ...(previous ?? []).filter((item) => item.id !== doc.id)]);
      library.reload();
    },
    [library],
  );

  async function searchInside() {
    const query = filter.trim();
    if (query.length < INSIDE_MIN) return;
    const run = ++searchRun.current;
    setSearching(true);
    setSearchError(null);
    try {
      const result = await request<{ query: string; results: SearchHit[] }>(`/documents/?q=${encodeURIComponent(query)}`);
      if (run === searchRun.current) setHits({ query: result.query, results: result.results });
    } catch (error) {
      if (run === searchRun.current) setSearchError(errorMessage(error));
    } finally {
      if (run === searchRun.current) setSearching(false);
    }
  }

  function changeFilter(value: string) {
    setFilter(value);
    searchRun.current += 1;
    setHits(null);
    setSearchError(null);
    setSearching(false);
  }

  function download(doc: LibraryDocument) {
    return downloadDocument(doc.id, doc.filename, persona);
  }

  async function remove() {
    if (!removing) return;
    setRemoveBusy(true);
    setRemoveError(null);
    try {
      await request(`/documents/${removing.id}/`, { method: "DELETE" });
      const gone = removing;
      library.setData((previous) => (previous ?? []).filter((item) => item.id !== gone.id));
      if (selectedId === gone.id) setSelectedId(null);
      setRemoving(null);
      setActionError(null);
      notify(`Deleted ${gone.title}`);
      library.reload();
    } catch (error) {
      setRemoveError(errorMessage(error));
    } finally {
      setRemoveBusy(false);
    }
  }

  function sortBy(key: SortKey) {
    setSort((current) => (current.key === key ? { key, dir: current.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "title" ? "asc" : "desc" }));
  }

  function openFromHit(id: number) {
    setSelectedId(id);
    requestAnimationFrame(() => tableRef.current?.querySelector(`[data-doc-id="${id}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" }));
  }

  const canSearchInside = filter.trim().length >= INSIDE_MIN;
  const live = searching
    ? "Searching inside files"
    : hits
      ? `${hits.results.length} ${hits.results.length === 1 ? "match" : "matches"} inside files for ${hits.query}`
      : library.data && needle
        ? `${docs.length} of ${total} documents match`
        : "";

  const details = selected && (
    <DocumentDetails
      key={selected.id}
      doc={selected}
      boot={boot}
      request={request}
      animate={desktop}
      onClose={() => setSelectedId(null)}
      onDownload={download}
      onDelete={(doc) => {
        setRemoveError(null);
        setRemoving(doc);
      }}
      onSaved={(doc) => {
        library.setData((previous) => (previous ?? []).map((item) => (item.id === doc.id ? doc : item)));
        notify("Access saved");
        library.reload();
      }}
    />
  );

  return (
    <Page>
      <PageHeader title="Documents" description="Files you can open, who else can read each one, and how many passages are indexed." />

      <section aria-labelledby="upload-title" className="mt-8">
        <h2 id="upload-title" className="mb-3 text-[16px] font-medium">
          Upload
        </h2>
        <Uploader boot={boot} persona={persona} onUploaded={onUploaded} focusRequest={uploadFocus} />
      </section>

      <section aria-labelledby="library-title" className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="library-title" className="text-[16px] font-medium">
              Library
            </h2>
            <p className="text-[13px] text-ink-3 tabular-nums">
              {library.data ? (needle ? `${docs.length} of ${total} documents` : `${total} ${total === 1 ? "document" : "documents"} you can open`) : "Loading"}
            </p>
          </div>
          <form
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              void searchInside();
            }}
            className="flex w-full gap-2 sm:w-auto"
          >
            <div className="relative min-w-0 flex-1 sm:w-80 sm:flex-none">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-3" strokeWidth={1.5} />
              <Input
                type="search"
                value={filter}
                onChange={(event) => changeFilter(event.target.value)}
                aria-label="Filter documents"
                placeholder="Filter by name or owner"
                className="pl-10"
              />
            </div>
            {canSearchInside && (
              <Button type="submit" variant="secondary" size="lg" loading={searching}>
                Search inside files
              </Button>
            )}
          </form>
        </div>

        <p role="status" aria-live="polite" className="sr-only">
          {live}
        </p>

        {searchError && (
          <div className="mt-4">
            <ErrorNote message={searchError} onRetry={() => void searchInside()} />
          </div>
        )}
        {hits && (
          <section aria-label="Matches inside files" className="mt-4 animate-[rise-in_320ms_var(--ease-soft)_both] rounded-[16px] border border-line-strong">
            <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
              <h3 className="min-w-0 text-[14px] font-medium">
                {hits.results.length
                  ? `${hits.results.length} ${hits.results.length === 1 ? "match" : "matches"} inside files for “${hits.query}”`
                  : `Nothing inside the files you can open matches “${hits.query}”`}
              </h3>
              <button
                type="button"
                aria-label="Close matches"
                onClick={() => setHits(null)}
                className="grid size-8 shrink-0 place-items-center rounded-[8px] text-ink-3 transition-colors duration-150 hover:bg-hover hover:text-ink"
              >
                <X className="size-4" strokeWidth={1.5} />
              </button>
            </div>
            {hits.results.length > 0 && (
              <ul className="divide-y divide-line">
                {hits.results.map((hit, index) => {
                  const doc = byId.get(hit.document_id);
                  const name = doc?.filename ?? hit.title;
                  return (
                    <li key={`${hit.document_id}-${index}`}>
                      <button
                        type="button"
                        onClick={() => openFromHit(hit.document_id)}
                        className="block w-full px-5 py-3 text-left transition-colors duration-150 hover:bg-raised focus-visible:outline-offset-[-2px]"
                      >
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-[14px] font-medium">{hit.title}</span>
                          <Cite>{hit.page ? `${name} | ${hit.page}` : name}</Cite>
                        </span>
                        <span className="mt-1.5 line-clamp-3 text-[14px] leading-[22px] text-ink-2">
                          <Highlight text={hit.snippet} query={hits.query} />
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}

        {actionError && (
          <div className="mt-4">
            <ErrorNote message={actionError} />
          </div>
        )}
        {library.error && (
          <div className="mt-4">
            <ErrorNote message={library.error} onRetry={library.reload} />
          </div>
        )}

        <div className={cn("mt-4 grid items-start gap-6", selected && desktop && "lg:grid-cols-[minmax(0,1fr)_380px]")}>
          <div ref={tableRef} className="@container min-w-0">
            {library.loading && !library.data ? (
              <div aria-busy="true" aria-label="Loading documents" className="overflow-hidden rounded-[16px] border border-line-strong">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="flex h-14 items-center border-t border-line px-4 first:border-t-0">
                    <Skeleton className="h-4 w-1/3" />
                  </div>
                ))}
              </div>
            ) : library.data && docs.length === 0 ? (
              <div className="rounded-[16px] border border-line-strong">
                <EmptyState
                  icon={FileText}
                  title={needle ? "No documents match" : "No documents yet"}
                  text={needle ? "Try another word, or search inside the files." : "Drop a file above. It is searchable as soon as indexing finishes."}
                />
              </div>
            ) : library.data ? (
              <div role="table" aria-label="Documents" className="overflow-hidden rounded-[16px] border border-line-strong">
                <div role="row" className={cn("hidden h-10 items-center gap-3 border-b border-line px-4 text-[12px] text-ink-3 @3xl:grid", GRID)}>
                  <SortHeader label="Title" active={sort.key === "title"} dir={sort.dir} onSort={() => sortBy("title")} />
                  <div role="columnheader">Department</div>
                  <div role="columnheader" className="hidden @5xl:block">
                    Owner
                  </div>
                  <div role="columnheader">Access</div>
                  <div role="columnheader" className="hidden text-right @5xl:block">
                    Size
                  </div>
                  <SortHeader label="Added" active={sort.key === "added"} dir={sort.dir} onSort={() => sortBy("added")} />
                  <div role="columnheader" className="hidden text-right @5xl:block">
                    Passages
                  </div>
                  <div role="columnheader" className="sr-only">
                    Actions
                  </div>
                </div>
                <div role="rowgroup">
                  {docs.map((doc) => (
                    <DocumentRow
                      key={doc.id}
                      doc={doc}
                      selected={doc.id === selectedId}
                      fresh={fresh.has(doc.id)}
                      onSelect={() => setSelectedId((current) => (current === doc.id ? null : doc.id))}
                      onDownload={() => {
                        setActionError(null);
                        download(doc).catch((error) => setActionError(errorMessage(error)));
                      }}
                      onDelete={() => {
                        setRemoveError(null);
                        setRemoving(doc);
                      }}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          {selected && desktop && (
            <aside aria-label="Document details" className="max-h-[calc(100dvh-7rem)] overflow-y-auto rounded-[16px] border border-line-strong bg-surface p-5 lg:sticky lg:top-6">
              {details}
            </aside>
          )}
        </div>
      </section>

      <Modal
        open={selected !== null && !desktop}
        onClose={() => setSelectedId(null)}
        label="Document details"
        className="inset-x-0 bottom-0 top-auto m-0 w-full sm:inset-x-auto sm:left-1/2 sm:w-[480px] sm:-translate-x-1/2"
      >
        <div className="max-h-[88dvh] overflow-y-auto rounded-t-[20px] border border-line-strong bg-surface p-5 shadow-window sm:rounded-b-[20px]">{details}</div>
      </Modal>

      <ConfirmModal
        open={removing !== null}
        title={`Delete “${removing?.title ?? ""}”?`}
        text={removeError ? `Could not delete: ${removeError}` : "The file and its indexed passages are removed. The deletion is recorded in the audit log."}
        confirmLabel={removeError ? "Try again" : "Delete document"}
        busy={removeBusy}
        onConfirm={() => void remove()}
        onClose={() => {
          setRemoving(null);
          setRemoveError(null);
        }}
      />
    </Page>
  );
}

function SortHeader({ label, active, dir, onSort }: { label: string; active: boolean; dir: "asc" | "desc"; onSort: () => void }) {
  return (
    <div role="columnheader" aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}>
      <button
        type="button"
        onClick={onSort}
        className={cn("group -ml-2 inline-flex h-8 items-center gap-1 rounded-[6px] px-2 transition-colors duration-150 hover:text-ink", active && "text-ink")}
      >
        {label}
        <ArrowDown
          aria-hidden="true"
          className={cn("size-3.5 transition-[transform,opacity] duration-300 ease-soft", active ? "opacity-100" : "opacity-0 group-hover:opacity-50", active && dir === "asc" && "rotate-180")}
          strokeWidth={1.5}
        />
      </button>
    </div>
  );
}

function DocumentRow({
  doc,
  selected,
  fresh,
  onSelect,
  onDownload,
  onDelete,
}: {
  doc: LibraryDocument;
  selected: boolean;
  fresh: boolean;
  onSelect: () => void;
  onDownload: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      role="row"
      data-row=""
      data-doc-id={doc.id}
      data-selected={selected}
      className={cn(
        "relative grid min-h-[88px] items-center gap-3 border-t border-line px-4 py-3 transition-colors duration-300 first:border-t-0 @3xl:h-14 @3xl:min-h-0 @3xl:py-0",
        "before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-ink before:opacity-0 before:transition-opacity before:duration-150",
        "hover:bg-raised data-[flash=true]:bg-mark data-[selected=true]:bg-hover data-[selected=true]:before:opacity-100",
        GRID,
        fresh && "animate-[rise-in_460ms_var(--ease-soft)_both]",
      )}
    >
      <div role="cell" className="min-w-0">
        <button
          type="button"
          onClick={onSelect}
          aria-pressed={selected}
          className="flex w-full min-w-0 flex-col text-left after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-ink"
        >
          <span className="truncate text-[15px] font-medium leading-[24px]">{doc.title}</span>
          <span className="truncate font-mono text-[12px] leading-[20px] text-ink-3">{doc.filename}</span>
          <span className="truncate text-[13px] leading-[20px] text-ink-3 tabular-nums @3xl:hidden">
            {doc.department?.name ?? "Company-wide"}, {formatBytes(doc.size_bytes)}, {formatWhen(doc.created_at)}
          </span>
        </button>
      </div>
      <div role="cell" className="hidden min-w-0 truncate text-[14px] text-ink-2 @3xl:block">
        {doc.department?.name ?? "Company-wide"}
      </div>
      <div role="cell" className="hidden min-w-0 truncate text-[14px] text-ink-2 @5xl:block">
        {doc.owner}
      </div>
      <div role="cell" className="hidden min-w-0 @3xl:block">
        <Tag className="max-w-full">
          <span className="truncate">{doc.access_summary}</span>
        </Tag>
      </div>
      <div role="cell" className="hidden text-right text-[13px] text-ink-2 tabular-nums @5xl:block">
        {formatBytes(doc.size_bytes)}
      </div>
      <div role="cell" className="hidden truncate text-[13px] text-ink-2 tabular-nums @3xl:block">
        {formatWhen(doc.created_at)}
      </div>
      <div role="cell" className="hidden text-right text-[13px] text-ink-2 tabular-nums @5xl:block">
        {doc.chunk_count}
      </div>
      <div role="cell" className="relative flex justify-end gap-1">
        <button
          type="button"
          onClick={onDownload}
          aria-label={`Download ${doc.title}`}
          className="grid size-9 place-items-center rounded-[8px] text-ink-3 transition-colors duration-150 hover:bg-hover hover:text-ink"
        >
          <Download className="size-4" strokeWidth={1.5} />
        </button>
        {doc.can_delete && (
          <button
            type="button"
            onClick={onDelete}
            aria-label={`Delete ${doc.title}`}
            className="grid size-9 place-items-center rounded-[8px] text-ink-3 transition-colors duration-150 hover:bg-danger-soft hover:text-danger"
          >
            <Trash2 className="size-4" strokeWidth={1.5} />
          </button>
        )}
      </div>
    </div>
  );
}
