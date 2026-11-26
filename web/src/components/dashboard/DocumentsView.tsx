"use client";

import { CheckIcon, FileTextIcon, FileWarningIcon, RefreshCwIcon, XIcon } from "lucide-react";
import { FileText, Search, Trash2, UploadCloud } from "lucide-react";
import { useCallback, useRef, useState } from "react";

import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from "@/components/ui/attachment";
import { Spinner } from "@/components/ui/spinner";
import { useResource } from "@/hooks/useResource";
import {
  downloadDocument,
  errorMessage,
  formatBytes,
  formatDateTime,
  uploadRequest,
  type DocumentItem,
  type SearchHit,
} from "@/lib/workspace-api";

import { AccessFields, emptyAccess, type AccessValue } from "./AccessFields";
import { btnGhost, btnPrimary, btnSecondary, ConfirmModal, EmptyState, ErrorNote, inputClass, Modal, SkeletonRows } from "./ui";
import { useWorkspace } from "./WorkspaceContext";

type UploadState = "uploading" | "processing" | "error" | "done";
type UploadItem = { id: string; file: File; access: AccessValue; state: UploadState; detail: string };

function accessPayload(access: AccessValue, manage: boolean) {
  const form: Record<string, string> = { access_mode: access.mode };
  if (manage) {
    form.department_id = access.mode === "rbac" ? access.departmentId : "";
    form.grants = JSON.stringify(
      access.mode === "scope" ? { roles: access.roles, departments: access.departments, personas: access.personas } : {},
    );
  }
  return form;
}

