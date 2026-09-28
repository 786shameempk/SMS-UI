import * as React from "react";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/utils/cn";

export type StatTone = "brand" | "info" | "success" | "warning" | "danger" | "neutral";

const TONE: Record<StatTone, string> = {
  brand: "bg-accent text-accent-foreground ring-primary/25",
  info: "bg-info-soft text-info-strong ring-info/20",
  success: "bg-success-soft text-success-strong ring-success/20",
  warning: "bg-warning-soft text-warning-strong ring-warning/25",
  danger: "bg-destructive-soft text-destructive-strong ring-destructive/20",
  neutral: "bg-secondary text-secondary-foreground ring-border",
};

/** A faint corner glow in the tile's tone, so a row of KPIs reads as distinct at a glance. */
const GLOW: Record<StatTone, string> = {
  brand: "bg-primary/10",
  info: "bg-info/10",
  success: "bg-success/10",
  warning: "bg-warning/10",
  danger: "bg-destructive/10",
  neutral: "bg-muted-foreground/5",
};

interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: React.ReactNode;
  value: React.ReactNode;
  icon?: LucideIcon;
  tone?: StatTone;
  /** Secondary line under the value (e.g. "of 1,240 students"). */
  hint?: React.ReactNode;
  /** Trend chip. `direction` decides colour + arrow; `positive` flips meaning when "down" is good. */
  trend?: { value: React.ReactNode; direction: "up" | "down" | "flat"; positive?: boolean; label?: React.ReactNode };
  loading?: boolean;
}

/** The one KPI tile used across dashboard, reports and module summaries. */
export function StatCard({ label, value, icon: Icon, tone = "brand", hint, trend, loading, className, ...props }: StatCardProps) {
  const good = trend ? (trend.positive ?? trend.direction === "up") : false;
  return (
    <Card
      className={cn(
        "relative overflow-hidden p-[var(--space-card-padding)] transition-[box-shadow,border-color] duration-200 hover:shadow-md",
        className,
      )}
      {...props}
    >
      <span aria-hidden="true" className={cn("pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full blur-2xl", GLOW[tone])} />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1.5">
          <p className="truncate text-[13px] font-medium text-muted-foreground">{label}</p>
          {loading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <p className="text-[1.75rem] font-semibold leading-8 tracking-tight text-foreground tabular-nums">{value}</p>
          )}
        </div>
        {Icon && (
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset", TONE[tone])}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
        )}
      </div>
      {(trend || hint) && !loading && (
        <div className="relative mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          {trend && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-semibold",
                trend.direction === "flat"
                  ? "bg-secondary text-muted-foreground"
                  : good
                    ? "bg-success-soft text-success-strong"
                    : "bg-destructive-soft text-destructive-strong",
              )}
            >
              {trend.direction === "up" && <ArrowUpRight className="h-3 w-3" aria-hidden="true" />}
              {trend.direction === "down" && <ArrowDownRight className="h-3 w-3" aria-hidden="true" />}
              {trend.value}
            </span>
          )}
          {(trend?.label || hint) && <span className="text-muted-foreground">{trend?.label ?? hint}</span>}
        </div>
      )}
    </Card>
  );
}

/** Responsive grid for a row of StatCards: 1 → 2 → N columns. */
export function StatGrid({ columns = 4, className, ...props }: React.HTMLAttributes<HTMLDivElement> & { columns?: 2 | 3 | 4 | 5 }) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 min-[420px]:grid-cols-2",
        columns === 3 && "lg:grid-cols-3",
        columns === 4 && "xl:grid-cols-4",
        columns === 5 && "lg:grid-cols-3 xl:grid-cols-5",
        className,
      )}
      {...props}
    />
  );
}
