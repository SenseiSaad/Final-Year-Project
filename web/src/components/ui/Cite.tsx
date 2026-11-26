import { cn } from "@/lib/cn";

/* The signature detail: a source tag. Static, or pressable when it opens a passage. */
export function Cite({
  children,
  pressed,
  onPress,
  className,
}: {
  children: string;
  pressed?: boolean;
  onPress?: () => void;
  className?: string;
}) {
  if (!onPress) return <span className={cn("cite", className)}>{children}</span>;
  return (
    <button type="button" className={cn("cite", className)} aria-pressed={pressed} onClick={onPress}>
      {children}
    </button>
  );
}
