import type { Metadata } from "next";

import { HomeView } from "@/components/workspace/home/HomeView";

export const metadata: Metadata = { title: "Overview" };

export default function WorkspaceHome() {
  return <HomeView />;
}
