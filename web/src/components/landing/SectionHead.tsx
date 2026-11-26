import { TextEffect } from "@/components/core/text-effect";

type SectionHeadProps = {
  id: string;
  title: string;
  lead?: string;
  /** Fade the title in character by character as the section enters. On by default. */
  textEffect?: boolean;
};

export function SectionHead({ id, title, lead, textEffect = true }: SectionHeadProps) {
  return (
    <div data-reveal={textEffect ? undefined : ""} className="max-w-[40rem]">
      <h2 id={id} className="heading" aria-label={textEffect ? title : undefined}>
        {textEffect ? (
          <TextEffect per="char" preset="fade" delay={0.05} staggerSeconds={0.012}>
            {title}
          </TextEffect>
        ) : (
          title
        )}
      </h2>
      {lead && (
        <p data-reveal={textEffect ? "" : undefined} className="mt-4 text-[17px] leading-[28px] text-ink-2">
          {lead}
        </p>
      )}
    </div>
  );
}