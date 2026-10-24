import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Lock, RotateCcw } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { tabKey } from "@/store/subMenuStore";
import {
  getMatrixModules,
  getRolePermissions,
  getRoleSubMenus,
  listRoles,
  MATRIX_MODULES_QUERY_KEY,
  resetRoleSubMenus,
  setRoleSubMenus,
  SUB_MENUS_QUERY_KEY,
} from "../api";
import { menuPermissionId, SUB_MENU_CATALOG, type SubMenuPage } from "../subMenus";

/** Roles whose tabs can't be hidden: the school's administrators always keep every tab, so they can't be locked out. */
const LOCKED_ROLES = ["admin", "superAdmin"];

/**
 * Chooses, per role, which tabs inside each module's pages the role sees. Only the modules a role can open (its Menu cell in the
 * Permission matrix, within the school's plan) are listed. Everything is visible until a tab is unticked. This changes what the web
 * app shows at each user's next page load; what a role may do is still decided by the matrix, staff actions and the services.
 */
export default function SubMenusTab() {
  const { t } = useTranslation("administration");
  const queryClient = useQueryClient();
  const roles = useQuery({ queryKey: ["admin", "roles"], queryFn: listRoles });
  const grants = useQuery({ queryKey: ["admin", "role-permissions"], queryFn: getRolePermissions });
  const scope = useQuery({ queryKey: MATRIX_MODULES_QUERY_KEY, queryFn: getMatrixModules });
  const subMenus = useQuery({ queryKey: SUB_MENUS_QUERY_KEY, queryFn: getRoleSubMenus });

  const [roleId, setRoleId] = useState("");
  const [draft, setDraft] = useState<{ roleId: string; hidden: Set<string> } | null>(null);

  const selectedId = roleId || roles.data?.[0]?.id || "";
  const role = roles.data?.find((r) => r.id === selectedId);
  const locked = LOCKED_ROLES.includes(role?.key ?? "");
  const stored = subMenus.data?.find((s) => s.roleId === selectedId);
  const hidden = draft?.roleId === selectedId ? draft.hidden : new Set(stored?.hidden ?? []);
  const dirty = draft?.roleId === selectedId;

  const pages = useMemo(() => {
    if (!selectedId) return [];
    const granted = new Set(grants.data?.[selectedId] ?? []);
    return SUB_MENU_CATALOG.filter(
      (p) => (locked || granted.has(menuPermissionId(p.matrixModule))) && (!scope.data || scope.data.modules.includes(p.matrixModule)),
    );
  }, [grants.data, scope.data, selectedId, locked]);
  const byModule = useMemo(() => {
    const groups = new Map<string, SubMenuPage[]>();
    for (const page of pages) groups.set(page.matrixModule, [...(groups.get(page.matrixModule) ?? []), page]);
    return [...groups.entries()];
  }, [pages]);

  const done = (message: string) => {
    setDraft(null);
    queryClient.invalidateQueries({ queryKey: SUB_MENUS_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: ["sub-menus", "mine"] });
    toast.success(message);
  };
  const save = useMutation({
    mutationFn: () => setRoleSubMenus(selectedId, [...hidden]),
    onSuccess: () => done(t("Sub-menus saved. They apply when each user next opens a page.")),
    onError: (e: Error) => toast.error(e.message),
  });
  const reset = useMutation({
    mutationFn: () => resetRoleSubMenus(selectedId),
    onSuccess: () => done(t("Every tab is visible again.")),
    onError: (e: Error) => toast.error(e.message),
  });

  if (roles.isLoading || grants.isLoading || scope.isLoading || subMenus.isLoading) return <Skeleton className="h-64 w-full" />;
  if (subMenus.isError)
    return (
      <p role="alert" className="text-sm text-destructive">
        {subMenus.error.message}
      </p>
    );

  const toggle = (key: string, show: boolean) => {
    const next = new Set(hidden);
    if (show) next.delete(key);
    else next.add(key);
    setDraft({ roleId: selectedId, hidden: next });
  };
  const setAll = (page: SubMenuPage, show: boolean) => {
    const next = new Set(hidden);
    for (const tab of page.tabs) {
      if (show) next.delete(tabKey(page.routeId, tab.value));
      else next.add(tabKey(page.routeId, tab.value));
    }
    setDraft({ roleId: selectedId, hidden: next });
  };

  return (
    <div className="space-y-4">
      <p className="max-w-2xl text-sm text-muted-foreground">
        {t("Choose which sub-menus (the tabs inside a module's pages) each role sees. Only modules the role can open are listed; opening a module is set in the Permission matrix. Everything is visible until you untick it.")}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={selectedId}
          onValueChange={(v) => {
            setRoleId(v);
            setDraft(null);
          }}
        >
          <SelectTrigger className="w-60" aria-label={t("Role")}>
            <SelectValue placeholder={t("Choose a role")} />
          </SelectTrigger>
          <SelectContent>
            {roles.data?.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {stored && !locked && <Badge variant={stored.configured ? "info" : "neutral"}>{stored.configured ? t("Customised for this school") : t("Every tab visible")}</Badge>}
      </div>

      {locked && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Lock className="h-4 w-4" /> {t("Administrators always see every tab, so the school can't be locked out of its own settings.")}
        </p>
      )}
      {!locked && byModule.length === 0 && (
        <p className="text-sm text-muted-foreground">{t("This role can't open any module with sub-menus yet. Turn on a module's Menu cell for it in the Permission matrix first.")}</p>
      )}

      {byModule.map(([module, modulePages]) => (
        <div key={module} className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{t(module)}</p>
          {modulePages.map((page) => {
            const shown = page.tabs.filter((tab) => !hidden.has(tabKey(page.routeId, tab.value))).length;
            return (
              <Card key={page.routeId}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">
                      {t(page.title)} <span className="text-xs font-normal text-muted-foreground">· {t("{{shown}} of {{total}} tabs shown", { shown, total: page.tabs.length })}</span>
                    </p>
                    {!locked && (
                      <div className="flex gap-1">
                        <Button type="button" variant="ghost" size="sm" onClick={() => setAll(page, true)} disabled={shown === page.tabs.length}>
                          {t("Show all")}
                        </Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setAll(page, false)} disabled={shown === 0}>
                          {t("Hide all")}
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
                    {page.tabs.map((tab) => {
                      const key = tabKey(page.routeId, tab.value);
                      const id = `submenu-${key.replace(/[^a-z0-9]+/gi, "-")}`;
                      return (
                        <label key={key} htmlFor={id} className="flex items-center gap-2 text-sm text-foreground">
                          <Checkbox id={id} checked={locked || !hidden.has(key)} disabled={locked} onCheckedChange={(v) => toggle(key, v === true)} aria-label={`${t(page.title)}: ${t(tab.label)}`} />
                          {t(tab.label)}
                        </label>
                      );
                    })}
                  </div>
                  {shown === 0 && !locked && <p className="text-xs text-warning-strong">{t("Every tab is hidden, so this role will see an empty page. Keep at least one tab, or turn the module off in the Permission matrix.")}</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ))}

      {!locked && (
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => save.mutate()} disabled={!dirty || save.isPending}>
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />} {t("Save")}
          </Button>
          {stored?.configured && (
            <Button variant="outline" onClick={() => reset.mutate()} disabled={reset.isPending}>
              <RotateCcw className="h-4 w-4" /> {t("Show every tab")}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
