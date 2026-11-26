import { Cloud, FileText, Filter, KeyRound, Link2, UserRoundCog } from "lucide-react";

import { SectionHead } from "./SectionHead";

export function Security({ maxFileMb }: { maxFileMb: number }) {
  const items = [
    {
      icon: Cloud,
      title: "Local, Gemini or Hosted",
      text: "Local runs through Ollama on the workspace server. Gemini and Hosted send the question and the retrieved passages to those providers, and the workspace asks you to confirm before switching.",
    },
    {
      icon: Filter,
      title: "Permissions come first",
      text: "Passages are filtered by role, department and explicit scopes before ranking, so a model only receives text the person could open anyway.",
    },
    {
      icon: Link2,
      title: "Hash-chained audit",
      text: "Searches, uploads, shares and more are recorded with SHA-256 links and verified on the server. It exposes edits to the log; it is not externally anchored storage.",
    },
    {
      icon: KeyRound,
      title: "Keys stay on the server",
      text: "Provider credentials live in the Django environment. The browser never sees them, and an unconfigured provider says so instead of failing silently.",
    },
    {
      icon: FileText,
      title: "Supported files",
      text: `PDF with a text layer, Word (.docx), Markdown and plain text, up to ${maxFileMb} MB each. Scanned PDFs need OCR first.`,
    },
    {
      icon: UserRoundCog,
      title: "Open demo access",
      text: "Sign-in is open in this demo and everyone enters as an administrator. Use synthetic documents only, never real employee or customer data.",
    },
  ];

  return (
    <section id="security" aria-labelledby="security-title" className="border-y border-line bg-deep py-28 md:py-36">
      <div className="container-page grid gap-14 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] lg:gap-20">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <SectionHead
            id="security-title"
            title="What stays where"
            lead="Plain statements about where your questions go and what the demo does and does not protect."
          />
        </div>
        <ul className="grid gap-x-10 gap-y-12 sm:grid-cols-2">
          {items.map((item) => (
            <li key={item.title} data-reveal>
              <span className="grid size-10 place-items-center rounded-[10px] border border-line-strong text-ink">
                <item.icon className="size-[18px]" strokeWidth={1.5} />
              </span>
              <h3 className="mt-5 text-[17px] font-medium tracking-[-0.005em]">{item.title}</h3>
              <p className="mt-2 text-[14px] leading-[23px] text-ink-2">{item.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
