import type { Metadata } from "next";

import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { facts } from "@/lib/facts";

export const metadata: Metadata = {
  title: "Early access dashboard",
  description: "Test DocuTrust AI with ready-made Admin and Employee accounts.",
};

export default function DashboardPage() {
  return <DashboardShell role="employee" facts={facts} />;
}
