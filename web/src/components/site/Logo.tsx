import { TransitionLink } from "@/components/motion/TransitionLink";

/* The mark: a pair of brackets holding a source. Solid, one colour, no gradient. */
export function Mark({ className = "size-6", tone = "default" }: { className?: string; tone?: "default" | "inverse" }) {
  const fill = tone === "inverse" ? "var(--bg)" : "var(--ink)";
  const stroke = tone === "inverse" ? "var(--ink)" : "var(--bg)";
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`shrink-0 ${className}`}>
      <rect width="24" height="24" rx="6" fill={fill} />
      <path
        d="M9.5 7H7.5v10h2M14.5 7h2v10h-2"
        fill="none"
        stroke={stroke}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <TransitionLink href={href} className="inline-flex items-center gap-2.5 text-[16px] font-medium tracking-[-0.01em] text-ink">
      <Mark />
      <span>DocuTrust AI</span>
    </TransitionLink>
  );
}
