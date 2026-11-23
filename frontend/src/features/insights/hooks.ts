
"use client";

import { useMutation } from "@tanstack/react-query";
import { generateBusinessInsights } from "./api";

export function useGenerateBusinessInsights() {
  return useMutation({
    mutationKey: ["insights", "generate"],
    mutationFn: (businessId: string) =>
      generateBusinessInsights(businessId),
  });
}
