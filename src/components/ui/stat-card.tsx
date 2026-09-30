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

/** The one KPI tile used across dashboard, reports and module summaries: label, value, then context. */
export function StatCard({ label, value, icon: Icon, tone = "brand", hint, trend, loading, className, ...props }: StatCardProps) {
  const good = trend ? (trend.positive ?? trend.direction === "up") : false;
  return (
    <Card className={cn("flex h-full min-w-0 flex-col p-4 sm:p-[var(--space-card-padding)]", className)} {...props}>
      <div className="flex items-start justify-between gap-3">
        {/* Wraps rather than truncating ("Fees collected (MTD)"), so a label is never cut mid-word. */}
        <p className="min-w-0 text-[13px] font-medium leading-5 text-muted-foreground">{label}</p>
        {Icon && (
          <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset", TONE[tone])}>
            <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
          </div>
        )}
      </div>
      {loading ? (
        <Skeleton className="mt-1 h-8 w-24" />
      ) : (
        <p className="mt-1 break-words text-2xl font-semibold leading-8 tracking-tight text-foreground tabular-nums sm:text-[1.75rem]">{value}</p>
      )}
      {(trend || hint) && !loading && (
        <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-3 text-xs">
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

/** Responsive grid for a row of StatCards: 2-up on phones (a KPI row shouldn't cost a full screen of scrolling) → N columns. */
export function StatGrid({ columns = 4, className, ...props }: React.HTMLAttributes<HTMLDivElement> & { columns?: 2 | 3 | 4 | 5 }) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 sm:gap-4",
        columns === 3 && "lg:grid-cols-3",
        columns === 4 && "xl:grid-cols-4",
        columns === 5 && "lg:grid-cols-3 xl:grid-cols-5",
        className,
      )}
      {...props}
    />
  );
}
