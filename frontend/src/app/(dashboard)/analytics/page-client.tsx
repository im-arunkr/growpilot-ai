
"use client";

import {
  Activity,
  ArrowLeftRight,
  CheckCircle2,
  IndianRupee,
  RefreshCw,
  TrendingUp,
  Users,
} from "lucide-react";

import {
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  LineChart,
  Line,
} from "recharts";

import { useBusinessAnalytics } from "@/features/analytics/hooks";
import { APP_CONFIG } from "@/lib/constants";
import { getApiErrorMessage } from "@/lib/api/client";

const numberFormatter = new Intl.NumberFormat("en-IN");

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

function formatMonth(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(monthNumber) ||
    monthNumber < 1 ||
    monthNumber > 12
  ) {
    return month;
  }

  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, monthNumber - 1, 1)));
}

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  
}: {
  title: string;
  value: string;
  description: string;
  icon: typeof Users;
}) {
  return (
    <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">
          {title}
        </p>

        <Icon
          aria-hidden="true"
          className="h-5 w-5 shrink-0 text-blue-600"
        />
      </div>

      <p className="mt-4 break-words text-2xl font-bold text-slate-900 sm:text-3xl">
        {value}
      </p>

      <p className="mt-2 text-xs leading-5 text-slate-500">
        {description}
      </p>
    </article>
  );
}

