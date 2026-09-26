import * as React from "react";
import { AlertTriangle, Inbox, Loader2, RotateCw, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/utils/cn";

interface EmptyStateProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  icon?: LucideIcon;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  /** `bare` drops the dashed frame, for use inside an existing card or table. */
  bare?: boolean;
  size?: "sm" | "default";
}

export function EmptyState({ icon: Icon = Inbox, title, description, action, bare, size = "default", className, ...props }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        size === "sm" ? "gap-2 px-4 py-8" : "gap-3 px-6 py-12",
        !bare && "rounded-xl border border-dashed border-border bg-card/50",
        className,
      )}
      {...props}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-full bg-secondary text-muted-foreground ring-8 ring-secondary/40",
          size === "sm" ? "h-9 w-9" : "h-11 w-11",
        )}
      >
        <Icon className={size === "sm" ? "h-4 w-4" : "h-5 w-5"} aria-hidden="true" />
      </div>
      <div className="max-w-sm space-y-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="mt-1 flex flex-wrap items-center justify-center gap-2">{action}</div>}
    </div>
  );
}

interface ErrorStateProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title?: React.ReactNode;
  description?: React.ReactNode;
  onRetry?: () => void;
  retrying?: boolean;
  bare?: boolean;
  size?: "sm" | "default";
}

/** A friendly failure message. Deliberately never renders the raw API/Axios error text. */
export function ErrorState({
  title = "We couldn't load this",
  description = "Something went wrong while fetching the data. Check your connection and try again.",
  onRetry,
  retrying,
  bare,
  size = "default",
  className,
  ...props
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center text-center",
        size === "sm" ? "gap-2 px-4 py-8" : "gap-3 px-6 py-12",
        !bare && "rounded-xl border border-destructive/25 bg-destructive-soft/40",
        className,
      )}
      {...props}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-full bg-destructive-soft text-destructive-strong",
          size === "sm" ? "h-9 w-9" : "h-11 w-11",
        )}
      >
        <AlertTriangle className={size === "sm" ? "h-4 w-4" : "h-5 w-5"} aria-hidden="true" />
      </div>
      <div className="max-w-sm space-y-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} loading={retrying} className="mt-1">
          {!retrying && <RotateCw className="h-3.5 w-3.5" />}
          Try again
        </Button>
      )}
    </div>
  );
}

/** Inline "busy" row for small regions (a card body, a panel section) where a skeleton would be overkill. */
export function LoadingState({ label = "Loading…", className }: { label?: string; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={cn("flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground", className)}>
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      {label}
    </div>
  );
}

/** Full-page placeholder shaped like a standard page (header + stat row + a content card). */
export function PageSkeleton({ stats = 0, className }: { stats?: number; className?: string }) {
  return (
    <div role="status" aria-label="Loading" className={cn("mx-auto w-full max-w-[1400px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8 space-y-6", className)}>
      <div className="space-y-2">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      {stats > 0 && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: stats }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      )}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <Skeleton className="h-5 w-40" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-4" style={{ width: `${90 - i * 9}%` }} />
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
