
"use client";

import { useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Bot,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  Database,
  Lightbulb,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import { useGenerateBusinessInsights } from "@/features/insights/hooks";
import { APP_CONFIG } from "@/lib/constants";
import { getApiErrorMessage } from "@/lib/api/client";

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(date);
}

function formatDuration(value: number) {
  if (!Number.isFinite(value)) {
    return "Not available";
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(2)} sec`;
  }

  return `${value.toFixed(0)} ms`;
}

function displayLabel(key: string) {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase()
    );
}

function InsightContent({
  value,
  depth = 0,
}: {
  value: unknown;
  depth?: number;
}) {
  if (value === null || value === undefined) {
    return (
      <p className="text-sm text-slate-500">
        No details available.
      </p>
    );
  }

  if (typeof value === "string") {
    if (!value.trim()) {
      return (
        <p className="text-sm text-slate-500">
          The AI returned an empty response.
        </p>
      );
    }

    // Some model responses contain JSON as text.
    // Parse only structured JSON, otherwise show original text.
    const trimmed = value.trim();

    if (
      depth === 0 &&
      (trimmed.startsWith("{") ||
        trimmed.startsWith("["))
    ) {
      try {
        const parsed: unknown = JSON.parse(trimmed);

        return (
          <InsightContent
            value={parsed}
            depth={depth + 1}
          />
        );
      } catch {
        // A normal text response is still valid.
      }
    }

    return (
      <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">
        {value}
      </p>
    );
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return (
      <p className="break-words text-sm text-slate-700">
        {String(value)}
      </p>
    );
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return (
        <p className="text-sm text-slate-500">
          No items available.
        </p>
      );
    }

    return (
      <div className="space-y-3">
        {value.map((item, index) => (
          <div
            key={index}
            className="flex items-start gap-3 rounded-xl bg-slate-50 p-4"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-xs font-bold text-blue-700">
              {index + 1}
            </span>

            <div className="min-w-0 flex-1">
              <InsightContent
                value={item}
                depth={depth + 1}
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (typeof value === "object") {
    const entries = Object.entries(
      value as Record<string, unknown>
    );

    if (entries.length === 0) {
      return (
        <p className="text-sm text-slate-500">
          No insights available.
        </p>
      );
    }

    return (
      <div className="space-y-4">
        {entries.map(([key, item]) => (
          <section
            key={key}
            className={
              depth <= 1
                ? "rounded-xl border border-slate-200 bg-white p-4 sm:p-5"
                : "border-l-2 border-slate-200 pl-4"
            }
          >
            <h3 className="mb-3 text-sm font-semibold text-slate-900">
              {displayLabel(key)}
            </h3>

            <InsightContent
              value={item}
              depth={depth + 1}
            />
          </section>
        ))}
      </div>
    );
  }

  return (
    <p className="break-words text-sm text-slate-700">
      {String(value)}
    </p>
  );
}

const processSteps = [
  {
    title: "Analyze Business",
    description: "Read actual business performance metrics.",
    icon: Database,
  },
  {
    title: "Review Retention",
    description: "Include customer retention signals.",
    icon: TrendingUp,
  },
  {
    title: "Generate Insights",
    description: "AI produces business recommendations.",
    icon: BrainCircuit,
  },
];

export default function InsightsPage() {
  const {
    mutate,
    data,
    error,
    isPending,
    isError,
    isSuccess,
    reset,
  } = useGenerateBusinessInsights();

  const [previouslyGenerated, setPreviouslyGenerated] =
    useState(false);

  const result = data?.data;

  function handleGenerate() {
    reset();
    setPreviouslyGenerated(true);

    mutate(APP_CONFIG.businessId);
  }

  return (
    <div className="min-w-0 space-y-6 pb-8">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-blue-600">
            <Sparkles className="h-4 w-4" />
            AI-Powered Business Intelligence
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            AI Business Insights
          </h1>

          <p className="max-w-2xl text-sm leading-6 text-slate-500">
            Understand business performance, identify
            retention opportunities, and get AI-generated
            recommendations based on your actual data.
          </p>
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={isPending}
          className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}

          {isPending
            ? "Analyzing Business..."
            : previouslyGenerated
              ? "Regenerate Insights"
              : "Generate AI Insights"}
        </button>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 sm:p-5">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />

        <div className="space-y-1">
          <p className="text-sm font-semibold text-blue-900">
            Data-Driven AI Analysis
          </p>

          <p className="text-xs leading-6 text-blue-800 sm:text-sm">
            Insights use business analytics and customer
            retention summaries. Generating insights does
            not send customer messages or execute campaigns.
            Recommendations should be reviewed before
            taking action.
          </p>
        </div>
      </div>

      {/* Process */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {processSteps.map((step, index) => {
          const Icon = step.icon;

          return (
            <div
              key={step.title}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <Icon className="h-5 w-5" />
                </div>

                <span className="text-xs font-semibold text-slate-400">
                  STEP {index + 1}
                </span>
              </div>

              <h2 className="mt-4 text-sm font-semibold text-slate-900">
                {step.title}
              </h2>

              <p className="mt-2 text-xs leading-5 text-slate-500">
                {step.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Loading */}
      {isPending && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm sm:p-8"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50">
              <BrainCircuit className="h-6 w-6 animate-pulse text-blue-600" />
            </div>

            <div>
              <h2 className="text-base font-semibold text-slate-900">
                AI is analyzing your business
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Fetching business metrics and retention data,
                then requesting insights from the configured
                AI model.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {isError && (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-5 sm:p-6"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

            <div className="min-w-0 flex-1">
              <h2 className="font-semibold text-red-800">
                Unable to Generate Insights
              </h2>

              <p className="mt-2 break-words text-sm text-red-700">
                {getApiErrorMessage(error)}
              </p>

              <button
                type="button"
                onClick={handleGenerate}
                className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isPending && !isError && !isSuccess && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center shadow-sm sm:px-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">
            <Lightbulb className="h-8 w-8 text-blue-600" />
          </div>

          <h2 className="mt-5 text-lg font-semibold text-slate-900">
            Your AI Insights Are Ready to Generate
          </h2>

          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-500">
            Click Generate AI Insights to analyze business
            performance and customer retention data.
          </p>

          <button
            type="button"
            onClick={handleGenerate}
            className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Start Analysis
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Successful AI Result */}
      {isSuccess && result && !isPending && (
        <div className="space-y-5">
          <div
            role="status"
            className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4"
          >
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />

            <div>
              <p className="text-sm font-semibold text-emerald-800">
                Business Analysis Completed
              </p>

              <p className="mt-1 text-xs text-emerald-700">
                AI insights were generated successfully.
              </p>
            </div>
          </div>

          {/* Model Metadata */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500">
                <Bot className="h-4 w-4" />
                <span className="text-xs font-medium">
                  AI Model
                </span>
              </div>

              <p className="mt-3 break-words text-sm font-semibold text-slate-900">
                {result.model || "Not available"}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Provider: {result.provider || "Unknown"}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500">
                <Clock3 className="h-4 w-4" />
                <span className="text-xs font-medium">
                  Generation Time
                </span>
              </div>

              <p className="mt-3 text-sm font-semibold text-slate-900">
                {formatDuration(result.latencyMs)}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Model request latency
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-xs font-medium">
                  Generated At
                </span>
              </div>

              <p className="mt-3 text-sm font-semibold text-slate-900">
                {formatDate(result.generatedAt)}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                India Standard Time
              </p>
            </div>
          </div>

          {/* AI Insights */}
          <section className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100">
                <Sparkles className="h-5 w-5 text-blue-700" />
              </div>

              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  AI-Generated Business Insights
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Recommendations from your configured AI model
                </p>
              </div>
            </div>

            <InsightContent value={result.insights} />
          </section>

          {/* Review Notice */}
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs leading-6 text-amber-900">
              AI recommendations are decision-support
              suggestions. Verify them against business data
              before approving customer retention actions.
              This page does not automatically execute
              recommendations.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
