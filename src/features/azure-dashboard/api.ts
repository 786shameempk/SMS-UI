import axios from "axios";
import { authHttpClient } from "@/lib/httpClient";
import type {
  AzureAlert,
  AzureDashboard,
  AzureResource,
  AzureSubscription,
  ContainerRegistry,
  CostBreakdown,
  CostOverview,
  DailyCost,
  HealthSummary,
  MetricDefinition,
  MetricSeries,
  ResourceGroup,
  SqlOverview,
  StorageAccount,
  VirtualMachine,
} from "./types";

// SuperAdmin-only, read-only. The browser never talks to Azure: AuthService does, with its own managed identity, and
// returns only these shaped results (Azure's raw responses and tokens never reach the page).

const base = "/api/platform/azure";

async function get<T>(path: string, params?: Record<string, string | number>): Promise<T> {
  const { data } = await authHttpClient.get<T>(`${base}/${path}`, { params });
  return data;
}

/** The backend answers Azure problems with { error } and a 502; show that message instead of a generic one. */
export function azureErrorMessage(error: unknown, fallback = "Couldn't read this from Azure."): string {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as { error?: string } | undefined;
    if (body?.error) return body.error;
    if (error.response?.status === 403) return "Only the platform super admin can open the Azure dashboard.";
    if (!error.response) return "We can't reach the server right now. Check your connection and try again.";
  }
  return fallback;
}

export const getOverview = () => get<AzureDashboard>("overview");
export const getSubscription = () => get<AzureSubscription>("subscription");
export const getCost = () => get<CostOverview>("cost");
export const getDailyCost = (from: string, to: string) => get<DailyCost[]>("cost/daily", { from, to });
export const getCostBreakdown = () => get<CostBreakdown>("cost/breakdown");
export const getResources = () => get<AzureResource[]>("resources");
export const getResourceGroups = () => get<ResourceGroup[]>("resource-groups");
export const getResource = (id: string) => get<AzureResource>("resource", { id });
export const getVirtualMachines = () => get<VirtualMachine[]>("compute/vms");
export const getDatabases = () => get<SqlOverview>("databases");
export const getStorage = () => get<StorageAccount[]>("storage");
export const getContainers = () => get<ContainerRegistry[]>("containers");
export const getHealth = () => get<HealthSummary>("health");
export const getAlerts = () => get<AzureAlert[]>("alerts");
export const getMetricDefinitions = (resourceId: string) => get<MetricDefinition[]>("metrics/definitions", { resourceId });
export const getMetrics = (resourceId: string, metrics: string[], hours: number) =>
  get<MetricSeries[]>("metrics", { resourceId, metrics: metrics.join(","), hours });
