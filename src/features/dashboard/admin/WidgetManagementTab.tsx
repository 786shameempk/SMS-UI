import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { LayoutGrid, Pencil, RotateCcw } from "lucide-react";
import { extractApiErrorMessage } from "@/lib/httpClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { SearchInput } from "@/components/ui/search-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Switch } from "@/components/ui/switch";
import { ToggleChip } from "@/components/ui/toggle-chip";
import type { UserRole } from "@/types/auth";
import { cn } from "@/utils/cn";
import WidgetPreview from "../components/WidgetPreview";
import { HEIGHT_LABEL, WIDTH_LABEL } from "../layout";
import {
  listAdminWidgetSettings,
  resetAdminWidgetSetting,
  resetRoleDashboards,
  saveAdminWidgetSetting,
  type AdminWidgetSetting,
  type AdminWidgetSettingInput,
} from "../layoutApi";
import { WIDGET_CATEGORY_LABEL, WIDGETS_BY_ID, type DashboardWidgetId, type WidgetCategory } from "../widgets";
import { ASSIGNABLE_ROLES, ROLE_NAME, SCHOOL_ROLES } from "./roles";
import WidgetSettingDialog from "./WidgetSettingDialog";

const QUERY_KEY = ["dashboard-admin-widgets"] as const;
const CATEGORY_ORDER: WidgetCategory[] = ["overview", "academics", "finance", "campus", "calendar", "communication"];

const toInput = (w: AdminWidgetSetting): AdminWidgetSettingInput => ({
  enabled: w.enabled,
  allowedRoles: w.allowedRoles,
  defaultVisible: w.defaultVisible,
  defaultOrder: w.defaultOrder,
  defaultWidth: w.defaultWidth,
  defaultHeight: w.defaultHeight,
  configurable: w.configurable,
  refreshInterval: w.refreshInterval,
});

/** The roles that actually get a widget in this school. */
const rolesOf = (w: AdminWidgetSetting): UserRole[] => w.allowedRoles ?? w.catalogRoles ?? ASSIGNABLE_ROLES;

function refreshLabel(seconds: number, t: TFunction): string {
  if (seconds === 0) return t("No auto-refresh");
  if (seconds < 60) return t("Refreshes every {{seconds}}s", { seconds });
  if (seconds < 3600) return t("Refreshes every {{minutes}} min", { minutes: Math.round(seconds / 60) });
  return t("Refreshes every {{hours}} h", { hours: Math.round(seconds / 3600) });
}

