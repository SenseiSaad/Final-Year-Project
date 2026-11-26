import type { Metadata } from "next";

import { DashboardShell } from "@/components/dashboard/DashboardShell";

export const metadata: Metadata = {
  title: "Workspace",
  description: "AI chat over your documents, uploads, team rooms, roles and audit history.",
};

export default function DashboardPage() {
  return <DashboardShell />;
}
