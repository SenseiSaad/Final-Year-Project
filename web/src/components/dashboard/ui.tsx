"use client";

import { AlertCircle, X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";

export const btnPrimary =
  "inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-btn px-4 text-[14px] font-medium text-on-btn transition-[background-color,transform] duration-150 hover:bg-btn-hover active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50";
export const btnSecondary =
  "inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-line-strong px-4 text-[14px] font-medium text-ink transition-colors duration-150 hover:bg-raised disabled:pointer-events-none disabled:opacity-50";
export const btnGhost =
  "inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 text-[13px] font-medium text-ink-2 transition-colors duration-150 hover:bg-raised hover:text-ink disabled:pointer-events-none disabled:opacity-50";
export const inputClass =
  "h-10 w-full rounded-lg border border-line-strong bg-surface px-3 text-[14px] text-ink placeholder:text-ink-3 disabled:opacity-60";

export function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-ink">
        {label}
      </label>
      {children}
      {hint && <p className="text-[12px] leading-[18px] text-ink-3">{hint}</p>}
    </div>
  );
}

export function ErrorNote({ children, onRetry }: { children: ReactNode; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-line-strong bg-deep px-3.5 py-3 text-[14px] text-ink">
      <AlertCircle className="mt-0.5 size-4 shrink-0" strokeWidth={1.5} />
      <p className="min-w-0 flex-1 leading-[21px]">{children}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="shrink-0 font-medium underline underline-offset-2">
          Retry
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mx-auto max-w-[26rem] py-12 text-center">
      <p className="text-[16px] font-medium text-ink">{title}</p>
      {children && <p className="mt-1.5 text-[14px] leading-[22px] text-ink-3">{children}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function SkeletonRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="divide-y divide-line border-y border-line" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="py-4">
          <div className="h-4 w-1/3 animate-pulse rounded bg-raised" />
          <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-raised" />
        </div>
      ))}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className={`m-auto max-h-[90dvh] w-[calc(100vw-1.5rem)] overflow-y-auto overscroll-contain rounded-xl border border-line-strong bg-surface p-0 text-ink backdrop:bg-black/50 ${
        wide ? "max-w-[40rem]" : "max-w-[30rem]"
      }`}
    >
      {open && (
        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 id={titleId} className="text-[18px] font-medium leading-tight">
                {title}
              </h2>
              {description && <p className="mt-1.5 text-[14px] leading-[22px] text-ink-3">{description}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mr-2 -mt-1.5 grid size-9 shrink-0 place-items-center rounded-lg text-ink-2 hover:bg-raised hover:text-ink"
            >
              <X className="size-4" strokeWidth={1.5} />
            </button>
          </div>
          <div className="mt-5">{children}</div>
        </div>
      )}
    </dialog>
  );
}

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel,
  busy,
  error,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  busy?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} description={description}>
      {error && (
        <div className="mb-4">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onClose} className={btnSecondary}>
          Cancel
        </button>
        <button type="button" onClick={onConfirm} disabled={busy} className={btnPrimary}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

export function Avatar({ name, className = "size-8" }: { name: string; className?: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-full bg-raised text-[12px] font-medium text-ink ${className}`}
    >
      {initials || "U"}
    </span>
  );
}

export function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-6 items-center rounded-md border border-line px-2 text-[12px] font-medium text-ink-2">
      {children}
    </span>
  );
}
