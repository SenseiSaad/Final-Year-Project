"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export function Faq({ maxFileMb }: { maxFileMb: number }) {
  const items = [
    {
      value: "providers",
      trigger: "Which models answer my questions?",
      content:
        "Local uses Ollama on the workspace server, so nothing goes to a cloud provider. Gemini and Hosted (any OpenAI-compatible service) are cloud providers: your question and the retrieved passages are sent to them. A provider that is not configured on the server says so in the chat instead of answering.",
    },
    {
      value: "no-answer",
      trigger: "What if the documents do not contain the answer?",
      content:
        "You get a refusal that says no permitted source matched. The model is not asked to guess, and the attempt is still recorded in the audit log.",
    },
    {
      value: "files",
      trigger: "Which files can I upload?",
      content: `PDF, Word (.docx), Markdown and plain text, up to ${maxFileMb} MB each. PDFs need a text layer; scanned pages are not read because OCR is not included.`,
    },
    {
      value: "sharing",
      trigger: "Who can read an uploaded file?",
      content:
        "Either a role-based policy (the document's department and the managers assigned to it) or an admin-defined scope that names specific roles, departments and people. Finance and HR never see each other's files unless an admin explicitly grants it.",
    },
    {
      value: "ledger",
      trigger: "How trustworthy is the audit log?",
      content:
        "Each entry stores the SHA-256 of its contents and of the entry before it, and the server can recompute the whole chain on demand. That reveals edits made afterwards. It is not stored outside the database, so someone with full database access could rewrite it.",
    },
    {
      value: "status",
      trigger: "Is this safe for real company documents?",
      content:
        "No. The demo has no sign-in: anyone can pick the Admin persona. Use it with synthetic documents to evaluate the workflow, not to store confidential data.",
    },
  ];

  return (
    <section id="faq" aria-labelledby="faq-title" className="section-fit">
      <div className="container-page grid w-full gap-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] lg:gap-16">
        <div data-reveal>
          <h2 id="faq-title" className="heading">
            Questions teams ask first
          </h2>
          <p className="mt-4 text-[17px] leading-[28px] text-ink-2">Straight answers about models, files and access.</p>
        </div>

        <div data-reveal>
          <Accordion type="multiple" className="border-t border-line">
            {items.map((item) => (
              <AccordionItem key={item.value} value={item.value} className="border-b border-line">
                <AccordionTrigger className="py-5 text-[16px] font-medium leading-[1.4] text-ink hover:no-underline">
                  {item.trigger}
                </AccordionTrigger>
                <AccordionContent className="max-w-[40rem] pb-6 text-[15px] leading-[25px] text-ink-2">
                  {item.content}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
