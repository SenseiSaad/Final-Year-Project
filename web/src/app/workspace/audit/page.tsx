import type { Metadata } from "next";

import { AuditView } from "@/components/workspace/audit/AuditView";

export const metadata: Metadata = { title: "Audit log" };

export default function AuditPage() {
  return <AuditView />;
}
