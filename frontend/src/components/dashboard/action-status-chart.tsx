
"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { AgentMetrics } from "@/features/dashboard/types";

interface ActionStatusChartProps {
  data: AgentMetrics;
}

export function ActionStatusChart({
  data,
}: ActionStatusChartProps) {
  const chartData = [
    {
      name: "Pending",
      count: data.pendingApprovals,
      fill: "#f59e0b",
    },
    {
      name: "Approved",
      count: data.approvedActions,
      fill: "#3b82f6",
    },
    {
      name: "Completed",
      count: data.completedActions,
      fill: "#10b981",
    },
    {
      name: "Rejected",
      count: data.rejectedActions,
      fill: "#94a3b8",
    },
    {
      name: "Failed",
      count: data.failedActions,
      fill: "#ef4444",
    },
    {
      name: "Executing",
      count: data.executingActions,
      fill: "#8b5cf6",
    },
  ];

  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div>
        <h3 className="text-base font-semibold text-slate-900">
          AI Agent Actions
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          Current actions grouped by execution status
        </p>
      </div>

      <div className="chart-container mt-6 h-[260px] sm:h-[290px]">
        {data.totalActions > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{
                top: 5,
                right: 5,
                left: -20,
                bottom: 25,
              }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#e2e8f0"
              />

              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: "#64748b" }}
                angle={-30}
                textAnchor="end"
                interval={0}
                axisLine={false}
                tickLine={false}
              />

              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
              />

              <Tooltip
                formatter={(value) => [
                  `${value ?? 0} actions`,
                  "Count",
                ]}
              />

              <Bar
                dataKey="count"
                radius={[6, 6, 0, 0]}
                maxBarSize={42}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            No agent actions available
          </div>
        )}
      </div>
    </div>
  );
}
