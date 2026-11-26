import type { Metadata } from "next";

import { TeamChatView } from "@/components/workspace/chat/TeamChatView";

export const metadata: Metadata = { title: "Team chat" };

export default function TeamPage() {
  return <TeamChatView />;
}
