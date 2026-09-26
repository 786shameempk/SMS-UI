import { useState } from "react";
import { Check, Eye, LayoutGrid, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/utils/cn";
import type { DashboardWidgetDef, DashboardWidgetId } from "../widgets";
import WidgetPreview from "./WidgetPreview";

type Filter = "all" | "shown" | "hidden";

/** Gallery sections. Any widget not listed here lands in "More" so new widgets never go missing. */
const GROUPS: Array<{ title: string; ids: DashboardWidgetId[] }> = [
  { title: "Overview", ids: ["stats", "scopeOverview", "recentActivity", "notifications"] },
  { title: "Academics", ids: ["performance", "attendance", "todayClasses", "upcomingExams", "pendingAssignments"] },
  { title: "Finance", ids: ["revenue", "feesDue"] },
  { title: "Campus", ids: ["libraryDue", "busStatus", "hostel"] },
  { title: "Calendar & people", ids: ["calendar", "holidays", "birthdays"] },
];

function WidgetTile({ widget, isShown, onToggle }: { widget: DashboardWidgetDef; isShown: boolean; onToggle: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={isShown}
        aria-label={`${widget.label}: ${isShown ? "on your dashboard, click to remove" : "hidden, click to add"}`}
        className={cn(
          "group relative flex h-full w-full flex-col overflow-hidden rounded-xl border bg-card text-left transition-[border-color,box-shadow,transform] duration-200 cursor-pointer",
          "hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
          isShown ? "border-primary/60 shadow-xs ring-1 ring-primary/25" : "border-border hover:border-input",
        )}
      >
        {/* Preview "screen" */}
        <div
          className={cn(
            "relative flex h-24 items-center justify-center border-b px-3 transition-colors",
            isShown ? "border-primary/20 bg-accent/60" : "border-border bg-muted/70",
          )}
        >
          <WidgetPreview
            id={widget.id}
            className={cn("h-full w-full max-w-[220px] py-2 transition-[opacity,filter] duration-200", !isShown && "opacity-55 grayscale-[60%] group-hover:opacity-90 group-hover:grayscale-0")}
          />
          <span
            className={cn(
              "absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full shadow-xs transition-all duration-200",
              isShown
                ? "bg-primary text-primary-foreground scale-100"
                : "border border-border bg-card text-muted-foreground group-hover:border-primary/50 group-hover:text-primary-text",
            )}
            aria-hidden="true"
          >
            {isShown ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <Plus className="h-3.5 w-3.5" />}
          </span>
        </div>

        <div className="flex flex-1 flex-col gap-0.5 px-3.5 py-3">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-semibold text-foreground">{widget.label}</p>
            <span
              className={cn(
                "shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                isShown ? "bg-success-soft text-success-strong" : "bg-secondary text-muted-foreground",
              )}
            >
              {isShown ? "Shown" : "Hidden"}
            </span>
          </div>
          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{widget.description}</p>
        </div>
      </button>
    </li>
  );
}

export default function ManageWidgetsDialog({
  available,
  hidden,
  onChange,
}: {
  available: DashboardWidgetDef[];
  hidden: DashboardWidgetId[];
  onChange: (hidden: DashboardWidgetId[]) => void;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const hiddenSet = new Set(hidden);
  const shownCount = available.filter((w) => !hiddenSet.has(w.id)).length;
  const hiddenCount = available.length - shownCount;

  const toggle = (id: DashboardWidgetId) => onChange(hiddenSet.has(id) ? hidden.filter((h) => h !== id) : [...hidden, id]);

  const matchesFilter = (w: DashboardWidgetDef) =>
    filter === "all" || (filter === "shown" ? !hiddenSet.has(w.id) : hiddenSet.has(w.id));

  const grouped = [
    ...GROUPS.map((g) => ({ title: g.title, widgets: available.filter((w) => g.ids.includes(w.id)) })),
    { title: "More", widgets: available.filter((w) => !GROUPS.some((g) => g.ids.includes(w.id))) },
  ]
    .map((g) => ({ ...g, widgets: g.widgets.filter(matchesFilter) }))
    .filter((g) => g.widgets.length > 0);

  const FILTERS: Array<{ value: Filter; label: string; count: number }> = [
    { value: "all", label: "All", count: available.length },
    { value: "shown", label: "On dashboard", count: shownCount },
    { value: "hidden", label: "Hidden", count: hiddenCount },
  ];

  return (
    <Dialog onOpenChange={(open) => open && setFilter("all")}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-2">
          <LayoutGrid className="w-3.5 h-3.5 text-muted-foreground" />
          Manage widgets
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Customize your dashboard</DialogTitle>
          <DialogDescription>Tap a card to show or hide it. Changes apply instantly and are saved on this device.</DialogDescription>
        </DialogHeader>

        {/* Summary + filters */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="mb-1.5 flex items-baseline justify-between text-xs">
                <span className="font-medium text-foreground">
                  <span className="tabular-nums">{shownCount}</span> of <span className="tabular-nums">{available.length}</span> widgets on your dashboard
                </span>
                <span className="tabular-nums text-muted-foreground">{Math.round((shownCount / Math.max(1, available.length)) * 100)}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-secondary" role="progressbar" aria-valuemin={0} aria-valuemax={available.length} aria-valuenow={shownCount} aria-label="Widgets shown">
                <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${(shownCount / Math.max(1, available.length)) * 100}%` }} />
              </div>
            </div>
          </div>

          <div role="radiogroup" aria-label="Filter widgets" className="inline-flex max-w-full gap-1 overflow-x-auto rounded-lg bg-secondary p-1">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                role="radio"
                aria-checked={filter === f.value}
                onClick={() => setFilter(f.value)}
                className={cn(
                  "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors cursor-pointer",
                  filter === f.value ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {f.label}
                <span className={cn("rounded px-1 tabular-nums", filter === f.value ? "bg-secondary text-foreground" : "text-muted-foreground")}>{f.count}</span>
              </button>
            ))}
          </div>
        </div>

        {grouped.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-6 py-10 text-center">
            <Eye className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm font-medium text-foreground">{filter === "hidden" ? "Nothing hidden" : "No widgets shown"}</p>
            <p className="text-xs text-muted-foreground">
              {filter === "hidden" ? "Every widget is already on your dashboard." : "Switch to All and tap a card to add it."}
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {grouped.map((group) => (
              <section key={group.title} aria-label={group.title} className="space-y-2.5">
                <h3 className="text-overline">{group.title}</h3>
                <ul className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2">
                  {group.widgets.map((w) => (
                    <WidgetTile key={w.id} widget={w} isShown={!hiddenSet.has(w.id)} onToggle={() => toggle(w.id)} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}

        <DialogFooter className="sm:justify-between">
          <Button variant="ghost" size="sm" onClick={() => onChange(available.map((w) => w.id))} disabled={shownCount === 0}>
            Hide all
          </Button>
          <Button variant="outline" size="sm" onClick={() => onChange([])} disabled={hiddenCount === 0}>
            <RotateCcw className="h-3.5 w-3.5" />
            Show all (default)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
