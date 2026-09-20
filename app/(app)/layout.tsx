import type { ReactNode } from "react";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppNav } from "@/components/shell/AppNav";
import { ExportButton } from "@/components/shell/ExportButton";
import { IOSInstallHint } from "@/components/shell/IOSInstallHint";
import { OfflineBanner } from "@/components/shell/OfflineBanner";
import { OverflowMenu } from "@/components/shell/OverflowMenu";
import { QuickAddFabSlot } from "@/components/shell/QuickAddFabSlot";
import { Toaster } from "@/components/ui/sonner";

/**
 * Authenticated app shell — sticky header (title + `OfflineBanner` +
 * `ExportButton` + overflow menu), `IOSInstallHint`, screen content wrapped
 * in `ErrorBoundary`, the `QuickAddFab` slot, `AppNav`, and `Toaster`
 * (`docs/UI_SPEC.md` §1). `PersistQueryClientProvider` lives one level up,
 * in the root `app/Providers.tsx`, so `/login` can use mutation hooks too.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col md:pl-20">
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border/60 bg-background/95 px-4 backdrop-blur-sm supports-backdrop-filter:bg-background/80">
        <h1 className="text-sm font-medium text-muted-foreground">Everyday List</h1>
        <div className="flex items-center gap-1">
          <OfflineBanner />
          <ExportButton />
          <OverflowMenu />
        </div>
      </header>

      <IOSInstallHint />

      <ErrorBoundary>
        <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pb-24 md:px-8">{children}</main>
      </ErrorBoundary>

      <QuickAddFabSlot />
      <AppNav />
      <Toaster />
    </div>
  );
}
