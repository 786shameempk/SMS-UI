import { useEffect, useMemo, useState } from "react";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import { Check, Users, FlaskConical, Layers, LayoutGrid, Move, Pencil, Plus, RotateCcw, RotateCw, SplitSquareHorizontal, Wifi, WifiOff } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useUiStore } from "@/store/useUiStore";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { timeOfDayGreeting, WelcomeHero } from "@/components/common/WelcomeHero";
import { cn } from "@/utils/cn";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ToggleChip } from "@/components/ui/toggle-chip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageContainer } from "@/components/ui/page";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { canSwitchScopeView } from "../scopeApi";
import { describeDateRange } from "../dateRange";
import { useDashboardDataSource, type DashboardDataSource } from "../dataSource";
import { quickActionsFor, ROLE_TAGLINE } from "../quickActions";
import { buildContext, useDashboardIdentity, useDashboardUpdatedAt } from "../useDashboard";
import { useDashboardLayout } from "../useDashboardLayout";
import { updateItem, type LayoutItem } from "../layout";
import { availableWidgets, type DashboardWidgetId } from "../widgets";
import type { WidgetEnv } from "../registry";
import type { DashboardScopeView } from "../types";
import DashboardSkeleton from "../components/DashboardSkeleton";
import DashboardLayout from "../components/DashboardLayout";
import DateRangePicker from "../components/DateRangePicker";
import ManageWidgetsDialog from "../components/ManageWidgetsDialog";

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrator",
  principal: "Principal",
  teacher: "Teacher",
  accountant: "Accountant",
  librarian: "Librarian",
  receptionist: "Receptionist",
  parent: "Parent",
  student: "Student",
  superAdmin: "Super Admin",
  staff: "Staff",
};

function Segmented<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string; icon: typeof Layers }>;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex h-9 items-center gap-0.5 rounded-lg bg-secondary p-0.5">
      {options.map(({ value: v, label: optionLabel, icon: Icon }) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            value === v ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          {optionLabel}
        </button>
      ))}
    </div>
  );
}

const SCOPE_VIEW_OPTIONS: Array<{ value: DashboardScopeView; label: string; icon: typeof Layers }> = [
  { value: "aggregated", label: "Aggregated", icon: Layers },
  { value: "segregated", label: "Segregated", icon: SplitSquareHorizontal },
];

const SOURCE_OPTIONS: Array<{ value: DashboardDataSource; label: string; icon: typeof Layers }> = [
  { value: "live", label: "Live", icon: Wifi },
  { value: "mock", label: "Demo", icon: FlaskConical },
];


function timeAgo(ms: number, now: number): string {
  const s = Math.max(0, Math.round((now - ms) / 1000));
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  return `${Math.round(m / 60)} h ago`;
}

/**
 * Dashboard → DashboardLayout → WidgetRenderer → WidgetRegistry → widget.
 * Role and permissions decide the available widgets (widgets.ts); the user's saved layout decides which of
 * them show, in what order and size (layout.ts); each widget then loads and fails on its own.
 */
