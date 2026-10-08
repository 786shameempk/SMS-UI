import { useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { extractApiErrorMessage } from "@/lib/httpClient";
import { useAuthStore } from "@/store/authStore";
import { useUiStore } from "@/store/useUiStore";
import type { DashboardDataSource } from "./dataSource";
import { applyServerWidgets, defaultLayout, resolveLayout, toSavedLayout, type LayoutItem } from "./layout";
import { getDashboardConfig, resetDashboardLayout, saveDashboardLayout, type ServerDashboard } from "./layoutApi";
import type { DashboardWidgetConfig } from "./widgets";

/**
 * The signed-in user's dashboard: which widgets they may have and their layout.
 *
 * With live data the server is the authority: it lists the widgets the user's role, permissions and school allow
 * (the client keeps only those), and stores the layout per user. The last layout is also cached on this device,
 * so if AuthService can't be reached the dashboard still opens the way the user left it. Demo data keeps the
 * layout on this device only, so it works without a backend.
 */
export function useDashboardLayout(clientAvailable: readonly DashboardWidgetConfig[], source: DashboardDataSource) {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id ?? "anon");
  const tenantId = useAuthStore((s) => s.activeTenantId);
  const cached = useUiStore((s) => s.dashboardLayouts[userId]);
  const setCached = useUiStore((s) => s.setDashboardLayout);

  const useServer = source === "live";
  const queryKey = ["dashboard-config", userId, tenantId] as const;
  const config = useQuery({
    queryKey,
    queryFn: getDashboardConfig,
    enabled: useServer,
    staleTime: 5 * 60_000,
    retry: 1,
  });
  const server = useServer ? config.data : undefined;

  const available = useMemo(
    () => (server ? applyServerWidgets(clientAvailable, server.widgets) : [...clientAvailable]),
    [clientAvailable, server],
  );

  const items = useMemo(() => {
    if (server) return resolveLayout(available, server.layout.customized ? toSavedLayout(server.layout.items) : null);
    return resolveLayout(available, cached);
  }, [available, server, cached]);

  const isCustomized = server ? server.layout.customized : cached !== undefined;

  // Keep this device's copy in step with the server's, for when AuthService can't be reached.
  const serverLayout = server?.layout;
  useEffect(() => {
    if (!serverLayout) return;
    setCached(userId, serverLayout.customized ? toSavedLayout(serverLayout.items) : null);
  }, [serverLayout, setCached, userId]);

  const setServerLayout = (layout: ServerDashboard["layout"]) =>
    queryClient.setQueryData<ServerDashboard>(queryKey, (old) => (old ? { ...old, layout } : old));

  const save = useMutation({
    mutationFn: saveDashboardLayout,
    onMutate: (next) => {
      const previous = queryClient.getQueryData<ServerDashboard>(queryKey);
      setServerLayout({ items: next, customized: true, updatedAt: new Date().toISOString() });
      return { previous };
    },
    onSuccess: (layout) => setServerLayout(layout),
    onError: (err, _next, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(queryKey, ctx.previous);
      toast.error(extractApiErrorMessage(err, "Couldn't save your dashboard layout."));
    },
  });

  const reset = useMutation({
    mutationFn: resetDashboardLayout,
    onSuccess: (layout) => setServerLayout(layout),
    onError: (err) => toast.error(extractApiErrorMessage(err, "Couldn't reset your dashboard.")),
  });

  return {
    available,
    items,
    isCustomized,
    /** Live mode: waiting for the server's widget list (don't draw a dashboard the server may narrow). */
    isLoading: useServer && config.isLoading,
    /** Live mode: the server couldn't be reached, so this is the layout cached on this device. */
    isOffline: useServer && config.isError && !config.data,
    isSaving: save.isPending || reset.isPending,
    save: (next: LayoutItem[]) => {
      setCached(userId, toSavedLayout(next));
      if (server) save.mutate(next);
    },
    reset: () => {
      setCached(userId, null);
      if (server) reset.mutate();
    },
    defaults: () => defaultLayout(available),
  };
}
