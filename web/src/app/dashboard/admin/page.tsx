import type { Metadata } from "next";

import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { facts } from "@/lib/facts";

export const metadata: Metadata = {
  title: "Admin dashboard · Early access",
  description: "Test DocuTrust AI with highest-level administrator permissions.",
};

export default function AdminDashboardPage() {
  return <DashboardShell role="admin" facts={facts} />;
}
