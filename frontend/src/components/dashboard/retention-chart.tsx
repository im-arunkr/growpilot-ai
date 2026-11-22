
"use client";

import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import type { RetentionMetrics } from "@/features/dashboard/types";

interface RetentionChartProps {
  data: RetentionMetrics;
}

const COLORS = {
  active: "#10b981",
  declining: "#f59e0b",
  inactive: "#ef4444",
  noActivity: "#94a3b8",
};

export function RetentionChart({
  data,
}: RetentionChartProps) {
  const chartData = [
    {
      name: "Active",
      value: data.active,
      color: COLORS.active,
    },
    {
      name: "Declining",
      value: data.declining,
      color: COLORS.declining,
    },
    {
      name: "Inactive",
      value: data.inactive,
      color: COLORS.inactive,
    },
    {
      name: "No Activity",
      value: data.noActivity,
      color: COLORS.noActivity,
    },
  ].filter((item) => item.value > 0);

  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div>
        <h3 className="text-base font-semibold text-slate-900">
          Customer Retention
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          Customer distribution by activity status
        </p>
      </div>

      <div className="mt-5 grid grid-cols-1 items-center gap-4 sm:grid-cols-2">
        <div className="relative h-[220px] min-w-0 sm:h-[240px]">
          {chartData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={90}
                    paddingAngle={3}
                    stroke="none"
                  >
                    {chartData.map((item) => (
                      <Cell
                        key={item.name}
                        fill={item.color}
                      />
                    ))}
                  </Pie>

                  <Tooltip
                    formatter={(value, name) => [
                      `${value ?? 0} customers`,
                      String(name),
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-slate-900">
                  {data.totalCustomers}
                </span>
                <span className="text-xs text-slate-500">
                  Customers
                </span>
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">
              No retention data available
            </div>
          )}
        </div>

        <div className="space-y-3">
          {chartData.map((item) => (
            <div
              key={item.name}
              className="flex items-center justify-between gap-3"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="truncate text-sm text-slate-600">
                  {item.name}
                </span>
              </div>

              <span className="text-sm font-semibold text-slate-900">
                {item.value}
              </span>
            </div>
          ))}

          <div className="border-t border-slate-100 pt-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-slate-600">
                At-Risk
              </span>
              <span className="text-sm font-semibold text-amber-700">
                {data.atRiskPercentage}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