export function DocumentsView() {
  const { boot, request, persona } = useWorkspace();
  const b = boot!;
  const [access, setAccess] = useState<AccessValue>(() => emptyAccess(b));
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [filter, setFilter] = useState("");
  const [hits, setHits] = useState<{ query: string; results: SearchHit[] } | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [editing, setEditing] = useState<DocumentItem | null>(null);
  const [removing, setRemoving] = useState<DocumentItem | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(
    (signal: AbortSignal) => request<{ documents: DocumentItem[] }>("/documents/", { signal }).then((r) => r.documents),
    [request],
  );
  const library = useResource(load);
  const manage = b.capabilities.upload_scope;
  const maxBytes = b.limits.max_upload_bytes;
  const accepted = b.limits.extensions.join(",");

  function patch(id: string, update: Partial<UploadItem>) {
    setUploads((prev) => prev.map((item) => (item.id === id ? { ...item, ...update } : item)));
  }

  const run = useCallback(
    async (item: UploadItem) => {
      const form = new FormData();
      form.append("file", item.file);
      Object.entries(accessPayload(item.access, manage)).forEach(([key, value]) => form.append(key, value));
      patch(item.id, { state: "uploading", detail: "Uploading · 0%" });
      try {
        await uploadRequest("/documents/", persona, form, (fraction) => patch(item.id, { detail: `Uploading · ${Math.round(fraction * 100)}%` }), () =>
          patch(item.id, { state: "processing", detail: "Extracting text and indexing" }),
        );
        patch(item.id, { state: "done", detail: `Ready · ${formatBytes(item.file.size)}` });
        library.reload();
      } catch (error) {
        patch(item.id, { state: "error", detail: errorMessage(error) });
      }
    },
    [manage, persona, library],
  );

  function addFiles(list: FileList | null) {
    if (!list) return;
    const added: UploadItem[] = [];
    Array.from(list).forEach((file) => {
      const ext = `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`;
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const base = { id, file, access: { ...access } };
      if (!b.limits.extensions.includes(ext)) {
        added.push({ ...base, state: "error", detail: "Unsupported type. Use PDF, DOCX, Markdown or TXT." });
      } else if (file.size > maxBytes) {
        added.push({ ...base, state: "error", detail: `Larger than the ${formatBytes(maxBytes)} limit.` });
      } else {
        added.push({ ...base, state: "uploading", detail: "Uploading · 0%" });
      }
    });
    setUploads((prev) => [...added, ...prev]);
    added.filter((item) => item.state === "uploading").forEach((item) => void run(item));
  }

  async function searchContents() {
    const query = filter.trim();
    if (!query) return;
    setSearching(true);
    setSearchError(null);
    try {
      const result = await request<{ query: string; results: SearchHit[] }>(`/documents/?q=${encodeURIComponent(query)}`);
      setHits({ query: result.query, results: result.results });
    } catch (error) {
      setSearchError(errorMessage(error));
    } finally {
      setSearching(false);
    }
  }

  async function remove() {
    if (!removing) return;
    try {
      await request(`/documents/${removing.id}/`, { method: "DELETE" });
      setRemoving(null);
      setActionError(null);
      library.reload();
    } catch (error) {
      setActionError(errorMessage(error));
    }
  }

  const needle = filter.trim().toLowerCase();
  const docs = (library.data ?? []).filter(
    (doc) =>
      !needle ||
      [doc.title, doc.filename, doc.owner, doc.access_summary, doc.department?.name ?? ""].some((text) => text.toLowerCase().includes(needle)),
  );

  return (
    <div className="mx-auto w-full max-w-[1000px] space-y-8 pb-8">
      <section aria-labelledby="upload-title">
        <h2 id="upload-title" className="text-[16px] font-semibold">
          Upload documents
        </h2>
        <div className="mt-3 grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragOver(false);
              addFiles(event.dataTransfer.files);
            }}
            className={`flex min-h-44 flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-5 py-8 text-center transition-colors ${
              dragOver ? "border-ink bg-raised" : "border-line-strong bg-deep/50"
            }`}
          >
            <UploadCloud className="size-6 text-ink-2" strokeWidth={1.5} />
            <div>
              <p className="text-[15px] font-medium">Drop files here</p>
              <p className="mt-0.5 text-[13px] text-ink-3">
                PDF, DOCX, Markdown or TXT · up to {formatBytes(maxBytes)} each
              </p>
            </div>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept={accepted}
              className="sr-only"
              aria-label="Choose files to upload"
              onChange={(event) => {
                addFiles(event.target.files);
                event.target.value = "";
              }}
            />
            <button type="button" onClick={() => fileRef.current?.click()} className={btnPrimary}>
              Choose files
            </button>
          </div>

          <div>
            <AccessFields boot={b} value={access} onChange={setAccess} idPrefix="upload" />
          </div>
        </div>

        {uploads.length > 0 && (
          <ul className="mt-4 grid gap-2" aria-label="Uploads">
            {uploads.map((item) => (
              <li key={item.id}>
                <Attachment state={item.state} className="w-full max-w-[34rem]">
                  <AttachmentMedia>
                    {item.state === "uploading" && <Spinner />}
                    {item.state === "processing" && <FileTextIcon />}
                    {item.state === "error" && <FileWarningIcon />}
                    {item.state === "done" && <CheckIcon />}
                  </AttachmentMedia>
                  <AttachmentContent>
                    <AttachmentTitle>{item.file.name}</AttachmentTitle>
                    <AttachmentDescription>{item.detail}</AttachmentDescription>
                  </AttachmentContent>
                  <AttachmentActions>
                    {item.state === "error" && b.limits.extensions.includes(`.${item.file.name.split(".").pop()?.toLowerCase()}`) && item.file.size <= maxBytes && (
                      <AttachmentAction aria-label={`Retry ${item.file.name}`} onClick={() => void run(item)}>
                        <RefreshCwIcon />
                      </AttachmentAction>
                    )}
                    <AttachmentAction
                      aria-label={`Dismiss ${item.file.name}`}
                      onClick={() => setUploads((prev) => prev.filter((u) => u.id !== item.id))}
                    >
                      <XIcon />
                    </AttachmentAction>
                  </AttachmentActions>
                </Attachment>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="library-title">
        <div className="flex flex-wrap items-end justify-between gap-3 pb-3">
          <div>
            <h2 id="library-title" className="text-[16px] font-semibold">
              Library
            </h2>
            <p className="text-[13px] text-ink-3">
              {library.data ? `${library.data.length} ${library.data.length === 1 ? "document" : "documents"} this persona can open` : "Loading…"}
            </p>
          </div>
          <form
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              void searchContents();
            }}
            className="flex w-full gap-2 sm:w-auto"
          >
            <div className="relative min-w-0 flex-1 sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" strokeWidth={1.5} />
              <input
                type="search"
                value={filter}
                onChange={(event) => {
                  setFilter(event.target.value);
                  setHits(null);
                }}
                aria-label="Search documents"
                placeholder="Filter, or search inside files"
                className={`${inputClass} pl-9`}
              />
            </div>
            <button type="submit" disabled={!filter.trim() || searching} className={btnSecondary}>
              {searching ? "Searching…" : "Search inside"}
            </button>
          </form>
        </div>

        {searchError && <ErrorNote>{searchError}</ErrorNote>}
        {hits && (
          <div className="mb-5 rounded-xl border border-line p-4" role="region" aria-label="Content matches">
            <p className="text-[13px] font-medium">
              {hits.results.length ? `Matches inside files for “${hits.query}”` : `Nothing in permitted files matches “${hits.query}”`}
            </p>
            <ul className="mt-2 divide-y divide-line">
              {hits.results.map((hit) => (
                <li key={hit.document_id} className="py-2.5">
                  <p className="text-[14px] font-medium">
                    {hit.title}
                    {hit.page ? <span className="ml-2 text-[12px] font-normal text-ink-3">p. {hit.page}</span> : null}
                  </p>
                  <p className="mt-0.5 text-[13px] leading-[20px] text-ink-2">{hit.snippet}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {library.error && <ErrorNote onRetry={library.reload}>{library.error}</ErrorNote>}
        {library.loading && !library.data && <SkeletonRows />}
        {library.data && docs.length === 0 && (
          <EmptyState title={needle ? "No documents match" : "No documents yet"}>
            {needle ? "Try a different word, or search inside files." : "Upload a file above. It is indexed as soon as the upload finishes."}
          </EmptyState>
        )}
        {docs.length > 0 && (
          <ul className="divide-y divide-line border-y border-line">
            {docs.map((doc) => (
              <li key={doc.id} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:gap-4">
                <FileText className="hidden size-4 shrink-0 text-ink-3 sm:block" strokeWidth={1.5} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-medium">{doc.title}</p>
                  <p className="mt-0.5 text-[13px] leading-[20px] text-ink-3">
                    {doc.filename} · {formatBytes(doc.size_bytes)} · {doc.chunk_count} {doc.chunk_count === 1 ? "passage" : "passages"}
                  </p>
                  <p className="text-[13px] leading-[20px] text-ink-3">
                    {doc.owner} · {formatDateTime(doc.created_at)}
                  </p>
                  <p className="mt-1 text-[13px] text-ink-2">
                    <span className="font-medium">{doc.access_mode === "rbac" ? "Role-based" : "Admin-defined"}:</span> {doc.access_summary}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {doc.can_edit && (
                    <button type="button" onClick={() => setEditing(doc)} className={btnSecondary}>
                      Access
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => downloadDocument(doc.id, doc.filename, persona).catch((e) => setActionError(errorMessage(e)))}
                    className={btnSecondary}
                  >
                    Download
                  </button>
                  {doc.can_delete && (
                    <button type="button" onClick={() => setRemoving(doc)} aria-label={`Delete ${doc.title}`} className={`${btnGhost} h-10`}>
                      <Trash2 className="size-4" strokeWidth={1.5} />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        {actionError && !removing && (
          <div className="mt-3">
            <ErrorNote>{actionError}</ErrorNote>
          </div>
        )}
      </section>

      <EditAccessModal
        doc={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          library.reload();
        }}
      />
      <ConfirmModal
        open={removing !== null}
        title={`Delete “${removing?.title ?? ""}”?`}
        description="The file and its indexed passages are removed. The deletion is recorded in the audit log."
        confirmLabel="Delete document"
        error={actionError}
        onConfirm={remove}
        onClose={() => {
          setRemoving(null);
          setActionError(null);
        }}
      />
    </div>
  );
}

function EditAccessModal({ doc, onClose, onSaved }: { doc: DocumentItem | null; onClose: () => void; onSaved: () => void }) {
  const { boot, request } = useWorkspace();
  const b = boot!;
  const [value, setValue] = useState<AccessValue | null>(null);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [lastDoc, setLastDoc] = useState<DocumentItem | null>(null);

  // Re-seed the form whenever a different document is opened.
  if (doc !== lastDoc) {
    setLastDoc(doc);
    if (doc) {
      setTitle(doc.title);
      setError(null);
      setValue({
        mode: doc.access_mode,
        departmentId: doc.department ? String(doc.department.id) : "",
        roles: doc.grants?.roles ?? [],
        departments: doc.grants?.departments ?? [],
        personas: doc.grants?.personas ?? [],
      });
    }
  }

  async function save() {
    if (!doc || !value) return;
    setBusy(true);
    setError(null);
    const manage = b.capabilities.upload_scope;
    const json: Record<string, unknown> = { title, access_mode: value.mode };
    if (manage) {
      json.department_id = value.mode === "rbac" && value.departmentId ? Number(value.departmentId) : value.mode === "rbac" ? null : doc.department?.id ?? null;
      json.grants = value.mode === "scope" ? { roles: value.roles, departments: value.departments, personas: value.personas } : { roles: [], departments: [], personas: [] };
    }
    try {
      await request(`/documents/${doc.id}/`, { method: "PATCH", json });
      onSaved();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={doc !== null} onClose={onClose} title="Document access" description="Changes apply immediately and are recorded in the audit log." wide>
      {doc && value && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
          className="grid gap-5"
        >
          <div className="grid gap-1.5">
            <label htmlFor="edit-title" className="text-[13px] font-medium">
              Title
            </label>
            <input id="edit-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} required className={inputClass} />
          </div>
          <AccessFields boot={b} value={value} onChange={setValue} idPrefix="edit" />
          {error && <ErrorNote>{error}</ErrorNote>}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className={btnSecondary}>
              Cancel
            </button>
            <button type="submit" disabled={busy || !title.trim()} className={btnPrimary}>
              {busy ? "Saving…" : "Save access"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
