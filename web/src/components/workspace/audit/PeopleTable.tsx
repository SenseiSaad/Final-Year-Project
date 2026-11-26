"use client";

import { useRef } from "react";

import { cn } from "@/lib/cn";
import { formatWhen, type AuditPerson } from "@/lib/workspace-api";

import { Avatar, Card } from "../ui";
import { useStaggerIn } from "./useStagger";

/* Who did what: counts per person. Opening a person narrows the ledger to their events. */
export function PeopleTable({ people, selectedId, onOpen }: { people: AuditPerson[]; selectedId: number | null; onOpen: (person: AuditPerson) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useStaggerIn(ref, people.length > 0, "[data-row]");

  return (
    <Card className="overflow-hidden">
      <div ref={ref}>
        <table className="w-full table-fixed text-left">
          <caption className="sr-only">Activity per person. Select a name to see only their entries.</caption>
          <colgroup>
            <col />
            <col className="hidden w-24 md:table-column" />
            <col className="hidden w-24 md:table-column" />
            <col className="hidden w-24 md:table-column" />
            <col className="w-24" />
            <col className="hidden w-40 md:table-column" />
          </colgroup>
          <thead>
            <tr className="h-10 border-b border-line text-[13px] text-ink-3">
              <th scope="col" className="px-4 font-normal">
                Person
              </th>
              <th scope="col" className="hidden px-3 text-right font-normal md:table-cell">
                Searches
              </th>
              <th scope="col" className="hidden px-3 text-right font-normal md:table-cell">
                Uploads
              </th>
              <th scope="col" className="hidden px-3 text-right font-normal md:table-cell">
                Shares
              </th>
              <th scope="col" className="px-3 text-right font-normal">
                Entries
              </th>
              <th scope="col" className="hidden px-4 text-right font-normal md:table-cell">
                Last active
              </th>
            </tr>
          </thead>
          <tbody>
            {people.map((person) => {
              const selected = person.id === selectedId;
              return (
                <tr
                  key={person.id}
                  data-row
                  onClick={() => onOpen(person)}
                  className={cn("h-14 cursor-pointer border-b border-line transition-colors duration-150 last:border-b-0", selected ? "bg-raised" : "hover:bg-deep")}
                >
                  <th scope="row" className="px-4 text-left font-normal">
                    <button type="button" aria-pressed={selected} onClick={() => onOpen(person)} className="flex w-full min-w-0 items-center gap-3 text-left">
                      <Avatar name={person.display_name} />
                      <span className="min-w-0">
                        <span className="block truncate text-[14px] font-medium">{person.display_name}</span>
                        <span className="block truncate text-[12px] leading-5 text-ink-3">
                          {person.role.name} · {person.department?.name ?? "No department"}
                          <span className="md:hidden"> · {person.last_active ? formatWhen(person.last_active) : "No activity"}</span>
                        </span>
                      </span>
                    </button>
                  </th>
                  <td className="hidden px-3 text-right text-[14px] tabular-nums md:table-cell">{person.searches}</td>
                  <td className="hidden px-3 text-right text-[14px] tabular-nums md:table-cell">{person.uploads}</td>
                  <td className="hidden px-3 text-right text-[14px] tabular-nums md:table-cell">{person.shares}</td>
                  <td className="px-3 text-right text-[14px] tabular-nums">{person.events}</td>
                  <td className={cn("hidden px-4 text-right text-[13px] md:table-cell", person.last_active ? "text-ink-2" : "text-ink-3")}>
                    {person.last_active ? formatWhen(person.last_active) : "No activity"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
