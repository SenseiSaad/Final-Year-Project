"use client";

import { Check, ChevronDown, CircleAlert, FileText, RefreshCw, Upload, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/cn";
import { errorMessage, formatBytes, uploadRequest, type Bootstrap } from "@/lib/workspace-api";

import { AccessFields, accessLabel, emptyAccess, type AccessValue } from "./AccessFields";
import type { LibraryDocument } from "./support";

type UploadState = "uploading" | "indexing" | "done" | "failed";
type UploadItem = { id: string; file: File; access: AccessValue; state: UploadState; progress: number; detail: string };

function accessPayload(access: AccessValue, manage: boolean) {
  const form: Record<string, string> = { access_mode: access.mode };
  if (manage) {
    form.department_id = access.mode === "rbac" ? access.departmentId : "";
    form.grants = JSON.stringify(access.mode === "scope" ? { roles: access.roles, departments: access.departments, personas: access.personas } : {});
  }
  return form;
}

function extensionOf(file: File) {
  return `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`;
}

/*
  One calm drop zone, the access choice for new files, and the queue of files
  being sent. Progress comes from the browser's real upload events.
*/
export function Uploader({
  boot,
  persona,
  onUploaded,
  focusRequest,
}: {
  boot: Bootstrap;
  persona: string;
  onUploaded: (doc: LibraryDocument) => void;
  /** Bumped by the page when a link asks for the upload area (?upload=1) */
  focusRequest: number;
}) {
  const [access, setAccess] = useState<AccessValue>(() => emptyAccess(boot));
  const [accessOpen, setAccessOpen] = useState(false);
  const [items, setItems] = useState<UploadItem[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const zoneRef = useRef<HTMLDivElement>(null);
  const manage = boot.capabilities.upload_scope;
  const { max_upload_bytes: maxBytes, extensions } = boot.limits;
  const typeList = extensions.map((ext) => ext.replace(".", "").toUpperCase()).join(", ");

  const patch = useCallback((id: string, update: Partial<UploadItem>) => {
    setItems((previous) => previous.map((item) => (item.id === id ? { ...item, ...update } : item)));
  }, []);

  const run = useCallback(
    async (item: UploadItem) => {
      const form = new FormData();
      form.append("file", item.file);
      Object.entries(accessPayload(item.access, manage)).forEach(([key, value]) => form.append(key, value));
      patch(item.id, { state: "uploading", progress: 0, detail: "Uploading, 0%" });
      let last = -1;
      try {
        const result = await uploadRequest<{ document: LibraryDocument }>(
          "/documents/",
          persona,
          form,
          (fraction) => {
            const percent = Math.round(fraction * 100);
            if (percent === last) return;
            last = percent;
            patch(item.id, { progress: fraction, detail: `Uploading, ${percent}%` });
          },
          () => patch(item.id, { state: "indexing", progress: 1, detail: "Extracting text and indexing" }),
        );
        const passages = result.document.chunk_count;
        patch(item.id, { state: "done", progress: 1, detail: `Indexed, ${passages} ${passages === 1 ? "passage" : "passages"}` });
        setAnnouncement(`${item.file.name} uploaded and indexed.`);
        onUploaded(result.document);
      } catch (error) {
        patch(item.id, { state: "failed", detail: errorMessage(error) });
        setAnnouncement(`${item.file.name} failed. ${errorMessage(error)}`);
      }
    },
    [manage, onUploaded, patch, persona],
  );

  function addFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    const added: UploadItem[] = [];
    Array.from(list).forEach((file) => {
      const base = { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, file, access: { ...access }, progress: 0 };
      if (!extensions.includes(extensionOf(file))) {
        added.push({ ...base, state: "failed", detail: `Unsupported type. Use ${typeList}.` });
      } else if (file.size > maxBytes) {
        added.push({ ...base, state: "failed", detail: `Larger than the ${formatBytes(maxBytes)} limit.` });
      } else {
        added.push({ ...base, state: "uploading", detail: "Uploading, 0%" });
      }
    });
    setItems((previous) => [...added, ...previous]);
    const invalid = added.filter((item) => item.state === "failed").length;
    setAnnouncement(
      `${added.length - invalid} ${added.length - invalid === 1 ? "file" : "files"} uploading${invalid ? `, ${invalid} rejected` : ""}.`,
    );
    added.filter((item) => item.state === "uploading").forEach((item) => void run(item));
  }

  // A link asked for the upload area: bring it into view and put focus on "Choose files"
  useEffect(() => {
    if (focusRequest === 0) return;
    const zone = zoneRef.current;
    zone?.scrollIntoView({ block: "center", behavior: "smooth" });
    buttonRef.current?.focus({ preventScroll: true });
    if (zone) {
      zone.dataset.flash = "true";
      const timer = window.setTimeout(() => delete zone.dataset.flash, 1800);
      return () => window.clearTimeout(timer);
    }
  }, [focusRequest]);

  return (
    <div>
      <div
        ref={zoneRef}
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragOver(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          addFiles(event.dataTransfer.files);
        }}
        className={cn(
          "flex flex-col items-start gap-4 rounded-[16px] border border-dashed px-5 py-5 transition-colors duration-150 sm:flex-row sm:items-center sm:gap-5 sm:px-6",
          dragOver ? "border-ink bg-raised" : "border-line-strong bg-transparent data-[flash=true]:border-ink data-[flash=true]:bg-raised",
        )}
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-[10px] border border-line-strong text-ink-2">
          <Upload className="size-[18px]" strokeWidth={1.5} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-medium">{dragOver ? "Release to upload" : "Drop files here"}</p>
          <p className="text-[13px] leading-[20px] text-ink-3">
            {typeList}, up to {formatBytes(maxBytes)} each. Files are indexed as soon as they arrive.
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          accept={extensions.join(",")}
          onChange={(event) => {
            addFiles(event.target.files);
            event.target.value = "";
          }}
        />
        <Button ref={buttonRef} onClick={() => inputRef.current?.click()}>
          Choose files
        </Button>
      </div>

      <div className="mt-3">
        <button
          type="button"
          onClick={() => setAccessOpen((value) => !value)}
          aria-expanded={accessOpen}
          aria-controls="upload-access"
          className="flex min-h-8 items-center gap-2 rounded-[6px] text-[13px] text-ink-2 transition-colors duration-150 hover:text-ink"
        >
          <ChevronDown className={cn("size-4 transition-transform duration-300 ease-soft", !accessOpen && "-rotate-90")} strokeWidth={1.5} />
          <span>
            Access for new files: <span className="text-ink">{accessLabel(boot, access)}</span>
          </span>
        </button>
        <div id="upload-access" inert={!accessOpen} className={cn("grid transition-[grid-template-rows] duration-300 ease-soft", accessOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
          <div className="min-h-0 overflow-hidden">
            <div className="max-w-[40rem] pb-1 pt-3">
              <AccessFields boot={boot} value={access} onChange={setAccess} idPrefix="upload" />
            </div>
          </div>
        </div>
      </div>

      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {items.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h3 className="text-[14px] font-medium">Uploads</h3>
            {items.some((item) => item.state === "done" || item.state === "failed") && (
              <button
                type="button"
                onClick={() => setItems((previous) => previous.filter((item) => item.state === "uploading" || item.state === "indexing"))}
                className="rounded-[6px] px-2 py-1 text-[13px] text-ink-3 transition-colors duration-150 hover:text-ink"
              >
                Clear finished
              </button>
            )}
          </div>
          <ul className="grid grid-cols-1 gap-2" aria-label="Uploads">
            {items.map((item) => {
              const retryable = item.state === "failed" && extensions.includes(extensionOf(item.file)) && item.file.size <= maxBytes;
              return (
                <li key={item.id} className="animate-[rise-in_320ms_var(--ease-soft)_both] overflow-hidden rounded-[12px] border border-line">
                  <div className="flex min-h-14 items-center gap-3 px-4 py-2">
                    <span className={cn("grid size-8 shrink-0 place-items-center", item.state === "failed" ? "text-danger" : item.state === "done" ? "text-ok" : "text-ink-2")}>
                      {item.state === "uploading" || item.state === "indexing" ? (
                        <Spinner className="size-4" />
                      ) : item.state === "failed" ? (
                        <CircleAlert className="size-4" strokeWidth={1.5} />
                      ) : (
                        <Check className="size-4" strokeWidth={1.5} />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 truncate text-[14px]">
                        <FileText className="size-4 shrink-0 text-ink-3" strokeWidth={1.5} />
                        <span className="truncate">{item.file.name}</span>
                        <span className="shrink-0 text-[12px] text-ink-3 tabular-nums">{formatBytes(item.file.size)}</span>
                      </p>
                      <p className={cn("truncate text-[13px] tabular-nums", item.state === "failed" ? "text-danger" : "text-ink-3")}>{item.detail}</p>
                    </div>
                    {retryable && (
                      <Button variant="ghost" size="sm" aria-label={`Retry ${item.file.name}`} onClick={() => void run(item)}>
                        <RefreshCw className="size-4" strokeWidth={1.5} />
                        Retry
                      </Button>
                    )}
                    <button
                      type="button"
                      aria-label={`Dismiss ${item.file.name}`}
                      onClick={() => setItems((previous) => previous.filter((entry) => entry.id !== item.id))}
                      className="grid size-8 shrink-0 place-items-center rounded-[8px] text-ink-3 transition-colors duration-150 hover:bg-hover hover:text-ink"
                    >
                      <X className="size-4" strokeWidth={1.5} />
                    </button>
                  </div>
                  {(item.state === "uploading" || item.state === "indexing") && (
                    <div
                      role="progressbar"
                      aria-label={`Uploading ${item.file.name}`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(item.progress * 100)}
                      className="h-0.5 bg-raised"
                    >
                      <div className="h-full origin-left bg-ink transition-transform duration-150 ease-linear" style={{ transform: `scaleX(${item.progress})` }} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
