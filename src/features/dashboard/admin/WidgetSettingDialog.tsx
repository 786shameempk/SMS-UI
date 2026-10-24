import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ToggleChip } from "@/components/ui/toggle-chip";
import type { UserRole } from "@/types/auth";
import WidgetPreview from "../components/WidgetPreview";
import { HEIGHT_LABEL, WIDTH_LABEL } from "../layout";
import type { AdminWidgetSetting, AdminWidgetSettingInput } from "../layoutApi";
import { WIDGET_HEIGHTS, WIDGET_WIDTHS, WIDGETS_BY_ID, type WidgetHeight, type WidgetWidth } from "../widgets";
import { ASSIGNABLE_ROLES, ROLE_NAME } from "./roles";

/** Refresh choices (seconds). The server accepts 0 or 15 s - 24 h. Labels are translated where they render. */
const REFRESH_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 0, label: "Off - on load and manual refresh" },
  { value: 30, label: "Every 30 seconds" },
  { value: 60, label: "Every minute" },
  { value: 120, label: "Every 2 minutes" },
  { value: 300, label: "Every 5 minutes" },
  { value: 600, label: "Every 10 minutes" },
  { value: 1800, label: "Every 30 minutes" },
  { value: 3600, label: "Every hour" },
];

/**
 * Edits one widget's settings for this school: on/off, which roles get it (only within the roles the catalog
 * allows), and the defaults new dashboards start from.
 */
