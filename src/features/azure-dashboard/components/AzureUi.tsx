import type { ReactNode } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { CloudOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/utils/cn";
import { azureErrorMessage } from "../api";
import type { AzureSection, HealthState } from "../types";
import { HEALTH_VARIANT, percent, usageLevel, type UsageLevel } from "../utils";

export function SectionSkeleton({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-3", className)} aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-9 w-full" />
      ))}
    </div>
  );
}

/** A query's loading / error / empty states around its content, so every page section degrades on its own. */
export function QueryBoundary<T>({
  query,
  children,
  isEmpty,
  emptyTitle = "Nothing found",
  emptyDescription,
  title,
  rows,
}: {
  query: UseQueryResult<T>;
  children: (data: T) => ReactNode;
  isEmpty?: (data: T) => boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  /** Names the section in the error ("Azure SQL data unavailable"). */
  title?: string;
  rows?: number;
}) {
  if (query.isPending) return <SectionSkeleton rows={rows} />;
  if (query.isError) {
    return (
      <ErrorState
        size="sm"
        title={title ? `${title} unavailable` : "Azure data unavailable"}
        description={azureErrorMessage(query.error)}
        onRetry={() => void query.refetch()}
        retrying={query.isFetching}
      />
    );
  }
  if (isEmpty?.(query.data)) return <EmptyState size="sm" bare title={emptyTitle} description={emptyDescription} />;
  return <>{children(query.data)}</>;
}

/** The same states for one section of the overview response, where a failing Azure call arrives as { available: false }. */
export function SectionBoundary<T>({
  section,
  loading,
  title,
  onRetry,
  children,
  rows,
}: {
  section: AzureSection<T> | undefined;
  loading: boolean;
  title: string;
  onRetry?: () => void;
  children: (data: T) => ReactNode;
  rows?: number;
}) {
  if (loading || !section) return <SectionSkeleton rows={rows} />;
  if (!section.available || section.data === null) {
    return (
      <EmptyState
        size="sm"
        bare
        icon={CloudOff}
        title={`${title} unavailable`}
        description={section.error ?? "Azure didn't return this information."}
        action={onRetry ? <button type="button" onClick={onRetry} className="text-sm font-medium text-primary-text hover:underline cursor-pointer">Retry</button> : undefined}
      />
    );
  }
  return <>{children(section.data)}</>;
}

export function AzureCard({ title, description, actions, children, className }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="min-w-0 space-y-1">
          <CardTitle className="text-base">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {actions}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

const BAR: Record<UsageLevel, string> = {
  ok: "bg-primary",
  warning: "bg-warning",
  critical: "bg-destructive",
  unknown: "bg-muted-foreground/40",
};

/** A usage meter: neutral up to 70%, warning above 70%, critical above 90%. Unknown shows an empty bar and "—". */
export function UsageBar({ value, label, detail, className }: { value: number | null | undefined; label?: string; detail?: ReactNode; className?: string }) {
  const level = usageLevel(value);
  const width = value === null || value === undefined ? 0 : Math.min(100, Math.max(0, value));
  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-baseline justify-between gap-2 text-xs">
        {label && <span className="text-muted-foreground">{label}</span>}
        <span className={cn("ml-auto tabular-nums", level === "critical" ? "font-semibold text-destructive-strong" : level === "warning" ? "font-semibold text-warning-strong" : "text-foreground")}>
          {detail ?? percent(value)}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={label ?? "Usage"}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value === null || value === undefined ? undefined : Math.round(width)}
        data-level={level}
        className="h-2 overflow-hidden rounded-full bg-secondary"
      >
        <div className={cn("h-full rounded-full transition-[width] duration-500", BAR[level])} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

export function HealthBadge({ state }: { state: HealthState }) {
  return (
    <Badge variant={HEALTH_VARIANT[state]} dot>
      {state}
    </Badge>
  );
}

export function KeyValue({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-words text-sm text-foreground">{children ?? "—"}</dd>
    </div>
  );
}
