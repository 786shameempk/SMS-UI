import { useAuthStore } from "@/store/authStore";
import { CORE_NAV_ITEMS, NAV_SECTIONS, type NavAudience, type NavItem } from "@/constants/nav";
import type { UserRole } from "@/types/auth";

const STAFF_ROLES: UserRole[] = ["superAdmin", "admin", "principal", "teacher"];

function matchesAudience(audience: NavAudience | undefined, role: UserRole | undefined) {
  if (!audience) return true;
  return audience === "student" ? role === "student" : !!role && STAFF_ROLES.includes(role);
}

/** Nav filtered by the signed-in user's module permissions. Sections left with no items are dropped. */
export function useVisibleNav() {
  const modulePermissions = useAuthStore((s) => s.modulePermissions);
  const role = useAuthStore((s) => s.user?.role);
  const hasPermission = (key?: NavItem["permissionKey"]) => !key || !modulePermissions || modulePermissions[key];
  const visible = (item: NavItem) =>
    hasPermission(item.permissionKey) && matchesAudience(item.audience, role) && (!item.superAdminOnly || role === "superAdmin");

  const coreItems = CORE_NAV_ITEMS.filter(visible);
  const sections = NAV_SECTIONS.filter((section) => hasPermission(section.permissionKey))
    .map((section) => ({ ...section, items: section.items.filter(visible) }))
    .filter((section) => section.items.length > 0);

  return { coreItems, sections };
}
