
import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import type { DashboardSummaryResponse } from "./types";

export async function getDashboardSummary(
  businessId: string
): Promise<DashboardSummaryResponse> {
  const { data } =
    await apiClient.get<DashboardSummaryResponse>(
      API_ENDPOINTS.dashboard.summary,
      {
        params: { businessId },
      }
    );

  return data;
}
