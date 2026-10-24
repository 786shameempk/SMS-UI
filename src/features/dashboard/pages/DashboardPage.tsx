import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { availableTabs, DASHBOARD_TABS_BY_ID, resolveTab, type DashboardTabId } from "../tabs/catalog";
import DashboardTabPanel from "../tabs/DashboardTabPanel";

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
  const { t } = useTranslation("dashboard");
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
          {t(optionLabel)}
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


function updatedLabel(ms: number, now: number, t: TFunction): string {
  const s = Math.max(0, Math.round((now - ms) / 1000));
  if (s < 45) return t("Updated just now");
  const m = Math.round(s / 60);
  if (m < 60) return t("Updated {{minutes}} min ago", { minutes: m });
  return t("Updated {{hours}} h ago", { hours: Math.round(m / 60) });
}

/**
 * Dashboard → DashboardLayout → WidgetRenderer → WidgetRegistry → widget.
 * Role and permissions decide the available widgets (widgets.ts); the user's saved layout decides which of
 * them show, in what order and size (layout.ts); each widget then loads and fails on its own.
 */
export default function DashboardPage() {
  const { t } = useTranslation("dashboard");
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
  // The tab bar: Overview is the widget grid below; every other tab is a purpose-built view (tabs/). The address bar
  // (?tab=finance) is the source of truth, so a tab can be linked to and survives a refresh.
  const [searchParams, setSearchParams] = useSearchParams();
  const tabViewer = useMemo(() => ({ role, modules: modulePermissions }), [role, modulePermissions]);
  const tabs = useMemo(() => availableTabs(tabViewer), [tabViewer]);
  const activeTab: DashboardTabId = resolveTab(searchParams.get("tab"), tabViewer);
  const onOverview = activeTab === "overview";
  const selectTab = (id: string) =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (id === "overview") next.delete("tab");
        else next.set("tab", id);
        return next;
      },
      { replace: false },
    );
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
    setAnnouncement(t("Editing your dashboard. Drag widgets or use the arrow buttons to move them."));
  };
  const saveDraft = () => {
    if (draft) layout.save(draft);
    setDraft(null);
    setAnnouncement(t("Dashboard layout saved."));
  };
  const cancelEditing = () => {
    setDraft(null);
    setAnnouncement(t("Changes discarded."));
  };
  const resetToDefault = () => {
    layout.reset();
    setDraft(null);
    setAnnouncement(t("Dashboard reset to the default layout."));
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
  // Preset labels are English constants (dateRange.ts); a custom range is already a formatted date span.
  const rangeLabel = dateRange.preset === "custom" ? describeDateRange(dateRange) : t(describeDateRange(dateRange));
  const env: WidgetEnv = { source, dateRange, rangeLabel, quickActions };

  // "Updated … ago": the oldest figure on screen, re-rendered every 30 s.
  const fetching = useIsFetching({ queryKey: ["dashboard", source] }) > 0;
  const updatedAt = useDashboardUpdatedAt(source);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ["dashboard", source] });

  if (identity.isError && !identity.data) {
    return (
      <PageContainer width="wide">
        <ErrorState
          title={t("Your dashboard couldn't load")}
          description={
            online
              ? t("We couldn't reach the server to fetch today's figures. Check your connection and try again.")
              : t("You're offline. Reconnect to load your dashboard.")
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
        eyebrow={t("{{role}} dashboard", { role: ROLE_LABEL[role] ? t(ROLE_LABEL[role]) : role })}
        title={t("{{greeting}}, {{name}}", { greeting: t(timeOfDayGreeting()), name: user?.name.split(" ")[0] ?? t("there") })}
        subtitle={ROLE_TAGLINE[role] ? t(ROLE_TAGLINE[role]) : undefined}
        aside={
          <div className="flex flex-wrap items-center gap-2">
            {canSwitch && <Segmented label={t("Data source")} value={source} onChange={setSource} options={SOURCE_OPTIONS} />}
            {onOverview && children.length > 1 && (
              <Select value={focusedChild ? childId : "all"} onValueChange={setChildId}>
                <SelectTrigger className="h-9 w-48" aria-label={t("Show the dashboard for")}>
                  <Users className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("All children")}</SelectItem>
                  {children.map((c) => (
                    <SelectItem key={c.studentId} value={c.studentId}>
                      {c.name.split(" ")[0]} · {c.classLabel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {onOverview && allBranches && scopeShown && <Segmented label={t("Dashboard view")} value={scopeView} onChange={setScopeView} options={SCOPE_VIEW_OPTIONS} />}
            <DateRangePicker value={dateRange} onChange={setDateRange} />
            <Button variant="outline" size="sm" className="h-9 gap-2" onClick={refresh} disabled={fetching || !online} aria-label={t("Refresh dashboard")}>
              <RotateCw className={cn("h-3.5 w-3.5", fetching && "animate-spin")} aria-hidden="true" />
              <span className="text-xs text-muted-foreground" aria-live="polite">
                {fetching ? t("Refreshing…") : updatedAt ? updatedLabel(updatedAt, now, t) : t("Refresh")}
              </span>
            </Button>
            {onOverview && canCustomize && !editing && (
              <Button variant="outline" size="sm" className="h-9 gap-2" onClick={startEditing}>
                <Pencil className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                {t("Customize")}
              </Button>
            )}
            {onOverview && canCustomize && !editing && (
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

      {tabs.length > 1 && (
        <nav aria-label={t("Dashboard sections")} className="space-y-2">
          <Tabs value={activeTab} onValueChange={selectTab}>
            <TabsList variant="line" aria-label={t("Dashboard sections")}>
              {tabs.map((tab) => (
                <TabsTrigger key={tab.id} value={tab.id}>
                  <tab.icon aria-hidden="true" />
                  {t(tab.label)}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          {!onOverview && <p className="text-sm text-muted-foreground">{t(DASHBOARD_TABS_BY_ID.get(activeTab)?.description ?? "")}</p>}
        </nav>
      )}

      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>

      {onOverview && editing && (
        <div
          role="region"
          aria-label={t("Customize dashboard")}
          className="sticky top-0 z-20 space-y-3 rounded-xl border border-primary/30 bg-card/95 p-3 shadow-md backdrop-blur supports-[backdrop-filter]:bg-card/85"
        >
          <div className="flex flex-wrap items-center gap-2">
            <Move className="h-4 w-4 text-primary-text" aria-hidden="true" />
            <p className="min-w-0 flex-1 text-sm text-foreground">
              <span className="font-semibold">{t("Customizing your dashboard.")}</span>{" "}
              <span className="text-muted-foreground">{t("Drag a card onto another to swap places, or use the arrows. Resize or hide from each card's toolbar.")}</span>
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" size="sm" onClick={resetToDefault} disabled={!layout.isCustomized}>
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                {t("Reset to default")}
              </Button>
              <Button variant="outline" size="sm" onClick={cancelEditing}>
                {t("Cancel")}
              </Button>
              <Button size="sm" onClick={saveDraft}>
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                {t("Save layout")}
              </Button>
            </div>
          </div>
          {draft!.some((i) => !i.visible && byId.get(i.id)?.configurable) && (
            <div className="flex flex-wrap items-center gap-1.5 border-t border-border pt-3">
              <span className="me-1 text-xs font-medium text-muted-foreground">{t("Hidden widgets:")}</span>
              {draft!
                .filter((i) => !i.visible && byId.get(i.id)?.configurable)
                .map((i) => (
                  <ToggleChip
                    key={i.id}
                    pressed={false}
                    onClick={() => {
                      setDraft(updateItem(draft!, i.id, { visible: true }));
                      setAnnouncement(t("{{name}} added back.", { name: t(byId.get(i.id)!.name) }));
                    }}
                    aria-label={t("Show {{name}}", { name: t(byId.get(i.id)!.name) })}
                  >
                    <Plus aria-hidden="true" />
                    {t(byId.get(i.id)!.name)}
                  </ToggleChip>
                ))}
            </div>
          )}
        </div>
      )}

      {!online && (
        <div role="status" className="flex items-center gap-2 rounded-lg border border-border bg-muted px-3.5 py-2.5 text-sm text-muted-foreground">
          <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
          {t("You're offline. Figures below are from your last visit and will refresh when you reconnect.")}
        </div>
      )}

      {onOverview && layout.isOffline && online && (
        <div role="status" className="flex items-center gap-2 rounded-lg border border-border bg-muted px-3.5 py-2.5 text-sm text-muted-foreground">
          <LayoutGrid className="h-4 w-4 shrink-0" aria-hidden="true" />
          {t("We couldn't load your saved layout, so this is the copy on this device. Changes will save here until the server is back.")}
        </div>
      )}

      {isDemo && (
        <div role="status" className="flex flex-wrap items-center gap-2 rounded-lg border border-warning/30 bg-warning-soft px-3.5 py-2.5 text-sm text-warning-strong">
          <Badge variant="warning" dot>
            {t("Demo data")}
          </Badge>
          <span>{t("These figures are sample values, not your school's records.")}</span>
          {canSwitch && (
            <button type="button" onClick={() => setSource("live")} className="font-medium underline underline-offset-4 cursor-pointer">
              {t("Switch to live data")}
            </button>
          )}
        </div>
      )}

      {!onOverview ? (
        <DashboardTabPanel tab={activeTab} source={source} dateRange={dateRange} rangeLabel={rangeLabel} />
      ) : available.length === 0 ? (
        <EmptyState
          icon={LayoutGrid}
          title={t("No dashboard widgets for your role")}
          description={t("Your role doesn't have access to any dashboard information yet. Ask your school administrator if you think this is wrong.")}
        />
      ) : visible.length === 0 && !editing ? (
        <EmptyState
          icon={LayoutGrid}
          title={t("Your dashboard is empty")}
          description={t("All widgets are hidden. Use Manage widgets above to add cards back, or reset to the default dashboard.")}
          action={
            <Button variant="outline" size="sm" onClick={layout.reset}>
              {t("Reset to default")}
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
