
"use client";

import {
  CheckCircle2,
  Clock3,
  FileText,
  LoaderCircle,
  ShieldCheck,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import { getApiErrorMessage } from "@/lib/api/client";
import { toast } from "sonner";
import {
  useApprovalDetails,
  useExecuteApprovedAction,
} from "@/features/approvals/hooks";


interface ApprovedActionDetailsProps {
  actionId: string;
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

export function ApprovedActionDetails({
  actionId,
  businessId,
}: ApprovedActionDetailsProps) {
 const {
  data,
  isPending,
  isError,
  error,
  refetch,
} = useApprovalDetails(actionId, businessId);

const executeMutation = useExecuteApprovedAction();

async function handleExecuteSimulation() {
  if (executeMutation.isPending) return;

  const confirmed = window.confirm(
    "Execute this approved message in simulation mode? " +
    "No real customer message will be sent."
  );

  if (!confirmed) return;

 
try {
  await executeMutation.mutateAsync({
    actionId,
    businessId,
  });

  await refetch();

  toast.success("Simulated message execution completed.");
} catch (executionError) {
  toast.error(getApiErrorMessage(executionError));
}

}

  if (isPending) {
    return (
      <div
        role="status"
        className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-6"
      >
        <LoaderCircle className="h-5 w-5 animate-spin text-blue-600" />
        <p className="text-sm text-slate-600">
          Loading approved action...
        </p>
      </div>
    );
  }

  if (isError) {
    return (
      <div
        role="alert"
        className="rounded-xl border border-red-200 bg-red-50 p-5"
      >
        <p className="font-semibold text-red-700">
          Unable to load action details
        </p>
        <p className="mt-2 text-sm text-red-600">
          {getApiErrorMessage(error)}
        </p>
      </div>
    );
  }

  const action = data?.data;

  if (!action) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
        Action not found.
      </div>
    );
  }

  const draftValue = action.payload?.messageDraft;

  const savedDraft =
    typeof draftValue === "string"
      ? draftValue
      : typeof draftValue?.message === "string"
        ? draftValue.message
        : null;

  const isApproved = action.status === "approved";

  return (
    <section className="min-w-0 space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <UserRound className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-slate-900">
              {action.payload?.customerName ?? "Customer"}
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              {action.payload?.title ?? "Customer Retention Action"}
            </p>
          </div>
        </div>

        <span
          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
            isApproved
              ? "bg-emerald-50 text-emerald-700"
              : "bg-slate-100 text-slate-700"
          }`}
        >
          {action.status.replaceAll("_", " ")}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-slate-500">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-xs">Approved By</span>
          </div>
          <p className="mt-2 text-sm font-semibold text-slate-900">
            {action.approved_by ?? "—"}
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-slate-500">
            <Clock3 className="h-4 w-4" />
            <span className="text-xs">Approved At</span>
          </div>
          <p className="mt-2 text-sm font-semibold text-slate-900">
            {formatDate(action.approved_at)}
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-slate-500">
            <ShieldCheck className="h-4 w-4" />
            <span className="text-xs">Execution Mode</span>
          </div>
          <p className="mt-2 text-sm font-semibold text-slate-900">
            Simulation Only
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 p-4">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-blue-600" />
          <h4 className="text-sm font-semibold text-slate-900">
            Saved Customer Message
          </h4>
        </div>

        {savedDraft ? (
          <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">
            {savedDraft}
          </p>
        ) : (
          <p className="mt-3 text-sm text-amber-700">
            No saved message draft found.
          </p>
        )}
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 p-4">
        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />

        <p className="text-xs leading-6 text-blue-800">
          {isApproved
            ? "This action is approved but has not been executed through this view. Any execution must be explicitly initiated and remains simulation-only."
            : "This action is not currently approved. Execution is unavailable."}
        </p>
      </div>

{/* Execute Simulation */}
{isApproved && savedDraft && (
  <div className="border-t border-slate-100 pt-5">
    <button
      type="button"
      disabled={executeMutation.isPending}
      onClick={handleExecuteSimulation}
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {executeMutation.isPending
        ? "Executing Simulation..."
        : "Execute Simulation"}
    </button>

    <p className="mt-2 text-xs text-slate-500">
      This operation creates a simulated delivery record.
      No real customer communication will be sent.
    </p>
  </div>
)}

      <p className="break-all text-xs text-slate-400">
        Action ID: {action.id}
      </p>
    </section>
  );
}
