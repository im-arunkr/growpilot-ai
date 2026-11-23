
"use client";

import { useQuery } from "@tanstack/react-query";
import { getAIModelStatus } from "./api";

/**
 * Fetch the configured Ollama model status.
 *
 * - Does not run AI inference.
 * - Does not change model settings.
 * - Supports online and offline states.
 */
export function useAIModelStatus() {
  return useQuery({
    queryKey: ["settings", "ai-model-status"],
    queryFn: getAIModelStatus,
    staleTime: 30_000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
