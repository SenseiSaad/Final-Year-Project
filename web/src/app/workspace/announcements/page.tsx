import type { Metadata } from "next";
import { Suspense } from "react";

import { AnnouncementsView } from "@/components/workspace/announcements/AnnouncementsView";

export const metadata: Metadata = { title: "Announcements" };

export default function AnnouncementsPage() {
  return (
    <Suspense>
      <AnnouncementsView />
    </Suspense>
  );
}
