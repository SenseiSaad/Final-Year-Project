import { TransitionLink } from "@/components/motion/TransitionLink";

import { Logo } from "./Logo";

const product = [
  { href: "/#how", label: "How it works" },
  { href: "/#product", label: "Product" },
  { href: "/#security", label: "Security" },
  { href: "/#pricing", label: "Early access" },
];
const legal = [
  { href: "/privacy", label: "Privacy policy" },
  { href: "/terms", label: "Terms of service" },
  { href: "/login", label: "Sign in" },
];

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="container-page grid gap-12 py-16 md:grid-cols-[1fr_auto_auto] md:gap-24">
        <div className="space-y-4">
          <Logo />
          <p className="font-serif text-[24px] leading-tight text-ink-2">Every answer has a source</p>
        </div>
        {[product, legal].map((group, i) => (
          <ul key={i} className="grid content-start gap-3">
            {group.map((link) => (
              <li key={link.href}>
                <TransitionLink href={link.href} className="text-[14px] text-ink-2 transition-colors hover:text-ink">
                  {link.label}
                </TransitionLink>
              </li>
            ))}
          </ul>
        ))}
      </div>
      <div className="container-page flex flex-col gap-2 border-t border-line py-6 text-[13px] text-ink-3 sm:flex-row sm:justify-between">
        <p>© 2026 DocuTrust AI</p>
        <p>Pre-release software in active development</p>
      </div>
    </footer>
  );
}
