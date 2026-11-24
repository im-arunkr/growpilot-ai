
"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Bot,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  Play,
  ShieldCheck,
  Sparkles,
  Target,
  TriangleAlert,
  Users,
} from "lucide-react";
import { AgentActivityHistory } from "@/components/agent/agent-activity-history";
import { useRunAgent } from "@/features/agent/hooks";
import type {
  AgentRunResponse,
  AgentAction,
} from "@/features/agent/types";
import { APP_CONFIG } from "@/lib/constants";
import { getApiErrorMessage } from "@/lib/api/client";
import { ReplanningPanel } from "@/components/agent/replanning-panel";
const statusColors: Record<string, string> = {
  high: "bg-red-50 text-red-700",
  medium: "bg-amber-50 text-amber-700",
  low: "bg-emerald-50 text-emerald-700",
};

function formatLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function ActionCard({
  action,
}: {
  action: AgentAction;
}) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="font-semibold text-slate-900">
            {action.customerName}
          </h4>
          <p className="mt-1 text-xs text-slate-500">
            {action.title} · {action.actionType.replaceAll("_", " ")}
          </p>
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${statusColors[action.priority] ??
            "bg-slate-100 text-slate-600"
            }`}
        >
          {formatLabel(action.priority)} Priority
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-sm">
        <div>
          <p className="text-xs text-slate-500">Priority Score</p>
          <p className="mt-1 font-semibold text-slate-900">
            {action.priorityScore}
          </p>
        </div>

        <div>
          <p className="text-xs text-slate-500">Action Status</p>
          <p className="mt-1 font-semibold text-slate-900">
            {formatLabel(action.status)}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Why this customer?
          </p>
          <p className="mt-1 text-sm leading-6 text-slate-700">
            {action.rationale}
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Recommended Action
          </p>
          <p className="mt-1 text-sm leading-6 text-slate-700">
            {action.recommendedAction}
          </p>
        </div>

        {action.aiStrategy && (
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-blue-700">
              <BrainCircuit className="h-4 w-4" />
              AI-Generated Strategy
            </div>

            <p className="mt-2 text-sm leading-6 text-slate-700">
              {action.aiStrategy.strategy}
            </p>

            <p className="mt-3 text-xs text-blue-700">
              Source: {action.strategySource ?? "AI"}
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
        <span className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700">
          {action.requiresApproval
            ? "Owner Approval Required"
            : "No Approval Required"}
        </span>

        <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
          Simulation Only
        </span>

        {!action.marketingConsent && (
          <span className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700">
            No Marketing Consent
          </span>
        )}
      </div>
    </article>
  );
}

function ExecutionResults({
  result,
}: {
  result: AgentRunResponse;
}) {
  const actions = result.actionPlan?.actions ?? [];
  const summary = result.summary;
  const plan = result.actionPlan;
  const ai = result.ai;

  const stats = [
    {
      label: "Customers Analyzed",
      value: summary.totalCustomers,
      icon: Users,
    },
    {
      label: "At-Risk Customers",
      value: summary.atRiskCustomers,
      icon: TriangleAlert,
    },
    {
      label: "Eligible Opportunities",
      value: summary.eligibleOpportunities ?? "—",
      icon: Target,
    },
    {
      label: "Actions Generated",
      value: actions.length,
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Run Overview */}
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" />

          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-emerald-900">
              Agent Run Finished
            </h2>

            <p className="mt-1 text-sm text-emerald-800">
              {actions.length > 0
                ? `${actions.length} retention actions generated for owner review.`
                : "No new eligible actions were generated."}
            </p>

            <p className="mt-2 break-all text-xs text-emerald-700">
              Run ID: {result.runId}
            </p>

            <p className="mt-1 text-xs text-emerald-700">
              Status: {formatLabel(result.status)}
              {result.persisted ? " · Saved to database" : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Execution Stats */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.label}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <Icon className="h-5 w-5 text-blue-600" />

              <p className="mt-4 text-2xl font-bold text-slate-900">
                {stat.value}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {stat.label}
              </p>
            </div>
          );
        })}
      </div>

      {/* AI Model Information */}
      {ai && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-2">
            <BrainCircuit className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-slate-900">
              AI Execution Details
            </h3>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <div>
              <p className="text-slate-500">Provider</p>
              <p className="mt-1 font-semibold text-slate-900">
                {ai.provider}
              </p>
            </div>

            <div>
              <p className="text-slate-500">Model</p>
              <p className="mt-1 break-words font-semibold text-slate-900">
                {ai.model}
              </p>
            </div>

            <div>
              <p className="text-slate-500">Strategy Source</p>
              <p className="mt-1 font-semibold text-slate-900">
                {ai.strategySource}
              </p>
            </div>

            <div>
              <p className="text-slate-500">AI Latency</p>
              <p className="mt-1 font-semibold text-slate-900">
                {(ai.latencyMs / 1000).toFixed(1)}s
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700">
              {ai.aiEnhancedActions} AI-enhanced actions
            </span>

            <span className="rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-700">
              Guardrail triggered: {ai.guardrailTriggered ? "Yes" : "No"}
            </span>
          </div>

          {ai.fallbackReason && (
            <p className="mt-3 text-xs text-amber-700">
              Fallback reason: {ai.fallbackReason}
            </p>
          )}
        </section>
      )}

      {/* Action Plan */}
      {plan && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {plan.title}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {plan.objective}
              </p>
            </div>

            <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
              {plan.summary.pendingApproval} Pending Approval
            </span>
          </div>

          {actions.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
              No new action plans available. Existing open actions may already cover eligible customers.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {actions.map((action) => (
                <ActionCard
                  key={action.customerId}
                  action={action}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Execution Steps */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-2">
          <Clock3 className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-slate-900">
            Agent Execution Steps
          </h3>
        </div>

        <p className="mt-1 text-xs text-slate-500">
          Recorded execution steps from the completed API request.
          Not a live progress stream.
        </p>

        <ol className="mt-5 space-y-4">
          {result.steps?.map((step, index) => (
            <li
              key={`${step.step}-${index}`}
              className="flex items-start gap-3"
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${step.status === "completed"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-700"
                  }`}
              >
                {step.status === "completed" ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Clock3 className="h-4 w-4" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900">
                  {formatLabel(step.step)}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {formatLabel(step.status)}
                  {step.tool ? ` · ${step.tool}` : ""}
                </p>

                {step.reason && (
                  <p className="mt-1 text-xs text-slate-600">
                    {step.reason}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Approval Notice */}
      <div className="flex flex-col gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />

          <div>
            <p className="text-sm font-semibold text-blue-900">
              Human Approval Required
            </p>

            <p className="mt-1 text-xs leading-5 text-blue-800">
              Actions require owner review. This workspace does
              not send messages. Demo delivery is simulation-only.
            </p>
          </div>
        </div>

        <Link
          href="/approvals"
          className="inline-flex shrink-0 items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Review Approvals
        </Link>
      </div>
    </div>
  );
}

