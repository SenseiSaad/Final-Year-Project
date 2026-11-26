import { PageEnter } from "@/components/motion/PageEnter";

/* Every workspace screen fades in when it opens */
export default function WorkspaceTemplate({ children }: { children: React.ReactNode }) {
  return <PageEnter className="min-h-full">{children}</PageEnter>;
}
