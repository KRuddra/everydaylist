"use client";

import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useExport } from "@/lib/query/hooks/useExport";
import { useOnlineStatus } from "@/lib/query/useOnlineStatus";

/**
 * One-tap JSON backup download, always visible in the header (never nested
 * in a menu — see `docs/UI_SPEC.md` §1). Disabled while offline (export
 * requires a live network call, per `docs/API_CONTRACT.md` #12).
 */
export function ExportButton() {
  const isOnline = useOnlineStatus();
  const exportMutation = useExport();

  async function handleClick() {
    try {
      await exportMutation.mutateAsync();
      toast.success("Backup exported");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export failed. Try again.");
    }
  }

  const disabled = !isOnline || exportMutation.isPending;

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Export backup"
      title={!isOnline ? "Unavailable offline" : undefined}
      aria-describedby={!isOnline ? "export-offline-hint" : undefined}
      disabled={disabled}
      onClick={handleClick}
    >
      {exportMutation.isPending ? (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        <Download className="size-4" aria-hidden="true" />
      )}
      {!isOnline ? (
        <span id="export-offline-hint" className="sr-only">
          Unavailable offline
        </span>
      ) : null}
    </Button>
  );
}
