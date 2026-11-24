"use client";

/* Renders answer pieces: plain text plus citation tags that can be pressed */
export function Cited({
  pieces,
  active,
  onCite,
}: {
  pieces: (string | { cite: string })[];
  active?: string | null;
  onCite?: (ref: string) => void;
}) {
  return (
    <>
      {pieces.map((piece, i) =>
        typeof piece === "string" ? (
          <span key={i}>{piece}</span>
        ) : onCite ? (
          <button
            key={i}
            type="button"
            className="cite"
            aria-pressed={active === piece.cite}
            onClick={() => onCite(piece.cite)}
          >
            {piece.cite}
          </button>
        ) : (
          <span key={i} className="cite">
            {piece.cite}
          </span>
        ),
      )}
    </>
  );
}
