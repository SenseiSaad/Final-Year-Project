import type { Metadata } from "next";

import { ChatView } from "@/components/workspace/chat/ChatView";

export const metadata: Metadata = { title: "AI chat" };

export default function ChatPage() {
  return <ChatView />;
}
