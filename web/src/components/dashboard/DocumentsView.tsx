"use client";

import { FileText, Pin, Trash2, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";

import type { Facts } from "@/lib/facts";

import type { DocVisibility, RoleProfile, WorkspaceDoc } from "./dashboardData";
import { FileSearch } from "./FileSearch";

type Props = {
  isAdmin: boolean;
  profile: RoleProfile;
  facts: Facts;
  docs: WorkspaceDoc[];
  visibleDocs: WorkspaceDoc[];
  pinnedOkfCount: number;
  okfNotice: string;
  onUploadFile: (file: File, visibility: DocVisibility) => void;
  onToggleOkf: (id: string) => void;
  onToggleShare: (id: string) => void;
  onDeleteDoc: (id: string) => void;
};

export function DocumentsView({
  isAdmin,
  profile,
  facts,
  docs,
  visibleDocs,
  pinnedOkfCount,
  okfNotice,
  onUploadFile,
  onToggleOkf,
  onToggleShare,
  onDeleteDoc,
}: Props) {
  const [visibility, setVisibility] = useState<DocVisibility>(isAdmin ? "Everyone" : "Department");
  const [query, setQuery] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = visibleDocs.filter((d) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return d.name.toLowerCase().includes(q) || d.department.toLowerCase().includes(q) || d.owner.toLowerCase().includes(q);
  });

  function processFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    const file = list[0];
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!["txt", "md", "pdf", "docx"].includes(ext)) {
      setUploadStatus("Unsupported file type. Use .txt, .md, .pdf or .docx.");
      return;
    }
    if (file.size > facts.maxFileMb * 1024 * 1024) {
      setUploadStatus(`File exceeds ${facts.maxFileMb} MB limit.`);
      return;
    }
    onUploadFile(file, visibility);
    setUploadStatus(`Indexed ${file.name} (${visibility}).`);
  }

  return (
    <div className="mx-auto w-full max-w-[1040px] space-y-8">
      {/* Functional dropzone only — no outer card wrapper */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[14px] text-ink-2">
            Add PDF, Word, Markdown or plain text up to {facts.maxFileMb} MB ({facts.maxDocs} per user).
          </p>
          <div className="flex items-center gap-2.5">
            <label htmlFor="doc-visibility" className="text-[13px] font-medium text-ink-3">
              Visibility
            </label>
            <select
              id="doc-visibility"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as DocVisibility)}
              className="h-9 rounded-lg border border-line-strong bg-surface px-3 text-[14px] text-ink"
            >
              <option value="Everyone">Everyone</option>
              <option value="Department">Department ({profile.department})</option>
              <option value="Private">Only me (Private)</option>
            </select>
          </div>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            processFiles(e.dataTransfer.files);
          }}
          className={`mt-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-dashed px-6 py-5 transition-colors duration-150 ${
            dragOver ? "border-ink bg-raised" : "border-line-strong bg-deep/50"
          }`}
        >
          <div className="flex items-center gap-3.5">
            <UploadCloud className="size-5 shrink-0 text-ink-2" strokeWidth={1.5} />
            <div>
              <p className="text-[15px] font-medium text-ink">Drop a file here to index locally</p>
              <p className="text-[13px] text-ink-3">Supports .pdf, .docx, .md and .txt</p>
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.md,.pdf,.docx"
            className="hidden"
            onChange={(e) => {
              processFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex h-9 items-center rounded-lg bg-btn px-4 text-[14px] font-medium text-on-btn transition-[background-color,transform] duration-150 hover:bg-btn-hover active:scale-[0.98]"
          >
            Choose file
          </button>
        </div>

        {uploadStatus && <p className="mt-3 text-[13px] font-medium text-ink">{uploadStatus}</p>}
      </div>

      {/* Open frameless document list */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
          <div>
            <h2 className="text-[16px] font-semibold text-ink">Document library</h2>
            <p className="text-[13px] text-ink-3">
              {isAdmin
                ? `${docs.length} total files · OKF ${pinnedOkfCount}/${facts.okfMaxDocs} pinned`
                : `${visibleDocs.length} permitted files · ${docs.length - visibleDocs.length} restricted hidden`}
            </p>
          </div>
          <FileSearch value={query} onChange={setQuery} />
        </div>

        {okfNotice && <p className="pb-3 text-[13px] font-medium text-ink">{okfNotice}</p>}

        <ul className="divide-y divide-line border-y border-line">
          {filtered.map((doc) => (
            <li
              key={doc.id}
              className="flex flex-wrap items-center gap-3 px-2 py-4 transition-colors duration-150 hover:bg-deep/50"
            >
              <FileText className="size-4 shrink-0 text-ink-3" strokeWidth={1.5} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-[15px] font-medium text-ink">{doc.name}</span>
                  {doc.isOkf && (
                    <span className="inline-flex items-center gap-1 rounded bg-btn px-2 py-0.5 text-[11px] font-medium text-on-btn">
                      <Pin className="size-3" strokeWidth={1.5} />
                      OKF
                    </span>
                  )}
                </div>
                <p className="text-[13px] text-ink-3">
                  {doc.owner} · {doc.department} · {doc.sizeLabel} · {doc.chunks} chunks · {doc.updated}
                </p>
              </div>
              <span className="text-[13px] text-ink-3">{doc.visibility}</span>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => onToggleOkf(doc.id)}
                  className={`h-8 rounded-lg px-3 text-[13px] font-medium transition-colors ${
                    doc.isOkf
                      ? "bg-btn text-on-btn hover:bg-btn-hover"
                      : "border border-line-strong text-ink hover:bg-raised"
                  }`}
                >
                  {doc.isOkf ? "Unpin OKF" : "Pin OKF"}
                </button>
              )}
              {!isAdmin && doc.employeeAccess === "Own" && (
                <button
                  type="button"
                  onClick={() => onToggleShare(doc.id)}
                  className="h-8 rounded-lg border border-line-strong px-3 text-[13px] font-medium text-ink hover:bg-raised"
                >
                  {doc.visibility === "Private" ? "Share" : "Revoke"}
                </button>
              )}
              {(isAdmin || doc.employeeAccess === "Own") && doc.id.startsWith("upload-") && (
                <button
                  type="button"
                  onClick={() => onDeleteDoc(doc.id)}
                  aria-label={`Delete ${doc.name}`}
                  className="grid size-8 place-items-center rounded-lg text-ink-3 hover:bg-raised hover:text-ink"
                >
                  <Trash2 className="size-4" strokeWidth={1.5} />
                </button>
              )}
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="py-8 text-center text-[14px] text-ink-3">No matching documents.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
