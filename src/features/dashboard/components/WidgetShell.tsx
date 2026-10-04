import type { ReactNode } from "react";
import { AlertTriangle, Lock, RotateCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { isAccessDenied } from "../useDashboard";

export interface WidgetQuery<T> {
  data: T | undefined;
  error: unknown;
  isError: boolean;
  isRefetching: boolean;
  refetch: () => unknown;
}

/** A card with just the widget title and a one-line state message, plus an optional action. */
function StateCard({
  title,
  icon: Icon,
  tone,
  message,
  role,
  action,
}: {
  title: string;
  icon: typeof Lock;
  tone: "muted" | "error";
  message: string;
  role?: "alert" | "status";
  action?: ReactNode;
}) {
  return (
    <Card role={role}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription className="flex items-center gap-1.5">
          <Icon className={tone === "error" ? "h-3.5 w-3.5 text-destructive-strong" : "h-3.5 w-3.5"} aria-hidden="true" />
          {message}
        </CardDescription>
      </CardHeader>
      {action && <div className="px-[var(--space-card-padding)] pb-[var(--space-card-padding)]">{action}</div>}
    </Card>
  );
}

/** Placeholder card while a widget's code or data loads. */
export function WidgetSkeleton({ title, height = 220 }: { title: string; height?: number }) {
  return (
    <Card aria-busy="true" aria-label={`Loading ${title}`}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <div className="space-y-3 px-[var(--space-card-padding)] pb-[var(--space-card-padding)]" style={{ minHeight: height - 64 }}>
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </Card>
  );
}

/**
 * The non-data states of one dashboard widget, so a slow, failing or refused service only affects its own card:
 * loading → skeleton, refused (401/403) → "no access", offline with nothing cached → "offline", other failures →
 * "Try again". Once data has arrived the widget itself renders (widgets own their empty state), and a failed
 * background refresh keeps the last good figures on screen.
 */
export default function WidgetShell<T>({
  query,
  title,
  height = 220,
  skeleton,
  children,
}: {
  query: WidgetQuery<T>;
  title: string;
  height?: number;
  /** A loading placeholder shaped like the widget (defaults to a generic card). */
  skeleton?: ReactNode;
  children: (data: T) => ReactNode;
}) {
  const online = useOnlineStatus();

  if (query.data !== undefined) return <>{children(query.data)}</>;

  if (query.isError && isAccessDenied(query.error)) {
    return <StateCard title={title} icon={Lock} tone="muted" role="status" message="You don't have permission to view this information." />;
  }

  const retry = (
    <Button variant="outline" size="sm" onClick={() => void query.refetch()} loading={query.isRefetching}>
      {!query.isRefetching && <RotateCw className="h-3.5 w-3.5" />}
      Try again
    </Button>
  );

  if (!online) {
    return <StateCard title={title} icon={WifiOff} tone="muted" role="status" message="You're offline. This will load when you reconnect." action={retry} />;
  }

  if (query.isError) {
    return <StateCard title={title} icon={AlertTriangle} tone="error" role="alert" message="Couldn't load this right now." action={retry} />;
  }

  return <>{skeleton ?? <WidgetSkeleton title={title} height={height} />}</>;
}
