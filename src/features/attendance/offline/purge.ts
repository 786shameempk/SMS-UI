import { SIGN_OUT_REASON_KEY, useAuthStore } from "@/store/authStore";
import { purgeCache } from "./cache";
import { purgeQueue } from "./queue";

/**
 * Keeps saved attendance data with the person it belongs to:
 * - signing out removes the saved rosters and registers (student names) from this device;
 * - signing out on purpose also removes that person's waiting registers (the sign-out button warns first); a session that
 *   merely expired keeps them, so signing in again sends them;
 * - signing in as someone else removes any saved names that are not theirs.
 */
export function startOfflinePurge(): () => void {
  return useAuthStore.subscribe((state, previous) => {
    const now = state.user?.id ?? null;
    const before = previous.user?.id ?? null;
    if (now === before) return;
    if (before && !now) {
      void purgeCache();
      let expired = false;
      try {
        expired = sessionStorage.getItem(SIGN_OUT_REASON_KEY) === "expired";
      } catch {
        // storage unavailable: treat as a deliberate sign-out
      }
      if (!expired) void purgeQueue(before);
    } else if (now) {
      void purgeCache(now);
    }
  });
}
