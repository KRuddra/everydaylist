"use client";

import { useMutation, useQuery, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import type { NoteResponse } from "@/lib/api/schemas";
import { queryKeys } from "@/lib/query/keys";
import { mutationKeys } from "@/lib/query/mutationKeys";
import type { SaveNoteVariables } from "@/lib/query/mutationTypes";

/** The single persistent general note (`GET /api/notes`). */
export function useNote(): UseQueryResult<NoteResponse> {
  return useQuery({
    queryKey: queryKeys.note,
    queryFn: () => apiClient.getNote(),
  });
}

/**
 * Saves the general note. Optimistic + offline-resumable defaults live in
 * `registerMutationDefaults.ts` (keyed by `mutationKeys.saveNote`); this hook
 * only supplies the types.
 */
export function useSaveNote(): UseMutationResult<NoteResponse, Error, SaveNoteVariables> {
  return useMutation<NoteResponse, Error, SaveNoteVariables>({
    mutationKey: mutationKeys.saveNote,
  });
}
