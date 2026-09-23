import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { getRolePermissions, listPermissions, listRoles, setRolePermission } from "../api";
import { CATEGORY_DESCRIPTION, CATEGORY_LABEL } from "../constants";
import type { PermissionCategory } from "../types";

const CATEGORIES: PermissionCategory[] = ["menu", "api", "screen", "action"];

export default function PermissionMatrixTab() {
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

  const toggleMutation = useMutation({
    mutationFn: ({ roleId, permissionId, granted }: { roleId: string; permissionId: string; granted: boolean }) =>
      setRolePermission(roleId, permissionId, granted),
    onSuccess: (map) => {
      queryClient.setQueryData(["admin", "role-permissions"], map);
    },
    onError: () => toast.error("Could not update permission"),
  });

  const rowsForCategory = useMemo(() => permissions.filter((p) => p.category === category), [permissions, category]);
  const isLoading = rolesLoading || permsLoading || mapLoading;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="max-w-md">
          <p className="text-sm font-medium text-slate-800">{CATEGORY_LABEL[category]} permissions</p>
          <p className="text-xs text-slate-500 mt-0.5">{CATEGORY_DESCRIPTION[category]}</p>
        </div>
        <Select value={category} onValueChange={(v) => setCategory(v as PermissionCategory)}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {CATEGORY_LABEL[c]} permissions
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-secondary/60 border-b border-border">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide sticky left-0 bg-secondary/60">
                    Module
                  </th>
                  {roles.map((role) => (
                    <th key={role.id} className="text-center px-3 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">
                      {role.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rowsForCategory.map((perm) => (
                  <tr key={perm.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5 text-sm text-slate-700 font-medium sticky left-0 bg-card">{perm.module}</td>
                    {roles.map((role) => {
                      const granted = (rolePermissions[role.id] ?? []).includes(perm.id);
                      return (
                        <td key={role.id} className="px-3 py-2.5 text-center">
                          <Checkbox
                            checked={granted}
                            onCheckedChange={(checked) =>
                              toggleMutation.mutate({ roleId: role.id, permissionId: perm.id, granted: checked === true })
                            }
                            aria-label={`${perm.label} for ${role.name}`}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
