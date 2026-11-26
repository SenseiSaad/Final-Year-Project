import Link from "next/link";

import { Logo } from "./Logo";

const groups = [
  {
    title: "Product",
    links: [
      { href: "/#product", label: "Product tour" },
      { href: "/#how", label: "How it works" },
      { href: "/#security", label: "Security" },
      { href: "/dashboard", label: "Workspace" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy policy" },
      { href: "/terms", label: "Terms of service" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="container-page grid gap-12 py-16 md:grid-cols-[1fr_auto_auto] md:gap-24">
        <div className="space-y-3">
          <Logo />
          <p className="font-serif text-[20px] text-ink-2">Every answer has a source</p>
        </div>
        {groups.map((group) => (
          <nav key={group.title} aria-label={group.title} className="grid content-start gap-3">
            <p className="text-[13px] font-medium text-ink-3">{group.title}</p>
            {group.links.map((link) => (
              <Link key={link.href} href={link.href} className="text-[14px] text-ink-2 transition-colors hover:text-ink">
                {link.label}
              </Link>
            ))}
          </nav>
        ))}
      </div>
      <div className="container-page flex flex-col gap-2 border-t border-line py-6 text-[13px] text-ink-3 sm:flex-row sm:justify-between">
        <p>© 2026 DocuTrust AI</p>
        <p>Local, Gemini or Hosted models</p>
      </div>
    </footer>
  );
}
