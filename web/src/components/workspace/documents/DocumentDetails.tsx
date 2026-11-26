"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { Download, Pencil, Trash2, X } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Tag, ErrorNote } from "@/components/workspace/ui";
import { errorMessage, formatBytes, formatDateTime, type Bootstrap } from "@/lib/workspace-api";

import { AccessFields, type AccessValue } from "./AccessFields";
import { accessModeLabel, type LibraryDocument } from "./support";

gsap.registerPlugin(useGSAP);

type Request = <T>(path: string, options?: { method?: "GET" | "POST" | "PATCH" | "DELETE"; json?: unknown }) => Promise<T>;

function seed(doc: LibraryDocument): AccessValue {
  return {
    mode: doc.access_mode,
    departmentId: doc.department ? String(doc.department.id) : "",
    roles: doc.grants?.roles ?? [],
    departments: doc.grants?.departments ?? [],
    personas: doc.grants?.personas ?? [],
  };
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[104px_minmax(0,1fr)] gap-3 py-2.5 text-[14px]">
      <dt className="text-ink-3">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

/*
  Details of one document: its access settings, passages, hash, download and
  delete. Editing swaps the read-only view for the same fields used on upload.
  The parent keys this by document id, so state resets when another is chosen.
*/
export function DocumentDetails({
  doc,
  boot,
  request,
  animate,
  onClose,
  onSaved,
  onDownload,
  onDelete,
}: {
  doc: LibraryDocument;
  boot: Bootstrap;
  request: Request;
  /** Slide in on mount (the inline panel); the sheet is animated by its dialog instead */
  animate: boolean;
  onClose: () => void;
  onSaved: (doc: LibraryDocument) => void;
  onDownload: (doc: LibraryDocument) => Promise<void>;
  onDelete: (doc: LibraryDocument) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState<AccessValue>(() => seed(doc));
  const [title, setTitle] = useState(doc.title);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useGSAP(
    () => {
      if (!animate) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(root.current, { x: 16, opacity: 0, duration: 0.4, ease: "power3.out", clearProps: "transform,opacity" });
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  async function download() {
    setError(null);
    try {
      await onDownload(doc);
    } catch (failure) {
      setError(errorMessage(failure));
    }
  }

  async function save() {
    setBusy(true);
    setError(null);
    const json: Record<string, unknown> = { title: title.trim(), access_mode: value.mode };
    if (boot.capabilities.upload_scope) {
      json.department_id = value.mode === "rbac" && value.departmentId ? Number(value.departmentId) : value.mode === "rbac" ? null : (doc.department?.id ?? null);
      json.grants = value.mode === "scope" ? { roles: value.roles, departments: value.departments, personas: value.personas } : { roles: [], departments: [], personas: [] };
    }
    try {
      const result = await request<{ document: LibraryDocument }>(`/documents/${doc.id}/`, { method: "PATCH", json });
      setEditing(false);
      onSaved(result.document);
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div ref={root} className="grid gap-5">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="break-words text-[16px] font-medium leading-[24px]">{doc.title}</h2>
          <p className="break-all font-mono text-[12px] leading-[20px] text-ink-3">{doc.filename}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close details"
          className="grid size-8 shrink-0 place-items-center rounded-[8px] text-ink-3 transition-colors duration-150 hover:bg-hover hover:text-ink"
        >
          <X className="size-4" strokeWidth={1.5} />
        </button>
      </div>

      {editing ? (
        <form
          className="grid gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <Field htmlFor="edit-title" label="Title">
            <Input id="edit-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={200} required />
          </Field>
          <AccessFields boot={boot} value={value} onChange={setValue} idPrefix="edit" />
          <p className="text-[13px] text-ink-3">Changes apply immediately and are recorded in the audit log.</p>
          {error && <ErrorNote message={error} />}
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setEditing(false);
                setError(null);
                setTitle(doc.title);
                setValue(seed(doc));
              }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={busy} disabled={!title.trim()}>
              Save access
            </Button>
          </div>
        </form>
      ) : (
        <>
          <dl className="divide-y divide-line border-y border-line">
            <Row label="Access">
              <span className="flex flex-wrap items-center gap-2">
                <Tag>{accessModeLabel(doc.access_mode)}</Tag>
              </span>
              <span className="mt-1.5 block text-ink-2">{doc.access_summary}</span>
            </Row>
            <Row label="Department">{doc.department?.name ?? "Company-wide"}</Row>
            <Row label="Owner">{doc.owner}</Row>
            <Row label="Added">
              <span className="tabular-nums">{formatDateTime(doc.created_at)}</span>
            </Row>
            <Row label="Size">
              <span className="tabular-nums">{formatBytes(doc.size_bytes)}</span>
            </Row>
            <Row label="Passages">
              <span className="tabular-nums">
                {doc.chunk_count} {doc.chunk_count === 1 ? "passage" : "passages"} indexed
              </span>
            </Row>
            {doc.sha256 && (
              <Row label="SHA-256">
                <span className="break-all font-mono text-[12px] leading-[20px] text-ink-2">{doc.sha256}</span>
              </Row>
            )}
          </dl>
          {error && <ErrorNote message={error} />}
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => void download()}>
              <Download className="size-4" strokeWidth={1.5} />
              Download
            </Button>
            {doc.can_edit && (
              <Button variant="secondary" onClick={() => setEditing(true)}>
                <Pencil className="size-4" strokeWidth={1.5} />
                Edit access
              </Button>
            )}
            {doc.can_delete && (
              <Button variant="danger" onClick={() => onDelete(doc)}>
                <Trash2 className="size-4" strokeWidth={1.5} />
                Delete
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
