export function SectionHead({ id, title, lead }: { id: string; title: string; lead?: string }) {
  return (
    <div data-reveal className="max-w-[40rem]">
      <h2 id={id} className="heading">
        {title}
      </h2>
      {lead && <p className="mt-4 text-[17px] leading-[28px] text-ink-2">{lead}</p>}
    </div>
  );
}
