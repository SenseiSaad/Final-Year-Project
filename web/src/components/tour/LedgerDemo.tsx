"use client";

import { Check, RotateCcw, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";

import { ledgerEntries, tamperedAction } from "@/lib/samples";

async function sha256(text: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");
}

type Entry = (typeof ledgerEntries)[number];
const line = (e: Entry) => `${e.time}|${e.actor}|${e.action}`;
const GENESIS = "0".repeat(64);

/* Build the stored chain from the original entries: each hash covers the entry and the previous hash */
async function chain(entries: Entry[]) {
  const hashes: string[] = [];
  let prev = GENESIS;
  for (const entry of entries) {
    prev = await sha256(prev + line(entry));
    hashes.push(prev);
  }
  return hashes;
}

const TAMPER_AT = 2;

export function LedgerDemo() {
  const [stored, setStored] = useState<string[]>([]);
  const [current, setCurrent] = useState<string[]>([]);
  const [tampered, setTampered] = useState(false);

  const entries = ledgerEntries.map((e, i) => (tampered && i === TAMPER_AT ? { ...e, action: tamperedAction } : e));

  useEffect(() => {
    if (!crypto?.subtle) return;
    chain(ledgerEntries).then(setStored);
  }, []);

  useEffect(() => {
    if (!crypto?.subtle) return;
    // Verification recomputes each hash from the entry and the stored previous hash
    (async () => {
      const result: string[] = [];
      for (let i = 0; i < entries.length; i++) {
        const prev = i === 0 ? GENESIS : stored[i - 1];
        result.push(await sha256(prev + line(entries[i])));
      }
      setCurrent(result);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tampered, stored]);

  const ready = stored.length > 0 && current.length === stored.length;
  const brokenAt = ready ? current.findIndex((h, i) => h !== stored[i]) : -1;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p
          aria-live="polite"
          className={`flex items-center gap-2 text-[14px] font-medium ${brokenAt >= 0 ? "text-danger" : "text-ink"}`}
        >
          {!ready ? (
            "Verifying chain"
          ) : brokenAt >= 0 ? (
            <>
              <TriangleAlert className="size-4" strokeWidth={1.5} />
              Chain broken at entry {brokenAt + 1}
            </>
          ) : (
            <>
              <Check className="size-4 text-ok" strokeWidth={1.5} />
              Chain intact · {stored.length} of {stored.length} entries verified
            </>
          )}
        </p>
        <button
          type="button"
          onClick={() => setTampered((t) => !t)}
          className="inline-flex h-8 items-center gap-2 rounded-lg border border-line-strong px-3 text-[13px] text-ink transition-colors duration-150 hover:bg-raised"
        >
          {tampered ? <RotateCcw className="size-3.5" strokeWidth={1.5} /> : null}
          {tampered ? "Restore entry 3" : "Quietly edit entry 3"}
        </button>
      </div>

      <ol className="mt-6 divide-y divide-line border-y border-line">
        {entries.map((entry, i) => {
          const broken = brokenAt >= 0 && i === brokenAt;
          const after = brokenAt >= 0 && i > brokenAt;
          return (
            <li
              key={i}
              className={`grid grid-cols-[24px_1fr] gap-x-3 gap-y-1 py-3 transition-colors duration-300 sm:grid-cols-[24px_48px_1fr_auto] sm:items-center ${
                broken ? "bg-danger-soft" : ""
              }`}
            >
              <span className="pl-1 font-mono text-[12px] text-ink-3">{i + 1}</span>
              <span className="hidden font-mono text-[12px] text-ink-3 sm:block">{entry.time}</span>
              <span className={`text-[13px] ${broken ? "text-ink" : "text-ink-2"}`}>
                <span className="text-ink">{entry.actor}</span> {entry.action}
              </span>
              <span
                className={`col-start-2 pr-2 font-mono text-[12px] tabular-nums sm:col-start-auto ${
                  broken ? "text-danger" : after ? "text-ink-3" : "text-ink-3"
                }`}
              >
                {current[i] ? `${current[i].slice(0, 12)}…` : "············"}
                {broken && <span className="ml-2">≠ {stored[i]?.slice(0, 6)}</span>}
                {after && <span className="ml-2">unverified</span>}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-4 text-[13px] text-ink-3">
        Demo only: SHA-256 hashes for these sample entries are computed in your browser; they do not verify an external or production audit log.
      </p>
    </div>
  );
}
