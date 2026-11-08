import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { listRoles } from "@/features/administration/roles/api";
import type { UserRole } from "@/types/auth";
import { ASSIGNABLE_ROLES, ROLE_NAME } from "./roles";

export interface DashboardRoleOption {
  value: UserRole;
  /** Already the role master's own name where it has one; pass through t() is harmless. */
  label: string;
}

/**
 * The roles offered in Settings → Dashboard, taken from the role master (/api/school-roles). Built-in roles show
 * the master's name for them; every custom role in the master is served by the single "staff" bucket (the dashboard
 * service keys widgets by built-in role name or "staff"), whose label lists those custom roles. Falls back to the
 * static list while the master loads or if it can't be reached.
 */
export function useDashboardRoles(): { roles: DashboardRoleOption[]; loading: boolean } {
  const master = useQuery({ queryKey: ["admin", "roles"], queryFn: listRoles, staleTime: 60_000 });

  const roles = useMemo<DashboardRoleOption[]>(() => {
    const fallback = ASSIGNABLE_ROLES.map((value) => ({ value, label: ROLE_NAME[value] }));
    if (!master.data) return fallback;
    const system = new Map(master.data.filter((r) => r.isSystem && r.key).map((r) => [r.key!.toLowerCase(), r]));
    const custom = master.data.filter((r) => !r.isSystem);
    const out: DashboardRoleOption[] = [];
    for (const value of ASSIGNABLE_ROLES) {
      if (value === "staff") {
        if (custom.length) out.push({ value, label: custom.length <= 3 ? custom.map((r) => r.name).join(" / ") : `${ROLE_NAME.staff} (${custom.length})` });
        continue;
      }
      const row = system.get(value.toLowerCase());
      if (row) out.push({ value, label: row.name });
    }
    return out.length ? out : fallback;
  }, [master.data]);

  return { roles, loading: master.isLoading };
}