export default function AgentPage() {
  const [limit, setLimit] = useState(5);
  const agentMutation = useRunAgent();

  function handleRunAgent() {
    if (
      agentMutation.isPending ||
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 10
    ) {
      return;
    }

    agentMutation.mutate({
      businessId: APP_CONFIG.businessId,
      goal: "customer_retention",
      limit,
    });
  }

  const result = agentMutation.data;

  return (
    <section className="min-w-0 space-y-7">
      {/* Heading */}
      <div>
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
          <Sparkles className="h-4 w-4" />
          AI-Powered Retention
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          AI Agent Workspace
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Identify at-risk customers, generate retention strategies
          and prepare action plans for human approval.
        </p>
      </div>

      {/* Agent Configuration */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-slate-900">
            Run Customer Retention Agent
          </h2>
        </div>

        <p className="mt-2 text-sm text-slate-500">
          Configure the agent before starting a new analysis.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="agent-goal"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Agent Goal
            </label>

            <select
              id="agent-goal"
              disabled
              value="customer_retention"
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 disabled:cursor-not-allowed"
            >
              <option value="customer_retention">
                Customer Retention
              </option>
            </select>
          </div>

          <div>
            <label
              htmlFor="agent-limit"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Maximum Actions Requested
            </label>

            <input
              id="agent-limit"
              type="number"
              min={1}
              max={10}
              step={1}
              value={limit}
              disabled={agentMutation.isPending}
              onChange={(event) =>
                setLimit(Number(event.target.value))
              }
              className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-800"
            />

            <p className="mt-2 text-xs text-slate-500">
              Select 1–10. Actual actions depend on backend eligibility.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Owner approval and simulation safeguards enabled
          </div>

          <button
            type="button"
            onClick={handleRunAgent}
            disabled={
              agentMutation.isPending ||
              !Number.isInteger(limit) ||
              limit < 1 ||
              limit > 10
            }
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {agentMutation.isPending ? (
              <>
                <LoaderCircle className="h-5 w-5 animate-spin" />
                Running Agent...
              </>
            ) : (
              <>
                <Play className="h-5 w-5" />
                Run AI Agent
              </>
            )}
          </button>
        </div>


        {/* Previous Agent Execution Events */}
        <AgentActivityHistory businessId={APP_CONFIG.businessId} />

      </section>

      {/* Running State */}
      {agentMutation.isPending && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-2xl border border-blue-200 bg-blue-50 p-6 text-center"
        >
          <LoaderCircle className="mx-auto h-9 w-9 animate-spin text-blue-600" />

          <h2 className="mt-4 font-semibold text-blue-900">
            Analyzing Customer Retention
          </h2>

          <p className="mt-2 text-sm leading-6 text-blue-700">
            GrowPilot AI is processing customer data and generating
            retention recommendations using the backend AI model.
          </p>
        </div>
      )}

      {/* Error State */}
      {agentMutation.isError && (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-5"
        >
          <p className="font-semibold text-red-700">
            Agent run could not be confirmed
          </p>

          <p className="mt-2 text-sm text-red-600">
            {getApiErrorMessage(agentMutation.error)}
          </p>

          <p className="mt-2 text-xs text-red-700">
            If the request timed out, check agent history before
            retrying. The backend may have already saved a run.
          </p>
        </div>
      )}

      {/* Agent Results */}
      {agentMutation.isSuccess && result && (
        <ExecutionResults result={result} />
      )}
      {/* Autonomous Feedback & Replanning */}
      <ReplanningPanel
        businessId={APP_CONFIG.businessId}
        initialRunId={result?.runId}
      />
      {/* Initial Empty State */}
      {agentMutation.isIdle && (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center sm:p-12">
          <BrainCircuit className="mx-auto h-12 w-12 text-slate-300" />

          <h2 className="mt-4 font-semibold text-slate-900">
            Ready to Analyze Your Customers
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            Run the retention agent to identify opportunities
            and generate a reviewable action plan.
          </p>
        </div>
      )}
    </section>
  );
}
