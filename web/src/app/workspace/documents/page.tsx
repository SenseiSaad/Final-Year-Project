import { Suspense } from "react";

import { DocumentsView } from "@/components/workspace/documents/DocumentsView";

export const metadata = { title: "Documents" };

export default function DocumentsPage() {
  return (
    <Suspense fallback={null}>
      <DocumentsView />
    </Suspense>
  );
}