export default function WidgetSettingDialog({
  widget,
  open,
  onOpenChange,
  onSave,
  onReset,
  saving,
}: {
  widget: AdminWidgetSetting;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (input: AdminWidgetSettingInput) => void;
  onReset: () => void;
  saving: boolean;
}) {
  const { t } = useTranslation("dashboard");
  const config = WIDGETS_BY_ID.get(widget.id);
  const possibleRoles: UserRole[] = widget.catalogRoles ?? ASSIGNABLE_ROLES;
  const [form, setForm] = useState<AdminWidgetSettingInput>(() => ({
    enabled: widget.enabled,
    allowedRoles: widget.allowedRoles,
    defaultVisible: widget.defaultVisible,
    defaultOrder: widget.defaultOrder,
    defaultWidth: widget.defaultWidth,
    defaultHeight: widget.defaultHeight,
    configurable: widget.configurable,
    refreshInterval: widget.refreshInterval,
  }));
  const set = <K extends keyof AdminWidgetSettingInput>(key: K, value: AdminWidgetSettingInput[K]) => setForm((f) => ({ ...f, [key]: value }));

  const selectedRoles = form.allowedRoles ?? possibleRoles;
  const toggleRole = (role: UserRole) => {
    const next = selectedRoles.includes(role) ? selectedRoles.filter((r) => r !== role) : [...selectedRoles, role];
    // Every possible role ticked = "follow the catalog" (null), so roles the catalog adds later are included too.
    set("allowedRoles", possibleRoles.every((r) => next.includes(r)) ? null : possibleRoles.filter((r) => next.includes(r)));
  };
  const noRoles = form.allowedRoles !== null && form.allowedRoles.length === 0;
  const orderValid = Number.isInteger(form.defaultOrder) && form.defaultOrder >= 0 && form.defaultOrder <= 10_000;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{t(widget.name)}</DialogTitle>
          <DialogDescription>{t(config?.description ?? "Dashboard widget settings for this school.")}</DialogDescription>
        </DialogHeader>

        <form
          id="widget-setting-form"
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (!noRoles && orderValid) onSave(form);
          }}
        >
          <div className="flex items-center gap-4 rounded-xl border border-border bg-muted/50 p-3">
            <WidgetPreview id={widget.id} className="h-16 w-36 shrink-0" />
            <label className="flex flex-1 items-center justify-between gap-3 text-sm">
              <span>
                <span className="block font-medium text-foreground">{t("Available in this school")}</span>
                <span className="block text-xs text-muted-foreground">{t("Off removes it from every dashboard here.")}</span>
              </span>
              <Switch checked={form.enabled} onCheckedChange={(v) => set("enabled", v)} aria-label={t("Available in this school")} />
            </label>
          </div>

          <FormField
            label={t("Roles")}
            hint={
              widget.requiredModule
                ? t("Users also need the {{module}} module to see it.", { module: widget.requiredModule.replace("module.", "") })
                : widget.catalogRoles
                  ? t("This widget can only be given to these roles.")
                  : undefined
            }
            error={noRoles ? t("Pick at least one role, or switch the widget off.") : undefined}
          >
            <div role="group" aria-label={t("Roles that get this widget")} className="flex flex-wrap gap-1.5">
              {possibleRoles.map((role) => (
                <ToggleChip key={role} size="lg" pressed={selectedRoles.includes(role)} onClick={() => toggleRole(role)}>
                  {t(ROLE_NAME[role])}
                </ToggleChip>
              ))}
            </div>
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={t("Default width")} htmlFor="ws-width">
              <Select value={String(form.defaultWidth)} onValueChange={(v) => set("defaultWidth", Number(v) as WidgetWidth)}>
                <SelectTrigger id="ws-width">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WIDGET_WIDTHS.map((w) => (
                    <SelectItem key={w} value={String(w)}>
                      {t(WIDTH_LABEL[w])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label={t("Default height")} htmlFor="ws-height">
              <Select value={String(form.defaultHeight)} onValueChange={(v) => set("defaultHeight", Number(v) as WidgetHeight)}>
                <SelectTrigger id="ws-height">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WIDGET_HEIGHTS.map((h) => (
                    <SelectItem key={h} value={String(h)}>
                      {t(HEIGHT_LABEL[h])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label={t("Default position")} htmlFor="ws-order" hint={t("Lower numbers come first.")} error={orderValid ? undefined : t("Use a whole number from 0 to 10,000.")}>
              <Input
                id="ws-order"
                type="number"
                min={0}
                max={10_000}
                step={10}
                value={Number.isNaN(form.defaultOrder) ? "" : form.defaultOrder}
                onChange={(e) => set("defaultOrder", e.target.value === "" ? Number.NaN : Number(e.target.value))}
              />
            </FormField>
            <FormField label={t("Auto-refresh")} htmlFor="ws-refresh">
              <Select value={String(form.refreshInterval)} onValueChange={(v) => set("refreshInterval", Number(v))}>
                <SelectTrigger id="ws-refresh">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(REFRESH_OPTIONS.some((o) => o.value === form.refreshInterval)
                    ? REFRESH_OPTIONS
                    : [...REFRESH_OPTIONS, { value: form.refreshInterval, label: t("Every {{seconds}} seconds", { seconds: form.refreshInterval }) }]
                  ).map((o) => (
                    <SelectItem key={o.value} value={String(o.value)}>
                      {t(o.label)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>

          <div className="space-y-3 rounded-xl border border-border p-3">
            <label className="flex items-center justify-between gap-3 text-sm">
              <span>
                <span className="block font-medium text-foreground">{t("Shown by default")}</span>
                <span className="block text-xs text-muted-foreground">{t("On a new or reset dashboard. Users can still add it themselves.")}</span>
              </span>
              <Switch checked={form.defaultVisible} onCheckedChange={(v) => set("defaultVisible", v)} aria-label={t("Shown by default")} />
            </label>
            <label className="flex items-center justify-between gap-3 text-sm">
              <span>
                <span className="block font-medium text-foreground">{t("Users can customize it")}</span>
                <span className="block text-xs text-muted-foreground">{t("Off locks it at the default place and size, always shown.")}</span>
              </span>
              <Switch checked={form.configurable} onCheckedChange={(v) => set("configurable", v)} aria-label={t("Users can customize it")} />
            </label>
          </div>
        </form>

        <DialogFooter className="sm:justify-between">
          <Button type="button" variant="ghost" size="sm" onClick={onReset} disabled={!widget.customized || saving}>
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            {t("Reset to defaults")}
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("Cancel")}
            </Button>
            <Button type="submit" form="widget-setting-form" loading={saving} disabled={noRoles || !orderValid}>
              {t("Save")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
