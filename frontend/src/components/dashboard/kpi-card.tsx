
import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

type Trend = "up" | "down" | "neutral";
type Accent = "blue" | "green" | "amber" | "purple";

interface KpiCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  accent?: Accent;
  trend?: Trend;
  trendLabel?: string;
  loading?: boolean;
}

const accentStyles: Record<
  Accent,
  { icon: string; background: string }
> = {
  blue: {
    icon: "text-blue-600",
    background: "bg-blue-50",
  },
  green: {
    icon: "text-emerald-600",
    background: "bg-emerald-50",
  },
  amber: {
    icon: "text-amber-600",
    background: "bg-amber-50",
  },
  purple: {
    icon: "text-violet-600",
    background: "bg-violet-50",
  },
};

export function KpiCard({
  title,
  value,
  description,
  icon: Icon,
  accent = "blue",
  trend = "neutral",
  trendLabel,
  loading = false,
}: KpiCardProps) {
  const styles = accentStyles[accent];

  if (loading) {
    return (
      <div
        role="status"
        aria-label={`Loading ${title}`}
        className="min-w-0 animate-pulse rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      >
        <div className="h-10 w-10 rounded-xl bg-slate-100" />
        <div className="mt-5 h-3 w-24 rounded bg-slate-100" />
        <div className="mt-3 h-8 w-32 rounded bg-slate-100" />
        <div className="mt-4 h-3 w-36 rounded bg-slate-100" />
      </div>
    );
  }

  return (
    <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">
          {title}
        </p>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${styles.background}`}
        >
          <Icon className={`h-5 w-5 ${styles.icon}`} />
        </div>
      </div>

      <div className="mt-3">
        <p className="break-words text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {value}
        </p>

        {description && (
          <p className="mt-2 text-xs leading-relaxed text-slate-500 sm:text-sm">
            {description}
          </p>
        )}
      </div>

      {trendLabel && (
        <div className="mt-4 flex items-center gap-1.5">
          {trend === "up" && (
            <ArrowUpRight className="h-4 w-4 text-emerald-600" />
          )}

          {trend === "down" && (
            <ArrowDownRight className="h-4 w-4 text-red-600" />
          )}

          <span
            className={
              trend === "up"
                ? "text-xs font-medium text-emerald-700"
                : trend === "down"
                  ? "text-xs font-medium text-red-600"
                  : "text-xs font-medium text-slate-500"
            }
          >
            {trendLabel}
          </span>
        </div>
      )}
    </article>
  );
}
