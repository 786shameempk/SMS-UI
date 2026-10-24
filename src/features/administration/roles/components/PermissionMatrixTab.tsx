import { useMemo, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Info } from "lucide-react";
import { PLAN_MODULE_GROUPS } from "@/features/platform/constants";
import { getMatrixModules, getRolePermissions, listPermissions, listRoles, MATRIX_MODULES_QUERY_KEY, putRolePermission, setRolePermission } from "../api";
import { CATEGORY_DESCRIPTION, CATEGORY_LABEL } from "../constants";
import type { PermissionCategory } from "../types";

const CATEGORIES: PermissionCategory[] = ["menu", "api", "screen", "action"];

export default function PermissionMatrixTab() {
  const { t } = useTranslation("administration");
  const queryClient = useQueryClient();
  const [category, setCategory] = useState<PermissionCategory>("menu");

  const { data: roles = [], isLoading: rolesLoading } = useQuery({ queryKey: ["admin", "roles"], queryFn: listRoles });
  const { data: permissions = [], isLoading: permsLoading } = useQuery({
    queryKey: ["admin", "permissions"],
    queryFn: listPermissions,
  });
  const { data: rolePermissions = {}, isLoading: mapLoading } = useQuery({
    queryKey: ["admin", "role-permissions"],
    queryFn: getRolePermissions,
  });

  const { data: scope, isLoading: scopeLoading } = useQuery({ queryKey: MATRIX_MODULES_QUERY_KEY, queryFn: getMatrixModules });

  const toggleMutation = useMutation({
    mutationFn: ({ roleId, permissionId, granted }: { roleId: string; permissionId: string; granted: boolean }) =>
      setRolePermission(roleId, permissionId, granted),
    onSuccess: (map) => {
      queryClient.setQueryData(["admin", "role-permissions"], map);
    },
    onError: (err) => toast.error(err instanceof Error && err.message ? err.message : t("Could not update permission")),
  });

  // Several cells at once (a whole column of the visible category). Each is the same single-cell change the checkboxes make, so the
  // server applies the same rules to each (the plan, locked-in administrator access) and reports what it refused.
  const bulkMutation = useMutation({
    mutationFn: async ({ roleId, permissionIds, granted }: { roleId: string; permissionIds: string[]; granted: boolean }) => {
      const results = await Promise.allSettled(permissionIds.map((id) => putRolePermission(roleId, id, granted)));
      const failed = results.filter((r) => r.status === "rejected").length;
      return { done: results.length - failed, failed, map: await getRolePermissions() };
    },
    onSuccess: ({ done, failed, map }) => {
      queryClient.setQueryData(["admin", "role-permissions"], map);
      if (failed > 0) toast.error(t("{{done}} changed, {{failed}} could not be changed (outside the school's plan or protected).", { done, failed }));
      else toast.success(done === 1 ? t("{{count}} permission updated", { count: done }) : t("{{count}} permissions updated", { count: done }));
    },
    onError: (err) => toast.error(err instanceof Error && err.message ? err.message : t("Could not update permissions")),
  });

  // Only the modules in the school's plan are grantable (superAdmin sees every module).
  const rowsForCategory = useMemo(
    () => permissions.filter((p) => p.category === category && (!scope || scope.modules.includes(p.module))),
    [permissions, category, scope],
  );
  // Rows are laid out under the menu groups, so "Campus Operations" reads as one block of Library, Transport, Hostel and the rest.
  const grouped = useMemo(() => {
    const placed = new Set<string>();
    const groups = PLAN_MODULE_GROUPS.map((g) => ({
      title: g.title,
      rows: g.modules.flatMap((m) => rowsForCategory.filter((p) => p.module === m)),
    })).filter((g) => g.rows.length > 0);
    for (const g of groups) for (const r of g.rows) placed.add(r.id);
    const rest = rowsForCategory.filter((p) => !placed.has(p.id));
    return rest.length ? [...groups, { title: "Other", rows: rest }] : groups;
  }, [rowsForCategory]);
  const isLoading = rolesLoading || permsLoading || mapLoading || scopeLoading;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="max-w-md">
          <p className="text-sm font-medium text-foreground">{t(`${CATEGORY_LABEL[category]} permissions`)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{t(CATEGORY_DESCRIPTION[category])}</p>
        </div>
        <Select value={category} onValueChange={(v) => setCategory(v as PermissionCategory)}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {t(`${CATEGORY_LABEL[c]} permissions`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {scope?.restricted && (
        <div className="flex items-start gap-2.5 rounded-xl border border-primary/30 bg-brand-500/10 px-4 py-3 text-sm">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary-text" />
          <p className="text-foreground">
            <Trans
              t={t}
              i18nKey="Your school is on the <b>{{plan}}</b> plan, which includes <b>{{count}}</b> modules. Only those modules can be granted here. Contact the platform administrator to add more."
              values={{ plan: scope.planName, count: scope.modules.length }}
              components={{ b: <span className="font-semibold" /> }}
            />
          </p>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card overflow-clip">
        {isLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : (
          <Table stickyHeader>
            <TableHeader>
              <TableRow hover={false}>
                <TableHead className="sticky start-0 bg-muted">{t("Module")}</TableHead>
                {roles.map((role) => (
                  <TableHead key={role.id} className="text-center">
                    <div className="flex flex-col items-center gap-0.5">
                      <span>{role.name}</span>
                      <span className="flex gap-1.5 text-[10px] font-normal normal-case">
                        <button
                          type="button"
                          className="text-primary-text hover:underline cursor-pointer disabled:opacity-50"
                          disabled={bulkMutation.isPending}
                          aria-label={t("Grant every {{category}} permission shown to {{role}}", { category: t(CATEGORY_LABEL[category]), role: role.name })}
                          onClick={() => bulkMutation.mutate({ roleId: role.id, permissionIds: rowsForCategory.filter((p) => !(rolePermissions[role.id] ?? []).includes(p.id)).map((p) => p.id), granted: true })}
                        >
                          {t("All")}
                        </button>
                        <button
                          type="button"
                          className="text-muted-foreground hover:underline cursor-pointer disabled:opacity-50"
                          disabled={bulkMutation.isPending}
                          aria-label={t("Clear every {{category}} permission shown for {{role}}", { category: t(CATEGORY_LABEL[category]), role: role.name })}
                          onClick={() => bulkMutation.mutate({ roleId: role.id, permissionIds: rowsForCategory.filter((p) => (rolePermissions[role.id] ?? []).includes(p.id)).map((p) => p.id), granted: false })}
                        >
                          {t("None")}
                        </button>
                      </span>
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {grouped.flatMap((group) => [
                <TableRow key={`group-${group.title}`} hover={false}>
                  <TableCell colSpan={roles.length + 1} className="bg-secondary/40 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t(group.title)}
                  </TableCell>
                </TableRow>,
                ...group.rows.map((perm) => (
                <TableRow key={perm.id}>
                  <TableCell className="sticky start-0 bg-card font-medium">{t(perm.module)}</TableCell>
                  {roles.map((role) => {
                    const granted = (rolePermissions[role.id] ?? []).includes(perm.id);
                    return (
                      <TableCell key={role.id} className="text-center">
                        <Checkbox
                          checked={granted}
                          onCheckedChange={(checked) =>
                            toggleMutation.mutate({ roleId: role.id, permissionId: perm.id, granted: checked === true })
                          }
                          aria-label={t("{{permission}} for {{role}}", { permission: `${t(perm.module)} — ${t(CATEGORY_LABEL[perm.category])}`, role: role.name })}
                        />
                      </TableCell>
                    );
                  })}
                </TableRow>
                )),
              ])}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
