
"use client";

import { useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  FileText,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";

import {
  useApprovedActions,
  useExecuteApprovedAction,
  useGenerateMessageDraft,
} from "@/features/approvals/hooks";

import { getApiErrorMessage } from "@/lib/api/client";
import { toast } from "sonner";

interface ApprovedActionsListProps {
  businessId: string;
}

function formatDate(value?: string | null) {
  if (!value) return "Not available";

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

function getSavedDraft(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "message" in value &&
    typeof value.message === "string" &&
    value.message.trim()
  ) {
    return value.message.trim();
  }

  return null;
}

export function ApprovedActionsList({
  businessId,
}: ApprovedActionsListProps) {
  const {
    data,
    isPending,
    isError,
    isFetching,
    refetch,
  } = useApprovedActions(businessId);

  const executeMutation = useExecuteApprovedAction();
  const draftMutation = useGenerateMessageDraft();
  const [expandedId, setExpandedId] = useState<
    string | null
  >(null);

  const actions = data?.data ?? [];

  async function handleExecute(
    actionId: string,
    customerName: string
  ) {
    if (executeMutation.isPending) return;

    const confirmed = window.confirm(
      `Execute the approved message for ${customerName} ` +
      "in simulation mode? No real message will be sent."
    );

    if (!confirmed) return;

    try {
      await executeMutation.mutateAsync({
        actionId,
        businessId,
      });

      setExpandedId(null);

      toast.success(
        "Simulated message execution completed."
      );
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  }

  return (
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-blue-600" />

            <h2 className="text-lg font-semibold text-slate-900">
              Approved Actions
            </h2>
          </div>

          <p className="mt-1 text-sm text-slate-500">
            Approved customer messages awaiting simulation.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${isFetching ? "animate-spin" : ""
              }`}
          />
          Refresh
        </button>
      </div>

      {isPending ? (
        <div
          role="status"
          className="mt-6 flex items-center gap-3 py-8 text-sm text-slate-500"
        >
          <LoaderCircle className="h-5 w-5 animate-spin" />
          Loading approved actions...
        </div>
      ) : isError ? (
        <div
          role="alert"
          className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          Unable to load approved actions. Please try again.
        </div>
      ) : actions.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-slate-200 p-8 text-center">
          <CheckCircle2 className="mx-auto h-8 w-8 text-slate-400" />

          <p className="mt-3 text-sm font-medium text-slate-700">
            No approved actions awaiting simulation.
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          <p className="text-xs text-slate-500">
            {actions.length} approved actions
          </p>

          {actions.map((action) => {
            const expanded = expandedId === action.id;

            const customerName = String(
              action.payload?.customerName ?? "Customer"
            );

            const savedDraft = getSavedDraft(
              action.payload?.messageDraft
            );

            const canExecute =
              action.status === "approved" &&
              action.channel === "simulation" &&
              Boolean(savedDraft);

            return (
              <article
                key={action.id}
                className="min-w-0 overflow-hidden rounded-xl border border-slate-200"
              >
                <button
                  type="button"
                  aria-expanded={expanded}
                  onClick={() =>
                    setExpandedId(
                      expanded ? null : action.id
                    )
                  }
                  className="flex w-full flex-wrap items-center justify-between gap-3 p-4 text-left hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <h3 className="break-words text-sm font-semibold text-slate-900">
                      {customerName}
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      Approved: {formatDate(action.approved_at)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {savedDraft ? (
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                        Ready for Simulation
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                        Draft Missing
                      </span>
                    )}

                    {expanded ? (
                      <ChevronUp className="h-4 w-4 text-slate-500" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-500" />
                    )}
                  </div>
                </button>

                {expanded && (
                  <div className="space-y-4 border-t border-slate-200 bg-slate-50/50 p-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-xs text-slate-500">
                          Approved By
                        </p>

                        <p className="mt-1 text-sm font-medium text-slate-900">
                          {action.approved_by ?? "Not available"}
                        </p>
                      </div>

                      <div>
                        <p className="flex items-center gap-1 text-xs text-slate-500">
                          <Clock3 className="h-3.5 w-3.5" />
                          Approved At
                        </p>

                        <p className="mt-1 text-sm font-medium text-slate-900">
                          {formatDate(action.approved_at)}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-600" />

                        <h4 className="text-sm font-semibold text-slate-900">
                          Saved AI Message
                        </h4>
                      </div>

                      <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">
                        {savedDraft ?? "Message not available"}
                      </p>
                    </div>

                    {!savedDraft && (
                      <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
                        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />

                        <p className="text-xs leading-6 text-amber-800">
                          This approved action has no saved message
                          draft. Simulation is disabled.
                        </p>
                      </div>
                    )}

                    {!savedDraft && (
                      <button
                        type="button"
                        disabled={draftMutation.isPending}
                        onClick={async () => {
                          try {
                            const result = await draftMutation.mutateAsync({
                              businessId,
                              customerId: action.customer_id,
                              actionId: action.id,
                              recoverApprovedMissingDraft: true,
                            });

                            if (
                              !result.success ||
                              !result.data?.draftPersisted ||
                              result.data.actionId !== action.id
                            ) {
                              throw new Error(
                                "Draft was not saved for this approved action."
                              );
                            }

                            await refetch();

                            toast.success(
                              "AI draft saved. Renewed admin approval is required."
                            );
                          } catch (error) {
                            toast.error(getApiErrorMessage(error));
                          }
                        }}
                        className="inline-flex min-h-11 items-center rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        {draftMutation.isPending
                          ? "Generating AI Message..."
                          : "Generate Missing AI Message"}
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={
                        !canExecute ||
                        executeMutation.isPending
                      }
                      onClick={() =>
                        void handleExecute(
                          action.id,
                          customerName
                        )
                      }
                      className="inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {executeMutation.isPending &&
                        executeMutation.variables?.actionId ===
                        action.id
                        ? "Executing Simulation..."
                        : "Execute Simulation"}
                    </button>

                    <p className="text-xs text-slate-500">
                      Simulation only. No SMS, email or WhatsApp
                      message will be sent.
                    </p>

                    <p className="break-all text-xs text-slate-400">
                      Action ID: {action.id}
                    </p>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
