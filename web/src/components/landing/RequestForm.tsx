"use client";

import gsap from "gsap";
import { Check, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";

import { requestAccess, type RequestState } from "@/app/actions";
import { TextMorph } from "@/components/core/text-morph";

const initial: RequestState = { status: "idle", errors: {}, values: {} };

const teamSizes = [
  { value: "1-10", label: "1 to 10 people" },
  { value: "11-50", label: "11 to 50 people" },
  { value: "51-200", label: "51 to 200 people" },
  { value: "200+", label: "More than 200 people" },
];

const inputClass =
  "h-11 w-full rounded-[10px] border border-line-strong bg-bg px-3.5 text-[15px] text-ink placeholder:text-ink-3 transition-[border-color,box-shadow] duration-150 focus:border-accent focus:outline-none focus:shadow-[0_0_0_3px_var(--accent-soft)] aria-[invalid=true]:border-danger";

function Field({
  id,
  label,
  error,
  optional,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <label htmlFor={id} className="flex items-baseline justify-between text-[14px] text-ink">
        {label}
        {optional && <span className="text-[12px] text-ink-3">Optional</span>}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-[13px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function RequestForm({
  onNameChange,
  onSuccess,
}: {
  onNameChange?: (name: string) => void;
  onSuccess?: () => void;
} = {}) {
  const [state, action, pending] = useActionState(requestAccess, initial);
  const [plan, setPlan] = useState("pilot");
  const done = useRef<HTMLDivElement>(null);
  const v = state.values;
  const e = state.errors;

  useEffect(() => {
    const select = (event: Event) => setPlan((event as CustomEvent<string>).detail);
    window.addEventListener("plan:select", select);
    return () => window.removeEventListener("plan:select", select);
  }, []);

  useEffect(() => {
    if (state.status === "ok" && done.current) {
      done.current.focus();
      gsap.fromTo(done.current, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: "power3.out" });
      onSuccess?.();
    }
  }, [state.status, onSuccess]);

  if (state.status === "ok") {
    return (
      <div ref={done} tabIndex={-1} className="grid min-h-[420px] place-content-center justify-items-center text-center outline-none">
        <span className="grid size-11 place-items-center rounded-full bg-accent-soft text-accent">
          <Check className="size-5" strokeWidth={1.5} />
        </span>
        <h3 className="mt-6 text-[20px] font-medium">Request received</h3>
        <p className="mt-2 max-w-[22rem] text-[15px] leading-[24px] text-ink-2">
          Thank you. We will reply to the email address you gave us.
        </p>
      </div>
    );
  }

  const err = (field: string) => (e[field] ? { "aria-invalid": true, "aria-describedby": `${field}-error` } : {});

  return (
    <form action={action} noValidate className="grid gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="name" label="Full name" error={e.name}>
          <input
            id="name"
            name="name"
            autoComplete="name"
            defaultValue={v.name}
            onChange={(event) => onNameChange?.(event.target.value)}
            className={inputClass}
            {...err("name")}
          />
        </Field>
        <Field id="email" label="Work email" error={e.email}>
          <input id="email" name="email" type="email" autoComplete="email" defaultValue={v.email} className={inputClass} {...err("email")} />
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="organisation" label="Organisation" error={e.organisation}>
          <input id="organisation" name="organisation" autoComplete="organization" defaultValue={v.organisation} className={inputClass} {...err("organisation")} />
        </Field>
        <Field id="team_size" label="Team size" error={e.team_size}>
          <select id="team_size" name="team_size" defaultValue={v.team_size ?? ""} className={`${inputClass} appearance-none bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-10`} style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%237a8296' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }} {...err("team_size")}>
            <option value="" disabled>
              Choose a size
            </option>
            {teamSizes.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <fieldset className="grid gap-2">
        <legend className="mb-2 text-[14px] text-ink">Interested in</legend>
        <div className="grid grid-cols-2 gap-1 rounded-[10px] bg-raised p-1">
          {[
            { value: "pilot", label: "Pilot" },
            { value: "team", label: "Team" },
          ].map((option) => (
            <label
              key={option.value}
              className={`flex h-9 cursor-pointer items-center justify-center rounded-lg text-[14px] transition-[background-color,color,box-shadow] duration-150 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent ${
                plan === option.value ? "bg-surface text-ink shadow-[0_0_0_1px_var(--line)]" : "text-ink-2 hover:text-ink"
              }`}
            >
              <input
                type="radio"
                name="plan"
                value={option.value}
                checked={plan === option.value}
                onChange={() => setPlan(option.value)}
                className="sr-only"
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      <Field id="note" label="What would you use it for" optional>
        <textarea
          id="note"
          name="note"
          rows={3}
          maxLength={1000}
          defaultValue={v.note}
          placeholder="The documents you want to search, or the problem you want to solve"
          className={`${inputClass} h-auto resize-y py-3 leading-[22px]`}
        />
      </Field>

      {/* Hidden from people; most spam bots fill it in */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 overflow-hidden">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="mt-2 flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[13px] text-ink-3">
          By sending this you agree to our{" "}
          <Link href="/privacy" className="text-ink-2 underline underline-offset-[3px] hover:text-ink">
            Privacy policy
          </Link>
        </p>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-[10px] bg-btn px-5 text-[15px] font-medium text-on-btn transition-[background-color,transform,opacity] duration-150 hover:bg-btn-hover active:scale-[0.98] disabled:opacity-70"
        >
          {pending && <LoaderCircle className="size-4 animate-spin" strokeWidth={1.5} />}
          <TextMorph as="span">{pending ? "Sending…" : "Send request"}</TextMorph>
        </button>
      </div>
      {state.message && (
        <p role="alert" className="rounded-lg bg-danger-soft px-3.5 py-2.5 text-[14px] text-danger">
          {state.message}
        </p>
      )}
    </form>
  );
}
