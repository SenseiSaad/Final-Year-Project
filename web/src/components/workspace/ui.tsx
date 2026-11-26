"use client";

import { CircleAlert, type LucideIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/workspace-api";

/* Shared building blocks for every workspace screen */

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="font-serif text-[34px] leading-[1.1] tracking-[-0.02em] sm:text-[40px]">{title}</h1>
        {description && <p className="mt-2 max-w-[44rem] text-[15px] leading-[24px] text-ink-2">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-[16px] border border-line-strong bg-surface", className)} {...props} />;
}

export function EmptyState({
  icon: Icon,
  title,
  text,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  text?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid place-items-center px-6 py-14 text-center", className)}>
      {Icon && (
        <span className="grid size-11 place-items-center rounded-full border border-line-strong text-ink-2">
          <Icon className="size-5" strokeWidth={1.5} />
        </span>
      )}
      <p className="mt-4 text-[16px] font-medium">{title}</p>
      {text && <p className="mt-1.5 max-w-[26rem] text-[14px] leading-[22px] text-ink-2">{text}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center gap-3 rounded-[12px] bg-danger-soft px-4 py-3 text-[14px] text-danger">
      <CircleAlert className="size-4 shrink-0" strokeWidth={1.5} />
      <span className="min-w-0 flex-1">{message}</span>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span aria-hidden="true" className={cn("grid size-8 shrink-0 place-items-center rounded-full bg-raised font-mono text-[11px] text-ink-2", className)}>
      {initials(name)}
    </span>
  );
}

/* Quiet outlined tag for a status or a count */
export function Tag({ children, tone = "neutral", className }: { children: ReactNode; tone?: "neutral" | "strong" | "danger"; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-[6px] border px-2 text-[12px] leading-none",
        tone === "neutral" && "border-line-strong text-ink-2",
        tone === "strong" && "border-ink bg-ink text-on-ink",
        tone === "danger" && "border-danger/40 text-danger",
        className,
      )}
    >
      {children}
    </span>
  );
}

/* Loading placeholder: still blocks, no shimmer */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("rounded-[8px] bg-raised", className)} />;
}

export function ConfirmModal({
  open,
  title,
  text,
  confirmLabel = "Delete",
  danger = true,
  busy,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  text: string;
  confirmLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} label={title} className="top-[18vh] mt-0 w-[min(440px,calc(100vw-24px))]">
      <div className="rounded-[18px] border border-line-strong bg-surface p-6 shadow-window">
        <h2 className="text-[18px] font-medium">{title}</h2>
        <p className="mt-2 text-[14px] leading-[22px] text-ink-2">{text}</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant={danger ? "danger" : "primary"} loading={busy} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/* Padded, centred page body for ordinary screens */
export function Page({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("mx-auto w-full max-w-[1240px] p-5 sm:p-8 lg:p-10", className)} {...props} />;
}
