"use client";

import gsap from "gsap";
import { ShieldAlert, ShieldCheck, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { useReducedMotion } from "@/components/motion/useReducedMotion";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Field";
import { Spinner } from "@/components/ui/Spinner";
import { useResource } from "@/hooks/useResource";
import { errorMessage, type AuditPerson } from "@/lib/workspace-api";

import { Card, EmptyState, ErrorNote, Page, PageHeader, Skeleton } from "../ui";
import { useWorkspace } from "../WorkspaceContext";
import { CopyButton } from "./CopyButton";
import { EventFeed } from "./EventFeed";
import { PeopleTable } from "./PeopleTable";

type Verify = { valid: boolean; events_checked: number; first_invalid_sequence: number | null; head_hash: string };
type Summary = { people: AuditPerson[]; total_events: number; head_hash: string | null };
type Outcome = Verify & { visible: boolean };

const filters = [
  { value: "", label: "All activity" },
  { value: "chat.", label: "Questions and chats" },
  { value: "document.", label: "Documents" },
  { value: "team.", label: "Team chat" },
  { value: "department.", label: "Departments" },
  { value: "member.", label: "People" },
  { value: "role.", label: "Roles" },
  { value: "audit.", label: "Audit access" },
];

const description = "Every action in the workspace is written to a hash chain. Verify it to recompute each hash and confirm nothing was changed.";

export function AuditView() {
  const { boot } = useWorkspace();
  if (!boot) {
    return (
      <Page>
        <PageHeader title="Audit log" description={description} />
        <Card className="mt-8 p-2" aria-busy="true">
          <Skeleton className="h-20" />
        </Card>
      </Page>
    );
  }
  if (!boot.capabilities.view_audit) {
    return (
      <Page>
        <PageHeader title="Audit log" />
        <Card className="mt-8">
          <EmptyState icon={ShieldAlert} title="The audit log is restricted" text="Your role does not hold the audit permission." />
        </Card>
      </Page>
    );
  }
  return <Ledger />;
}

function Ledger() {
  const { request } = useWorkspace();
  const reduced = useReducedMotion();
  const [version, setVersion] = useState(0);
  const [person, setPerson] = useState<AuditPerson | null>(null);
  const [type, setType] = useState("");
  const [phase, setPhase] = useState<"idle" | "running">("idle");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const ledgerRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const mmRef = useRef<gsap.MatchMedia | null>(null);

  const loadSummary = useCallback((signal: AbortSignal) => request<Summary>(`/audit/summary/?v=${version}`, { signal }), [request, version]);
  const summary = useResource(loadSummary);

  useEffect(() => () => mmRef.current?.revert(), []);

  /* A quick check-down over the rows on screen, 20ms apart, then the verdict */
  function playChecks(result: Verify) {
    const bad = result.first_invalid_sequence;
    const rows = Array.from(ledgerRef.current?.querySelectorAll<HTMLElement>("[data-row][data-seq]") ?? []);
    const ticks = rows
      .filter((row) => bad === null || Number(row.dataset.seq) < bad)
      .map((row) => row.querySelector<SVGElement>("[data-tick]"))
      .filter((tick): tick is SVGElement => tick !== null);
    const visible = bad !== null && rows.some((row) => Number(row.dataset.seq) === bad);

    const finish = () => {
      setOutcome({ ...result, visible });
      setPhase("idle");
      setVersion((value) => value + 1);
    };

    mmRef.current?.revert();
    const mm = gsap.matchMedia();
    mmRef.current = mm;
    mm.add({ motion: "(prefers-reduced-motion: no-preference)" }, (context) => {
      if (!context.conditions?.motion || ticks.length === 0) {
        gsap.set(ticks, { opacity: 1 });
        finish();
        return;
      }
      gsap.fromTo(
        ticks,
        { opacity: 0, scale: 0.5, transformOrigin: "50% 50%" },
        { opacity: 1, scale: 1, duration: 0.2, ease: "power2.out", stagger: 0.02, onComplete: finish },
      );
    });
  }

  async function verify() {
    mmRef.current?.revert();
    setPhase("running");
    setOutcome(null);
    setVerifyError(null);
    try {
      playChecks(await request<Verify>("/audit/verify/"));
    } catch (failure) {
      setVerifyError(errorMessage(failure));
      setPhase("idle");
    }
  }

  function openPerson(next: AuditPerson) {
    setPerson(next);
    setOutcome(null);
    requestAnimationFrame(() => {
      headingRef.current?.focus({ preventScroll: true });
      headingRef.current?.scrollIntoView({ block: "start", behavior: reduced ? "auto" : "smooth" });
    });
  }

  const head = summary.data?.head_hash ?? null;
  const total = summary.data?.total_events;
  const broken = outcome && !outcome.valid ? outcome.first_invalid_sequence : null;

  return (
    <Page>
      <PageHeader title="Audit log" description={description} />

      <Card className="mt-8 p-5">
        <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4">
          <dl className="flex flex-wrap gap-x-10 gap-y-3">
            <div>
              <dt className="text-[13px] text-ink-3">Entries</dt>
              <dd className="mt-1 text-[18px] font-medium tabular-nums">{total ?? <span className="text-ink-3">…</span>}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-[13px] text-ink-3">Head hash</dt>
              <dd className="mt-1 flex h-7 items-center gap-1">
                {head ? (
                  <>
                    <code className="font-mono text-[13px]" title={head}>
                      {head.slice(0, 10)}…{head.slice(-8)}
                    </code>
                    <CopyButton value={head} label="Copy head hash" />
                  </>
                ) : (
                  <span className="text-[14px] text-ink-3">{summary.data ? "None yet" : "…"}</span>
                )}
              </dd>
            </div>
          </dl>
          <Button onClick={verify} loading={phase === "running"}>
            <ShieldCheck className="size-[18px]" strokeWidth={1.5} />
            Verify chain
          </Button>
        </div>

        <div role="status" aria-live="polite">
          {phase === "running" && (
            <p className="mt-4 flex items-center gap-2 border-t border-line pt-4 text-[14px] text-ink-2">
              <Spinner className="size-4" />
              Recomputing every hash
            </p>
          )}
          {outcome && (
            <div className="mt-4 border-t border-line pt-4 text-[14px]">
              {outcome.valid ? (
                <p className="flex items-center gap-2 font-medium text-ok">
                  <ShieldCheck className="size-[18px] shrink-0" strokeWidth={1.5} />
                  Chain intact: {outcome.events_checked} entries verified
                </p>
              ) : (
                <>
                  <p className="flex items-center gap-2 font-medium text-danger">
                    <ShieldAlert className="size-[18px] shrink-0" strokeWidth={1.5} />
                    Chain broken at entry {outcome.first_invalid_sequence}
                  </p>
                  <p className="mt-1 text-ink-2">
                    {outcome.events_checked} earlier entries verified. Entry {outcome.first_invalid_sequence} no longer matches its hash or its link to the entry before it.
                    {!outcome.visible && " It is not in the entries loaded below."}
                  </p>
                </>
              )}
            </div>
          )}
        </div>
        {verifyError && (
          <div className="mt-4">
            <ErrorNote message={verifyError} />
          </div>
        )}
      </Card>

      <section aria-labelledby="audit-people" className="mt-10">
        <h2 id="audit-people" className="text-[16px] font-medium">
          People
        </h2>
        <p className="mb-3 mt-1 text-[14px] text-ink-2">Select a person to see only their entries.</p>
        {summary.error && <ErrorNote message={summary.error} onRetry={summary.reload} />}
        {summary.loading && !summary.data && (
          <Card className="grid gap-1 p-2" aria-busy="true" aria-label="Loading people">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </Card>
        )}
        {summary.data && <PeopleTable people={summary.data.people} selectedId={person?.id ?? null} onOpen={openPerson} />}
      </section>

      <section ref={ledgerRef} aria-labelledby="audit-events" className="mt-10">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h2 id="audit-events" ref={headingRef} tabIndex={-1} className="rounded-[6px] text-[16px] font-medium">
              {person ? `Entries by ${person.display_name}` : "Entries"}
            </h2>
            {person && (
              <p className="mt-1 text-[14px] text-ink-2">
                {person.role.name} · {person.department?.name ?? "No department"} · {person.searches} searches, {person.uploads} uploads, {person.shares} shares
              </p>
            )}
          </div>
          {person ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setPerson(null);
                setOutcome(null);
              }}
            >
              <X className="size-4" strokeWidth={1.5} />
              Show all entries
            </Button>
          ) : (
            <div className="w-full sm:w-60">
              <label htmlFor="audit-type" className="sr-only">
                Filter entries by type
              </label>
              <Select
                id="audit-type"
                value={type}
                onChange={(event) => {
                  setType(event.target.value);
                  setOutcome(null);
                }}
              >
                {filters.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </Select>
            </div>
          )}
        </div>
        {/* A person's timeline is not reloaded after a verification: opening it is itself an audit event */}
        {person ? (
          <EventFeed key={`person-${person.id}`} path={`/audit/users/${person.id}/`} showActor={false} version={0} brokenSequence={broken} />
        ) : (
          <EventFeed key={`type-${type}`} path="/audit/" query={type ? `type=${encodeURIComponent(type)}` : ""} showActor version={version} brokenSequence={broken} />
        )}
      </section>
    </Page>
  );
}
