"use client";

export function Segmented({
  options,
  value,
  onChange,
  label,
}: {
  options: string[];
  value: number;
  onChange: (index: number) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex flex-wrap gap-1 rounded-[10px] bg-raised p-1">
      {options.map((option, i) => (
        <button
          key={option}
          type="button"
          aria-pressed={i === value}
          onClick={() => onChange(i)}
          className={`h-7 rounded-md px-3 text-[13px] transition-[background-color,color,box-shadow] duration-150 ${
            i === value ? "bg-surface text-ink shadow-[0_0_0_1px_var(--line)]" : "text-ink-2 hover:text-ink"
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