export default function AnalyticsPage() {
  const {
    data,
    isPending,
    isError,
    error,
    isFetching,
    refetch,
  } = useBusinessAnalytics(APP_CONFIG.businessId);

  const analytics = data?.data;
  const summary = analytics?.summary;
  const trends = analytics?.monthlyTrends ?? [];

  const chartData = trends.map((item) => ({
    ...item,
    label: formatMonth(item.month),
  }));

  const completionRate =
    summary && summary.totalTransactions > 0
      ? (
          (summary.completedTransactions /
            summary.totalTransactions) *
          100
        ).toFixed(1)
      : "0.0";

  const averageFeeRevenue =
    summary && summary.completedTransactions > 0
      ? summary.totalRevenue /
        summary.completedTransactions
      : 0;

  const generatedMonth = analytics?.generatedAt
    ? new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
      }).format(new Date(analytics.generatedAt))
    : null;

  const latestMonth =
    trends.length > 0 ? trends[trends.length - 1].month : null;

  const latestMonthIsPartial =
    generatedMonth !== null &&
    latestMonth === generatedMonth;

  return (
    <section className="min-w-0 space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Business Analytics
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Revenue and transaction performance for{" "}
            {analytics?.business.name ??
              "your business"}.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw
            aria-hidden="true"
            className={`h-4 w-4 ${
              isFetching ? "animate-spin" : ""
            }`}
          />

          Refresh Analytics
        </button>
      </div>

      {/* Loading */}
      {isPending && (
        <div
          role="status"
          className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500"
        >
          Loading business analytics...
        </div>
      )}

      {/* Error */}
      {isError && (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-5"
        >
          <h2 className="font-semibold text-red-700">
            Unable to load analytics
          </h2>

          <p className="mt-2 text-sm text-red-600">
            {getApiErrorMessage(error)}
          </p>

          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Analytics Content */}
      {!isPending && !isError && analytics && summary && (
        <>
          {/* Primary KPIs */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Service Fee Revenue"
              value={currencyFormatter.format(
                summary.totalRevenue
              )}
              description="Revenue from completed transactions"
              icon={IndianRupee}
            />

            <MetricCard
              title="Transaction Value"
              value={currencyFormatter.format(
                summary.totalTransactionValue
              )}
              description="Total value processed in completed transactions"
              icon={TrendingUp}
            />

            <MetricCard
              title="Total Customers"
              value={numberFormatter.format(
                summary.totalCustomers
              )}
              description="Customers registered with this business"
              icon={Users}
            />

            <MetricCard
              title="Completed Transactions"
              value={numberFormatter.format(
                summary.completedTransactions
              )}
              description={`${numberFormatter.format(
                summary.totalTransactions
              )} total transactions`}
              icon={ArrowLeftRight}
            />
          </div>

          {/* Secondary KPIs */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <MetricCard
              title="Transaction Completion Rate"
              value={`${completionRate}%`}
              description="Completed / total transactions"
              icon={CheckCircle2}
            />

            <MetricCard
              title="Customers With Transactions"
              value={numberFormatter.format(
                summary.customersWithCompletedTransactions
              )}
              description="Unique customers with completed transactions"
              icon={Users}
            />

            <MetricCard
              title="Average Fee Per Transaction"
              value={currencyFormatter.format(
                averageFeeRevenue
              )}
              description="Service fee revenue / completed transactions"
              icon={Activity}
            />
          </div>

          {/* Monthly Charts */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
              <h2 className="text-lg font-semibold text-slate-900">
                Monthly Service Fee Revenue
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Revenue earned from completed transactions
              </p>

              {chartData.length > 0 ? (
                <div className="mt-6 h-72 w-full sm:h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      margin={{
                        top: 8,
                        right: 8,
                        bottom: 8,
                        left: 0,
                      }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                      />

                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11 }}
                        tickLine={false}
                      />

                      <YAxis
                        width={54}
                        tick={{ fontSize: 11 }}
                        tickFormatter={(value: number) =>
                          numberFormatter.format(value)
                        }
                      />

                      <Tooltip
                        formatter={(value) =>
                          currencyFormatter.format(
                            Number(value ?? 0)
                          )
                        }
                      />

                      <Bar
                        dataKey="totalRevenue"
                        name="Service Fee Revenue"
                        fill="#2563eb"
                        radius={[5, 5, 0, 0]}
                        maxBarSize={54}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="mt-8 text-sm text-slate-500">
                  No monthly revenue data available.
                </p>
              )}
            </section>

            <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
              <h2 className="text-lg font-semibold text-slate-900">
                Monthly Transaction Trends
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Total transactions versus completed transactions
              </p>

              {chartData.length > 0 ? (
                <div className="mt-6 h-72 w-full sm:h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={chartData}
                      margin={{
                        top: 8,
                        right: 8,
                        bottom: 8,
                        left: 0,
                      }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                      />

                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11 }}
                        tickLine={false}
                      />

                      <YAxis
                        allowDecimals={false}
                        width={40}
                        tick={{ fontSize: 11 }}
                      />

                      <Tooltip />
                      <Legend />

                      <Line
                        type="monotone"
                        dataKey="totalTransactions"
                        name="Total"
                        stroke="#2563eb"
                        strokeWidth={3}
                        dot={{ r: 4 }}
                      />

                      <Line
                        type="monotone"
                        dataKey="completedTransactions"
                        name="Completed"
                        stroke="#059669"
                        strokeWidth={2}
                        strokeDasharray="5 4"
                        dot={{ r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="mt-8 text-sm text-slate-500">
                  No monthly transaction data available.
                </p>
              )}
            </section>
          </div>

          {/* Monthly Summary Table */}
          <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-slate-900">
                Monthly Performance
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Detailed monthly revenue and transaction metrics
              </p>
            </div>

            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[780px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-4">Month</th>
                    <th className="px-5 py-4">Transactions</th>
                    <th className="px-5 py-4">Completed</th>
                    <th className="px-5 py-4">Completion Rate</th>
                    <th className="px-5 py-4">Fee Revenue</th>
                    <th className="px-5 py-4">Transaction Value</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {trends.map((month) => (
                    <tr
                      key={month.month}
                      className="hover:bg-slate-50"
                    >
                      <td className="px-5 py-4 font-semibold text-slate-900">
                        {formatMonth(month.month)}
                      </td>

                      <td className="px-5 py-4">
                        {numberFormatter.format(
                          month.totalTransactions
                        )}
                      </td>

                      <td className="px-5 py-4">
                        {numberFormatter.format(
                          month.completedTransactions
                        )}
                      </td>

                      <td className="px-5 py-4">
                        {month.completionRate.toFixed(1)}%
                      </td>

                      <td className="px-5 py-4 font-medium">
                        {currencyFormatter.format(
                          month.totalRevenue
                        )}
                      </td>

                      <td className="px-5 py-4 font-medium">
                        {currencyFormatter.format(
                          month.totalTransactionValue
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {trends.length === 0 && (
              <p className="p-6 text-sm text-slate-500">
                No monthly analytics available yet.
              </p>
            )}
          </section>

          {/* Data Notes */}
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-xs leading-6 text-blue-800">
              All revenue figures represent service fees, not
              total transaction value. Monthly figures use
              India Standard Time.
              {latestMonthIsPartial &&
                " The latest month is still in progress, so its results are month-to-date."}
              {" "}Charts show recorded transactions only.
            </p>
          </div>
        </>
      )}
    </section>
  );
}
