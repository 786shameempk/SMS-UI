import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/utils";
import PlansPage from "./pages/PlansPage";
import { useOfficeStore } from "./store";
import type { Catalog, PlanDetail, PlanListItem, PlanVersion } from "./types";

const api = vi.hoisted(() => ({
  listPlans: vi.fn(),
  getPlan: vi.fn(),
  getCatalog: vi.fn(),
  listAddons: vi.fn(),
  publishPlanVersion: vi.fn(),
  createPlan: vi.fn(),
  archivePlan: vi.fn(),
  restorePlan: vi.fn(),
  deletePlan: vi.fn(),
  newPlanVersion: vi.fn(),
  updatePlanVersion: vi.fn(),
  discardPlanVersion: vi.fn(),
  saveAddon: vi.fn(),
}));
vi.mock("./api/plans", () => api);

const catalog: Catalog = {
  modules: [{ key: "Students", label: "Students", description: null }, { key: "Dashboard", label: "Dashboard", description: null }],
  aiFeatures: [], mobileApps: [], features: [], alwaysIncludedModules: ["Dashboard"],
};

const version = (over: Partial<PlanVersion> = {}): PlanVersion => ({
  id: "v1", versionNumber: 1, status: "Draft", billingCycle: "Annual", cycleMonths: 12, currencyCode: "INR", basePrice: 120000, taxRatePercent: 18, includedStudents: 500, extraStudentPrice: 100,
  maxBranches: 1, extraBranchPrice: 0, maxUsers: 50, storageGb: 50, modules: ["Students"], aiFeatures: [], mobileApps: [], features: [], trialDays: 0, graceDays: 7, autoRenew: true,
  renewalRules: null, upgradePolicy: null, downgradePolicy: null, changeNotes: null, createdAt: "2026-10-01T00:00:00Z", publishedAt: null, ...over,
});

const listItem: PlanListItem = { id: "p1", code: "GROWTH", name: "Growth", description: null, status: "Draft", publishedVersion: null, basePrice: null, billingCycle: null, currencyCode: null, hasDraft: true, versions: 1, createdAt: "2026-10-01T00:00:00Z" };
const detail = (versions: PlanVersion[], status: PlanDetail["status"] = "Draft"): PlanDetail => ({ id: "p1", code: "GROWTH", name: "Growth", description: null, status, versions });

const asUser = (permissions: string[]) =>
  useOfficeStore.setState({ status: "signedIn", user: { id: "u", email: "a@b.c", displayName: "A", roleId: "r", role: "R", permissions, mfaEnabled: false, isActive: true, lastLoginAt: null, mustChangePassword: false } });

beforeEach(() => {
  vi.clearAllMocks();
  api.listPlans.mockResolvedValue({ items: [listItem], pageNumber: 1, totalPages: 1, totalCount: 1, hasPreviousPage: false, hasNextPage: false });
  api.getCatalog.mockResolvedValue(catalog);
  api.listAddons.mockResolvedValue([]);
});
afterEach(() => useOfficeStore.setState({ status: "signedOut", user: null }));

describe("Subscription plans screen", () => {
  it("lists plans, and offers creation only to people who may manage plans", async () => {
    asUser(["plans.view"]);
    renderWithProviders(<PlansPage />);
    expect(await screen.findByText("Growth")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /New plan/ })).not.toBeInTheDocument();
  });

  it("shows New plan to a plan manager", async () => {
    asUser(["plans.view", "plans.manage"]);
    renderWithProviders(<PlansPage />);
    expect(await screen.findByRole("button", { name: /New plan/ })).toBeInTheDocument();
  });

  it("publishes a draft only after a confirmation, and not for someone without the publish permission", async () => {
    asUser(["plans.view", "plans.manage"]);
    api.getPlan.mockResolvedValue(detail([version()]));
    renderWithProviders(<PlansPage />);
    await userEvent.click(await screen.findByRole("button", { name: "Open Growth" }));
    const versions = await screen.findByRole("list", { name: "Versions" });
    expect(within(versions).queryByRole("button", { name: /Publish/ })).not.toBeInTheDocument(); // manage is not publish
  });

  it("asks before publishing, then calls the API once", async () => {
    asUser(["plans.view", "plans.manage", "plans.publish"]);
    api.getPlan.mockResolvedValue(detail([version()]));
    api.publishPlanVersion.mockResolvedValue(version({ status: "Published" }));
    renderWithProviders(<PlansPage />);
    await userEvent.click(await screen.findByRole("button", { name: "Open Growth" }));
    await userEvent.click(await screen.findByRole("button", { name: /Publish/ }));
    expect(api.publishPlanVersion).not.toHaveBeenCalled();
    expect(await screen.findByText(/frozen for good/)).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole("button", { name: "Publish" }).at(-1)!);
    await waitFor(() => expect(api.publishPlanVersion).toHaveBeenCalledWith("p1", "v1"));
    expect(api.publishPlanVersion).toHaveBeenCalledTimes(1);
  });

  it("shows a published version read-only, and offers a new version instead of editing it", async () => {
    asUser(["plans.view", "plans.manage"]);
    api.getPlan.mockResolvedValue(detail([version({ status: "Published", publishedAt: "2026-10-02T00:00:00Z" })], "Active"));
    renderWithProviders(<PlansPage />);
    await userEvent.click(await screen.findByRole("button", { name: "Open Growth" }));
    expect(await screen.findByRole("button", { name: /New version/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "View" }));
    expect((await screen.findAllByText(/Published versions are frozen/)).length).toBeGreaterThan(1);
    expect(screen.getByLabelText("Base price per cycle")).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Save draft" })).not.toBeInTheDocument();
  });

  it("shows the server's validation message when a plan cannot be saved", async () => {
    asUser(["plans.view", "plans.manage"]);
    api.createPlan.mockRejectedValue(Object.assign(new Error("x"), { isAxiosError: true, response: { status: 400, data: { title: "Invalid", errors: { modules: ["Choose at least one module."] } } } }));
    renderWithProviders(<PlansPage />);
    await userEvent.click(await screen.findByRole("button", { name: /New plan/ }));
    await userEvent.type(await screen.findByLabelText("Name"), "Starter");
    await userEvent.type(screen.getByLabelText("Code"), "starter");
    await userEvent.click(screen.getByRole("button", { name: "Create draft" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Choose at least one module.");
  });
});
