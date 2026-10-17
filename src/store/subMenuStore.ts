import { create } from "zustand";

interface SubMenuState {
  /** Tab keys ("{route id}:{tab}") the school hides from the signed-in user's roles. Empty until loaded: until then every tab shows. */
  hidden: ReadonlySet<string>;
  setHidden: (keys: readonly string[]) => void;
  clear: () => void;
}

const NONE: ReadonlySet<string> = new Set();

/**
 * What the school's Roles & permissions → Sub-menus setting hides from this user. Kept in a plain store (not a query) so the shared
 * Tabs component can read it anywhere, including screens and tests that have no query client.
 */
export const useSubMenuStore = create<SubMenuState>((set) => ({
  hidden: NONE,
  setHidden: (keys) => set({ hidden: new Set(keys) }),
  clear: () => set({ hidden: NONE }),
}));

export const tabKey = (routeId: string, tab: string) => `${routeId}:${tab}`;
