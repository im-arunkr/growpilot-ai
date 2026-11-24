
import { apiClient } from "@/lib/api/client";

export interface AIModelStatus {
  available: boolean;
  provider: string;
  configuredModel: string;
  installedModels?: string[];
  error?: string;
}

export interface AIModelStatusResponse {
  success: boolean;
  message: string;
  data: AIModelStatus;
}

/**
 * Fetch Ollama connection and configured model status.
 *
 * HTTP 200 = Model available
 * HTTP 503 = Model unavailable
 *
 * Both responses contain useful model status data.
 *
 * Read-only request.
 */
export async function getAIModelStatus():
  Promise<AIModelStatusResponse> {
  const { data } =
    await apiClient.get<AIModelStatusResponse>(
      "/agent/models/status",
      {
        validateStatus: (status) =>
          status === 200 || status === 503,

        timeout: 10000,
      }
    );

  return data;
}
export interface BusinessGoal {
  id: string;
  business_id: string;
  title: string;
  description: string;
  goal_type: string;
  target_metric: string;
  baseline_value: number | null;
  target_value: number | null;
  due_at: string | null;
  status: string;
}

export async function getActiveBusinessGoal(
  businessId: string
): Promise<{
  success: boolean;
  message: string;
  data: BusinessGoal | null;
}> {
  const response = await apiClient.get(
    "/agent/goals/active",
    {
      params: { businessId },
    }
  );

  return response.data;
}

export interface SaveBusinessGoalRequest {
  businessId: string;
  title: string;
  description: string;
  baseline: number;
  target: number;
  dueAt: string | null;
}

export async function saveBusinessGoal(
  request: SaveBusinessGoalRequest
): Promise<{
  success: boolean;
  message: string;
  data: BusinessGoal;
}> {
  const response = await apiClient.post(
    "/agent/goals",
    request
  );

  return response.data;
}
