"use client";

import { useMutation, type UseMutationResult } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import type { LoginResponse, LogoutResponse } from "@/lib/api/schemas";

/**
 * Login/logout are plain (non-offline-outbox) mutations — both inherently
 * require a live network call (there's no meaningful "queue a login for
 * later"), so neither has a `mutationKey`/registered default to resume after
 * a reload.
 */

export function useLogin(): UseMutationResult<LoginResponse, Error, string> {
  return useMutation({
    mutationFn: (password: string) => apiClient.login(password),
  });
}

export function useLogout(): UseMutationResult<LogoutResponse, Error, void> {
  return useMutation({
    mutationFn: () => apiClient.logout(),
  });
}
