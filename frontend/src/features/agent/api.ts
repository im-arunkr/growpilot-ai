
import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";

import type {
  AgentRunRequest,
  AgentRunResponse,
} from "./types";

/**
 * Execute the GrowPilot AI customer retention agent.
 *
 * The backend generates an action plan and saves actions
 * for human approval.
 *
 * No customer messages are sent by this request.
 */
export async function runAgent(
  request: AgentRunRequest
): Promise<AgentRunResponse> {
  const { data } = await apiClient.post<AgentRunResponse>(
    API_ENDPOINTS.agent.run,
    request,
    {
      // Ollama inference can take longer than normal API calls.
      timeout: 120000,
    }
  );

  return data;
}

export interface AgentHistoryEvent {
  id: number;
  business_id: string;
  run_id: string;
  action_id: string | null;
  event_type: string;
  severity: string;
  tool_name: string | null;
  model_name: string | null;
  latency_ms: number | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface AgentHistoryResponse {
  success: boolean;
  message: string;
  data: AgentHistoryEvent[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  filters: {
    businessId: string;
    runId: string | null;
  };
  generatedAt: string;
}

/**
 * Fetch stored agent execution events.
 *
 * Read-only. Does not trigger an agent run.
 */
export async function getAgentHistory(
  businessId: string,
  page = 1,
  limit = 20
): Promise<AgentHistoryResponse> {
  const { data } = await apiClient.get<AgentHistoryResponse>(
    "/agent/history",
    {
      params: {
        businessId,
        page,
        limit,
      },
    }
  );

  return data;
}
