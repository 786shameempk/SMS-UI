import type { QueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";

/**
 * Cached answers belong to whoever was signed in when they were fetched: what AI features a role may use, its own staff
 * record, payslips, notifications... Signing out and in as someone else must not show them the previous person's data
 * until the cache goes stale (the Insights / AI Features screens did, until a page refresh). So the whole cache is dropped
 * whenever the signed-in user changes, including on sign-out. A token refresh keeps the same user and the cache.
 */
export function clearCacheOnUserChange(queryClient: QueryClient): () => void {
  return useAuthStore.subscribe((state, previous) => {
    if ((state.user?.id ?? null) !== (previous.user?.id ?? null)) queryClient.clear();
  });
}
