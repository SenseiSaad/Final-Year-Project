"use client";

import { FileText, Lock } from "lucide-react";
import { useState } from "react";

import { Segmented } from "@/components/ui/Segmented";
import { docs, people } from "@/lib/samples";

export function AccessDemo() {
  const [index, setIndex] = useState(0);
  const person = people[index];
  const count = person.access.filter(Boolean).length;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Segmented label="Signed in as" options={people.map((p) => p.label)} value={index} onChange={setIndex} />
        <p className="font-mono text-[12px] tabular-nums text-ink-3">
          {count} of {docs.length} documents in search
        </p>
      </div>

      {/* key={index} replays the row entrance when the person changes */}
      <ul key={index} className="mt-6 divide-y divide-line border-y border-line">
        {docs.map((doc, i) => {
          const access = person.access[i];
          return (
            <li
              key={doc.name}
              style={{ animationDelay: `${i * 40}ms` }}
              className={`flex h-12 animate-[row-in_400ms_var(--ease-out-soft)] items-center gap-3 transition-opacity duration-300 ${
                access ? "" : "opacity-45"
              }`}
            >
              {access ? (
                <FileText className="size-4 shrink-0 text-ink-2" strokeWidth={1.5} />
              ) : (
                <Lock className="size-4 shrink-0 text-ink-3" strokeWidth={1.5} />
              )}
              <span className={`truncate font-mono text-[13px] ${access ? "text-ink" : "text-ink-3"}`}>{doc.name}</span>
              <span className="hidden truncate text-[13px] text-ink-3 sm:block">{doc.department}</span>
              <span
                className={`ml-auto shrink-0 rounded-md px-2 py-0.5 text-[12px] ${
                  access ? "bg-raised text-ink" : "text-ink-3"
                }`}
              >
                {access === "Shared" ? `Shared by ${doc.owner.split(" ")[0]}` : (access ?? "Not visible")}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-[13px] text-ink-3">
        This sample illustrates visibility for the selected role. It does not enforce permissions or send content to a model.
      </p>
    </div>
  );
}