import type { Metadata } from "next";

import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { facts } from "@/lib/facts";

export const metadata: Metadata = {
  title: "Workspace",
  description: "Open DocuTrust AI workspace with Chat, Team chat, Document upload, OKF and Audit log.",
};

export default function DashboardPage() {
  return <DashboardShell role="admin" facts={facts} />;
}
