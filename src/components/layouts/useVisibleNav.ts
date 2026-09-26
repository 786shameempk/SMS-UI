import { useAuthStore } from "@/store/authStore";
import { CORE_NAV_ITEMS, NAV_SECTIONS, type NavItem } from "@/constants/nav";

/** Nav filtered by the signed-in user's module permissions. Sections left with no items are dropped. */
export function useVisibleNav() {
  const modulePermissions = useAuthStore((s) => s.modulePermissions);
  const hasPermission = (key?: NavItem["permissionKey"]) => !key || !modulePermissions || modulePermissions[key];

  const coreItems = CORE_NAV_ITEMS.filter((item) => hasPermission(item.permissionKey));
  const sections = NAV_SECTIONS.filter((section) => hasPermission(section.permissionKey))
    .map((section) => ({ ...section, items: section.items.filter((item) => hasPermission(item.permissionKey)) }))
    .filter((section) => section.items.length > 0);

  return { coreItems, sections };
}
