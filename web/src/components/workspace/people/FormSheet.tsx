"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { X } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { errorMessage } from "@/lib/workspace-api";

gsap.registerPlugin(useGSAP);

/*
  Add and edit forms live in a right-hand sheet from 640px up and in a centred modal
  below that. It is built on Modal, so focus trap, Escape and focus return come with it.
  The sheet slides with transform and opacity only.
*/
export function FormSheet({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      label={title}
      className="max-sm:w-[calc(100vw-24px)] sm:inset-y-0 sm:left-auto sm:right-0 sm:m-0 sm:h-dvh sm:w-[480px] sm:transform-none!"
    >
      <Panel title={title} description={description} onClose={onClose}>
        {children}
      </Panel>
    </Modal>
  );
}

function Panel({ title, description, onClose, children }: { title: string; description?: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(min-width: 640px) and (prefers-reduced-motion: no-preference)", () => {
        gsap.from(ref.current, { x: 40, opacity: 0, duration: 0.45, ease: "power3.out", clearProps: "transform,opacity" });
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <div
      ref={ref}
      className="flex max-h-[calc(100dvh-24px)] flex-col overflow-hidden rounded-[20px] border border-line-strong bg-surface text-ink shadow-window sm:h-dvh sm:max-h-none sm:rounded-[20px_0_0_20px] sm:border-0 sm:border-l"
    >
      <div className="flex items-start justify-between gap-4 px-5 pb-4 pt-5">
        <div className="min-w-0">
          <h2 className="text-[18px] font-medium leading-[24px]">{title}</h2>
          {description && <p className="mt-1 text-[14px] leading-[22px] text-ink-2">{description}</p>}
        </div>
        <Button variant="ghost" size="icon" aria-label="Close" onClick={onClose} className="-mr-2 -mt-2">
          <X className="size-[18px]" strokeWidth={1.5} />
        </Button>
      </div>
      {children}
    </div>
  );
}

/* A form inside the sheet: scrolling body, fixed footer */
export function SheetForm({ onSubmit, children, footer }: { onSubmit: () => void; children: ReactNode; footer: ReactNode }) {
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div data-lenis-prevent className="grid min-h-0 flex-1 content-start gap-5 overflow-y-auto overscroll-contain px-5 pb-5">
        {children}
      </div>
      <div className="flex justify-end gap-2 border-t border-line px-5 py-4">{footer}</div>
    </form>
  );
}

/* Submit state shared by the three forms */
export function useSubmit(onDone: () => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      onDone();
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, submit };
}

/*
  The API returns one sentence per failure. If it names a field, attach it to that
  field; anything else stays a note above the buttons.
*/
export function routeError<K extends string>(message: string | null, rules: Record<K, RegExp>): { field: K | null; message: string | null } {
  if (!message) return { field: null, message: null };
  const field = (Object.keys(rules) as K[]).find((key) => rules[key].test(message)) ?? null;
  return { field, message };
}

/* A checkbox row with a label and an optional description */
export function CheckRow({
  checked,
  onChange,
  disabled,
  label,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label: string;
  description?: string;
}) {
  return (
    <li>
      <label className="flex cursor-pointer items-start gap-3 rounded-[8px] px-3 py-2.5 transition-colors duration-150 hover:bg-hover has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
          className="mt-0.5 size-4 shrink-0 accent-ink"
        />
        <span className="min-w-0">
          <span className="block text-[14px] leading-5">{label}</span>
          {description && <span className="mt-0.5 block text-[13px] leading-5 text-ink-3">{description}</span>}
        </span>
      </label>
    </li>
  );
}

export function CheckGroup({ legend, hint, children }: { legend: string; hint?: string; children: ReactNode }) {
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-2 text-[14px] text-ink">{legend}</legend>
      <ul className="grid rounded-[12px] border border-line-strong p-1">{children}</ul>
      {hint && <p className="text-[12px] leading-5 text-ink-3">{hint}</p>}
    </fieldset>
  );
}
