
"use client";

import { useQuery } from "@tanstack/react-query";
import { getDashboardSummary } from "./api";

export function useDashboardSummary(businessId: string) {
  return useQuery({
    queryKey: ["dashboard", "summary", businessId],
    queryFn: () => getDashboardSummary(businessId),
    enabled: Boolean(businessId),
  });
}
