
"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  runAgent,
  getAgentHistory,
} from "./api";

import type { AgentRunRequest } from "./types";

/**
 * Mutation for executing the AI agent.
 */
export function useRunAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: AgentRunRequest) =>
      runAgent(request),

    onSuccess: async () => {
      // Refresh affected dashboard, approval and history data.
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["dashboard"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["approvals"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["agent", "history"],
        }),
      ]);
    },
  });
}

/**
 * Fetch stored agent execution events.
 *
 * Supports server-side pagination.
 * Read-only: does not execute the AI agent.
 */
export function useAgentHistory(
  businessId: string,
  page = 1,
  limit = 20
) {
  return useQuery({
    queryKey: [
      "agent",
      "history",
      businessId,
      page,
      limit,
    ],

    queryFn: () =>
      getAgentHistory(businessId, page, limit),

    enabled: Boolean(businessId),

    staleTime: 30_000,
  });
}
