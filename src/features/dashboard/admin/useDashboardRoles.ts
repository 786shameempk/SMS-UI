import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { listRoles } from "@/features/administration/roles/api";
import { ASSIGNABLE_ROLES, ROLE_NAME } from "./roles";

export interface DashboardRoleOption {
  /** A built-in role name, or a custom role's key (each custom role is its own entry), or "staff" until the master loads. */
  value: string;
  /** Already the role master's own name where it has one; pass through t() is harmless. */
  label: string;
  custom: boolean;
}

export interface DashboardRoles {
  roles: DashboardRoleOption[];
  loading: boolean;
  /** The keys of the school's custom roles. */
  customKeys: string[];
  /** Replaces the catalog's "staff" (every custom role) in a role list with each custom role. */
  expand: (roles: readonly string[]) => string[];
  /** The label for a role value, falling back to the built-in name or the value itself. */
  labelOf: (role: string) => string;
}

/**
 * The roles offered in Settings → Dashboard, taken from the role master (/api/school-roles): built-in roles first,
 * then every custom role as its own entry (the dashboard service takes a custom role's key as well as "staff", which
 * means all of them). Falls back to the static list while the master loads or if it can't be reached.
 */
export function useDashboardRoles(): DashboardRoles {
  const master = useQuery({ queryKey: ["admin", "roles"], queryFn: listRoles, staleTime: 60_000 });

  return useMemo<DashboardRoles>(() => {
    const fallback = ASSIGNABLE_ROLES.map((value) => ({ value: value as string, label: ROLE_NAME[value], custom: false }));
    const labelOf = (role: string, options: DashboardRoleOption[] = fallback) => options.find((o) => o.value === role)?.label ?? ROLE_NAME[role] ?? role;
    if (!master.data) return { roles: fallback, loading: master.isLoading, customKeys: [], expand: (r) => [...r], labelOf: (r) => labelOf(r) };

    const system = new Map(master.data.filter((r) => r.isSystem && r.key).map((r) => [r.key!.toLowerCase(), r]));
    const custom = master.data.filter((r) => !r.isSystem && r.key).sort((a, b) => a.name.localeCompare(b.name));
    const out: DashboardRoleOption[] = [];
    for (const value of ASSIGNABLE_ROLES) {
      if (value === "staff") continue;
      const row = system.get(value.toLowerCase());
      if (row) out.push({ value, label: row.name, custom: false });
    }
    for (const r of custom) out.push({ value: r.key!, label: r.name, custom: true });
    const roles = out.length ? out : fallback;
    const customKeys = custom.map((r) => r.key!);
    return {
      roles,
      loading: master.isLoading,
      customKeys,
      expand: (list) => [...new Set(list.flatMap((r) => (r === "staff" ? customKeys : [r])))],
      labelOf: (r) => labelOf(r, roles),
    };
  }, [master.data, master.isLoading]);
}
