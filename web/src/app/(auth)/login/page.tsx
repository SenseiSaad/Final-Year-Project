import type { Metadata } from "next";

import { LoginView } from "@/components/workspace/login/LoginView";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return <LoginView />;
}
