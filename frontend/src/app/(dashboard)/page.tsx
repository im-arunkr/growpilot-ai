
"use client";

import {
  IndianRupee,
  Users,
  ArrowLeftRight,
  TriangleAlert,
  Bot,
  ClipboardCheck,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";

import { KpiCard } from "@/components/dashboard/kpi-card";
import { useDashboardSummary } from "@/features/dashboard/hooks";
import { APP_CONFIG } from "@/lib/constants";
import { getApiErrorMessage } from "@/lib/api/client";
import { RetentionChart } from "@/components/dashboard/retention-chart";
import { ActionStatusChart } from "@/components/dashboard/action-status-chart";
import { RecentRuns } from "@/components/dashboard/recent-runs";
import { RecentActivityTimeline } from "@/components/dashboard/recent-activity";

const numberFormatter = new Intl.NumberFormat("en-IN");

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export default function DashboardPage() {
  const {
    data,
    isPending,
    isError,
    error,
    refetch,
    isFetching,
  } = useDashboardSummary(APP_CONFIG.businessId);

  const dashboard = data?.data;
  const business = dashboard?.business;
  const metrics = dashboard?.businessMetrics;
  const retention = dashboard?.retentionMetrics;
  const agent = dashboard?.agentMetrics;
  const hasCompleteData = Boolean(dashboard && metrics && retention && agent);

  return (
    <section className="min-w-0 space-y-7">
      {/* Page Heading */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Business Dashboard
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            {business?.name ??
              "Monitor your business with GrowPilot AI"}
          </p>
        </div>

        <button
          type="button"
          disabled={isFetching}
          onClick={() => void refetch()}
          className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${isFetching ? "animate-spin" : ""
              }`}
          />
          Refresh Data
        </button>
      </div>

      {/* Loading State */}
      {isPending && (
        <div className="app-grid">
          <KpiCard title="Service Fee Revenue" value="—" icon={IndianRupee} loading />
          <KpiCard title="Total Customers" value="—" icon={Users} loading />
          <KpiCard title="Transactions" value="—" icon={ArrowLeftRight} loading />
          <KpiCard title="At-Risk Customers" value="—" icon={TriangleAlert} loading />
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-5 sm:p-6"
        >
          <h2 className="font-semibold text-red-700">
            Unable to load dashboard
          </h2>

          <p className="mt-2 text-sm text-red-600">
            {getApiErrorMessage(error)}
          </p>

          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Successful but incomplete API responses should not leave the page blank. */}
      {!isPending && !isError && !hasCompleteData && (
        <div
          role="alert"
          className="rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:p-6"
        >
          <h2 className="font-semibold text-amber-900">
            Dashboard data is incomplete
          </h2>
          <p className="mt-2 text-sm text-amber-800">
            Some dashboard metrics are unavailable. Refresh to try again.
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="mt-4 min-h-10 rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800 disabled:opacity-50"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Real Dashboard Data */}
      {dashboard && metrics && retention && agent && (
        <>
          {/* Primary Business KPIs */}
          <div>
            <h2 className="mb-4 text-lg font-semibold text-slate-900">
              Business Performance
            </h2>

            <div className="app-grid">
              <KpiCard
                title="Service Fee Revenue"
                value={currencyFormatter.format(
                  metrics.totalRevenue
                )}
                description="Revenue earned from service fees"
                icon={IndianRupee}
                accent="blue"
              />

              <KpiCard
                title="Total Customers"
                value={numberFormatter.format(
                  metrics.totalCustomers
                )}
                description="Customers in your business"
                icon={Users}
                accent="purple"
              />

              <KpiCard
                title="Completed Transactions"
                value={numberFormatter.format(
                  metrics.completedTransactions
                )}
                description={`${numberFormatter.format(
                  metrics.totalTransactions
                )} total transactions`}
                icon={ArrowLeftRight}
                accent="green"
              />

              <KpiCard
                title="At-Risk Customers"
                value={numberFormatter.format(
                  retention.atRisk
                )}
                description={`${retention.atRiskPercentage}% of total customers`}
                icon={TriangleAlert}
                accent="amber"
              />
            </div>
          </div>

          {/* Agent Metrics */}
          <div>
            <h2 className="mb-4 text-lg font-semibold text-slate-900">
              AI Agent Overview
            </h2>

            <div className="app-grid">
              <KpiCard
                title="Agent Runs"
                value={numberFormatter.format(agent.totalAgentRuns)}
                description="Total AI agent executions"
                icon={Bot}
                accent="blue"
              />

              <KpiCard
                title="Pending Approvals"
                value={numberFormatter.format(agent.pendingApprovals)}
                description="Actions awaiting owner approval"
                icon={ClipboardCheck}
                accent="amber"
              />

              <KpiCard
                title="Completed Actions"
                value={numberFormatter.format(agent.completedActions)}
                description="Successfully completed actions"
                icon={CheckCircle2}
                accent="green"
              />

              <KpiCard
                title="Action Completion Rate"
                value={`${agent.actionCompletionRate}%`}
                description="Completed actions / total actions"
                icon={CheckCircle2}
                accent="purple"
              />
            </div>
          </div>

          {/* Dashboard Charts */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <RetentionChart data={retention} />
            <ActionStatusChart data={agent} />
          </div>

          {/* Additional Business Information */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h3 className="text-base font-semibold text-slate-900">
                Transaction Overview
              </h3>

              <div className="mt-5 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-500">
                    Total Transaction Value
                  </span>
                  <span className="text-sm font-semibold text-slate-900">
                    {currencyFormatter.format(
                      metrics.totalTransactionValue
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-500">
                    Service Fee Revenue
                  </span>
                  <span className="text-sm font-semibold text-slate-900">
                    {currencyFormatter.format(
                      metrics.totalRevenue
                    )}
                  </span>
                </div>

                <p className="text-xs leading-relaxed text-slate-500">
                  Transaction value represents money processed.
                  Service fee revenue represents business earnings.
                </p>
              </div>
            </div>

            <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h3 className="text-base font-semibold text-slate-900">
                Customer Retention
              </h3>

              <div className="mt-5 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-500">
                    Active Customers
                  </span>
                  <span className="text-sm font-semibold text-emerald-700">
                    {numberFormatter.format(retention.active)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-500">
                    Declining Customers
                  </span>
                  <span className="text-sm font-semibold text-amber-600">
                    {numberFormatter.format(retention.declining)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-500">
                    Inactive Customers
                  </span>
                  <span className="text-sm font-semibold text-red-600">
                    {numberFormatter.format(retention.inactive)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Agent Runs & Activity */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <RecentRuns runs={dashboard.recentRuns} />
            <RecentActivityTimeline
              activities={dashboard.recentActivity}
            />
          </div>

        </>
      )}
    </section>
  );
}
