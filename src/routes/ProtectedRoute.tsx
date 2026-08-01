import { useEffect, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const token = useAuthStore((s) => s.token);
  const isSessionValid = useAuthStore((s) => s.isSessionValid);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const sessionValid = token ? isSessionValid() : false;

  // Clearing stale auth state is a side effect and must not run during render
  // (it would update the Header, which reads the same store, mid-render).
  useEffect(() => {
    if (token && !sessionValid) clearAuth();
  }, [token, sessionValid, clearAuth]);

  if (!token || !sessionValid) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
