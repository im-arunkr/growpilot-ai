
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
