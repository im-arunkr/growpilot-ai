
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, RefreshCw, ShieldCheck } from "lucide-react";

import { apiClient, getApiErrorMessage } from "@/lib/api/client";

type ResumeResult = {
  runId: string;
  status?: string;
  evaluation?: {
    success?: boolean;
    actual?: number;
    target?: number;
    targetReached?: boolean;
  };
  replanningEvidence?: {
    newBusinessEvidence: boolean;
    newCompletedTransactions: number;
  };
  nextDecision?: {
    decision: string;
    reason?: string;
    shouldReplan: boolean;
  };
  replanning?: {
    started: boolean;
    reason?: string;
    cycleNumber?: number;
    nextRunId?: string;
    newActions?: number;
    status?: string;
  };
};

type ResumeApiResponse = {
  success: boolean;
  message?: string;
  data: ResumeResult;
};

function formatStatus(value?: string) {
  return value
    ? value.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "Not available";
}

export function ReplanningPanel({
  businessId,
  initialRunId,
}: {
  businessId: string;
  initialRunId?: string;
}) {
  const [runId, setRunId] = useState(initialRunId ?? "");
  const queryClient = useQueryClient();

  useEffect(() => {
    if (initialRunId) {
      setRunId(initialRunId);
    }
  }, [initialRunId]);

  const mutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post<ResumeApiResponse>(
        `/agent/${runId.trim()}/resume`,
        { businessId }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || "Resume failed");
      }

      return response.data.data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["approvals"] }),
        queryClient.invalidateQueries({ queryKey: ["agent", "history"] }),
      ]);
    },
  });

  const result = mutation.data;
  const evaluation = result?.evaluation;
  const decision = result?.nextDecision;
  const replanning = result?.replanning;
  const evidence = result?.replanningEvidence;

  const validRunId =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      runId.trim()
    );

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-2">
        <RefreshCw className="h-5 w-5 text-blue-600" />
        <h2 className="text-lg font-semibold text-slate-900">
          Autonomous Feedback & Replanning
        </h2>
      </div>

      <p className="mt-2 text-sm text-slate-500">
        Resume a saved worker run, evaluate goal progress and generate
        a successor plan when new business evidence is available.
      </p>

      <div className="mt-5 space-y-3">
        <label
          htmlFor="resume-run-id"
          className="block text-sm font-medium text-slate-700"
        >
          Agent Run ID
        </label>

        <input
          id="resume-run-id"
          value={runId}
          onChange={(event) => setRunId(event.target.value)}
          placeholder="Enter existing run UUID"
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
        />

        <button
          type="button"
          disabled={!validRunId || mutation.isPending}
          onClick={() => mutation.mutate()}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${mutation.isPending ? "animate-spin" : ""}`}
          />
          {mutation.isPending ? "Resuming Worker..." : "Resume Worker"}
        </button>
      </div>

      {mutation.isError && (
        <div role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">
          {getApiErrorMessage(mutation.error)}
          <p className="mt-2 text-xs">
            If the request timed out, check run history before retrying.
          </p>
        </div>
      )}

      {result && (
        <div className="mt-6 space-y-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Current Goal</p>
              <p className="mt-2 text-xl font-bold text-slate-900">
                {evaluation?.actual ?? "—"}%
              </p>
              <p className="text-xs text-slate-500">
                Target: {evaluation?.target ?? "—"}%
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">New Transactions</p>
              <p className="mt-2 text-xl font-bold text-slate-900">
                {evidence?.newCompletedTransactions ?? 0}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Worker Decision</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {formatStatus(decision?.decision)}
              </p>
            </div>
          </div>

          {decision && (
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-sm font-semibold text-blue-900">
                Decision Explanation
              </p>
              <p className="mt-2 text-sm text-blue-800">
                {decision.reason || formatStatus(decision.decision)}
              </p>
            </div>
          )}

          {replanning?.started && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="font-semibold text-emerald-900">
                Successor Plan Created
              </p>

              <div className="mt-3 space-y-2 text-sm text-emerald-900">
                <p>Cycle: {replanning.cycleNumber ?? "—"}</p>
                <p>New Actions: {replanning.newActions ?? "—"}</p>
                <p>Status: {formatStatus(replanning.status)}</p>
                <p className="break-all">
                  Next Run ID: {replanning.nextRunId ?? "—"}
                </p>
              </div>

              <Link
                href="/approvals"
                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-emerald-800 hover:underline"
              >
                Review New Actions <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}

          {replanning && !replanning.started && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">
                No New Replanning Cycle
              </p>
              <p className="mt-2 text-sm text-slate-600">
                {replanning.reason || "Worker is waiting for new evidence."}
              </p>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Simulation only. New actions require human approval.
          </div>
        </div>
      )}
    </section>
  );
}
