"use client";

import { Check, ChevronDown, CircleAlert, History } from "lucide-react";
import { useCallback, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { useResource } from "@/hooks/useResource";
import { cn } from "@/lib/cn";
import { errorMessage, formatDateTime, formatWhen, type AuditEventItem } from "@/lib/workspace-api";

import { Card, EmptyState, ErrorNote, Skeleton } from "../ui";
import { useWorkspace } from "../WorkspaceContext";
import { CopyButton } from "./CopyButton";
import { eventLabel, eventSummary, keyLabel, valueText } from "./describe";
import { useStaggerIn } from "./useStagger";

type Page = { events: AuditEventItem[]; next_before: number | null; total: number };
type More = { source: Page | undefined; events: AuditEventItem[]; next: number | null };

/*
  The ledger: newest first, paged with `before`. `version` changes after a verification
  (which writes its own event) so the list reloads and shows it.
*/
export function EventFeed({
  path,
  query = "",
  showActor,
  version,
  brokenSequence,
}: {
  path: string;
  query?: string;
  showActor: boolean;
  version: number;
  brokenSequence: number | null;
}) {
  const { request } = useWorkspace();
  const ref = useRef<HTMLDivElement>(null);
  const base = `${path}?limit=40${query ? `&${query}` : ""}`;
  const load = useCallback((signal: AbortSignal) => request<Page>(`${base}&v=${version}`, { signal }), [request, base, version]);
  const first = useResource(load);
  const [more, setMore] = useState<More>({ source: undefined, events: [], next: null });
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState<string | null>(null);
  useStaggerIn(ref, !!first.data, "[data-row]");

  // Older pages belong to the first page they were fetched after; a reload starts over
  const extra = first.data && more.source === first.data ? more : null;
  const events = [...(first.data?.events ?? []), ...(extra?.events ?? [])];
  const next = extra ? extra.next : (first.data?.next_before ?? null);

  async function loadMore() {
    const source = first.data;
    if (!next || !source) return;
    setLoadingMore(true);
    setMoreError(null);
    try {
      const page = await request<Page>(`${base}&before=${next}`);
      setMore((prev) => ({ source, events: [...(prev.source === source ? prev.events : []), ...page.events], next: page.next_before }));
    } catch (failure) {
      setMoreError(errorMessage(failure));
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div ref={ref}>
      {first.error && <ErrorNote message={first.error} onRetry={first.reload} />}
      {first.loading && !first.data && (
        <Card className="grid gap-1 p-2" aria-busy="true" aria-label="Loading events">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </Card>
      )}
      {first.data && events.length === 0 && (
        <Card>
          <EmptyState icon={History} title="No activity yet" text="Actions appear here as soon as they happen." />
        </Card>
      )}
      {events.length > 0 && (
        <>
          <p className="mb-2 text-[13px] text-ink-3">
            Showing <span className="tabular-nums">{events.length}</span> of <span className="tabular-nums">{first.data?.total ?? events.length}</span> entries, newest first
          </p>
          <Card className="overflow-hidden">
            <ol aria-label="Audit entries">
              {events.map((event) => (
                <EventRow key={event.sequence} event={event} showActor={showActor} broken={brokenSequence === event.sequence} />
              ))}
            </ol>
          </Card>
        </>
      )}
      {moreError && (
        <div className="mt-3">
          <ErrorNote message={moreError} />
        </div>
      )}
      {next && (
        <div className="mt-4 flex justify-center">
          <Button variant="secondary" onClick={loadMore} loading={loadingMore}>
            Load older entries
          </Button>
        </div>
      )}
    </div>
  );
}

function EventRow({ event, showActor, broken }: { event: AuditEventItem; showActor: boolean; broken: boolean }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const summary = eventSummary(event);
  const entries = Object.entries(event.details);

  return (
    <li data-row data-seq={event.sequence} className={cn("border-b border-line transition-colors duration-300 last:border-b-0", broken && "bg-danger-soft")}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "grid h-14 w-full items-center gap-x-3 px-4 text-left transition-colors duration-150",
          broken ? "hover:bg-danger-soft" : "hover:bg-deep",
          showActor ? "grid-cols-[16px_minmax(0,1fr)_16px] md:grid-cols-[16px_56px_minmax(0,1fr)_176px_176px_16px]" : "grid-cols-[16px_minmax(0,1fr)_16px] md:grid-cols-[16px_56px_minmax(0,1fr)_176px_16px]",
        )}
      >
        <span aria-hidden="true" className="grid size-4 place-items-center">
          {broken ? (
            <CircleAlert className="size-4 text-danger" strokeWidth={1.5} />
          ) : (
            <Check data-tick className="size-4 text-ok opacity-0" strokeWidth={1.5} />
          )}
        </span>
        <span className="font-mono text-[12px] tabular-nums text-ink-3 max-md:hidden">#{event.sequence}</span>
        <span className="min-w-0">
          <span className="flex items-baseline gap-2">
            <span className={cn("shrink-0 text-[14px] font-medium", labelIsRaw(event.event_type) && "font-mono text-[13px]")}>{eventLabel(event.event_type)}</span>
            {summary && <span className="min-w-0 truncate text-[13px] text-ink-2">{summary}</span>}
          </span>
          <span className="block truncate text-[12px] leading-5 text-ink-3 md:hidden">
            #{event.sequence} · {showActor ? `${event.actor} · ` : ""}
            {formatWhen(event.timestamp)}
          </span>
        </span>
        {showActor && (
          <span className="min-w-0 max-md:hidden">
            <span className="block truncate text-[13px]">{event.actor}</span>
            <span className="block truncate text-[12px] leading-5 text-ink-3">{event.role}</span>
          </span>
        )}
        <time dateTime={event.timestamp} className="font-mono text-[12px] tabular-nums text-ink-2 max-md:hidden">
          {formatDateTime(event.timestamp)}
        </time>
        <ChevronDown aria-hidden="true" className={cn("size-4 text-ink-3 transition-transform duration-300 ease-soft", open && "rotate-180")} strokeWidth={1.5} />
      </button>

      <div id={panelId} inert={!open} className={cn("grid transition-[grid-template-rows] duration-300 ease-soft", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
        <div className="min-h-0 overflow-hidden">
          <dl className="grid grid-cols-[96px_minmax(0,1fr)] gap-x-4 gap-y-2 px-4 pb-5 pt-1 text-[13px] leading-5 md:pl-[100px]">
            <Row label="Actor">{event.actor}</Row>
            <Row label="Role">{event.role || "None"}</Row>
            <Row label="Department">{event.department || "None"}</Row>
            <Row label="Object">
              {event.object_type ? (
                <>
                  {keyLabel(event.object_type)}
                  {event.object_id && <span className="font-mono"> #{event.object_id}</span>}
                </>
              ) : (
                "None"
              )}
            </Row>
            <Row label="Time">{formatDateTime(event.timestamp)}</Row>
            <Row label="Details">
              {entries.length === 0 ? (
                "None"
              ) : (
                <dl className="grid grid-cols-[minmax(0,140px)_minmax(0,1fr)] gap-x-4 gap-y-1">
                  {entries.map(([key, value]) => (
                    <div key={key} className="contents">
                      <dt className="text-ink-3">{keyLabel(key)}</dt>
                      <dd className="min-w-0 whitespace-pre-wrap break-words">{valueText(value)}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </Row>
            <Row label="Previous hash">
              <Hash value={event.previous_hash} label={`Copy previous hash of entry ${event.sequence}`} />
            </Row>
            <Row label="Event hash">
              <Hash value={event.event_hash} label={`Copy hash of entry ${event.sequence}`} />
            </Row>
          </dl>
        </div>
      </div>
    </li>
  );
}

function labelIsRaw(type: string) {
  return eventLabel(type) === type;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-ink-3">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </>
  );
}

function Hash({ value, label }: { value: string; label: string }) {
  return (
    <span className="-my-1.5 flex items-center gap-1">
      <code className="min-w-0 break-all font-mono text-[12px] leading-5">{value}</code>
      <CopyButton value={value} label={label} />
    </span>
  );
}