function WidgetRow({ widget, onEdit, onToggle, toggling }: { widget: AdminWidgetSetting; onEdit: () => void; onToggle: (enabled: boolean) => void; toggling: boolean }) {
  const { t } = useTranslation("dashboard");
  const roles = rolesOf(widget);
  const name = t(widget.name);
  return (
    <li className={cn("flex flex-col gap-3 rounded-xl border border-border bg-card p-3 sm:flex-row sm:items-center", !widget.enabled && "bg-muted/40")}>
      <div className={cn("hidden h-14 w-28 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/60 sm:flex", !widget.enabled && "opacity-50 grayscale")}>
        <WidgetPreview id={widget.id} className="h-12 w-24" />
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className={cn("text-sm font-semibold", widget.enabled ? "text-foreground" : "text-muted-foreground")}>{name}</p>
          {widget.customized && <Badge variant="brand">{t("Customized")}</Badge>}
          {!widget.enabled && <Badge variant="neutral">{t("Off")}</Badge>}
          {!widget.configurable && widget.enabled && <Badge variant="info">{t("Locked")}</Badge>}
        </div>
        <p className="truncate text-xs text-muted-foreground">{t(WIDGETS_BY_ID.get(widget.id)?.description ?? "")}</p>
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{roles.length === ASSIGNABLE_ROLES.length ? t("Every role") : roles.map((r) => t(ROLE_NAME[r])).join(", ")}</span>
          {" · "}
          {t(WIDTH_LABEL[widget.defaultWidth])}, {t(HEIGHT_LABEL[widget.defaultHeight]).toLowerCase()}
          {" · "}
          {widget.defaultVisible ? t("Shown by default") : t("Hidden by default")}
          {" · "}
          {refreshLabel(widget.refreshInterval, t)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
        <Switch checked={widget.enabled} disabled={toggling} onCheckedChange={onToggle} aria-label={t("{{name}} available in this school", { name })} />
        <Button variant="outline" size="sm" onClick={onEdit} aria-label={t("Edit {{name}}", { name })}>
          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          {t("Edit")}
        </Button>
      </div>
    </li>
  );
}

function ResetRoleDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation("dashboard");
  const [role, setRole] = useState<UserRole>("teacher");
  const reset = useMutation({
    mutationFn: () => resetRoleDashboards(role),
    onSuccess: (count) => {
      const roleName = t(ROLE_NAME[role]).toLowerCase();
      toast.success(
        count
          ? count === 1
            ? t("Reset {{n}} {{role}} dashboard.", { n: count, role: roleName })
            : t("Reset {{n}} {{role}} dashboards.", { n: count, role: roleName })
          : t("No {{role}} had customized their dashboard.", { role: roleName }),
      );
      onOpenChange(false);
    },
    onError: (err) => toast.error(extractApiErrorMessage(err, t("Couldn't reset those dashboards."))),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("Reset a role's dashboards")}</DialogTitle>
          <DialogDescription>
            {t("Everyone in this school with the role goes back to the default dashboard on their next visit. Their own arrangement is discarded.")}
          </DialogDescription>
        </DialogHeader>
        <FormField label={t("Role")} htmlFor="reset-role">
          <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
            <SelectTrigger id="reset-role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SCHOOL_ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {t(ROLE_NAME[r])}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("Cancel")}
          </Button>
          <Button variant="destructive" loading={reset.isPending} onClick={() => reset.mutate()}>
            {t("Reset dashboards")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Settings → Dashboard: which widgets this school offers, to which roles, and the default dashboard each role
 * starts from. The server enforces all of it (a role can only be narrowed, never widened past the catalog).
 */
export default function WidgetManagementTab() {
  const { t } = useTranslation("dashboard");
  const queryClient = useQueryClient();
  const widgets = useQuery({ queryKey: QUERY_KEY, queryFn: listAdminWidgetSettings });
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<DashboardWidgetId | null>(null);
  const [resetOpen, setResetOpen] = useState(false);

  const afterChange = (updated: AdminWidgetSetting) => {
    queryClient.setQueryData<AdminWidgetSetting[]>(QUERY_KEY, (old) => old?.map((w) => (w.id === updated.id ? updated : w)));
    // Everyone's (including this admin's) dashboard config depends on these settings.
    void queryClient.invalidateQueries({ queryKey: ["dashboard-config"] });
  };

  const save = useMutation({
    mutationFn: ({ id, input }: { id: DashboardWidgetId; input: AdminWidgetSettingInput }) => saveAdminWidgetSetting(id, input),
    onSuccess: (updated) => {
      afterChange(updated);
      setEditing(null);
      toast.success(t("{{name}} saved.", { name: t(updated.name) }));
    },
    onError: (err) => toast.error(extractApiErrorMessage(err, t("Couldn't save the widget settings."))),
  });
  const reset = useMutation({
    mutationFn: resetAdminWidgetSetting,
    onSuccess: (updated) => {
      afterChange(updated);
      setEditing(null);
      toast.success(t("{{name}} is back to its defaults.", { name: t(updated.name) }));
    },
    onError: (err) => toast.error(extractApiErrorMessage(err, t("Couldn't reset the widget."))),
  });

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (widgets.data ?? []).filter(
      (w) =>
        (roleFilter === "all" || rolesOf(w).includes(roleFilter)) &&
        (!q || w.name.toLowerCase().includes(q) || (WIDGETS_BY_ID.get(w.id)?.description ?? "").toLowerCase().includes(q)),
    );
  }, [widgets.data, roleFilter, search]);

  const grouped = CATEGORY_ORDER.map((c) => ({
    category: c,
    items: visible.filter((w) => (WIDGETS_BY_ID.get(w.id)?.category ?? "overview") === c).sort((a, b) => a.defaultOrder - b.defaultOrder),
  })).filter((g) => g.items.length > 0);

  const editingWidget = widgets.data?.find((w) => w.id === editing);
  const enabledCount = widgets.data?.filter((w) => w.enabled).length ?? 0;
  const customizedCount = widgets.data?.filter((w) => w.customized).length ?? 0;

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>{t("Dashboard widgets")}</CardTitle>
          <CardDescription>
            {t("Choose which widgets each role gets and how their default dashboard looks. People can still personalise any widget you leave customizable.")}
            {widgets.data && (
              <span className="mt-1 block">
                {customizedCount
                  ? t("{{enabled}} of {{total}} widgets on · {{customized}} customized for this school.", { enabled: enabledCount, total: widgets.data.length, customized: customizedCount })
                  : t("{{enabled}} of {{total}} widgets on.", { enabled: enabledCount, total: widgets.data.length })}
              </span>
            )}
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={() => setResetOpen(true)} className="shrink-0">
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          {t("Reset a role's dashboards")}
        </Button>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <SearchInput value={search} onValueChange={setSearch} placeholder={t("Search widgets")} aria-label={t("Search widgets")} containerClassName="lg:w-64" />
          <div role="group" aria-label={t("Show widgets for role")} className="flex flex-wrap gap-1.5">
            <ToggleChip pressed={roleFilter === "all"} onClick={() => setRoleFilter("all")}>
              {t("All roles")}
            </ToggleChip>
            {ASSIGNABLE_ROLES.map((r) => (
              <ToggleChip key={r} pressed={roleFilter === r} onClick={() => setRoleFilter(r)}>
                {t(ROLE_NAME[r])}
              </ToggleChip>
            ))}
          </div>
        </div>

        {widgets.isLoading ? (
          <div className="space-y-2" aria-busy="true" aria-label={t("Loading widgets")}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : widgets.isError ? (
          <ErrorState
            title={t("Couldn't load the widget settings")}
            description={extractApiErrorMessage(widgets.error, t("Check your connection and try again."))}
            onRetry={() => widgets.refetch()}
            retrying={widgets.isRefetching}
          />
        ) : grouped.length === 0 ? (
          <EmptyState icon={LayoutGrid} title={t("No widgets match")} description={t("Try another role or search term.")} />
        ) : (
          grouped.map((g) => (
            <section key={g.category} aria-label={t(WIDGET_CATEGORY_LABEL[g.category])} className="space-y-2">
              <h3 className="text-overline">{t(WIDGET_CATEGORY_LABEL[g.category])}</h3>
              <ul className="space-y-2">
                {g.items.map((w) => (
                  <WidgetRow
                    key={w.id}
                    widget={w}
                    onEdit={() => setEditing(w.id)}
                    toggling={save.isPending && save.variables?.id === w.id}
                    onToggle={(enabled) => save.mutate({ id: w.id, input: { ...toInput(w), enabled } })}
                  />
                ))}
              </ul>
            </section>
          ))
        )}
      </CardContent>

      {editingWidget && (
        <WidgetSettingDialog
          key={editingWidget.id}
          widget={editingWidget}
          open
          onOpenChange={(open) => !open && setEditing(null)}
          saving={save.isPending || reset.isPending}
          onSave={(input) => save.mutate({ id: editingWidget.id, input })}
          onReset={() => reset.mutate(editingWidget.id)}
        />
      )}
      <ResetRoleDialog open={resetOpen} onOpenChange={setResetOpen} />
    </Card>
  );
}
