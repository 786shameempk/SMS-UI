import type { NavItem, NavSection } from "@/constants/nav";

export function isNavItemActive(item: NavItem, pathname: string) {
  return item.end ? pathname === item.to : pathname === item.to || pathname.startsWith(item.to + "/");
}

/** The sidebar section whose pages include the current route (the most specific match wins), if any. */
export function findActiveSection<T extends Pick<NavSection, "items">>(sections: T[], pathname: string): T | undefined {
  let best: { section: T; length: number } | undefined;
  for (const section of sections) {
    for (const item of section.items) {
      if (!isNavItemActive(item, pathname)) continue;
      if (!best || item.to.length > best.length) best = { section, length: item.to.length };
    }
  }
  return best?.section;
}
