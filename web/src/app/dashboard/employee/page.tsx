import type { Metadata } from "next";

import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { facts } from "@/lib/facts";

export const metadata: Metadata = {
  title: "Employee dashboard · Early access",
  description: "Test DocuTrust AI with standard employee permissions.",
};

export default function EmployeeDashboardPage() {
  return <DashboardShell role="employee" facts={facts} />;
}
