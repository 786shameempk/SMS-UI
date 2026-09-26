import { useEffect, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";

/** setTimeout clamps at ~24.8 days; longer "remember me" sessions are re-armed on the next check. */
const MAX_TIMER_MS = 2_147_483_647;

/**
 * Signed-in pages only. With no session, or once it runs out, the user goes to /login, which brings
 * them back to the page they were on after signing in again. Sessions end in three ways:
 *  - the remembered session lifetime passes (timer below, re-checked when the tab regains focus),
 *  - an API call returns 401 and the token can't be renewed (lib/httpClient.ts),
 *  - the user signs out.
 */
export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const location = useLocation();
  const token = useAuthStore((s) => s.token);
  const expiresAt = useAuthStore((s) => s.expiresAt);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const sessionValid = Boolean(token && expiresAt && expiresAt > Date.now());

  // Clearing stale auth state is a side effect and must not run during render
  // (it would update the Header, which reads the same store, mid-render).
  useEffect(() => {
    if (token && !sessionValid) clearAuth("expired");
  }, [token, sessionValid, clearAuth]);

  useEffect(() => {
    if (!token || !expiresAt) return;
    const check = () => {
      if (expiresAt <= Date.now()) clearAuth("expired");
    };
    const timer = window.setTimeout(check, Math.min(Math.max(0, expiresAt - Date.now()), MAX_TIMER_MS));
    // A laptop waking from sleep doesn't fire overdue timers promptly, so also check on return to the tab.
    const onVisible = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", check);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", check);
    };
  }, [token, expiresAt, clearAuth]);

  if (!token || !sessionValid) {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}${location.hash}` }} />;
  }
  return <>{children}</>;
}
