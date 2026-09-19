"use client";

import { useMutation, type UseMutationResult } from "@tanstack/react-query";

import { downloadExport } from "@/lib/api/client";
import type { ExportResponse } from "@/lib/api/schemas";

/**
 * Triggers the one-tap JSON backup download (`ExportButton`). A plain
 * (non-offline-outbox) mutation: export requires a live network call — per
 * `docs/UI_SPEC.md` §1, `ExportButton` is disabled while offline, so this is
 * never invoked without connectivity in the first place, and it deliberately
 * has no `mutationKey`/registered default (nothing to resume after a
 * reload).
 */
export function useExport(): UseMutationResult<ExportResponse, Error, void> {
  return useMutation({
    mutationFn: downloadExport,
  });
}
