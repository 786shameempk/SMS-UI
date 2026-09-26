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

/** The dark gradient greeting banner every role's home page opens with (dashboard, parent portal). */
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
  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-brand-900 px-5 py-6 sm:px-8 sm:py-8 text-white shadow-lg">
      <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-brand-500/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-sky-500/20 blur-3xl" />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-300">{eyebrow}</p>
          <h1 className="mt-1.5 text-2xl sm:text-3xl font-bold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1.5 max-w-xl text-sm text-white/70">{subtitle}</p>}
          <p className="mt-3 text-xs text-white/50">
            {new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        {aside}
      </div>
    </section>
  );
}

export interface QuickAction {
  label: string;
  hint: string;
  icon: LucideIcon;
  /** Icon chip colours, e.g. "bg-sky-500/12 text-sky-600 dark:text-sky-300". */
  tint: string;
  /** Navigates here when set; otherwise onClick runs. */
  to?: string;
  onClick?: () => void;
}

export function QuickActionTile({ action }: { action: QuickAction }) {
  const body = (
    <>
      <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", action.tint)}>
        <action.icon className="h-[18px] w-[18px]" />
      </span>
      <span className="min-w-0 text-left">
        <span className="block text-sm font-semibold text-foreground truncate lg:whitespace-normal">{action.label}</span>
        <span className="block text-xs text-muted-foreground truncate lg:whitespace-normal">{action.hint}</span>
      </span>
    </>
  );
  const className =
    "group flex items-center gap-3 lg:flex-col lg:items-start rounded-2xl border border-border bg-card p-3.5 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md hover:border-brand-300 cursor-pointer";

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
  5: "lg:grid-cols-5",
  6: "lg:grid-cols-6",
};

export function QuickActionGrid({ actions }: { actions: QuickAction[] }) {
  if (actions.length === 0) return null;
  return (
    <section className={cn("grid grid-cols-1 min-[480px]:grid-cols-2 gap-3", GRID_COLS[Math.min(actions.length, 6)])}>
      {actions.map((action) => (
        <QuickActionTile key={action.label} action={action} />
      ))}
    </section>
  );
}
