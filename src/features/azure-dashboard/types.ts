// Mirrors AuthService's AzureDashboard DTOs (GET /api/platform/azure/*). Every figure comes from Azure itself; null = Azure
// doesn't expose it (or the call was denied), never an estimate.

export interface AzureSection<T> {
  available: boolean;
  error: string | null;
  data: T | null;
}

export interface AzureSubscription {
  id: string;
  name: string | null;
  state: string | null;
  tenantId: string | null;
  primaryLocation: string | null;
  resourceCount: number;
  resourceGroupCount: number;
}

export interface DailyCost {
  date: string;
  cost: number;
}

export interface CostOverview {
  currency: string;
  monthToDate: number;
  previousMonth: number | null;
  today: number | null;
  yesterday: number | null;
  forecast: number | null;
  monthlyBudget: number | null;
  daily: DailyCost[];
}

export interface CostLine {
  key: string;
  name: string;
  type: string | null;
  resourceGroup: string | null;
  location: string | null;
  cost: number;
  previousCost: number | null;
  changePercent: number | null;
}

export interface CostBreakdown {
  currency: string;
  byResource: CostLine[];
  byResourceGroup: CostLine[];
  byService: CostLine[];
  byLocation: CostLine[];
}

export type HealthState = "Healthy" | "Warning" | "Critical" | "Unknown";

export interface AzureResource {
  id: string;
  name: string;
  type: string;
  typeLabel: string;
  resourceGroup: string;
  location: string | null;
  sku: string | null;
  kind: string | null;
  status: HealthState;
  tags: Record<string, string>;
  monthCost: number | null;
}

export interface ResourceGroup {
  name: string;
  location: string | null;
  provisioningState: string | null;
  resourceCount: number;
  monthCost: number | null;
}

export interface MetricPoint {
  time: string;
  average: number | null;
  maximum: number | null;
  total: number | null;
}

export interface MetricSeries {
  name: string;
  unit: string | null;
  points: MetricPoint[];
  latestAverage: number | null;
  latestMaximum: number | null;
  totalSum: number | null;
}

export interface MetricDefinition {
  name: string;
  displayName: string;
  unit: string | null;
}

export interface VirtualMachine {
  id: string;
  name: string;
  resourceGroup: string;
  location: string | null;
  size: string | null;
  powerState: string | null;
  osType: string | null;
  cpuCount: number | null;
  memoryGb: number | null;
  cpuPercent: number | null;
  networkInBytes: number | null;
  networkOutBytes: number | null;
  diskReadBytes: number | null;
  diskWriteBytes: number | null;
  availableMemoryGb: number | null;
  monthCost: number | null;
}

export interface SqlServer {
  id: string;
  name: string;
  resourceGroup: string;
  location: string | null;
  state: string | null;
  version: string | null;
  databaseCount: number;
  poolCount: number;
}

export interface SqlDatabase {
  id: string;
  name: string;
  server: string;
  resourceGroup: string;
  location: string | null;
  tier: string | null;
  sku: string | null;
  status: string | null;
  elasticPool: string | null;
  storageUsedGb: number | null;
  storageLimitGb: number | null;
  cpuPercent: number | null;
  dataIoPercent: number | null;
  logIoPercent: number | null;
  monthCost: number | null;
}

export interface SqlElasticPool {
  id: string;
  name: string;
  server: string;
  resourceGroup: string;
  location: string | null;
  tier: string | null;
  sku: string | null;
  capacity: number | null;
  databaseCount: number;
  storageUsedGb: number | null;
  storageLimitGb: number | null;
  cpuPercent: number | null;
  dataIoPercent: number | null;
  logIoPercent: number | null;
  monthCost: number | null;
  databases: string[];
}

export interface SqlOverview {
  servers: SqlServer[];
  pools: SqlElasticPool[];
  databases: SqlDatabase[];
}

export interface StorageAccount {
  id: string;
  name: string;
  resourceGroup: string;
  location: string | null;
  sku: string | null;
  kind: string | null;
  usedGb: number | null;
  blobGb: number | null;
  blobCount: number | null;
  containerCount: number | null;
  containers: string[];
  monthCost: number | null;
}

export interface RegistryRepository {
  name: string;
  tagCount: number | null;
  latestTag: string | null;
  lastUpdated: string | null;
}

export interface ContainerRegistry {
  id: string;
  name: string;
  resourceGroup: string;
  location: string | null;
  sku: string | null;
  loginServer: string | null;
  storageGb: number | null;
  repositoryCount: number | null;
  imageCount: number | null;
  repositories: RegistryRepository[];
  repositoriesNote: string | null;
  monthCost: number | null;
}

export interface ResourceHealth {
  resourceId: string;
  resourceName: string;
  state: HealthState;
  azureState: string;
  summary: string | null;
  since: string | null;
}

export interface HealthSummary {
  healthy: number;
  warning: number;
  critical: number;
  unknown: number;
  resources: ResourceHealth[];
}

export type AlertSeverity = "Critical" | "Warning";

export interface AzureAlert {
  severity: AlertSeverity;
  resourceId: string | null;
  resource: string;
  message: string;
  category: string;
}

export interface AzureDashboard {
  generatedAt: string;
  subscription: AzureSection<AzureSubscription>;
  cost: AzureSection<CostOverview>;
  resources: AzureSection<{ total: number; byType: Record<string, number> }>;
  health: AzureSection<HealthSummary>;
  compute: AzureSection<{ vmCount: number; running: number; averageCpuPercent: number | null }>;
  sql: AzureSection<{
    serverCount: number;
    databaseCount: number;
    poolCount: number;
    storageUsedGb: number | null;
    storageLimitGb: number | null;
    cpuPercent: number | null;
  }>;
  storage: AzureSection<{ accountCount: number; usedGb: number | null; containerCount: number | null }>;
  containers: AzureSection<{ registryCount: number; repositoryCount: number | null; storageGb: number | null }>;
  alerts: AzureSection<AzureAlert[]>;
}
