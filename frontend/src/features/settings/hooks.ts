
"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

import {
  getAIModelStatus,
  getActiveBusinessGoal,
  saveBusinessGoal,
} from "./api";

/**
 * Fetch the configured Ollama model status.
 *
 * - Does not run AI inference.
 * - Does not change model settings.
 * - Supports online and offline states.
 */
export function useAIModelStatus() {
  return useQuery({
    queryKey: ["settings", "ai-model-status"],
    queryFn: getAIModelStatus,
    staleTime: 30_000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

/**
 * Fetch the active business goal.
 *
 * - Read-only operation.
 * - Returns the current goal configuration.
 */
export function useActiveBusinessGoal(businessId: string) {
  return useQuery({
    queryKey: ["business-goal", "active", businessId],
    queryFn: () => getActiveBusinessGoal(businessId),
    enabled: Boolean(businessId),
    staleTime: 30_000,
  });
}

/**
 * Save a new active business goal.
 *
 * - Backend verifies owner/admin authorization.
 * - Backend validates goal configuration.
 * - Previous active goal is paused.
 * - New goal becomes active.
 * - Refreshes Settings and Dashboard data.
 */
export function useSaveBusinessGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: saveBusinessGoal,

    onSuccess: async (_response, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [
            "business-goal",
            "active",
            variables.businessId,
          ],
        }),

        queryClient.invalidateQueries({
          queryKey: ["dashboard"],
        }),
      ]);
    },
  });
}
