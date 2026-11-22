"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  History,
  LoaderCircle,
  RefreshCw,
  Search,
} from "lucide-react";

import { useExecutionHistory } from "@/features/approvals/hooks";

interface ExecutionHistoryProps {
  businessId: string;
}

type DateFilter = "all" | "7d" | "30d";

const PAGE_SIZE = 10;

function formatDate(value?: string | null): string {
  if (!value) return "Not available";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Invalid date";

  return date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getMessageDraft(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) {
    return value;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "message" in value &&
    typeof value.message === "string" &&
    value.message.trim()
  ) {
    return value.message;
  }

  return null;
}

export function ExecutionHistory({ businessId }: ExecutionHistoryProps) {
  const { data, isPending, isError, isFetching, refetch } =
    useExecutionHistory(businessId);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
  }, []);

  const actions = data?.data ?? [];
  const query = searchQuery.trim().toLowerCase();
 
  const days = dateFilter === "7d" ? 7 : dateFilter === "30d" ? 30 : 0;
  const cutoff = now === null ? null : now - days * 24 * 60 * 60 * 1000;

  const filteredActions = actions.filter((action) => {
    const customerName = String(action.payload?.customerName ?? "").toLowerCase();
    const matchesSearch =
      !query ||
      customerName.includes(query) ||
      action.id.toLowerCase().includes(query);

    if (!matchesSearch) return false;
    if (dateFilter === "all") return true;
    if (now === null || cutoff === null || !action.executed_at) return false;

    const executedAt = new Date(action.executed_at).getTime();
    return Number.isFinite(executedAt) && executedAt >= cutoff && executedAt <= now;
  });

  const totalPages = Math.max(1, Math.ceil(filteredActions.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const paginatedActions = filteredActions.slice(startIndex, startIndex + PAGE_SIZE);

  function handleSearchChange(value: string) {
    setSearchQuery(value);
    setCurrentPage(1);
    setExpandedId(null);
  }

  function handleDateFilterChange(value: DateFilter) {
    setDateFilter(value);
    setCurrentPage(1);
    setExpandedId(null);
  }

  return (
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-blue-600" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-slate-900">Execution History</h2>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Completed customer message simulations. No real messages were sent.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw
            aria-hidden="true"
            className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      <div className="relative mt-5">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        />
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => handleSearchChange(event.target.value)}
          placeholder="Search by customer name or action ID..."
          aria-label="Search execution history"
          className="min-h-11 w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-slate-900 outline-none focus:border-blue-500"
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label htmlFor="execution-date-filter" className="text-sm font-medium text-slate-600">
          Execution Date
        </label>
        <select
          id="execution-date-filter"
          value={dateFilter}
          onChange={(event) => handleDateFilterChange(event.target.value as DateFilter)}
          className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-500"
        >
          <option value="all">All Dates</option>
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
        </select>
      </div>

      {isPending ? (
        <div role="status" className="mt-6 flex items-center gap-3 py-8 text-sm text-slate-500">
          <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" />
          Loading execution history...
        </div>
      ) : isError ? (
        <div role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Unable to load execution history. Please try again using Refresh.
        </div>
      ) : actions.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-slate-200 p-8 text-center">
          <History className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
          <p className="mt-3 text-sm font-medium text-slate-700">
            No completed simulations yet.
          </p>
        </div>
      ) : filteredActions.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-slate-200 p-8 text-center">
          <Search className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
          <p className="mt-3 text-sm font-medium text-slate-700">
            No simulations match your filters.
          </p>
          <button
            type="button"
            onClick={() => {
              handleSearchChange("");
              handleDateFilterChange("all");
            }}
            className="mt-3 text-sm font-medium text-blue-600 hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          <p className="text-xs text-slate-500">
            Showing {startIndex + 1}–{Math.min(startIndex + PAGE_SIZE, filteredActions.length)} of{" "}
            {filteredActions.length} matching simulations ({actions.length} recent records loaded)
          </p>

          {paginatedActions.map((action) => {
            const expanded = expandedId === action.id;
            const customerName = action.payload?.customerName ?? "Customer";
            const message = getMessageDraft(action.payload?.messageDraft);

            return (
              <article
                key={action.id}
                className="min-w-0 overflow-hidden rounded-xl border border-slate-200"
              >
                <button
                  type="button"
                  aria-expanded={expanded}
                  onClick={() => setExpandedId(expanded ? null : action.id)}
                  className="flex w-full flex-wrap items-center justify-between gap-3 p-4 text-left hover:bg-slate-50"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                      <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="break-words text-sm font-semibold text-slate-900">
                        {customerName}
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatDate(action.executed_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                      Completed
                    </span>
                    {expanded ? (
                      <ChevronUp className="h-4 w-4 text-slate-500" aria-hidden="true" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-500" aria-hidden="true" />
                    )}
                  </div>
                </button>

                {expanded && (
                  <div className="space-y-4 border-t border-slate-200 bg-slate-50/50 p-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-xs text-slate-500">Approved By</p>
                        <p className="mt-1 text-sm font-medium text-slate-900">
                          {action.approved_by ?? "Not available"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Approved At</p>
                        <p className="mt-1 text-sm font-medium text-slate-900">
                          {formatDate(action.approved_at)}
                        </p>
                      </div>
                      <div>
                        <p className="flex items-center gap-1 text-xs text-slate-500">
                          <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                          Executed At
                        </p>
                        <p className="mt-1 text-sm font-medium text-slate-900">
                          {formatDate(action.executed_at)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Delivery Mode</p>
                        <p className="mt-1 text-sm font-medium text-slate-900">
                          Simulation Only
                        </p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <h4 className="text-sm font-semibold text-slate-900">
                        Saved AI Message
                      </h4>
                      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">
                        {message ?? "Message not available"}
                      </p>
                    </div>
                    <p className="break-all text-xs text-slate-400">
                      Action ID: {action.id}
                    </p>
                  </div>
                )}
              </article>
            );
          })}

          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
              <p className="text-sm text-slate-500">
                Page {safePage} of {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={safePage === 1}
                  onClick={() => {
                    setCurrentPage(Math.max(1, safePage - 1));
                    setExpandedId(null);
                  }}
                  className="min-h-10 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={safePage === totalPages}
                  onClick={() => {
                    setCurrentPage(Math.min(totalPages, safePage + 1));
                    setExpandedId(null);
                  }}
                  className="min-h-10 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
