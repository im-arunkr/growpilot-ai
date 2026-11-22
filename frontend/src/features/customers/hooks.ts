
"use client";

import { useQuery } from "@tanstack/react-query";
import { getCustomerRetention } from "./api";

export function useCustomerRetention(businessId: string) {
  return useQuery({
    queryKey: ["customers", "retention", businessId],
    queryFn: () => getCustomerRetention(businessId),
    enabled: Boolean(businessId),
    staleTime: 60_000,
  });
}
