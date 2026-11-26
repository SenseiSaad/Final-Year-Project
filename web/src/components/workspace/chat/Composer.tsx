"use client";

import { ArrowUp } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/cn";

/*
  Message box pinned to the bottom of a pane. Enter sends, Shift+Enter adds a line.
  `onSend` may return a promise; the draft is cleared unless it resolves to false.
  While `busy` the text is read-only (so focus stays put) and the button says why.
*/
export function Composer({
  id,
  label,
  placeholder,
  sendLabel = "Send",
  busyLabel = "Sending",
  busy = false,
  maxLength = 4000,
  onSend,
  className,
}: {
  id: string;
  label: string;
  placeholder: string;
  sendLabel?: string;
  busyLabel?: string;
  busy?: boolean;
  maxLength?: number;
  onSend: (text: string) => boolean | void | Promise<boolean | void>;
  className?: string;
}) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  function resize(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }

  async function submit() {
    const text = value.trim();
    if (!text || busy) return;
    const result = await onSend(text);
    if (result === false) return;
    setValue("");
    if (ref.current) ref.current.style.height = "";
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      className={className}
    >
      <div className="flex items-end gap-1.5 rounded-[16px] border border-line-strong p-1.5 transition-colors duration-150 focus-within:border-ink hover:border-ink-3 focus-within:hover:border-ink">
        <label htmlFor={id} className="sr-only">
          {label}
        </label>
        <textarea
          id={id}
          ref={ref}
          rows={1}
          value={value}
          maxLength={maxLength}
          readOnly={busy}
          aria-busy={busy}
          placeholder={placeholder}
          onChange={(event) => {
            setValue(event.target.value);
            resize(event.target);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              void submit();
            }
          }}
          className={cn(
            "max-h-40 min-h-10 min-w-0 flex-1 resize-none bg-transparent px-3 py-2.5 text-[15px] leading-[20px] text-ink placeholder:text-ink-3 focus:outline-none",
            busy && "text-ink-2",
          )}
        />
        <Button type="submit" size="icon" disabled={busy || !value.trim()} aria-label={busy ? busyLabel : sendLabel} title={busy ? busyLabel : sendLabel}>
          {busy ? <Spinner className="size-[18px]" /> : <ArrowUp className="size-[18px]" strokeWidth={1.5} />}
        </Button>
      </div>
      <p className="mt-2 hidden px-1 text-[12px] leading-[16px] text-ink-3 sm:block">Enter to send, Shift and Enter for a new line</p>
    </form>
  );
}
