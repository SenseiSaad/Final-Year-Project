import { LoaderCircle } from "lucide-react";

import { cn } from "@/lib/cn";

export function Spinner({ className }: { className?: string }) {
  return <LoaderCircle role="presentation" aria-hidden="true" className={cn("animate-spin", className)} strokeWidth={1.5} />;
}
