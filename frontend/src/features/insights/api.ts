
import { apiClient } from "@/lib/api/client";

export interface GenerateInsightsResponse {
  success: boolean;
  message: string;
  data: {
    businessId: string;
    provider: string;
    model: string;
    insights: unknown;
    latencyMs: number;
    usage: unknown;
    generatedAt: string;
  };
}

export async function generateBusinessInsights(
  businessId: string
): Promise<GenerateInsightsResponse> {
  const { data } =
    await apiClient.post<GenerateInsightsResponse>(
      "/agent/insights",
      {
        businessId,
      }
    );

  return data;
}
