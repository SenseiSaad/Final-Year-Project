import Link from "next/link";

export function Mark({ className = "size-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`shrink-0 text-accent ${className}`}>
      <rect width="24" height="24" rx="6" fill="currentColor" />
      <path
        d="M9.5 7H7.5v10h2M14.5 7h2v10h-2"
        fill="none"
        stroke="var(--on-accent)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 whitespace-nowrap text-[16px] font-medium tracking-[-0.01em] text-ink">
      <Mark />
      <span>DocuTrust AI</span>
    </Link>
  );
}
