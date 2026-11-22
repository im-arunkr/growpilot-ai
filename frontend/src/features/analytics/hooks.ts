
"use client";

import { useQuery } from "@tanstack/react-query";
import { getBusinessAnalytics } from "./api";

/**
 * Fetch business analytics with monthly trends.
 *
 * Read-only API.
 * Automatically caches analytics data.
 */
export function useBusinessAnalytics(businessId: string) {
  return useQuery({
    queryKey: ["analytics", "business", businessId],

    queryFn: () => getBusinessAnalytics(businessId),

    enabled: Boolean(businessId),

    staleTime: 30_000,
  });
}
