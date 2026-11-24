
"use client";

import Link from "next/link";
import { ArrowRight, GitBranch, RefreshCw } from "lucide-react";

import { useAgentHistory } from "@/features/agent/hooks";
import { getApiErrorMessage } from "@/lib/api/client";

type DataObject = Record<string, unknown>;

function asObject(value: unknown): DataObject {
  return value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
    ? (value as DataObject)
    : {};
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim()
    ? value
    : null;
}

function number(value: unknown): number | null {
  return typeof value === "number" &&
    Number.isFinite(value)
    ? value
    : null;
}

function label(value: string | null): string {
  return value
    ? value
      .replaceAll("_", " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
    : "Not available";
}

export function WorkerReplanningStatus({
  businessId,
  compact = false,
}: {
  businessId: string;
  compact?: boolean;
}) {
  const query = useAgentHistory(businessId, 1, 20);
  const events = query.data?.data ?? [];

  // Read-only: the component never resumes the agent.
  const resumeEvents = events.filter(
    (event) => event.event_type === "agent_run_resumed"
  );

  const latest = resumeEvents[0];

  const details = asObject(latest?.details);

  // Support both flat and nested persisted log formats.
  const results = asObject(details.results);
  const source =
    Object.keys(results).length > 0 ? results : details;

  const decision = asObject(source.nextDecision);
  const evidence = asObject(source.replanningEvidence);
  const replanning = asObject(source.replanning);
  const evaluation = asObject(source.evaluation);

  const decisionName = text(decision.decision);
  const nextRunId = text(replanning.nextRunId);
  const parentRunId =
    text(replanning.parentRunId) ??
    text(latest?.run_id);

  const cycleNumber = number(replanning.cycleNumber);
  const newActions = number(replanning.newActions);

  const actual =
    number(evaluation.actual) ??
    number(source.evaluationActual);

  const target =
    number(evaluation.target) ??
    number(source.evaluationTarget);

  const newTransactions =
    number(evidence.newCompletedTransactions);

  const started = replanning.started === true;
  const reason =
    text(decision.reason) ?? text(replanning.reason);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-slate-900">
              Autonomous Worker Status
            </h2>
          </div>

          <p className="mt-2 text-sm text-slate-500">
            Latest available persisted resume evidence.
            Read-only; no automatic execution.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void query.refetch()}
          disabled={query.isFetching}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${query.isFetching ? "animate-spin" : ""
              }`}
          />
          Refresh
        </button>
      </div>

      {query.isPending && (
        <p className="mt-5 text-sm text-slate-500">
          Loading worker history...
        </p>
      )}

      {query.isError && (
        <p role="alert" className="mt-5 text-sm text-red-700">
          {getApiErrorMessage(query.error)}
        </p>
      )}

      {!query.isPending && !query.isError && !latest && (
        <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
          No resume events found in the latest 20 history records.
        </p>
      )}

      {latest && (
        <div className="mt-5 space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">
                Latest Decision
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {label(decisionName)}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">
                Goal Progress
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {actual !== null && target !== null
                  ? `${actual}% / ${target}%`
                  : "Not available"}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">
                New Transactions
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {newTransactions ?? "Not available"}
              </p>
            </div>
          </div>

          {reason && (
            <p className="text-sm leading-6 text-slate-600">
              {reason}
            </p>
          )}

          {!compact && (
            <div className="rounded-xl border border-slate-200 p-4">
              <h3 className="font-semibold text-slate-900">
                Run Relationship
              </h3>

              <p className="mt-3 break-all text-xs text-slate-600">
                Parent Run: {parentRunId ?? "Not available"}
              </p>

              <div className="my-3 flex items-center gap-2 text-blue-600">
                <ArrowRight className="h-4 w-4" />
                <span className="text-xs">
                  {started
                    ? `Replanning Cycle ${cycleNumber ?? "—"}`
                    : "No new successor in this resume"}
                </span>
              </div>

              <p className="break-all text-xs text-slate-600">
                Successor Run: {nextRunId ?? "Not created in this resume"}
              </p>

              {newActions !== null && (
                <p className="mt-2 text-xs text-slate-600">
                  Proposed Actions: {newActions}
                </p>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-4 text-sm">
            <Link
              href="/agent"
              className="font-semibold text-blue-700 hover:underline"
            >
              Open Agent Workspace
            </Link>

            {started && (
              <Link
                href="/approvals"
                className="font-semibold text-blue-700 hover:underline"
              >
                Review New Actions
              </Link>
            )}
          </div>

          <p className="text-xs text-slate-400">
            Showing the latest matching event within the first
            20 history records. Earlier cycles may not appear.
            Simulated actions do not establish business impact.
          </p>
        </div>
      )}
    </section>
  );
}
