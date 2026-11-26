export function SectionHead({ id, title, lead, className = "" }: { id: string; title: string; lead?: string; className?: string }) {
  return (
    <div className={`max-w-[44rem] ${className}`}>
      <h2 id={id} data-split className="h2">
        {title}
      </h2>
      {lead && (
        <p data-reveal className="lead mt-5">
          {lead}
        </p>
      )}
    </div>
  );
}
