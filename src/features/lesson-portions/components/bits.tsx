import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Skeleton } from "@/components/ui/skeleton";
import type { LucideIcon } from "lucide-react";

/** A titled card; the body shows a skeleton while loading, a retry on error and a friendly empty state when there is nothing. */
export function Panel({
  title,
  description,
  actions,
  loading,
  error,
  onRetry,
  empty,
  children,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  /** Shown instead of the children when set. */
  empty?: { icon?: LucideIcon; title: string; description?: string } | null;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div className="min-w-0 space-y-1">
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {actions}
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-32 w-full" />
        ) : error ? (
          <ErrorState onRetry={onRetry} />
        ) : empty ? (
          <EmptyState bare size="sm" icon={empty.icon} title={empty.title} description={empty.description} />
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

/** A label above a value, for details panels. */
export function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{children}</dd>
    </div>
  );
}
