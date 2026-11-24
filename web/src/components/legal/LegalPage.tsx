import type { ReactNode } from "react";

import { Toc } from "./Toc";

/* Shows a legal fact from config.toml, or a clear marker while it is still missing */
export function Fact({ value, label }: { value: string; label: string }) {
  if (value) return <>{value}</>;
  return (
    <span className="rounded-[4px] border border-dashed border-line-strong px-1.5 py-0.5 text-[14px] text-ink-3">
      {label} to be confirmed
    </span>
  );
}

export function LegalPage({
  title,
  effective,
  intro,
  sections,
  children,
}: {
  title: string;
  effective: string;
  intro: string;
  sections: { id: string; label: string }[];
  children: ReactNode;
}) {
  return (
    <article className="container-page pb-24 pt-16 md:pb-32 md:pt-24">
      <header className="max-w-[44rem] border-b border-line pb-10">
        <p className="text-[13px] text-ink-3">Legal</p>
        <h1 className="display mt-4 text-[44px] sm:text-[56px]">{title}</h1>
        <p className="mt-6 text-[14px] text-ink-3">
          Effective <Fact value={effective} label="Date" />
        </p>
      </header>
      <div className="mt-12 grid gap-12 lg:grid-cols-[220px_minmax(0,44rem)] lg:gap-20">
        <Toc sections={sections} />
        <div className="prose-legal">
          <p className="!text-[18px] !leading-[30px] !text-ink">{intro}</p>
          {children}
        </div>
      </div>
    </article>
  );
}
