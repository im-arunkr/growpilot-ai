
"use client";
import { toast } from "sonner";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  getPendingApprovals,
  submitApprovalDecision,
  executeApprovedAction,
  generateMessageDraft,
  getApprovalDetails,
  getExecutionHistory,
  getApprovedActions,
} from "./api";

import type {
  ApprovalDecisionRequest,
  GenerateMessageDraftRequest,
} from "./types";

export function usePendingApprovals(
  businessId: string
) {
  return useQuery({
    queryKey: ["approvals", "pending", businessId],
    queryFn: () => getPendingApprovals(businessId),
    enabled: Boolean(businessId),
    staleTime: 30_000,
  });
}


export function useApprovalDecision() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      actionId,
      request,
    }: {
      actionId: string;
      request: ApprovalDecisionRequest;
    }) => submitApprovalDecision(actionId, request),

    onSuccess: async (response) => {
      toast.success(
        response.message || "Decision saved successfully."
      );

      if (response.warning) {
        toast.warning(response.warning);
      }

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["approvals"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["dashboard"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["agent", "history"],
        }),
      ]);
    },
  });
}



export function useExecuteApprovedAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      actionId,
      businessId,
    }: {
      actionId: string;
      businessId: string;
    }) => executeApprovedAction(actionId, businessId),

    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["approvals"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["dashboard"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["agent", "history"],
        }),
      ]);
    },
  });
}


/**
 * Generate and save an AI message draft
 * for a pending customer action.
 */


export function useGenerateMessageDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      request: GenerateMessageDraftRequest
    ) => generateMessageDraft(request),

    onSuccess: async (response) => {
      if (
        !response.success ||
        response.data.draftPersisted !== true
      ) {
        return;
      }

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["approvals"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["dashboard"],
        }),
      ]);
    },
  });
}


/**
 * Fetch the latest details of a specific approval action.
 *
 * Works for pending, approved, rejected
 * and completed actions.
 *
 * Read-only: does not change action status.
 */
export function useApprovalDetails(
  actionId: string | null,
  businessId: string
) {
  return useQuery({
    queryKey: [
      "approvals",
      "detail",
      businessId,
      actionId,
    ],
    queryFn: () =>
      getApprovalDetails(actionId!, businessId),
    enabled: Boolean(actionId && businessId),
    staleTime: 30_000,
  });
}


/**
 * Fetch completed simulated execution history.
 *
 * Automatically refreshes when the query is invalidated.
 * Read-only: no messages are sent.
 */
export function useExecutionHistory(businessId: string) {
  return useQuery({
    queryKey: ["approvals", "history", businessId],
    queryFn: () => getExecutionHistory(businessId),
    enabled: Boolean(businessId),
    staleTime: 30_000,
  });
}

/**
 * Fetch approved actions awaiting simulated execution.
 *
 * Read-only request.
 * Automatically refreshes after approval or execution.
 */
export function useApprovedActions(businessId: string) {
  return useQuery({
    queryKey: ["approvals", "approved", businessId],
    queryFn: () => getApprovedActions(businessId),
    enabled: Boolean(businessId),
    staleTime: 30_000,
  });
}
