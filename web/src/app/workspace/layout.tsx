import { Shell } from "@/components/workspace/Shell";
import { WorkspaceProvider } from "@/components/workspace/WorkspaceContext";
import { WorkspaceSearchProvider } from "@/components/workspace/WorkspaceSearch";

export default function WorkspaceLayout({ children }: LayoutProps<"/workspace">) {
  return (
    <WorkspaceProvider>
      <WorkspaceSearchProvider>
        <Shell>{children}</Shell>
      </WorkspaceSearchProvider>
    </WorkspaceProvider>
  );
}
