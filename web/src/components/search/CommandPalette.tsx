"use client";

import { CornerDownLeft, Search } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, type ComponentType, type ReactNode } from "react";

import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/cn";

export type PaletteItem = {
  id: string;
  label: string;
  /** Already ranked by the server for this query, so the typed words need not appear in the label */
  always?: boolean;
  /** Short text on the right: where the result lives */
  hint?: string;
  /** Extra words that should match */
  keywords?: string;
  /** Second line under the label, such as a snippet */
  detail?: string;
  icon?: ComponentType<{ className?: string; strokeWidth?: number }>;
  perform: () => void;
};

function score(item: PaletteItem, terms: string[]) {
  const label = item.label.toLowerCase();
  const rest = `${item.hint ?? ""} ${item.keywords ?? ""} ${item.detail ?? ""}`.toLowerCase();
  let total = 0;
  for (const term of terms) {
    if (label.startsWith(term)) total += 4;
    else if (label.includes(term)) total += 3;
    else if (rest.includes(term)) total += 1;
    else return 0;
  }
  return total;
}

/*
  The search bar. Opens with a shortcut or a button, filters as you type, and works
  entirely from the keyboard with arrow keys, Enter and Escape. `extra` lets a page
  add results it fetched itself, such as document content matches.
*/
export function CommandPalette(props: PaletteProps) {
  return (
    <Modal open={props.open} onClose={props.onClose} label="Search" className="top-[12vh] mt-0 w-[min(640px,calc(100vw-24px))]">
      <PaletteBody {...props} />
    </Modal>
  );
}

type PaletteProps = {
  open: boolean;
  onClose: () => void;
  items: PaletteItem[];
  placeholder: string;
  onQueryChange?: (query: string) => void;
  loading?: boolean;
  footer?: ReactNode;
  emptyMessage?: string;
};

function PaletteBody({
  onClose,
  items,
  placeholder,
  onQueryChange,
  loading,
  footer,
  emptyMessage = "Nothing matches that search",
}: PaletteProps) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listId = useId();
  const list = useRef<HTMLUListElement>(null);

  const results = useMemo(() => {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return items.slice(0, 40);
    return items
      .map((item) => ({ item, s: score(item, terms) || (item.always ? 0.5 : 0) }))
      .filter((r) => r.s > 0)
      .sort((a, b) => b.s - a.s)
      .map((r) => r.item)
      .slice(0, 40);
  }, [items, query]);

  // Closing the palette unmounts this body, which clears the query held by the caller
  useEffect(() => () => onQueryChange?.(""), [onQueryChange]);

  useEffect(() => {
    list.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function choose(item: PaletteItem | undefined) {
    if (!item) return;
    onClose();
    // Let the dialog finish closing before the page reacts
    window.setTimeout(item.perform, 60);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      choose(results[active]);
    }
  }

  return (
    <>
      <div className="overflow-hidden rounded-[18px] border border-line-strong bg-surface shadow-window">
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search className="size-[18px] shrink-0 text-ink-3" strokeWidth={1.5} />
          <input
            autoFocus
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={results[active] ? `${listId}-${active}` : undefined}
            aria-label={placeholder}
            value={query}
            placeholder={placeholder}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
              onQueryChange?.(event.target.value);
            }}
            onKeyDown={onKeyDown}
            className="h-14 flex-1 bg-transparent text-[16px] text-ink placeholder:text-ink-3 focus:outline-none"
          />
          <span className="kbd">Esc</span>
        </div>

        <ul ref={list} id={listId} role="listbox" aria-label="Results" data-lenis-prevent className="max-h-[min(55vh,420px)] overflow-y-auto p-2">
          {results.map((item, i) => (
            <li
              key={item.id}
              id={`${listId}-${i}`}
              data-index={i}
              role="option"
              aria-selected={i === active}
              onMouseMove={() => setActive(i)}
              onClick={() => choose(item)}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-[10px] px-3 py-2.5 transition-colors duration-100",
                i === active ? "bg-raised" : "",
              )}
            >
              {item.icon && <item.icon className="size-4 shrink-0 text-ink-3" strokeWidth={1.5} />}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] text-ink">{item.label}</span>
                {item.detail && <span className="mt-0.5 block truncate text-[13px] text-ink-3">{item.detail}</span>}
              </span>
              {item.hint && <span className="shrink-0 text-[12px] text-ink-3">{item.hint}</span>}
              {i === active && <CornerDownLeft className="size-3.5 shrink-0 text-ink-3" strokeWidth={1.5} />}
            </li>
          ))}
          {!results.length && (
            <li role="presentation" className="px-3 py-10 text-center text-[14px] text-ink-3">
              {loading ? "Searching" : emptyMessage}
            </li>
          )}
        </ul>

        <div className="flex items-center justify-between gap-4 border-t border-line px-4 py-2.5 text-[12px] text-ink-3">
          <span aria-live="polite">{loading ? "Searching" : `${results.length} ${results.length === 1 ? "result" : "results"}`}</span>
          {footer ?? (
            <span className="hidden items-center gap-2 sm:flex">
              <span className="kbd">↑</span>
              <span className="kbd">↓</span>
              move
              <span className="kbd">↵</span>
              open
            </span>
          )}
        </div>
      </div>
    </>
  );
}
