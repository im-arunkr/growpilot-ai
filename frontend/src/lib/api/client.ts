
import axios, { AxiosError } from "axios";

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

export interface ApiErrorResponse {
  success?: boolean;
  errorCode?: string;
  message?: string;
}

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    const axiosError = error as AxiosError<ApiErrorResponse>;

    if (!axiosError.response) {
      return "Cannot connect to GrowPilot AI backend.";
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
