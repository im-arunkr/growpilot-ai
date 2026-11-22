
import { apiClient } from "@/lib/api/client";

export interface MonthlyAnalyticsTrend {
  month: string;
  totalTransactions: number;
  completedTransactions: number;
  totalRevenue: number;
  totalTransactionValue: number;
  completionRate: number;
}

export interface BusinessAnalyticsData {
  business: {
    id: string;
    name: string;
    owner_name: string;
  };
  summary: {
    totalCustomers: number;
    totalTransactions: number;
    completedTransactions: number;
    totalRevenue: number;
    totalTransactionValue: number;
    customersWithCompletedTransactions: number;
  };
  monthlyTrends: MonthlyAnalyticsTrend[];
  generatedAt: string;
}

export interface BusinessAnalyticsResponse {
  success: boolean;
  message: string;
  data: BusinessAnalyticsData;
}

/**
 * Fetch business analytics including monthly trends.
 *
 * Read-only API.
 */
export async function getBusinessAnalytics(
  businessId: string
): Promise<BusinessAnalyticsResponse> {
  const { data } =
    await apiClient.get<BusinessAnalyticsResponse>(
      "/analytics",
      {
        params: { businessId },
      }
    );

  return data;
}
