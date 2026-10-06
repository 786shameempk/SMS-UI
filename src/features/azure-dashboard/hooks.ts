import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "./api";

/**
 * Azure data changes slowly and every read is cached server-side (cost 30 min, metrics 5 min), so the page doesn't
 * poll aggressively: data is fresh for a minute and the overview re-fetches itself every five minutes.
 */
export const AUTO_REFRESH_MS = 5 * 60 * 1000;
const STALE_MS = 60 * 1000;

const key = (...parts: unknown[]) => ["azure", ...parts] as const;

const options = { staleTime: STALE_MS, retry: 1 } as const;

export const useAzureOverview = () =>
  useQuery({ queryKey: key("overview"), queryFn: api.getOverview, refetchInterval: AUTO_REFRESH_MS, ...options });
export const useAzureCost = () => useQuery({ queryKey: key("cost"), queryFn: api.getCost, ...options });
export const useAzureDailyCost = (from: string, to: string) =>
  useQuery({ queryKey: key("cost", "daily", from, to), queryFn: () => api.getDailyCost(from, to), ...options });
export const useAzureCostBreakdown = () => useQuery({ queryKey: key("cost", "breakdown"), queryFn: api.getCostBreakdown, ...options });
export const useAzureResources = () => useQuery({ queryKey: key("resources"), queryFn: api.getResources, ...options });
export const useAzureResourceGroups = () => useQuery({ queryKey: key("resource-groups"), queryFn: api.getResourceGroups, ...options });
export const useAzureResource = (id: string) =>
  useQuery({ queryKey: key("resource", id), queryFn: () => api.getResource(id), enabled: id.length > 0, ...options });
export const useAzureVirtualMachines = () => useQuery({ queryKey: key("vms"), queryFn: api.getVirtualMachines, ...options });
export const useAzureDatabases = () => useQuery({ queryKey: key("databases"), queryFn: api.getDatabases, ...options });
export const useAzureStorage = () => useQuery({ queryKey: key("storage"), queryFn: api.getStorage, ...options });
export const useAzureContainers = () => useQuery({ queryKey: key("containers"), queryFn: api.getContainers, ...options });
export const useAzureHealth = () => useQuery({ queryKey: key("health"), queryFn: api.getHealth, ...options });
export const useAzureAlerts = () => useQuery({ queryKey: key("alerts"), queryFn: api.getAlerts, ...options });
export const useAzureMetricDefinitions = (resourceId: string) =>
  useQuery({ queryKey: key("metric-defs", resourceId), queryFn: () => api.getMetricDefinitions(resourceId), enabled: resourceId.length > 0, ...options });
export const useAzureMetrics = (resourceId: string, metrics: string[], hours: number) =>
  useQuery({
    queryKey: key("metrics", resourceId, metrics.join(","), hours),
    queryFn: () => api.getMetrics(resourceId, metrics, hours),
    enabled: resourceId.length > 0 && metrics.length > 0,
    ...options,
  });

/** Re-fetches every Azure query in place (no page reload). The server's own cache still applies. */
export function useRefreshAzure() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["azure"] });
}
