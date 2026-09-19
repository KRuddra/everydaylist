import type { Metadata } from "next";

import { LoginForm } from "@/components/auth/LoginForm";
import { OfflineBanner } from "@/components/shell/OfflineBanner";

export const metadata: Metadata = {
  title: "Log in — Everyday List",
};

/** Unauthenticated, minimal, centered — no `AppNav`/header shell (`docs/UI_SPEC.md` §2.5). */
export default function LoginPage() {
  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center gap-4 p-4">
      <OfflineBanner />
      <LoginForm />
    </main>
  );
}