export default function DashboardPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const role = user?.role ?? "admin";
  const modulePermissions = useAuthStore((s) => s.modulePermissions);
  const scopeView = useUiStore((s) => s.dashboardScopeView);
  const setScopeView = useUiStore((s) => s.setDashboardScopeView);
  const dateRange = useUiStore((s) => s.dashboardDateRange);
  const setDateRange = useUiStore((s) => s.setDashboardDateRange);
  const { source, canSwitch, setSource } = useDashboardDataSource();
  const online = useOnlineStatus();

  const allBranches = canSwitchScopeView(user);
  const quickActions = useMemo(() => quickActionsFor(role, modulePermissions), [role, modulePermissions]);
  const clientAvailable = useMemo(
    // Quick actions only make sense when the role has at least one shortcut.
    () => availableWidgets({ role, allBranches, modules: modulePermissions }).filter((w) => w.id !== "quickActions" || quickActions.length > 0),
    [role, allBranches, modulePermissions, quickActions.length],
  );
  // The server narrows this further (the school's widget settings) and owns the saved layout.
  const layout = useDashboardLayout(clientAvailable, source);
  const available = layout.available;
  // Edit mode works on a draft; nothing is saved until "Save layout" (one write per editing session).
  const [draft, setDraft] = useState<LayoutItem[] | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const editing = draft !== null;
  const items = draft ?? layout.items;
  const visible = items.filter((i) => i.visible);
  const hidden = layout.items.filter((i) => !i.visible).map((i) => i.id);
  const canCustomize = available.some((w) => w.configurable);
  const startEditing = () => {
    setDraft(layout.items);
    setAnnouncement("Editing your dashboard. Drag widgets or use the arrow buttons to move them.");
  };
  const saveDraft = () => {
    if (draft) layout.save(draft);
    setDraft(null);
    setAnnouncement("Dashboard layout saved.");
  };
  const cancelEditing = () => {
    setDraft(null);
    setAnnouncement("Changes discarded.");
  };
  const resetToDefault = () => {
    layout.reset();
    setDraft(null);
    setAnnouncement("Dashboard reset to the default layout.");
  };
  const byId = new Map(available.map((w) => [w.id, w]));
  const setHidden = (ids: DashboardWidgetId[]) => layout.save(layout.items.map((i) => ({ ...i, visible: !ids.includes(i.id) })));

  const identity = useDashboardIdentity(source);
  // Parents with more than one child can focus the whole dashboard on one of them.
  const [childId, setChildId] = useState<string>("all");
  const children = role === "parent" ? (identity.data?.learners ?? []) : [];
  const focusedChild = children.find((c) => c.studentId === childId);
  const viewIdentity = identity.data && focusedChild ? { ...identity.data, learners: [focusedChild] } : identity.data;
  const ctx = buildContext(user, viewIdentity, dateRange);
  const rangeLabel = describeDateRange(dateRange);
  const env: WidgetEnv = { source, dateRange, rangeLabel, quickActions };

  // "Updated … ago": the oldest figure on screen, re-rendered every 30 s.
  const fetching = useIsFetching({ queryKey: ["dashboard", source] }) > 0;
  const updatedAt = useDashboardUpdatedAt(source);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, []);
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ["dashboard", source] });

  if (identity.isError && !identity.data) {
    return (
      <PageContainer width="wide">
        <ErrorState
          title="Your dashboard couldn't load"
          description={
            online
              ? "We couldn't reach the server to fetch today's figures. Check your connection and try again."
              : "You're offline. Reconnect to load your dashboard."
          }
          onRetry={() => identity.refetch()}
          retrying={identity.isRefetching}
        />
      </PageContainer>
    );
  }
  if (!ctx || layout.isLoading) return <DashboardSkeleton />;

  const isDemo = source === "mock";
  const scopeShown = visible.some((i) => i.id === "scopeOverview");

  return (
    <PageContainer width="wide">
      <WelcomeHero
        eyebrow={`${ROLE_LABEL[role] ?? role} dashboard`}
        title={`${timeOfDayGreeting()}, ${user?.name.split(" ")[0] ?? "there"}`}
        subtitle={ROLE_TAGLINE[role]}
        aside={
          <div className="flex flex-wrap items-center gap-2">
            {canSwitch && <Segmented label="Data source" value={source} onChange={setSource} options={SOURCE_OPTIONS} />}
            {children.length > 1 && (
              <Select value={focusedChild ? childId : "all"} onValueChange={setChildId}>
                <SelectTrigger className="h-9 w-48" aria-label="Show the dashboard for">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All children</SelectItem>
                  {children.map((c) => (
                    <SelectItem key={c.studentId} value={c.studentId}>
                      {c.name.split(" ")[0]} · {c.classLabel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {allBranches && scopeShown && <Segmented label="Dashboard view" value={scopeView} onChange={setScopeView} options={SCOPE_VIEW_OPTIONS} />}
            <DateRangePicker value={dateRange} onChange={setDateRange} />
            <Button variant="outline" size="sm" className="h-9 gap-2" onClick={refresh} disabled={fetching || !online} aria-label="Refresh dashboard">
              <RotateCw className={cn("h-3.5 w-3.5", fetching && "animate-spin")} aria-hidden="true" />
              <span className="text-xs text-muted-foreground" aria-live="polite">
                {fetching ? "Refreshing…" : updatedAt ? `Updated ${timeAgo(updatedAt, now)}` : "Refresh"}
              </span>
            </Button>
            {canCustomize && !editing && (
              <Button variant="outline" size="sm" className="h-9 gap-2" onClick={startEditing}>
                <Pencil className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                Customize
              </Button>
            )}
            {canCustomize && !editing && (
              <ManageWidgetsDialog
                available={available.filter((w) => w.configurable)}
                hidden={hidden}
                onChange={setHidden}
                onReset={layout.reset}
                isCustomized={layout.isCustomized}
                savedToAccount={source === "live" && !layout.isOffline}
              />
            )}
          </div>
        }
      />

      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>

      {editing && (
        <div
          role="region"
          aria-label="Customize dashboard"
          className="sticky top-0 z-20 space-y-3 rounded-xl border border-primary/30 bg-card/95 p-3 shadow-md backdrop-blur supports-[backdrop-filter]:bg-card/85"
        >
          <div className="flex flex-wrap items-center gap-2">
            <Move className="h-4 w-4 text-primary-text" aria-hidden="true" />
            <p className="min-w-0 flex-1 text-sm text-foreground">
              <span className="font-semibold">Customizing your dashboard.</span>{" "}
              <span className="text-muted-foreground">Drag a card onto another to swap places, or use the arrows. Resize or hide from each card&apos;s toolbar.</span>
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" size="sm" onClick={resetToDefault} disabled={!layout.isCustomized}>
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                Reset to default
              </Button>
              <Button variant="outline" size="sm" onClick={cancelEditing}>
                Cancel
              </Button>
              <Button size="sm" onClick={saveDraft}>
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                Save layout
              </Button>
            </div>
          </div>
          {draft!.some((i) => !i.visible && byId.get(i.id)?.configurable) && (
            <div className="flex flex-wrap items-center gap-1.5 border-t border-border pt-3">
              <span className="mr-1 text-xs font-medium text-muted-foreground">Hidden widgets:</span>
              {draft!
                .filter((i) => !i.visible && byId.get(i.id)?.configurable)
                .map((i) => (
                  <ToggleChip
                    key={i.id}
                    pressed={false}
                    onClick={() => {
                      setDraft(updateItem(draft!, i.id, { visible: true }));
                      setAnnouncement(`${byId.get(i.id)!.name} added back.`);
                    }}
                    aria-label={`Show ${byId.get(i.id)!.name}`}
                  >
                    <Plus aria-hidden="true" />
                    {byId.get(i.id)!.name}
                  </ToggleChip>
                ))}
            </div>
          )}
        </div>
      )}

      {!online && (
        <div role="status" className="flex items-center gap-2 rounded-lg border border-border bg-muted px-3.5 py-2.5 text-sm text-muted-foreground">
          <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
          You&apos;re offline. Figures below are from your last visit and will refresh when you reconnect.
        </div>
      )}

      {layout.isOffline && online && (
        <div role="status" className="flex items-center gap-2 rounded-lg border border-border bg-muted px-3.5 py-2.5 text-sm text-muted-foreground">
          <LayoutGrid className="h-4 w-4 shrink-0" aria-hidden="true" />
          We couldn&apos;t load your saved layout, so this is the copy on this device. Changes will save here until the server is back.
        </div>
      )}

      {isDemo && (
        <div role="status" className="flex flex-wrap items-center gap-2 rounded-lg border border-warning/30 bg-warning-soft px-3.5 py-2.5 text-sm text-warning-strong">
          <Badge variant="warning" dot>
            Demo data
          </Badge>
          <span>These figures are sample values, not your school&apos;s records.</span>
          {canSwitch && (
            <button type="button" onClick={() => setSource("live")} className="font-medium underline underline-offset-4 cursor-pointer">
              Switch to live data
            </button>
          )}
        </div>
      )}

      {available.length === 0 ? (
        <EmptyState
          icon={LayoutGrid}
          title="No dashboard widgets for your role"
          description="Your role doesn't have access to any dashboard information yet. Ask your school administrator if you think this is wrong."
        />
      ) : visible.length === 0 && !editing ? (
        <EmptyState
          icon={LayoutGrid}
          title="Your dashboard is empty"
          description="All widgets are hidden. Use Manage widgets above to add cards back, or reset to the default dashboard."
          action={
            <Button variant="outline" size="sm" onClick={layout.reset}>
              Reset to default
            </Button>
          }
        />
      ) : (
        <DashboardLayout
          items={items}
          widgets={available}
          ctx={ctx}
          env={env}
          onEdit={
            editing
              ? (next, message) => {
                  setDraft(next);
                  setAnnouncement(message);
                }
              : undefined
          }
        />
      )}
    </PageContainer>
  );
}
