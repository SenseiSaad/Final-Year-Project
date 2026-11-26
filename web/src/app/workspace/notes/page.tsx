import type { Metadata } from "next";
import { Suspense } from "react";

import { NotesView } from "@/components/workspace/notes/NotesView";

export const metadata: Metadata = { title: "Notes" };

export default function NotesPage() {
  return (
    <Suspense>
      <NotesView />
    </Suspense>
  );
}
