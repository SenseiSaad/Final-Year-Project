"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/core/accordion";
import type { Facts } from "@/lib/facts";

export function Faq({ facts }: { facts: Facts }) {
  const items = [
    {
      q: "Do our documents go to the cloud?",
      a: "No, not by default. Files, search indexes and answers stay on the machine DocuTrust runs on. An administrator can choose Gemini for the chat step. When they do, the question and the passages found for it are sent to Google, and every screen shows that cloud chat is on. Indexing always stays local.",
    },
    {
      q: "What happens when the documents do not have the answer?",
      a: `DocuTrust tells you it could not find the answer. If no passage scores above the minimum of ${facts.minScore}, it declines rather than filling the gap from general knowledge.`,
    },
    {
      q: "Which files can we upload?",
      a: `PDF, Word (.docx), Markdown and plain text, up to ${facts.maxFileMb} MB per file and ${facts.maxDocs} files per person. Scanned PDFs need a text layer, because DocuTrust does not run OCR.`,
    },
    {
      q: "Can I share one document with one colleague?",
      a: "Yes. Share a single file with a single teammate and revoke it whenever you like. It appears on their Shared with me page and in their search results until you do.",
    },
    {
      q: "How does the ledger show tampering?",
      a: "Each entry stores a SHA-256 hash of its own content together with the hash of the entry before it. If anyone changes an old entry, its hash no longer matches and verification points to the first broken link.",
    },
    {
      q: "What do we need to run it?",
      a: "One computer with Python and Ollama installed. The default models are small enough for an ordinary office machine, and no account, subscription or internet connection is needed to use it.",
    },
    {
      q: "Is DocuTrust ready to use today?",
      a: "Yes—open the Workspace directly from this page with no login required to test Chat, Team chat, Document upload, OKF pinning and the SHA-256 Audit log.",
    },
  ];

  const [open, setOpen] = useState<string | null>(items[0].q);

  return (
    <section id="faq" aria-labelledby="faq-title" className="py-24 md:py-32">
      <div className="container-page grid gap-12 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] lg:gap-20">
        <div data-reveal>
          <h2 id="faq-title" className="heading">
            Questions teams ask first
          </h2>
          <p className="mt-4 text-[17px] leading-[28px] text-ink-2">
            Open the Workspace above to test every feature directly—no account or sign-in needed.
          </p>
        </div>

        <div data-reveal>
          <Accordion
            className="border-t border-line"
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
            expandedValue={open}
            onValueChange={(value) => setOpen(value === null ? null : String(value))}
          >
            {items.map((item) => (
              <AccordionItem key={item.q} value={item.q} className="border-b border-line">
                <AccordionTrigger className="group flex w-full items-center justify-between gap-6 py-5 text-left text-[16px] font-medium text-ink">
                  {item.q}
                  <Plus
                    className="size-[18px] shrink-0 text-ink-3 transition-transform duration-300 group-data-[expanded]:rotate-45"
                    strokeWidth={1.5}
                  />
                </AccordionTrigger>
                <AccordionContent className="overflow-hidden">
                  <p className="max-w-[40rem] pb-6 text-[15px] leading-[25px] text-ink-2">{item.a}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}