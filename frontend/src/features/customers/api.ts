
import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import type { CustomerRetentionResponse } from "./types";

export async function getCustomerRetention(
  businessId: string
): Promise<CustomerRetentionResponse> {
  const { data } = await apiClient.get<CustomerRetentionResponse>(
    API_ENDPOINTS.customers.retention,
    {
      params: { businessId },
    }
  );

  return data;
}
