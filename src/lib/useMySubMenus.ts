import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { authHttpClient } from "@/lib/httpClient";
import { useAuthStore } from "@/store/authStore";
import { useSubMenuStore } from "@/store/subMenuStore";

/** The tabs the school hides from the signed-in user's roles (Roles & permissions → Sub-menus). */
export const getMySubMenus = async (): Promise<string[]> => (await authHttpClient.get<string[]>("/api/tenant/sub-menus/mine")).data;

/**
 * Loads the signed-in user's hidden tabs into the sub-menu store once the app shell is up, and clears them on sign-out. A failed load
 * leaves every tab visible: this is a display preference, never a reason to lock someone out of a page.
 */
export function useMySubMenus() {
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const query = useQuery({
    queryKey: ["sub-menus", "mine", userId],
    queryFn: getMySubMenus,
    enabled: Boolean(userId),
    staleTime: 5 * 60_000,
    retry: false,
  });

  useEffect(() => {
    if (!userId) useSubMenuStore.getState().clear();
    else if (query.data) useSubMenuStore.getState().setHidden(query.data);
  }, [userId, query.data]);
}
