import type { Metadata } from "next";

import { DashboardShell } from "@/components/dashboard/DashboardShell";

export const metadata: Metadata = {
  title: "Workspace as Admin",
  description: "Open the workspace previewing the Admin persona.",
};

export default function AdminDashboardPage() {
  return <DashboardShell initialPersona="admin" />;
}
