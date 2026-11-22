
"use client";

import { useState } from "react";
import {
  Activity,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock3,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";

import { useAgentHistory } from "@/features/agent/hooks";
import type { AgentHistoryEvent } from "@/features/agent/api";
import { getApiErrorMessage } from "@/lib/api/client";

interface AgentActivityHistoryProps {
  businessId: string;
}

const PAGE_SIZE = 10;

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatLabel(value: string): string {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getDetail(
  details: AgentHistoryEvent["details"],
  key: string
): string | null {
  const value = details?.[key];

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }

  return null;
}

export function AgentActivityHistory({
  businessId,
}: AgentActivityHistoryProps) {
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] =
    useState<number | null>(null);

  const {
    data,
    isPending,
    isError,
    isFetching,
    error,
    refetch,
  } = useAgentHistory(businessId, page, PAGE_SIZE);

  const events = data?.data ?? [];
  const pagination = data?.pagination;

  const totalPages = Math.max(
    1,
    pagination?.totalPages ?? 1
  );

  function changePage(nextPage: number) {
    setPage(Math.max(1, Math.min(nextPage, totalPages)));
    setExpandedId(null);
  }

  return (
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      {/* Heading */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Activity
              className="h-5 w-5 text-blue-600"
              aria-hidden="true"
            />

            <h2 className="text-lg font-semibold text-slate-900">
              Agent Activity History
            </h2>
          </div>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Review recorded AI agent events, tool activity
            and execution details from previous runs.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${
              isFetching ? "animate-spin" : ""
            }`}
          />
          Refresh
        </button>
      </div>

      {/* Loading */}
      {isPending ? (
        <div
          role="status"
          className="mt-6 flex items-center gap-3 py-8 text-sm text-slate-500"
        >
          <LoaderCircle className="h-5 w-5 animate-spin" />
          Loading agent activity...
        </div>
      ) : isError ? (
        <div
          role="alert"
          className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4"
        >
          <p className="text-sm font-semibold text-red-700">
            Unable to load agent history
          </p>

          <p className="mt-2 text-sm text-red-600">
            {getApiErrorMessage(error)}
          </p>
        </div>
      ) : events.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-slate-200 p-8 text-center">
          <Activity className="mx-auto h-8 w-8 text-slate-400" />

          <p className="mt-3 text-sm font-medium text-slate-700">
            No agent activity recorded yet.
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          <p className="text-xs text-slate-500">
            Showing {events.length} events on page {page}
            {" · "}
            {pagination?.total ?? events.length} total events
          </p>

          {/* Event List */}
          {events.map((event) => {
            const expanded = expandedId === event.id;

            const model =
              event.model_name ??
              getDetail(event.details, "model");

            const latency =
              event.latency_ms ??
              (typeof event.details?.latencyMs === "number"
                ? event.details.latencyMs
                : null);

            return (
              <article
                key={event.id}
                className="min-w-0 overflow-hidden rounded-xl border border-slate-200"
              >
                <button
                  type="button"
                  aria-expanded={expanded}
                  onClick={() =>
                    setExpandedId(
                      expanded ? null : event.id
                    )
                  }
                  className="flex w-full flex-wrap items-center justify-between gap-3 p-4 text-left hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <h3 className="break-words text-sm font-semibold text-slate-900">
                      {formatLabel(event.event_type)}
                    </h3>

                    <p className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                      <Clock3 className="h-3.5 w-3.5 shrink-0" />
                      {formatDate(event.created_at)}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium capitalize text-slate-700">
                      {event.severity}
                    </span>

                    {expanded ? (
                      <ChevronUp className="h-4 w-4 text-slate-500" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-500" />
                    )}
                  </div>
                </button>

                {expanded && (
                  <div className="space-y-4 border-t border-slate-200 bg-slate-50/50 p-4">
                    <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                      <div>
                        <p className="text-xs text-slate-500">
                          Tool
                        </p>
                        <p className="mt-1 font-medium text-slate-900">
                          {event.tool_name ?? "Not applicable"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-500">
                          AI Model
                        </p>
                        <p className="mt-1 font-medium text-slate-900">
                          {model ?? "Not applicable"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-500">
                          Latency
                        </p>
                        <p className="mt-1 font-medium text-slate-900">
                          {latency !== null
                            ? `${(latency / 1000).toFixed(2)} seconds`
                            : "Not recorded"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-500">
                          Event ID
                        </p>
                        <p className="mt-1 font-medium text-slate-900">
                          {event.id}
                        </p>
                      </div>
                    </div>

                    {event.details &&
                      Object.keys(event.details).length > 0 && (
                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                          <h4 className="text-sm font-semibold text-slate-900">
                            Recorded Event Details
                          </h4>

                          <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-words text-xs leading-6 text-slate-600">
                            {JSON.stringify(
                              event.details,
                              null,
                              2
                            )}
                          </pre>
                        </div>
                      )}

                    <p className="break-all text-xs text-slate-500">
                      Run ID: {event.run_id}
                    </p>

                    {event.action_id && (
                      <p className="break-all text-xs text-slate-500">
                        Action ID: {event.action_id}
                      </p>
                    )}
                  </div>
                )}
              </article>
            );
          })}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
              <p className="text-sm text-slate-500">
                Page {page} of {totalPages}
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1 || isFetching}
                  onClick={() => changePage(page - 1)}
                  className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>

                <button
                  type="button"
                  disabled={
                    page >= totalPages || isFetching
                  }
                  onClick={() => changePage(page + 1)}
                  className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 disabled:opacity-40"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <p className="mt-5 text-xs leading-5 text-slate-500">
        Historical events are read-only. This section does
        not initiate AI runs or send customer messages.
      </p>
    </section>
  );
}
