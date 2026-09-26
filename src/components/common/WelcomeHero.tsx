import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/utils/cn";

export function timeOfDayGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/** The greeting header every role's home page opens with (dashboard, parent portal). Deliberately a calm page
 *  header rather than a banner: the controls and data below are what the user came for. */
export function WelcomeHero({
  eyebrow,
  title,
  subtitle,
  aside,
}: {
  eyebrow: string;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Right-hand content: child chips, page controls, ... */
  aside?: ReactNode;
}) {
  const today = new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
  return (
    <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0 space-y-1">
        <p className="text-xs font-medium text-muted-foreground">
          <span className="text-primary-text">{eyebrow}</span>
          <span aria-hidden="true"> · </span>
          {today}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {subtitle && <p className="max-w-2xl text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {aside}
    </section>
  );
}

export interface QuickAction {
  label: string;
  hint: string;
  icon: LucideIcon;
  /** Legacy per-action colour; tiles now share one brand chip so the grid reads as one set. */
  tint?: string;
  /** Navigates here when set; otherwise onClick runs. */
  to?: string;
  onClick?: () => void;
}

export function QuickActionTile({ action }: { action: QuickAction }) {
  const body = (
    <>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        <action.icon className="h-[18px] w-[18px]" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block truncate text-sm font-medium text-foreground">{action.label}</span>
        <span className="block truncate text-xs text-muted-foreground">{action.hint}</span>
      </span>
    </>
  );
  const className =
    "group flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-xs transition-[border-color,box-shadow] duration-150 hover:border-input hover:shadow-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return action.to ? (
    <Link to={action.to} className={className}>
      {body}
    </Link>
  ) : (
    <button type="button" onClick={action.onClick} className={className}>
      {body}
    </button>
  );
}

const GRID_COLS: Record<number, string> = {
  1: "lg:grid-cols-1",
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
  5: "lg:grid-cols-3 2xl:grid-cols-5",
  6: "lg:grid-cols-3 2xl:grid-cols-6",
};

export function QuickActionGrid({ actions }: { actions: QuickAction[] }) {
  if (actions.length === 0) return null;
  return (
    <section aria-label="Quick actions" className={cn("grid grid-cols-1 min-[480px]:grid-cols-2 gap-3", GRID_COLS[Math.min(actions.length, 6)])}>
      {actions.map((action) => (
        <QuickActionTile key={action.label} action={action} />
      ))}
    </section>
  );
}
