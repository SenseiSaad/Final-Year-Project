"use client";

import { Check, CircleAlert } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type Toast = { id: number; message: string; tone: "ok" | "error" };
type ToastContext = { notify: (message: string, tone?: Toast["tone"]) => void };

const Context = createContext<ToastContext | null>(null);
let counter = 0;

export function useToast() {
  const value = useContext(Context);
  if (!value) throw new Error("useToast must be used inside ToastProvider");
  return value;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const notify = useCallback<ToastContext["notify"]>((message, tone = "ok") => {
    const id = ++counter;
    setToasts((current) => [...current.slice(-2), { id, message, tone }]);
    window.setTimeout(() => setToasts((current) => current.filter((t) => t.id !== id)), tone === "error" ? 7000 : 3800);
  }, []);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <Context.Provider value={value}>
      {children}
      <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-[80] flex flex-col items-center gap-2 px-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex max-w-md animate-[rise-in_320ms_var(--ease-soft)_both] items-center gap-3 rounded-[12px] border border-line-strong bg-ink px-4 py-3 text-[14px] text-on-ink shadow-window"
          >
            {toast.tone === "ok" ? <Check className="size-4 shrink-0" strokeWidth={1.5} /> : <CircleAlert className="size-4 shrink-0" strokeWidth={1.5} />}
            {toast.message}
          </div>
        ))}
      </div>
    </Context.Provider>
  );
}
