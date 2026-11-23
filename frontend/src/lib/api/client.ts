
import axios, {
  AxiosError,
  type InternalAxiosRequestConfig,
} from "axios";

import { supabaseAuth } from "@/lib/supabase/client";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:5000/api";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * GrowPilot AI — Supabase Authentication Interceptor
 *
 * Automatically attaches the current access token
 * to every backend API request.
 *
 * The backend must independently validate the token
 * and verify business membership.
 */
apiClient.interceptors.request.use(
  async (
    config: InternalAxiosRequestConfig
  ): Promise<InternalAxiosRequestConfig> => {
    // Never reuse an Authorization header from
    // a previous authenticated session.
    delete config.headers.Authorization;

    const { data, error } =
      await supabaseAuth.auth.getSession();

    if (error) {
      throw new Error(
        "Unable to verify your login session."
      );
    }

    const token = data.session?.access_token;

    if (!token) {
      throw new Error(
        "Your session has expired. Please sign in again."
      );
    }

    config.headers.set(
      "Authorization",
      `Bearer ${token}`
    );

    return config;
  }
);

export interface ApiErrorResponse {
  success?: boolean;
  errorCode?: string;
  message?: string;
}

export function getApiErrorMessage(
  error: unknown
): string {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    const axiosError =
      error as AxiosError<ApiErrorResponse>;

    if (!axiosError.response) {
      return "Cannot connect to GrowPilot AI backend.";
    }

    if (axiosError.response.status === 401) {
      return "Your session is invalid or expired. Please sign in again.";
    }

    if (axiosError.response.status === 403) {
      return "You do not have permission to access this business.";
    }

    return (
      axiosError.response.data?.message ||
      `API request failed (${axiosError.response.status}).`
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred.";
}
