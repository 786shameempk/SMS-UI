import { useMemo } from "react";
import { useAuthStore } from "@/store/authStore";
import { ANONYMOUS, type Viewer } from "./access";

/** The reader: signed in (role and module permissions) or nobody. An expired session counts as nobody, as the app treats it. */
export function useViewer(): Viewer {
  const signedIn = useAuthStore((s) => Boolean(s.token && s.expiresAt && s.expiresAt > Date.now() && s.user));
  const role = useAuthStore((s) => s.user?.role ?? null);
  const permissions = useAuthStore((s) => s.modulePermissions);
  return useMemo(() => (signedIn ? { role, permissions } : ANONYMOUS), [signedIn, role, permissions]);
}
