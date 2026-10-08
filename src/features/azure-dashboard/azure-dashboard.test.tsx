import { renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { authHttpClient } from "@/lib/httpClient";
import { useVisibleNav } from "@/components/layouts/useVisibleNav";
import RequireSuperAdmin from "@/routes/RequireSuperAdmin";
import { apiError, renderWithProviders, signIn, signOut, stubClient } from "@/test/utils";
import AzureAlertsPage from "./pages/AzureAlertsPage";
import AzureComputePage from "./pages/AzureComputePage";
import AzureCostPage from "./pages/AzureCostPage";
import AzureDatabasesPage from "./pages/AzureDatabasesPage";
import AzureOverviewPage from "./pages/AzureOverviewPage";
import AzureResourcesPage from "./pages/AzureResourcesPage";
import type { AzureDashboard } from "./types";
import { money, usageLevel } from "./utils";

const base = "GET /api/platform/azure";

const section = <T,>(data: T) => ({ available: true, error: null, data });
const unavailable = (error: string) => ({ available: false, error, data: null });

const overview = (patch: Partial<AzureDashboard> = {}): AzureDashboard => ({
  generatedAt: "2026-10-15T10:00:00Z",
  subscription: section({ id: "sub-1", name: "SchoolSphere", state: "Enabled", tenantId: "t", primaryLocation: "centralindia", resourceCount: 18, resourceGroupCount: 2 }),
  cost: section({ currency: "USD", monthToDate: 47.32, previousMonth: 80, today: 2.1, yesterday: 2.4, forecast: 91.4, monthlyBudget: null, daily: [{ date: "2026-10-01", cost: 2.11 }] }),
  resources: section({ total: 18, byType: { "Virtual machine": 1 } }),
  health: section({ healthy: 16, warning: 1, critical: 1, unknown: 0, resources: [{ resourceId: "/a", resourceName: "vm1", state: "Healthy" as const, azureState: "Available", summary: null, since: null }] }),
  compute: section({ vmCount: 1, running: 1, averageCpuPercent: 38 }),
  sql: section({ serverCount: 1, databaseCount: 5, poolCount: 1, storageUsedGb: 11.8, storageLimitGb: 50, cpuPercent: 23 }),
  storage: section({ accountCount: 1, usedGb: 12.4, containerCount: 4 }),
  containers: section({ registryCount: 1, repositoryCount: 7, storageGb: 4.2 }),
  alerts: section([]),
  ...patch,
});

afterEach(() => {
  signOut();
  vi.restoreAllMocks();
});

describe("RequireSuperAdmin", () => {
  it("opens the area for the platform super admin", () => {
    signIn("superAdmin");
    renderWithProviders(<RequireSuperAdmin><p>azure area</p></RequireSuperAdmin>);
    expect(screen.getByText("azure area")).toBeInTheDocument();
  });

  it.each(["admin", "principal", "teacher", "parent", "student"] as const)("keeps %s out", (role) => {
    signIn(role);
    renderWithProviders(<RequireSuperAdmin><p>azure area</p></RequireSuperAdmin>);
    expect(screen.queryByText("azure area")).not.toBeInTheDocument();
    expect(screen.getByText(/only for the platform administrator/i)).toBeInTheDocument();
  });
});

describe("navigation", () => {
  it("lists Azure Infrastructure for the super admin only - by role, not by a module permission", () => {
    const labels = () => renderHook(() => useVisibleNav()).result.current.sections.flatMap((s) => s.items.map((i) => i.label));

    signIn("superAdmin");
    expect(labels()).toContain("Azure Infrastructure");
    signOut();

    signIn("admin");
    expect(labels()).not.toContain("Azure Infrastructure");
  });
});

describe("usage helpers", () => {
  it.each([[null, "unknown"], [50, "ok"], [70, "ok"], [71, "warning"], [90, "warning"], [91, "critical"]] as const)("usageLevel(%s) is %s", (value, level) => {
    expect(usageLevel(value)).toBe(level);
  });

  it("formats money in Azure's billing currency and shows a dash for unknown", () => {
    expect(money(47.32, "USD")).toBe("$47.32");
    expect(money(null, "USD")).toBe("—");
  });
});

describe("AzureOverviewPage", () => {
  it("shows a loading skeleton, then the cost, resources and health cards", async () => {
    stubClient(authHttpClient, { [`${base}/overview`]: overview() });
    renderWithProviders(<AzureOverviewPage />);

    expect(screen.getAllByLabelText("Loading").length).toBeGreaterThan(0);
    expect(await screen.findByText("$47.32")).toBeInTheDocument();
    expect(screen.getByText("$91.40")).toBeInTheDocument();
    expect(screen.getByText("18")).toBeInTheDocument();
    expect(screen.getByText("16 healthy")).toBeInTheDocument();
    expect(screen.getByText("Last month $80.00")).toBeInTheDocument();
  });

  it("never invents a credit balance", async () => {
    stubClient(authHttpClient, { [`${base}/overview`]: overview() });
    renderWithProviders(<AzureOverviewPage />);

    expect(await screen.findByText("Credit balance isn't exposed through this API")).toBeInTheDocument();
  });

  it("shows a missing forecast as not available", async () => {
    const data = overview();
    data.cost = section({ ...data.cost.data!, forecast: null });
    stubClient(authHttpClient, { [`${base}/overview`]: data });
    renderWithProviders(<AzureOverviewPage />);

    expect(await screen.findByText("Not available")).toBeInTheDocument();
  });

  it("marks only the failing section unavailable (partial failure)", async () => {
    stubClient(authHttpClient, { [`${base}/overview`]: overview({ sql: unavailable("Azure denied access (SQL)") }) });
    renderWithProviders(<AzureOverviewPage />);

    expect(await screen.findByText("SQL data unavailable")).toBeInTheDocument();
    expect(screen.getAllByText("Azure denied access (SQL)").length).toBeGreaterThan(0);
    expect(screen.getByText("$47.32")).toBeInTheDocument();
    expect(screen.getByText("1 VM · 1 running")).toBeInTheDocument();
  });

  it("shows alerts, or an all-clear when there are none", async () => {
    stubClient(authHttpClient, {
      [`${base}/overview`]: overview({ alerts: section([{ severity: "Critical" as const, resourceId: "/a", resource: "pool", message: "Elastic pool storage is 92% full.", category: "Database" }]) }),
    });
    renderWithProviders(<AzureOverviewPage />);
    expect(await screen.findByText("Elastic pool storage is 92% full.")).toBeInTheDocument();
  });

  it("says all is clear with no alerts", async () => {
    stubClient(authHttpClient, { [`${base}/overview`]: overview() });
    renderWithProviders(<AzureOverviewPage />);
    expect(await screen.findByText("All clear")).toBeInTheDocument();
  });

  it("shows Azure's own error with a retry when the whole call fails", async () => {
    stubClient(authHttpClient, {
      [`${base}/overview`]: () => { throw apiError(502, { error: "Couldn't sign in to Azure." }); },
    });
    renderWithProviders(<AzureOverviewPage />);

    expect(await screen.findByText("Azure dashboard unavailable")).toBeInTheDocument();
    expect(screen.getByText("Couldn't sign in to Azure.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });
});

describe("AzureCostPage", () => {
  const cost = { currency: "USD", monthToDate: 60, previousMonth: 100, today: 30, yesterday: 20, forecast: null, monthlyBudget: 100, daily: [] };
  const line = (name: string, c: number, previous: number | null, change: number | null) => ({ key: name, name, type: "microsoft.compute/virtualmachines", resourceGroup: "rg", location: null, cost: c, previousCost: previous, changePercent: change });

  it("shows costs, the monitoring budget, and the per-resource change against last month", async () => {
    stubClient(authHttpClient, {
      [`${base}/cost`]: cost,
      [`${base}/cost/daily`]: [{ date: "2026-10-01", cost: 2 }],
      [`${base}/cost/breakdown`]: { currency: "USD", byResource: [line("SchoolSphere-VM", 78.4, 76.12, 3)], byResourceGroup: [], byService: [], byLocation: [] },
    });
    renderWithProviders(<AzureCostPage />);

    expect(await screen.findByText("SchoolSphere-VM")).toBeInTheDocument();
    expect(screen.getByText("$78.40")).toBeInTheDocument();
    expect(screen.getByText("+3.0%")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: /of \$100\.00/ })).toHaveAttribute("data-level", "ok");
  });

  it("shows an empty state when no cost has been recorded", async () => {
    stubClient(authHttpClient, {
      [`${base}/cost`]: cost,
      [`${base}/cost/daily`]: [],
      [`${base}/cost/breakdown`]: { currency: "USD", byResource: [], byResourceGroup: [], byService: [], byLocation: [] },
    });
    renderWithProviders(<AzureCostPage />);

    expect(await screen.findByText("No cost recorded yet")).toBeInTheDocument();
    expect(await screen.findByText("No cost data for this period")).toBeInTheDocument();
  });

  it("explains a cost failure in the breakdown without breaking the page", async () => {
    stubClient(authHttpClient, {
      [`${base}/cost`]: cost,
      [`${base}/cost/daily`]: [],
      [`${base}/cost/breakdown`]: () => { throw apiError(502, { error: "Azure is rate limiting requests." }); },
    });
    renderWithProviders(<AzureCostPage />);

    expect(await screen.findByText("Cost breakdown unavailable")).toBeInTheDocument();
    expect(screen.getByText("Azure is rate limiting requests.")).toBeInTheDocument();
  });
});

describe("AzureDatabasesPage", () => {
  const pool = { id: "p", name: "SchoolSpherePool", server: "srv", resourceGroup: "rg", location: "centralindia", tier: "Standard", sku: "StandardPool", capacity: 50, databaseCount: 2, storageUsedGb: 46, storageLimitGb: 50, cpuPercent: 23, dataIoPercent: 5, logIoPercent: 1, monthCost: 12.3, databases: ["AuthDB", "FeesDB"] };
  const db = (name: string, used: number | null) => ({ id: name, name, server: "srv", resourceGroup: "rg", location: null, tier: "Standard", sku: null, status: "Online", elasticPool: "SchoolSpherePool", storageUsedGb: used, storageLimitGb: 10, cpuPercent: 12, dataIoPercent: null, logIoPercent: null, monthCost: null });

  it("shows the elastic pool, its databases, and flags storage that is nearly full", async () => {
    stubClient(authHttpClient, {
      [`${base}/databases`]: { servers: [{ id: "s", name: "srv", resourceGroup: "rg", location: "centralindia", state: "Ready", version: "12.0", databaseCount: 2, poolCount: 1 }], pools: [pool], databases: [db("AuthDB", 1.2), db("FeesDB", 9.5)] },
      [`${base}/cost`]: { currency: "USD", monthToDate: 1, previousMonth: null, today: null, yesterday: null, forecast: null, monthlyBudget: null, daily: [] },
    });
    renderWithProviders(<AzureDatabasesPage />);

    expect(await screen.findByText("Elastic pool · SchoolSpherePool")).toBeInTheDocument();
    expect(screen.getAllByText("AuthDB").length).toBeGreaterThan(0);
    const levels = screen.getAllByRole("progressbar").map((bar) => bar.getAttribute("data-level"));
    expect(levels).toContain("critical"); // pool storage 92%
    expect(levels).toContain("critical"); // FeesDB 95%
    expect(levels).toContain("ok"); // AuthDB 12%
  });

  it("copes with unknown usage and a database-only (no pool) setup", async () => {
    stubClient(authHttpClient, {
      [`${base}/databases`]: { servers: [{ id: "s", name: "srv", resourceGroup: "rg", location: null, state: null, version: null, databaseCount: 1, poolCount: 0 }], pools: [], databases: [{ ...db("StudentDB", null), elasticPool: null }] },
      [`${base}/cost`]: { currency: "USD", monthToDate: 1, previousMonth: null, today: null, yesterday: null, forecast: null, monthlyBudget: null, daily: [] },
    });
    renderWithProviders(<AzureDatabasesPage />);

    expect(await screen.findByText("StudentDB")).toBeInTheDocument();
    expect(screen.queryByText(/Elastic pool ·/)).not.toBeInTheDocument();
    expect(screen.getAllByRole("progressbar")[0]).toHaveAttribute("data-level", "unknown");
  });

  it("shows an empty state when there are no SQL servers", async () => {
    stubClient(authHttpClient, { [`${base}/databases`]: { servers: [], pools: [], databases: [] }, [`${base}/cost`]: { currency: "USD", monthToDate: 0, previousMonth: null, today: null, yesterday: null, forecast: null, monthlyBudget: null, daily: [] } });
    renderWithProviders(<AzureDatabasesPage />);

    expect(await screen.findByText("No SQL servers")).toBeInTheDocument();
  });

  it("shows the SQL error with a retry", async () => {
    stubClient(authHttpClient, {
      [`${base}/databases`]: () => { throw apiError(502, { error: "Unable to retrieve SQL metrics." }); },
      [`${base}/cost`]: { currency: "USD", monthToDate: 0, previousMonth: null, today: null, yesterday: null, forecast: null, monthlyBudget: null, daily: [] },
    });
    renderWithProviders(<AzureDatabasesPage />);

    expect(await screen.findByText("Azure SQL data unavailable")).toBeInTheDocument();
    expect(screen.getByText("Unable to retrieve SQL metrics.")).toBeInTheDocument();
  });
});

describe("AzureComputePage", () => {
  const vm = { id: "/vm1", name: "SchoolSphere-VM", resourceGroup: "rg", location: "centralindia", size: "Standard_D2lds_v6", powerState: "Running", osType: "Linux", cpuCount: 2, memoryGb: 4, cpuPercent: 38, networkInBytes: 2048, networkOutBytes: null, diskReadBytes: null, diskWriteBytes: null, availableMemoryGb: 1.5, monthCost: 78.4 };
  const noCost = { currency: "USD", monthToDate: 0, previousMonth: null, today: null, yesterday: null, forecast: null, monthlyBudget: null, daily: [] };

  it("shows the VM with the size Azure reports and its usage", async () => {
    stubClient(authHttpClient, { [`${base}/compute/vms`]: [vm], [`${base}/cost`]: noCost });
    renderWithProviders(<AzureComputePage />);

    expect(await screen.findByText("SchoolSphere-VM")).toBeInTheDocument();
    expect(screen.getByText(/Standard_D2lds_v6/)).toBeInTheDocument();
    expect(screen.getByText("Running")).toBeInTheDocument();
    expect(screen.getByText("2.0 KB")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "CPU (latest)" })).toHaveAttribute("aria-valuenow", "38");
  });

  it("shows an empty state with no VMs", async () => {
    stubClient(authHttpClient, { [`${base}/compute/vms`]: [], [`${base}/cost`]: noCost });
    renderWithProviders(<AzureComputePage />);
    expect(await screen.findByText("No virtual machines")).toBeInTheDocument();
  });
});

describe("AzureResourcesPage", () => {
  const resource = (name: string, typeLabel: string, status: "Healthy" | "Critical") => ({ id: `/subscriptions/s/${name}`, name, type: "t", typeLabel, resourceGroup: "rg", location: "centralindia", sku: null, kind: null, status, tags: {}, monthCost: 1 });

  it("filters resources by search text and type", async () => {
    const user = userEvent.setup();
    stubClient(authHttpClient, {
      [`${base}/resources`]: [resource("vm1", "Virtual machine", "Healthy"), resource("auth-db", "SQL database", "Critical")],
      [`${base}/cost`]: { currency: "USD", monthToDate: 0, previousMonth: null, today: null, yesterday: null, forecast: null, monthlyBudget: null, daily: [] },
    });
    renderWithProviders(<AzureResourcesPage />);

    expect(await screen.findByText("vm1")).toBeInTheDocument();
    expect(screen.getByText("auth-db")).toBeInTheDocument();

    await user.type(screen.getByRole("searchbox"), "auth");
    await waitFor(() => expect(screen.queryByText("vm1")).not.toBeInTheDocument());
    expect(screen.getByText("auth-db")).toBeInTheDocument();

    await user.type(screen.getByRole("searchbox"), "zzz");
    expect(await screen.findByText("No resources match these filters.")).toBeInTheDocument();
  });
});

describe("AzureAlertsPage", () => {
  it("lists alerts with their severity", async () => {
    stubClient(authHttpClient, { [`${base}/alerts`]: [{ severity: "Warning", resourceId: "/a", resource: "vm1", message: "CPU is at 75%.", category: "Compute" }] });
    renderWithProviders(<AzureAlertsPage />);

    expect(await screen.findByText("CPU is at 75%.")).toBeInTheDocument();
    expect(screen.getByText("Warning")).toBeInTheDocument();
  });
});
