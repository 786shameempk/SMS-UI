import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { getApiErrorStatus } from "@/lib/httpClient";
import { cn } from "@/utils/cn";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState } from "@/components/ui/states";
import type { DashboardDataSource } from "../dataSource";
import type { DashboardDateRange } from "../types";

/** What every tab body is given by the page. */
export interface TabProps {
  source: DashboardDataSource;
  dateRange: DashboardDateRange;
  rangeLabel: string;
}

/** Loading, access-refused and failed states shared by every tab; renders `children(data)` once there is data. */
export function TabBody<T>({
  query,
  skeletonCards = 4,
  children,
}: {
  query: { data: T | undefined; isLoading: boolean; isError: boolean; error: unknown; refetch: () => unknown; isRefetching: boolean };
  skeletonCards?: number;
  children: (data: T) => ReactNode;
}) {
  if (query.isLoading) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Loading">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          {Array.from({ length: skeletonCards }, (_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    );
  }
  if (query.isError || query.data === undefined) {
    const denied = [401, 403].includes(getApiErrorStatus(query.error) ?? 0);
    return denied ? (
      <EmptyState title="You don't have access to this view" description="Ask your school administrator to open the module behind it for your role." />
    ) : (
      <ErrorState onRetry={() => query.refetch()} retrying={query.isRefetching} />
    );
  }
  return <>{children(query.data)}</>;
}

/** A card with a title, a one-line description and an optional link into the module the numbers come from. */
export function Panel({
  title,
  description,
  href,
  hrefLabel = "Open",
  action,
  className,
  children,
}: {
  title: string;
  description?: ReactNode;
  href?: string;
  hrefLabel?: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Card className={cn("flex h-full min-w-0 flex-col p-4 sm:p-[var(--space-card-padding)]", className)}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
        {action}
        {href && (
          <Link
            to={href}
            className="inline-flex shrink-0 items-center gap-1 rounded-md text-xs font-medium text-primary-text hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {hrefLabel}
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        )}
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </Card>
  );
}

export type BarTone = "brand" | "success" | "warning" | "danger" | "info" | "neutral";

const BAR_TONE: Record<BarTone, string> = {
  brand: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
  info: "bg-info",
  neutral: "bg-muted-foreground/40",
};

/** One horizontal bar with its label on the left and its value on the right. `max` sets the full width. */
export function Bar({ label, value, max, display, tone = "brand", sub }: { label: ReactNode; value: number; max: number; display?: ReactNode; tone?: BarTone; sub?: ReactNode }) {
  const width = max <= 0 ? 0 : Math.max(value > 0 ? 2 : 0, Math.min(100, (value / max) * 100));
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
        <span className="min-w-0 truncate font-medium text-foreground">{label}</span>
        <span className="shrink-0 tabular-nums text-muted-foreground">{display ?? value.toLocaleString()}</span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-secondary"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={Math.min(value, max)}
        aria-label={typeof label === "string" ? label : undefined}
      >
        <div className={cn("h-full rounded-full transition-[width] duration-300", BAR_TONE[tone])} style={{ width: `${width}%` }} />
      </div>
      {sub && <p className="mt-1 text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

/** A stack of bars sharing one scale. */
export function BarList({
  items,
  max,
  empty = "Nothing to show yet.",
}: {
  items: Array<{ key?: string; label: ReactNode; value: number; display?: ReactNode; tone?: BarTone; sub?: ReactNode }>;
  max?: number;
  empty?: string;
}) {
  if (items.length === 0) return <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>;
  const top = max ?? Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="space-y-3">
      {items.map((i, idx) => (
        <Bar key={i.key ?? (typeof i.label === "string" ? i.label : idx)} label={i.label} value={i.value} max={top} display={i.display} tone={i.tone} sub={i.sub} />
      ))}
    </div>
  );
}

/** A row of small label/value facts inside a panel. */
export function Facts({ items }: { items: Array<{ label: string; value: ReactNode; tone?: "danger" | "warning" | "success" }> }) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
      {items.map((f) => (
        <div key={f.label} className="min-w-0">
          <dt className="text-xs text-muted-foreground">{f.label}</dt>
          <dd
            className={cn(
              "text-lg font-semibold tabular-nums text-foreground",
              f.tone === "danger" && "text-destructive-strong",
              f.tone === "warning" && "text-warning-strong",
              f.tone === "success" && "text-success-strong",
            )}
          >
            {f.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** A plain list row: primary text, secondary text and something on the right. */
export function Row({ title, sub, right, href }: { title: ReactNode; sub?: ReactNode; right?: ReactNode; href?: string }) {
  const body = (
    <>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{title}</p>
        {sub && <p className="truncate text-xs text-muted-foreground">{sub}</p>}
      </div>
      {right && <div className="shrink-0 text-right text-sm tabular-nums text-muted-foreground">{right}</div>}
    </>
  );
  const cls = "flex items-center justify-between gap-3 border-b border-border/60 py-2.5 last:border-0";
  return href ? (
    <Link to={href} className={cn(cls, "-mx-2 rounded-md px-2 hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** Quiet note shown when part of a tab could not be built (a section the viewer has no module for, or a failed request). */
export function Note({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border border-border bg-muted px-3.5 py-2.5 text-sm text-muted-foreground">{children}</p>;
}
