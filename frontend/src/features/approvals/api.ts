
import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import type {
  GenerateMessageDraftRequest,
  GenerateMessageDraftResponse,
} from "./types";
import type {
  ApprovalsListResponse,
  ApprovalDecisionRequest,
  ApprovalDecisionResponse,
  ApprovalAction,
} from "./types";

/**
 * Fetch pending actions requiring human approval.
 */
export async function getPendingApprovals(
  businessId: string
): Promise<ApprovalsListResponse> {
  const { data } = await apiClient.get<ApprovalsListResponse>(
    API_ENDPOINTS.approvals.list,
    {
      params: { businessId },
    }
  );

  return data;
}


/**
 * Submit a human approval or rejection decision.
 *
 * Backend validates the saved message draft before approval.
 * This operation does not execute or send a message.
 */
export async function submitApprovalDecision(
  actionId: string,
  request: ApprovalDecisionRequest
): Promise<ApprovalDecisionResponse> {
  const { data } =
    await apiClient.patch<ApprovalDecisionResponse>(
      API_ENDPOINTS.approvals.decision(actionId),
      request
    );

  return data;
}

/**
 * Execute a previously approved action.
 *
 * Demo backend must enforce simulation-only delivery.
 */

export async function executeApprovedAction(
  actionId: string,
  businessId: string
): Promise<unknown> {
  const { data } = await apiClient.post(
    API_ENDPOINTS.approvals.execute(actionId),
    {
      businessId,
    }
  );

  return data;
}


/**
 * Generate a customer-specific AI message draft.
 *
 * Backend validates and persists the message
 * into the pending agent action.
 *
 * This does not send a message.
 */
export async function generateMessageDraft(
  request: GenerateMessageDraftRequest
): Promise<GenerateMessageDraftResponse> {
  const { data } =
    await apiClient.post<GenerateMessageDraftResponse>(
      API_ENDPOINTS.agent.messageDraft,
      request,
      {
        timeout: 120000,
      }
    );

  return data;
}

/**
 * Fetch details of a specific approval action.
 *
 * Supports pending, approved, rejected,
 * completed and failed actions.
 *
 * This is a read-only request.
 */
export async function getApprovalDetails(
  actionId: string,
  businessId: string
): Promise<{
  success: boolean;
  data: ApprovalAction;
}> {
  const { data } = await apiClient.get<{
    success: boolean;
    data: ApprovalAction;
  }>(
    API_ENDPOINTS.approvals.detail(actionId),
    {
      params: { businessId },
    }
  );

  return data;
}

export interface ExecutionHistoryResponse {
  success: boolean;
  message: string;
  data: ApprovalAction[];
  total: number;
}

/**
 * Fetch completed simulated execution history.
 *
 * Read-only API.
 */
export async function getExecutionHistory(
  businessId: string
): Promise<ExecutionHistoryResponse> {
  const { data } =
    await apiClient.get<ExecutionHistoryResponse>(
      "/approvals/history",
      {
        params: { businessId },
      }
    );

  return data;
}

/**
 * Response for approved actions awaiting simulation.
 */
export interface ApprovedActionsResponse {
  success: boolean;
  message: string;
  data: ApprovalAction[];
  total: number;
}

/**
 * Fetch approved actions for a business.
 *
 * Read-only request.
 * Does not execute customer messages.
 */
export async function getApprovedActions(
  businessId: string
): Promise<ApprovedActionsResponse> {
  const { data } =
    await apiClient.get<ApprovedActionsResponse>(
      "/approvals/approved",
      {
        params: { businessId },
      }
    );

  return data;
}
