import type { Metadata } from "next";

import { DashboardShell } from "@/components/dashboard/DashboardShell";

export const metadata: Metadata = {
  title: "Workspace as Employee",
  description: "Open the workspace previewing the Employee persona.",
};

export default function EmployeeDashboardPage() {
  return <DashboardShell initialPersona="employee" />;
}
