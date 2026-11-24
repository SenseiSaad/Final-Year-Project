"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { FileText, Lock } from "lucide-react";
import { useRef, useState } from "react";

import { Segmented } from "@/components/landing/Segmented";
import { docs, people } from "@/lib/samples";

gsap.registerPlugin(useGSAP);

export function AccessDemo() {
  const [index, setIndex] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const person = people[index];
  const count = person.access.filter(Boolean).length;

  useGSAP(
    () => {
      gsap.fromTo("[data-row]", { autoAlpha: 0.4, x: -4 }, { autoAlpha: 1, x: 0, duration: 0.4, stagger: 0.04, ease: "power2.out", clearProps: "opacity,visibility,transform" });
    },
    { scope: root, dependencies: [index] },
  );

  return (
    <div ref={root}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Segmented label="Signed in as" options={people.map((p) => p.label)} value={index} onChange={setIndex} />
        <p className="font-mono text-[12px] tabular-nums text-ink-3">
          {count} of {docs.length} documents in search
        </p>
      </div>

      <ul className="mt-6 divide-y divide-line border-y border-line">
        {docs.map((doc, i) => {
          const access = person.access[i];
          return (
            <li
              key={doc.name}
              data-row
              className={`flex h-12 items-center gap-3 transition-opacity duration-300 ${access ? "" : "opacity-45"}`}
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
                  access ? "bg-accent-soft text-accent-ink" : "text-ink-3"
                }`}
              >
                {access === "Shared" ? `Shared by ${doc.owner.split(" ")[0]}` : (access ?? "Not visible")}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-[13px] text-ink-3">
        Hidden files are removed before ranking, so their text never reaches the model.
      </p>
    </div>
  );
}
