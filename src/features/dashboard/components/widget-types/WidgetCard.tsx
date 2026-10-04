import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";

/**
 * The shell every reusable widget type sits in: title, one-line description, an optional "View all" link and the
 * widget's own empty state - so new widgets look and behave like the rest of the dashboard.
 */
export default function WidgetCard({
  title,
  description,
  icon,
  href,
  hrefLabel = "View all",
  isEmpty = false,
  emptyTitle,
  emptyDescription,
  children,
}: {
  title: string;
  description?: ReactNode;
  icon: LucideIcon;
  href?: string;
  hrefLabel?: string;
  isEmpty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  children: ReactNode;
}) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="min-w-0">
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {href && !isEmpty && (
          <Link
            to={href}
            className="inline-flex shrink-0 items-center gap-1 rounded-md text-xs font-medium text-primary-text hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {hrefLabel}
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        )}
      </CardHeader>
      <CardContent className="flex-1">
        {isEmpty ? <EmptyState bare size="sm" icon={icon} title={emptyTitle ?? "Nothing to show"} description={emptyDescription} className="h-full py-6" /> : children}
      </CardContent>
    </Card>
  );
}
