
"use client";

import { useState } from "react";

import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";

import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "sonner";

import { AuthProvider } from "@/providers/auth-provider";

export function AppProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
        <Toaster
          richColors
          position="top-right"
        />
      </AuthProvider>

      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
