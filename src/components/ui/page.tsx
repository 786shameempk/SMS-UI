import * as React from "react";
import { cn } from "@/utils/cn";

type PageWidth = "default" | "narrow" | "medium" | "wide" | "full";

const WIDTH: Record<PageWidth, string> = {
  narrow: "max-w-[900px]",
  medium: "max-w-[1200px]",
  default: "max-w-[1400px]",
  wide: "max-w-[1600px]",
  full: "max-w-none",
};

/** The standard page frame: responsive gutters, a max width, and consistent vertical rhythm between sections. */
export function PageContainer({
  width = "default",
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { width?: PageWidth }) {
  return (
    <div
      className={cn("mx-auto w-full px-4 py-5 sm:px-6 sm:py-6 lg:px-8 space-y-6", WIDTH[width], className)}
      {...props}
    />
  );
}

interface PageHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Primary page actions, right-aligned on wide screens and stacked under the title on phones. */
  actions?: React.ReactNode;
  /** Small element above the title (e.g. a back link or a status badge row). */
  eyebrow?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}

export function PageHeader({ title, description, actions, eyebrow, icon: Icon, className, children, ...props }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between", className)} {...props}>
      <div className="flex min-w-0 items-start gap-3">
        {Icon && (
          <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-primary-text shadow-xs">
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div className="min-w-0 space-y-1">
          {eyebrow}
          <h1 className="text-page-title">{title}</h1>
          {description && <p className="max-w-3xl text-sm text-muted-foreground">{description}</p>}
          {children}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end">{actions}</div>}
    </div>
  );
}

/** A titled block within a page (e.g. "Recent activity"), with optional actions on the right. */
export function PageSection({
  title,
  description,
  actions,
  className,
  children,
  ...props
}: Omit<React.HTMLAttributes<HTMLElement>, "title"> & { title?: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <section className={cn("space-y-3", className)} {...props}>
      {(title || actions) && (
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div className="min-w-0">
            {title && <h2 className="text-section-title">{title}</h2>}
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
