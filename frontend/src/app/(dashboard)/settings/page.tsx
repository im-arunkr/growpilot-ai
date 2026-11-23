
"use client";

import {
  Activity,
  AlertCircle,
  Bot,
  Building2,
  CheckCircle2,
  Clock3,
  Database,
  LockKeyhole,
  RefreshCw,
  Server,
  Settings2,
  ShieldCheck,
  UserRound,
  Wifi,
  WifiOff,
} from "lucide-react";

import { useAIModelStatus } from "@/features/settings/hooks";
import { useBusinessAnalytics } from "@/features/analytics/hooks";
import { APP_CONFIG } from "@/lib/constants";
import { getApiErrorMessage } from "@/lib/api/client";

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 border-b border-slate-100 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <span className="text-sm text-slate-500">
        {label}
      </span>

      <span
        className={`break-all text-sm font-medium text-slate-900 ${
          mono ? "font-mono text-xs" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function SectionCard({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon: typeof Bot;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start gap-3 border-b border-slate-100 p-5 sm:p-6">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50">
          <Icon className="h-5 w-5 text-blue-600" />
        </div>

        <div className="min-w-0">
          <h2 className="text-base font-semibold text-slate-900">
            {title}
          </h2>

          <p className="mt-1 text-sm leading-6 text-slate-500">
            {description}
          </p>
        </div>
      </div>

      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

export default function SettingsPage() {
  const modelQuery = useAIModelStatus();

  const businessQuery = useBusinessAnalytics(
    APP_CONFIG.businessId
  );

  const modelResponse = modelQuery.data;
  const model = modelResponse?.data;

  const business = businessQuery.data?.data.business;

  const isModelOnline =
    modelResponse?.success === true &&
    model?.available === true;

  const installedModels = model?.installedModels ?? [];

  return (
    <section className="min-w-0 space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-blue-600">
            <Settings2 className="h-4 w-4" />
            Application Configuration
          </div>

          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Settings
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            View business information, AI model health,
            installed models, and application safety
            configuration.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            void modelQuery.refetch();
            void businessQuery.refetch();
          }}
          disabled={
            modelQuery.isFetching ||
            businessQuery.isFetching
          }
          className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${
              modelQuery.isFetching ||
              businessQuery.isFetching
                ? "animate-spin"
                : ""
            }`}
          />

          Refresh Status
        </button>
      </div>

      {/* Read-only Information */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4">
        <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />

        <p className="text-sm leading-6 text-blue-800">
          These settings are currently read-only.
          Configuration changes are managed by the
          backend. No model changes or customer
          messages are triggered from this page.
        </p>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">
              AI Model Status
            </p>

            {modelQuery.isPending ? (
              <Activity className="h-5 w-5 text-slate-400" />
            ) : isModelOnline ? (
              <Wifi className="h-5 w-5 text-emerald-600" />
            ) : (
              <WifiOff className="h-5 w-5 text-red-600" />
            )}
          </div>

          <p
            className={`mt-4 text-2xl font-bold ${
              modelQuery.isPending
                ? "text-slate-500"
                : modelQuery.isError
                  ? "text-amber-700"
                  : isModelOnline
                    ? "text-emerald-700"
                    : "text-red-700"
            }`}
          >
            {modelQuery.isPending
              ? "Checking..."
              : modelQuery.isError
                ? "Status Unavailable"
                : isModelOnline
                  ? "Online"
                  : "Offline"}
          </p>

          <p className="mt-2 text-xs text-slate-500">
            Live status from the backend
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">
              Configured AI Provider
            </p>

            <Bot className="h-5 w-5 text-blue-600" />
          </div>

          <p className="mt-4 text-2xl font-bold capitalize text-slate-900">
            {model?.provider ?? "Not available"}
          </p>

          <p className="mt-2 text-xs text-slate-500">
            Provider reported by the model status API
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Business Profile */}
        <SectionCard
          title="Business Profile"
          description="Business information retrieved from the analytics API."
          icon={Building2}
        >
          {businessQuery.isPending ? (
            <p
              role="status"
              className="text-sm text-slate-500"
            >
              Loading business details...
            </p>
          ) : businessQuery.isError ? (
            <div role="alert" className="space-y-3">
              <p className="text-sm text-red-600">
                {getApiErrorMessage(businessQuery.error)}
              </p>

              <button
                type="button"
                onClick={() =>
                  void businessQuery.refetch()
                }
                className="text-sm font-semibold text-blue-600 hover:text-blue-700"
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              <DetailRow
                label="Business Name"
                value={business?.name ?? "Not available"}
              />

              <DetailRow
                label="Business Owner"
                value={
                  business?.owner_name ??
                  "Not available"
                }
              />

              <DetailRow
                label="Business ID"
                value={
                  business?.id ??
                  APP_CONFIG.businessId
                }
                mono
              />

              <div className="mt-5 flex items-start gap-2 rounded-lg bg-slate-50 p-3">
                <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />

                <p className="text-xs leading-5 text-slate-500">
                  Business profile editing is not
                  available in this version.
                </p>
              </div>
            </>
          )}
        </SectionCard>

        {/* AI Model Configuration */}
        <SectionCard
          title="AI Model Configuration"
          description="Current Ollama provider and model readiness."
          icon={Server}
        >
          {modelQuery.isPending ? (
            <p
              role="status"
              className="text-sm text-slate-500"
            >
              Checking Ollama connection...
            </p>
          ) : modelQuery.isError ? (
            <div role="alert" className="space-y-3">
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-4 w-4" />

                <p className="text-sm font-semibold">
                  Unable to check model status
                </p>
              </div>

              <p className="text-sm text-red-600">
                {getApiErrorMessage(modelQuery.error)}
              </p>

              <button
                type="button"
                onClick={() =>
                  void modelQuery.refetch()
                }
                className="text-sm font-semibold text-blue-600 hover:text-blue-700"
              >
                Retry Connection Check
              </button>
            </div>
          ) : (
            <>
              <DetailRow
                label="AI Provider"
                value={model?.provider ?? "Unknown"}
              />

              <DetailRow
                label="Configured Model"
                value={
                  model?.configuredModel ??
                  "Not available"
                }
              />

              <DetailRow
                label="Model Availability"
                value={
                  isModelOnline
                    ? "Ready for inference"
                    : "Unavailable"
                }
              />

              {model?.error && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
                  <p className="text-xs font-semibold text-red-700">
                    Connection Error
                  </p>

                  <p className="mt-2 break-words text-sm text-red-700">
                    {model.error}
                  </p>
                </div>
              )}

              <div
                className={`mt-5 flex items-start gap-3 rounded-xl p-4 ${
                  isModelOnline
                    ? "border border-emerald-200 bg-emerald-50"
                    : "border border-amber-200 bg-amber-50"
                }`}
              >
                {isModelOnline ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                ) : (
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                )}

                <p
                  className={`text-xs leading-6 ${
                    isModelOnline
                      ? "text-emerald-800"
                      : "text-amber-800"
                  }`}
                >
                  {isModelOnline
                    ? "The configured AI model is installed and available for inference."
                    : "The configured AI model is not currently ready. Check the Ollama service and installed model."}
                </p>
              </div>
            </>
          )}
        </SectionCard>

        {/* Installed Models */}
        <SectionCard
          title="Installed AI Models"
          description="Models detected by the Ollama installation."
          icon={Database}
        >
          {modelQuery.isPending ? (
            <p className="text-sm text-slate-500">
              Loading installed models...
            </p>
          ) : modelQuery.isError ? (
            <p className="text-sm text-slate-500">
              Model list unavailable.
            </p>
          ) : installedModels.length > 0 ? (
            <div className="space-y-3">
              {installedModels.map((name) => {
                const isConfigured =
                  name === model?.configuredModel;

                return (
                  <div
                    key={name}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Bot className="h-5 w-5 shrink-0 text-slate-500" />

                      <span className="break-all text-sm font-medium text-slate-900">
                        {name}
                      </span>
                    </div>

                    {isConfigured && (
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                        Configured
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm leading-6 text-slate-500">
              {model?.error
                ? "Unable to retrieve the installed model list."
                : "No installed models were reported."}
            </p>
          )}

          <p className="mt-5 text-xs leading-5 text-slate-500">
            Models can be installed or changed through
            the Ollama environment, not this interface.
          </p>
        </SectionCard>

        {/* Safety Configuration */}
        <SectionCard
          title="AI Safety & Execution"
          description="Current application workflow and safety design."
          icon={ShieldCheck}
        >
          <div className="space-y-4">
            {[
              {
                title: "Human Approval",
                description:
                  "Retention actions require human review before approved execution.",
              },
              {
                title: "Simulation-Only Execution",
                description:
                  "Customer message execution is simulated in this demo.",
              },
              {
                title: "AI-Generated Drafts",
                description:
                  "AI drafts are generated for review before execution.",
              },
              {
                title: "Read-Only Settings",
                description:
                  "Configuration updates are not available from this page.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4"
              >
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />

                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">
                    {item.title}
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-5 text-xs leading-5 text-slate-500">
            These are documented application rules,
            not live configuration toggles or a
            security audit.
          </p>
        </SectionCard>
      </div>

      {/* Footer */}
      <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />

        <p className="text-xs leading-6 text-slate-500">
          Model availability is checked when this
          page loads or when you select Refresh
          Status. An available model does not
          guarantee successful inference.
        </p>
      </div>
    </section>
  );
}
