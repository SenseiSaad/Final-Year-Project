import { CloudOff, Filter, HardDrive, Link2, Lock, ScanText } from "lucide-react";

import type { Facts } from "@/lib/facts";

export function Security({ facts }: { facts: Facts }) {
  const items = [
    {
      icon: HardDrive,
      title: "Runs on your machine",
      text: "Documents, indexes and answers live in a local SQLite database, with a local Ollama model writing the answers.",
    },
    {
      icon: Filter,
      title: "Permissions come first",
      text: "Files a person cannot open are filtered out before ranking, so they never reach the model.",
    },
    {
      icon: Link2,
      title: "Tamper-evident ledger",
      text: "Uploads, questions, shares and admin changes are chained with SHA-256. Verification shows exactly where a chain breaks.",
    },
    {
      icon: Lock,
      title: "Sign-in lockout",
      text: `${facts.maxFailedLogins} failed attempts lock an account for ${facts.lockoutMinutes} minutes. Disabled accounts cannot sign in at all.`,
    },
    {
      icon: ScanText,
      title: "Guarded against hidden instructions",
      text: "Text inside a document is treated as content to quote, never as a command to follow.",
    },
    {
      icon: CloudOff,
      title: "Cloud chat is opt-in and labelled",
      text: "An administrator can switch chat to Gemini. While it is on, every screen says so, and indexing stays local.",
    },
  ];

  return (
    <section id="security" aria-labelledby="security-title" className="border-y border-line bg-deep/60 py-24 md:py-32">
      <div className="container-page grid gap-14 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] lg:gap-20">
        <div data-reveal className="lg:sticky lg:top-28 lg:self-start">
          <h2 id="security-title" className="heading">
            Private by design, with nothing taken on trust
          </h2>
          <p className="mt-4 text-[17px] leading-[28px] text-ink-2">
            DocuTrust is built for documents you would never paste into a public chatbot. Each safeguard below can be
            checked, not just promised.
          </p>
        </div>
        <ul className="grid gap-x-10 gap-y-10 sm:grid-cols-2">
          {items.map((item) => (
            <li key={item.title} data-reveal>
              <item.icon className="size-[18px] text-ink-2" strokeWidth={1.5} />
              <h3 className="mt-4 text-[16px] font-medium">{item.title}</h3>
              <p className="mt-2 text-[14px] leading-[23px] text-ink-2">{item.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
