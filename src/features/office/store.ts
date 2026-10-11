import { create } from "zustand";
import { officeHttp, refreshOfficeSession, setOfficeSignedOutHandler, setOfficeToken, withCsrf } from "./api/http";
import type { OfficeAuthResult, OfficeUser } from "./types";

type Status = "loading" | "signedOut" | "signedIn";

interface OfficeState {
  status: Status;
  user: OfficeUser | null;
  /** Why the person was signed out, shown once on the sign-in page. */
  notice: string | null;
  signIn: (result: OfficeAuthResult) => void;
  /** Replaces the profile of the current session (after changing MFA, say) without touching the tokens. */
  setUser: (user: OfficeUser) => void;
  /** Restores a session after a reload from the refresh cookie. Safe to call repeatedly. */
  restore: () => Promise<void>;
  signOut: (notice?: string | null) => Promise<void>;
  clear: (notice?: string | null) => void;
  has: (permission: string) => boolean;
}

/**
 * Who is signed in to the office portal. Intentionally NOT persisted: nothing about the session is written to browser
 * storage. (The access token is in api/http.ts memory, the refresh token is an HttpOnly cookie.)
 */
export const useOfficeStore = create<OfficeState>((set, get) => ({
  status: "loading",
  user: null,
  notice: null,

  signIn: (result) => {
    setOfficeToken(result.accessToken);
    set({ status: "signedIn", user: result.user, notice: null });
  },

  setUser: (user) => set({ user }),

  restore: async () => {
    if (get().status === "signedIn") return;
    const result = await refreshOfficeSession();
    if (result?.status === "authenticated" && result.user) set({ status: "signedIn", user: result.user });
    else set({ status: "signedOut", user: null });
  },

  signOut: async (notice = null) => {
    try {
      await officeHttp.post("auth/logout", null, withCsrf);
    } catch {
      /* the cookie may already be gone; the local session ends either way */
    }
    get().clear(notice);
  },

  clear: (notice = null) => {
    setOfficeToken(null);
    set({ status: "signedOut", user: null, notice });
  },

  has: (permission) => get().user?.permissions.includes(permission) ?? false,
}));

// When a request finds the session can no longer be renewed (revoked, expired, account disabled), end it here too.
setOfficeSignedOutHandler(() => useOfficeStore.getState().clear("Your session has ended. Please sign in again."));

export const useHasOfficePermission = (permission: string) => useOfficeStore((s) => s.user?.permissions.includes(permission) ?? false);
