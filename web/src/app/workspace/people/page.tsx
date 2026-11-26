import type { Metadata } from "next";

import { DirectoryView } from "@/components/workspace/people/DirectoryView";

export const metadata: Metadata = { title: "People and roles" };

export default function PeoplePage() {
  return <DirectoryView />;
}
