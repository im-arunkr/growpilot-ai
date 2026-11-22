
import Link from "next/link";
import { ArrowUpRight, Clock3 } from "lucide-react";

import type { RecentRun } from "@/features/dashboard/types";

interface RecentRunsProps {
  runs: RecentRun[];
}

const statusStyles: Record<string, string> = {
  completed: "bg-emerald-50 text-emerald-700",
  waiting_approval: "bg-amber-50 text-amber-700",
  running: "bg-blue-50 text-blue-700",
  queued: "bg-slate-100 text-slate-700",
  failed: "bg-red-50 text-red-700",
  cancelled: "bg-slate-100 text-slate-600",
};

export function RecentRuns({ runs }: RecentRunsProps) {
  return (
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Recent Agent Runs
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Latest AI agent execution history
          </p>
        </div>

        <Link
          href="/history"
          className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          View All
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-5 divide-y divide-slate-100">
        {runs.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-500">
            No agent runs found.
          </p>
        )}

        {runs.map((run) => (
          <div
            key={run.id}
            className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Clock3 className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">
                  Run #{run.id.slice(0, 8)}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {new Date(run.started_at).toLocaleString(
                    "en-IN",
                    {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }
                  )}
                </p>
              </div>
            </div>

            <span
              className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium ${
                statusStyles[run.status] ??
                "bg-slate-100 text-slate-600"
              }`}
            >
              {run.status.replaceAll("_", " ")}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
