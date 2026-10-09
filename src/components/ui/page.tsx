import * as React from "react";
import { useInRouterContext, useLocation } from "react-router-dom";
import { findNavEntry } from "@/constants/nav";
import { cn } from "@/utils/cn";

/** One shared content width for every page — the Dashboard's. `full` removes the cap. */
type PageWidth = "default" | "wide" | "full";

const WIDTH: Record<PageWidth, string> = {
  default: "max-w-[1600px]",
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
      className={cn("mx-auto w-full min-w-0 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 space-y-6 animate-in fade-in-0 slide-in-from-bottom-1 duration-300", WIDTH[width], className)}
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
  /** Overrides the icon taken from the page's menu entry. */
  icon?: React.ComponentType<{ className?: string }>;
}

type HeaderIcon = React.ComponentType<{ className?: string }>;

function HeaderTile({ icon: Icon }: { icon: HeaderIcon }) {
  return (
    <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-primary-foreground shadow-brand ring-1 ring-inset ring-white/25 sm:flex">
      <Icon className="h-[22px] w-[22px]" />
    </div>
  );
}

/** The icon of the nav entry the page belongs to, so a header carries its menu's icon without every page naming one. */
function RouteTile() {
  const { pathname } = useLocation();
  const Icon = findNavEntry(pathname)?.item.icon;
  return Icon ? <HeaderTile icon={Icon} /> : null;
}

/**
 * The page's title block: a softly brand-tinted panel with the page's icon, title, description and actions.
 * The icon is the page's own (`icon`) or, failing that, the one its menu entry uses.
 */
export function PageHeader({ title, description, actions, eyebrow, icon: Icon, className, children, ...props }: PageHeaderProps) {
  const inRouter = useInRouterContext();
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border/70 bg-hero px-4 py-4 shadow-xs sm:px-5 sm:py-5",
        "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
      {...props}
    >
      {/* A soft brand glow in the corner: depth without competing with the content. */}
      <div aria-hidden="true" className="pointer-events-none absolute -right-14 -top-20 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative flex min-w-0 items-center gap-3.5">
        {Icon ? <HeaderTile icon={Icon} /> : inRouter ? <RouteTile /> : null}
        <div className="min-w-0 space-y-1">
          {eyebrow}
          <h1 className="text-page-title leading-tight">{title}</h1>
          {description && <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>}
          {children}
        </div>
      </div>
      {actions && <div className="relative flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end">{actions}</div>}
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
