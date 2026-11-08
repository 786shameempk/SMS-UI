import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { listAssignableLoginRoles, type AssignableLoginRole } from "./api";
import { STAFF_LOGIN_ROLES, designationForRole } from "./constants";
import type { StaffDesignation, StaffMember } from "./types";

/** Prefix of a select value that stands for a plain designation no role in the master carries (older records). */
export const LEGACY_ROLE = "d:";

/** The roles a person can hold: the built-in staff roles and the school's custom roles (the role master), with a fixed fallback while it loads. */
export function useStaffRoles(): AssignableLoginRole[] {
  const { t } = useTranslation("staff");
  const { data } = useQuery({ queryKey: ["staff", "login-roles"], queryFn: listAssignableLoginRoles, staleTime: 60_000, retry: false });
  return data?.length ? data : STAFF_LOGIN_ROLES.map((r) => ({ key: r.value, name: t(r.label) }));
}

/** The select value that currently stands for a person: their role-master role, else their plain designation. */
export function roleKeyFor(staff: Pick<StaffMember, "designation" | "roleTitle">, roles: AssignableLoginRole[]): string {
  if (staff.roleTitle) return roles.find((r) => r.name.toLowerCase() === staff.roleTitle!.toLowerCase())?.key ?? LEGACY_ROLE + "Other";
  return roles.find((r) => designationForRole(r.key, r.name) === staff.designation)?.key ?? LEGACY_ROLE + staff.designation;
}

/** The designation (and role title for "Other") a select value means. */
export function resolveRole(picked: string, roles: AssignableLoginRole[], fallbackTitle?: string): { designation: StaffDesignation; roleTitle?: string; role?: AssignableLoginRole } {
  const role = roles.find((r) => r.key === picked);
  const designation: StaffDesignation = role ? designationForRole(role.key, role.name) : ((picked.slice(LEGACY_ROLE.length) as StaffDesignation) || "Other");
  return { designation, roleTitle: designation === "Other" ? role?.name ?? fallbackTitle : undefined, role };
}
