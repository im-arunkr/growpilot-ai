
"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Play } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { useMemo, useState } from "react";
import {
    AlertTriangle,
    BrainCircuit,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ChevronUp,
    ClipboardCheck,
    Clock3,
    FileText,
    RefreshCw,
    Search,
    ShieldCheck,
    Users,
    X,
} from "lucide-react";
import { Sparkles, LoaderCircle } from "lucide-react";
import { ExecutionHistory } from "@/components/approvals/execution-history";

import { ApprovedActionsList } from "@/components/approvals/approved-actions-list";

import {
    usePendingApprovals,
    useGenerateMessageDraft,
    useApprovalDecision,
} from "@/features/approvals/hooks";


import type {
    ApprovalAction,
} from "@/features/approvals/types";
import { APP_CONFIG } from "@/lib/constants";
import { getApiErrorMessage } from "@/lib/api/client";

type PriorityFilter = "all" | "high" | "medium" | "low";

const PAGE_SIZE = 6;

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
});

const priorityStyles: Record<string, string> = {
    high: "bg-red-50 text-red-700",
    medium: "bg-amber-50 text-amber-700",
    low: "bg-emerald-50 text-emerald-700",
};

function formatDate(value: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "Unknown date";

    return dateFormatter.format(date);
}

function formatLabel(value: string) {
    return value
        .replaceAll("_", " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getSavedDraft(action: ApprovalAction) {
    const draft = action.payload?.messageDraft;

    if (typeof draft === "string") {
        return draft.trim() || null;
    }

    if (draft && typeof draft.message === "string") {
        return draft.message.trim() || null;
    }

    return null;
}

function ApprovalCard({
    action,
}: {
    action: ApprovalAction;
}) {

    const [expanded, setExpanded] = useState(false);

    const draftMutation = useGenerateMessageDraft();
    const decisionMutation = useApprovalDecision();

    function handleApprovalDecision(
        decision: "approved" | "rejected"
    ) {
        if (decisionMutation.isPending) return;


        const savedDraft = draft;


        // Approval requires a saved customer message draft.
        if (decision === "approved" && !savedDraft) {
            window.alert(
                "Please generate and save a message draft before approval."
            );
            return;
        }

        let reason: string | null = null;

        if (decision === "rejected") {
            const input = window.prompt(
                "Enter the reason for rejecting this action:"
            );

            if (input === null) return;

            reason = input.trim();

            if (!reason || reason.length > 500) {
                window.alert(
                    "Please enter a rejection reason between 1 and 500 characters."
                );
                return;
            }
        }

        const customerName =
            action.payload?.customerName ?? "this customer";

        const confirmed = window.confirm(
            decision === "approved"
                ? `Approve the saved message for ${customerName}? This will not send the message.`
                : `Reject the proposed action for ${customerName}?`
        );

        if (!confirmed) return;

        decisionMutation.mutate({
            actionId: action.id,
            request: {
                businessId: action.business_id,
                decision,
                approvedBy: "Arun",
                reason,
            },
        });
    }


    const generatedDraft =
        draftMutation.data?.success &&
            draftMutation.data.data.draftPersisted &&
            draftMutation.data.data.actionId === action.id
            ? draftMutation.data.data.draft
            : null;
    const payload = action.payload ?? {};
    const priority = payload.priority ?? "medium";

    const draft = generatedDraft ?? getSavedDraft(action);


    return (
        <article className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="p-4 sm:p-5">
                {/* Customer Heading */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h3 className="text-base font-semibold text-slate-900">
                            {payload.customerName ?? "Unknown Customer"}
                        </h3>

                        <p className="mt-1 text-xs text-slate-500">
                            {payload.title ?? formatLabel(action.action_type)}
                        </p>
                    </div>

                    <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${priorityStyles[priority] ??
                            "bg-slate-100 text-slate-700"
                            }`}
                    >
                        {formatLabel(priority)} Priority
                    </span>
                </div>

                {/* Action Metadata */}
                <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-sm">
                    <div>
                        <p className="text-xs text-slate-500">
                            Priority Score
                        </p>

                        <p className="mt-1 font-semibold text-slate-900">
                            {payload.priorityScore ?? "—"}
                        </p>
                    </div>

                    <div>
                        <p className="text-xs text-slate-500">
                            Status
                        </p>

                        <p className="mt-1 font-semibold text-slate-900">
                            {formatLabel(action.status)}
                        </p>
                    </div>
                </div>

                {/* Rationale */}
                <div className="mt-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Why This Customer?
                    </p>

                    <p className="mt-2 text-sm leading-6 text-slate-700">
                        {action.rationale ?? "No rationale available."}
                    </p>
                </div>

                {/* Recommendation */}
                <div className="mt-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Recommended Action
                    </p>

                    <p className="mt-2 text-sm leading-6 text-slate-700">
                        {payload.recommendedAction ??
                            "Review this retention action."}
                    </p>
                </div>

                {/* Safety Labels */}
                <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700">
                        Approval Required
                    </span>

                    <span className="rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700">
                        Simulation Only
                    </span>

                    {payload.marketingConsent !== true && (
                        <span className="rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700">
                            No Marketing Consent
                        </span>
                    )}

                    {payload.guardrailTriggered && (
                        <span className="rounded-lg bg-orange-50 px-2.5 py-1.5 text-xs font-medium text-orange-700">
                            AI Fallback Used
                        </span>
                    )}
                </div>

                {/* Expand Details */}
                <button
                    type="button"
                    onClick={() => setExpanded((current) => !current)}
                    aria-expanded={expanded}
                    className="mt-5 flex min-h-10 w-full items-center justify-between border-t border-slate-100 pt-4 text-sm font-semibold text-blue-600 hover:text-blue-700"
                >
                    {expanded ? "Hide Details" : "Review Details"}

                    {expanded ? (
                        <ChevronUp className="h-4 w-4" />
                    ) : (
                        <ChevronDown className="h-4 w-4" />
                    )}
                </button>
            </div>

            {/* Expanded Details */}
            {expanded && (
                <div className="space-y-4 border-t border-slate-100 bg-slate-50/60 p-4 sm:p-5">
                    {/* Expected Outcome */}
                    <div>
                        <p className="text-xs font-semibold uppercase text-slate-500">
                            Expected Outcome
                        </p>

                        <p className="mt-2 text-sm leading-6 text-slate-700">
                            {action.expected_outcome ?? "Not available"}
                        </p>
                    </div>

                    {/* AI Strategy */}
                    {payload.aiStrategy?.strategy && (
                        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                            <div className="flex items-center gap-2 text-sm font-semibold text-blue-700">
                                <BrainCircuit className="h-4 w-4" />
                                Retention Strategy
                            </div>

                            <p className="mt-2 text-sm leading-6 text-slate-700">
                                {payload.aiStrategy.strategy}
                            </p>

                            <p className="mt-3 text-xs text-blue-700">
                                Source:{" "}
                                {payload.strategySource ?? "Not specified"}
                            </p>
                        </div>
                    )}

                    {/* Message Draft */}

                    {/* AI Message Draft */}
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-blue-600" />

                                <h4 className="text-sm font-semibold text-slate-900">
                                    Customer Message Draft
                                </h4>
                            </div>

                            {draft && (
                                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                                    Draft Available
                                </span>
                            )}
                        </div>

                        {draft ? (
                            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                                <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">
                                    {draft}
                                </p>
                            </div>
                        ) : (
                            <p className="mt-3 text-sm text-slate-500">
                                No saved message draft found. Generate an AI message
                                for owner review.
                            </p>
                        )}

                        {/* Generate Message Button */}
                        <button
                            type="button"
                            disabled={draftMutation.isPending}
                            onClick={() =>
                                draftMutation.mutate({
                                    businessId: action.business_id,
                                    customerId: action.customer_id,
                                })
                            }
                            className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {draftMutation.isPending ? (
                                <>
                                    <LoaderCircle className="h-4 w-4 animate-spin" />
                                    Generating Message...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="h-4 w-4" />
                                    {draft ? "Regenerate AI Message" : "Generate AI Message"}
                                </>
                            )}
                        </button>

                        {/* Generation Success */}
                        {draftMutation.isSuccess &&
                            draftMutation.data.success &&
                            draftMutation.data.data.draftPersisted && (
                                <div
                                    role="status"
                                    className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3"
                                >
                                    <p className="text-sm font-semibold text-emerald-800">
                                        AI message generated and saved successfully.
                                    </p>

                                    <p className="mt-1 text-xs text-emerald-700">
                                        Model: {draftMutation.data.data.model}
                                        {" · "}
                                        Strategy: {draftMutation.data.data.strategySource}
                                    </p>
                                </div>
                            )}

                        {/* Generation Error */}
                        {draftMutation.isError && (
                            <div
                                role="alert"
                                className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3"
                            >
                                <p className="text-sm font-semibold text-red-700">
                                    Message generation failed
                                </p>

                                <p className="mt-1 text-xs text-red-600">
                                    {getApiErrorMessage(draftMutation.error)}
                                </p>
                            </div>
                        )}

                        {/* Safety Information */}
                        <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 p-3">
                            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />

                            <p className="text-xs leading-5 text-amber-800">
                                Generated messages are saved for owner review only.
                                No real customer messages are sent.
                            </p>
                        </div>
                    </div>


                    {/* Technical Details */}
                    <div className="space-y-2 text-xs text-slate-500">
                        <p>
                            Created: {formatDate(action.created_at)}
                        </p>

                        <p className="break-all">
                            Action ID: {action.id}
                        </p>

                        <p className="break-all">
                            Run ID: {action.run_id}
                        </p>

                        <p>
                            AI Model: {payload.aiModel ?? "Not specified"}
                        </p>
                    </div>

                    {/* Approve / Reject Actions */}
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <h4 className="text-sm font-semibold text-slate-900">
                            Owner Decision
                        </h4>

                        <p className="mt-1 text-xs leading-5 text-slate-500">
                            Review the saved customer message before approving
                            or rejecting this action.
                        </p>

                        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                            {/* Approve Button */}
                            <button
                                type="button"
                                disabled={
                                    decisionMutation.isPending ||
                                    draftMutation.isPending ||
                                    !draft
                                }
                                onClick={() => handleApprovalDecision("approved")}
                                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {decisionMutation.isPending &&
                                    decisionMutation.variables?.request.decision ===
                                    "approved" ? (
                                    "Approving..."
                                ) : (
                                    "Approve Message"
                                )}
                            </button>

                            {/* Reject Button */}
                            <button
                                type="button"
                                disabled={
                                    decisionMutation.isPending ||
                                    draftMutation.isPending
                                }
                                onClick={() => handleApprovalDecision("rejected")}
                                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {decisionMutation.isPending &&
                                    decisionMutation.variables?.request.decision ===
                                    "rejected" ? (
                                    "Rejecting..."
                                ) : (
                                    "Reject Action"
                                )}
                            </button>
                        </div>

                        {!draft && (
                            <p className="mt-3 text-xs text-amber-700">
                                Generate and save an AI message before approval.
                                Rejection is still available.
                            </p>
                        )}

                        {/* Decision Error */}
                        {decisionMutation.isError && (
                            <div
                                role="alert"
                                className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3"
                            >
                                <p className="text-sm font-semibold text-red-700">
                                    Decision could not be saved
                                </p>

                                <p className="mt-1 text-xs text-red-600">
                                    {getApiErrorMessage(decisionMutation.error)}
                                </p>
                            </div>
                        )}

                        {/* Decision Success */}
                        {decisionMutation.isSuccess && (
                            <div
                                role="status"
                                className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3"
                            >
                                <p className="text-sm font-semibold text-emerald-800">
                                    {decisionMutation.data.message}
                                </p>

                                {decisionMutation.data.warning && (
                                    <p className="mt-2 text-xs text-amber-700">
                                        {decisionMutation.data.warning}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Approval Safety Notice */}
                    <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-white p-3">
                        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />

                        <p className="text-xs leading-5 text-slate-600">
                            This is a review-only view. Approval and rejection
                            controls will be enabled after validating the
                            decision API and saved draft workflow.
                        </p>
                    </div>
                </div>
            )}
        </article>
    );
}

type ApprovedRunAction = {
    id: string;
    run_id: string;
    business_id: string;
    status: string;
};

type ApprovedRunsResponse = {
    success: boolean;
    data: ApprovedRunAction[];
    total: number;
};


type GoalEvaluation = {
    success: boolean;
    evaluationId?: string;
    evaluationStatus?: string;
    metric?: string;
    baseline?: number | null;
    actual?: number | null;
    target?: number | null;
    progressPercentage?: number | null;
    targetReached?: boolean;
    measurementWindow?: {
        start: string;
        end: string;
    } | null;
    recommendation?: {
        decision: string;
        nextStep: string;
        reason: string;
    };
    message?: string;
};

type ResumeResult = {
    runId: string;
    status: string;

    executed: Array<{
        actionId: string;
        deliveryId: string;
        status: string;
    }>;

    skipped: Array<{
        actionId: string;
        reason: string;
    }>;

    failed: Array<{
        actionId: string;
        error: string;
    }>;

    pendingApproval: number;
    interrupted: number;

    evaluation?: GoalEvaluation | null;
};


type ResumeResponse = {
    success: boolean;
    message: string;
    data: ResumeResult;
};

function ResumeWorkerSection({
    businessId,
}: {
    businessId: string;
}) {
    const queryClient = useQueryClient();

    const [lastResult, setLastResult] =
        useState<ResumeResult | null>(null);

    // Fetch approved actions awaiting simulation.
    const approvedQuery = useQuery({
        queryKey: [
            "worker-resume",
            "approved",
            businessId,
        ],
        queryFn: async () => {
            const response =
                await apiClient.get<ApprovedRunsResponse>(
                    "/approvals/approved",
                    {
                        params: { businessId },
                    }
                );

            return response.data;
        },
    });

    // Group approved actions by their parent run.
    const approvedRuns = useMemo(() => {
        const runs = new Map<string, number>();

        for (const action of approvedQuery.data?.data ?? []) {
            if (!action.run_id) continue;

            runs.set(
                action.run_id,
                (runs.get(action.run_id) ?? 0) + 1
            );
        }

        return [...runs.entries()].map(
            ([runId, approvedCount]) => ({
                runId,
                approvedCount,
            })
        );
    }, [approvedQuery.data]);

    const resumeMutation = useMutation({
        mutationFn: async (runId: string) => {
            const response =
                await apiClient.post<ResumeResponse>(
                    `/agent/${runId}/resume`,
                    {
                        businessId,
                    }
                );

            return response.data;
        },

        onSuccess: async (response) => {
            setLastResult(response.data);

            // Refresh approvals, history and dashboard.
            await queryClient.invalidateQueries();
        },
    });

  // Evaluate the business goal for a saved worker run.
  const evaluationMutation = useMutation({
    mutationFn: async (runId: string) => {
      const response = await apiClient.post<{
        success: boolean;
        message: string;
        data: GoalEvaluation;
      }>(
        `/agent/${runId}/goal-evaluation`,
        {
          businessId,
        }
      );

      return response.data;
    },

    onSuccess: async (response) => {
      // Show evaluation in the existing Resume Result UI.
      setLastResult((previous) => {
        if (!previous) return previous;

        return {
          ...previous,
          evaluation: response.data,
        };
      });

      await queryClient.invalidateQueries();
    },
  });

    function handleResume(runId: string) {
        if (resumeMutation.isPending) return;

        const confirmed = window.confirm(
            "Resume this AI Worker? Approved actions will be executed in simulation mode only. No real customer messages will be sent."
        );

        if (!confirmed) return;

        setLastResult(null);
        resumeMutation.mutate(runId);
    }

    return (
        <section className="rounded-2xl border border-blue-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2">
                        <Play className="h-5 w-5 text-blue-600" />

                        <h2 className="text-lg font-bold text-slate-900">
                            Autonomous Worker Resume
                        </h2>
                    </div>

                    <p className="mt-2 text-sm text-slate-500">
                        Continue approved AI Worker actions from
                        their saved execution state.
                    </p>
                </div>

                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                    Simulation Only
                </span>
            </div>

            {approvedQuery.isPending && (
                <p className="mt-5 text-sm text-slate-500">
                    Checking approved worker actions...
                </p>
            )}

            {approvedQuery.isError && (
                <div
                    role="alert"
                    className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700"
                >
                    {getApiErrorMessage(approvedQuery.error)}
                </div>
            )}

            {approvedQuery.isSuccess &&
                approvedRuns.length === 0 && (
                    <div className="mt-5 rounded-xl bg-slate-50 p-4">
                        <p className="text-sm font-medium text-slate-700">
                            No approved actions awaiting execution.
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                            Generate a message draft and approve an
                            action to enable worker resumption.
                        </p>
                    </div>
                )}

            {approvedRuns.length > 0 && (
                <div className="mt-5 space-y-3">
                    {approvedRuns.map((run) => (
                        <div
                            key={run.runId}
                            className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-900">
                                    Worker Run
                                </p>

                                <p className="mt-1 break-all font-mono text-xs text-slate-500">
                                    {run.runId}
                                </p>

                                <p className="mt-2 text-xs text-emerald-700">
                                    {run.approvedCount} approved action(s)
                                    ready
                                </p>
                            </div>

                            <button
                                type="button"
                                disabled={resumeMutation.isPending}
                                onClick={() => handleResume(run.runId)}
                                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <Play className="h-4 w-4" />

                                {resumeMutation.isPending &&
                                    resumeMutation.variables === run.runId
                                    ? "Resuming..."
                                    : "Resume Worker"}
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {resumeMutation.isError && (
                <div
                    role="alert"
                    className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4"
                >
                    <p className="text-sm font-semibold text-red-700">
                        Worker resume failed
                    </p>

                    <p className="mt-1 text-sm text-red-600">
                        {getApiErrorMessage(resumeMutation.error)}
                    </p>
                </div>
            )}

      {lastResult && (
        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Business Goal Evaluation
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                Measure customer retention against the
                saved business goal.
              </p>
            </div>

            <button
              type="button"
              disabled={evaluationMutation.isPending}
              onClick={() =>
                evaluationMutation.mutate(lastResult.runId)
              }
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  evaluationMutation.isPending
                    ? "animate-spin"
                    : ""
                }`}
              />

              {evaluationMutation.isPending
                ? "Evaluating Goal..."
                : "Evaluate Goal"}
            </button>
          </div>

          {evaluationMutation.isError && (
            <div
              role="alert"
              className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              {getApiErrorMessage(evaluationMutation.error)}
            </div>
          )}

          {evaluationMutation.isSuccess && (
            <p className="mt-3 text-xs font-medium text-emerald-700">
              Goal evaluation saved successfully.
            </p>
          )}
        </div>
      )}

            {lastResult && (
                <div
                    role="status"
                    className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4"
                >
                    <h3 className="text-sm font-semibold text-emerald-900">
                        Worker Resume Result
                    </h3>

                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                        <div>
                            <p className="text-xs text-slate-500">
                                Executed
                            </p>
                            <p className="font-bold text-emerald-700">
                                {lastResult.executed.length}
                            </p>
                        </div>

                        <div>
                            <p className="text-xs text-slate-500">
                                Skipped
                            </p>
                            <p className="font-bold text-slate-800">
                                {lastResult.skipped.length}
                            </p>
                        </div>

                        <div>
                            <p className="text-xs text-slate-500">
                                Failed
                            </p>
                            <p className="font-bold text-red-700">
                                {lastResult.failed.length}
                            </p>
                        </div>

                        <div>
                            <p className="text-xs text-slate-500">
                                Pending Approval
                            </p>
                            <p className="font-bold text-amber-700">
                                {lastResult.pendingApproval}
                            </p>
                        </div>
                    </div>

                    <p className="mt-3 text-xs text-slate-600">
                        Status: {lastResult.status}
                    </p>

                    {lastResult.failed.length > 0 && (
                        <div className="mt-3 space-y-1">
                            {lastResult.failed.map((item) => (
                                <p
                                    key={item.actionId}
                                    className="break-words text-xs text-red-700"
                                >
                                    {item.actionId}: {item.error}
                                </p>
                            ))}
                        </div>
                    )}

                    <p className="mt-3 text-xs text-emerald-800">
                        No real SMS, WhatsApp or email was sent.
                    </p>
                </div>
            )}

            {lastResult?.evaluation && (
                <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50/50 p-4 sm:p-5">
                    <h3 className="text-base font-bold text-slate-900">
                        Goal Evaluation Results
                    </h3>

                    {!lastResult.evaluation.success ? (
                        <p className="mt-3 text-sm text-red-700">
                            {lastResult.evaluation.message ??
                                "Goal evaluation could not be completed."}
                        </p>
                    ) : (
                        <>
                            <p className="mt-2 text-xs text-slate-500">
                                Metric:{" "}
                                {lastResult.evaluation.metric ??
                                    "Not available"}
                            </p>

                            <div className="mt-4 grid grid-cols-3 gap-3">
                                {[
                                    {
                                        label: "Baseline",
                                        value: lastResult.evaluation.baseline,
                                    },
                                    {
                                        label: "Actual",
                                        value: lastResult.evaluation.actual,
                                    },
                                    {
                                        label: "Target",
                                        value: lastResult.evaluation.target,
                                    },
                                ].map((item) => (
                                    <div
                                        key={item.label}
                                        className="rounded-xl bg-white p-3"
                                    >
                                        <p className="text-xs text-slate-500">
                                            {item.label}
                                        </p>

                                        <p className="mt-2 text-lg font-bold text-slate-900">
                                            {item.value ?? "—"}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            {lastResult.evaluation.progressPercentage != null && (
                                <div className="mt-5">
                                    <div className="flex justify-between text-sm">
                                        <span className="font-medium text-slate-700">
                                            Goal Progress
                                        </span>
                                        <span className="font-bold text-blue-700">
                                            {lastResult.evaluation.progressPercentage}%
                                        </span>
                                    </div>

                                    <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-200">
                                        <div
                                            className="h-full rounded-full bg-blue-600"
                                            style={{
                                                width: `${Math.min(
                                                    100,
                                                    Math.max(
                                                        0,
                                                        lastResult.evaluation.progressPercentage
                                                    )
                                                )}%`,
                                            }}
                                        />
                                    </div>
                                </div>
                            )}

                            {lastResult.evaluation.recommendation && (
                                <div className="mt-5 rounded-xl border border-blue-100 bg-white p-4">
                                    <p className="text-xs font-semibold uppercase text-blue-700">
                                        AI Worker Next Recommendation
                                    </p>

                                    <p className="mt-2 text-sm font-semibold text-slate-900">
                                        {lastResult.evaluation.recommendation.nextStep
                                            .replaceAll("_", " ")}
                                    </p>

                                    <p className="mt-2 text-sm text-slate-600">
                                        {lastResult.evaluation.recommendation.reason}
                                    </p>
                                </div>
                            )}

                            <p className="mt-4 text-xs text-slate-500">
                                Based on completed transaction records.
                                Simulated messages do not prove actual
                                customer retention or revenue impact.
                            </p>
                        </>
                    )}
                </div>
            )}

        </section>
    );
}

export default function ApprovalsPage() {
    const {
        data,
        isPending,
        isError,
        error,
        isFetching,
        refetch,
    } = usePendingApprovals(APP_CONFIG.businessId);

    const [search, setSearch] = useState("");
    const [priorityFilter, setPriorityFilter] =
        useState<PriorityFilter>("all");
    const [page, setPage] = useState(1);


    const approvals = data?.data ?? [];

    const filteredApprovals = useMemo(() => {
        const query = search.trim().toLowerCase();

        return approvals
            .filter((action) => {
                const customerName =
                    action.payload?.customerName?.toLowerCase() ?? "";

                const matchesSearch =
                    !query ||
                    customerName.includes(query) ||
                    action.id.toLowerCase().includes(query);

                const matchesPriority =
                    priorityFilter === "all" ||
                    action.payload?.priority === priorityFilter;

                return matchesSearch && matchesPriority;
            })
            .sort((a, b) => {
                const priorityDifference =
                    (b.payload?.priorityScore ?? 0) -
                    (a.payload?.priorityScore ?? 0);

                return (
                    priorityDifference ||
                    new Date(b.created_at).getTime() -
                    new Date(a.created_at).getTime()
                );
            });
    }, [approvals, search, priorityFilter]);

    const totalPages = Math.max(
        1,
        Math.ceil(filteredApprovals.length / PAGE_SIZE)
    );

    const currentPage = Math.min(page, totalPages);

    const visibleApprovals = filteredApprovals.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE
    );

    const highPriority = approvals.filter(
        (action) => action.payload?.priority === "high"
    ).length;

    const mediumPriority = approvals.filter(
        (action) => action.payload?.priority === "medium"
    ).length;

    const savedDrafts = approvals.filter(
        (action) => Boolean(getSavedDraft(action))
    ).length;

    function updateSearch(value: string) {
        setSearch(value);
        setPage(1);
    }

    function updatePriority(value: PriorityFilter) {
        setPriorityFilter(value);
        setPage(1);
    }

    return (
        <section className="min-w-0 space-y-6">
            {/* Header */}
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                        Approvals Workspace
                    </h1>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                        Review AI-generated retention actions before execution.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => refetch()}
                    disabled={isFetching}
                    className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                    <RefreshCw
                        className={`h-4 w-4 ${isFetching ? "animate-spin" : ""
                            }`}
                    />
                    Refresh
                </button>
            </div>


            {/* Resume approved AI Worker runs */}
            <ResumeWorkerSection businessId={APP_CONFIG.businessId} />

            {/* Approved Actions Awaiting Simulation */}
            <ApprovedActionsList businessId={APP_CONFIG.businessId} />

            {/* Completed Simulation History */}
            <ExecutionHistory businessId={APP_CONFIG.businessId} />


            {/* Loading */}
            {isPending && (
                <div
                    role="status"
                    className="rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500"
                >
                    Loading pending approvals...
                </div>
            )}

            {/* Error */}
            {isError && (
                <div
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50 p-5"
                >
                    <p className="font-semibold text-red-700">
                        Unable to load approvals
                    </p>

                    <p className="mt-2 text-sm text-red-600">
                        {getApiErrorMessage(error)}
                    </p>

                    <button
                        type="button"
                        onClick={() => refetch()}
                        className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white"
                    >
                        Try Again
                    </button>
                </div>
            )}

            {/* Approvals Data */}
            {data?.success && (
                <>
                    {/* Summary */}
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        {[
                            {
                                label: "Pending Approvals",
                                value: data.total,
                                icon: ClipboardCheck,
                                color: "text-blue-600",
                            },
                            {
                                label: "High Priority",
                                value: highPriority,
                                icon: AlertTriangle,
                                color: "text-red-600",
                            },
                            {
                                label: "Medium Priority",
                                value: mediumPriority,
                                icon: Users,
                                color: "text-amber-600",
                            },
                            {
                                label: "Saved Drafts",
                                value: savedDrafts,
                                icon: FileText,
                                color: "text-emerald-600",
                            },
                        ].map((item) => {
                            const Icon = item.icon;

                            return (
                                <div
                                    key={item.label}
                                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
                                >
                                    <Icon className={`h-5 w-5 ${item.color}`} />

                                    <p className="mt-3 text-2xl font-bold text-slate-900">
                                        {item.value}
                                    </p>

                                    <p className="mt-1 text-xs text-slate-500">
                                        {item.label}
                                    </p>
                                </div>
                            );
                        })}
                    </div>

                    {/* Search and Filter */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                            <div className="relative w-full lg:max-w-md">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                                <input
                                    type="search"
                                    value={search}
                                    onChange={(event) =>
                                        updateSearch(event.target.value)
                                    }
                                    placeholder="Search customer or action ID..."
                                    aria-label="Search approval actions"
                                    className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm text-slate-900 outline-none focus:border-blue-500"
                                />

                                {search && (
                                    <button
                                        type="button"
                                        onClick={() => updateSearch("")}
                                        aria-label="Clear search"
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {(
                                    [
                                        ["all", "All"],
                                        ["high", "High"],
                                        ["medium", "Medium"],
                                        ["low", "Low"],
                                    ] as const
                                ).map(([value, label]) => (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => updatePriority(value)}
                                        aria-pressed={priorityFilter === value}
                                        className={`rounded-lg px-4 py-2 text-sm font-medium ${priorityFilter === value
                                            ? "bg-blue-600 text-white"
                                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                            }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <p className="mt-4 border-t border-slate-100 pt-4 text-sm text-slate-500">
                            Showing {filteredApprovals.length} of{" "}
                            {approvals.length} pending actions
                        </p>
                    </div>

                    {/* Approval Cards */}
                    {visibleApprovals.length > 0 ? (
                        <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
                            {visibleApprovals.map((action) => (
                                <ApprovalCard
                                    key={action.id}
                                    action={action}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
                            <ClipboardCheck className="mx-auto h-10 w-10 text-slate-300" />

                            <p className="mt-3 font-semibold text-slate-900">
                                No Matching Approvals
                            </p>

                            <p className="mt-2 text-sm text-slate-500">
                                No pending actions match your search or filter.
                            </p>
                        </div>
                    )}

                    {/* Pagination */}
                    {filteredApprovals.length > 0 && (
                        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
                            <p className="text-sm text-slate-500">
                                Page {currentPage} of {totalPages}
                            </p>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    disabled={currentPage <= 1}
                                    onClick={() =>
                                        setPage((previous) =>
                                            Math.max(1, previous - 1)
                                        )
                                    }
                                    className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-sm disabled:opacity-40"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                    Previous
                                </button>

                                <button
                                    type="button"
                                    disabled={currentPage >= totalPages}
                                    onClick={() =>
                                        setPage((previous) =>
                                            Math.min(totalPages, previous + 1)
                                        )
                                    }
                                    className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-sm disabled:opacity-40"
                                >
                                    Next
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Safety Notice */}
                    <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4">
                        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />

                        <p className="text-xs leading-6 text-blue-800">
                            Actions are reviewed before approval. This demo
                            uses simulation-only delivery. No real marketing
                            messages are sent to customers.
                        </p>
                    </div>
                </>
            )}
        </section>
    );
}
