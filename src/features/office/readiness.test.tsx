import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/utils";
import { ReadinessCard } from "./components/ReadinessCard";
import { useOfficeStore } from "./store";
import type { ReadinessReport } from "./api/onboardingImport";

const api = vi.hoisted(() => ({ getReadiness: vi.fn(), markSchoolReady: vi.fn(), saveReadinessPolicy: vi.fn() }));
vi.mock("./api/onboardingImport", () => api);

const asUser = (permissions: string[]) =>
  useOfficeStore.setState({ status: "signedIn", user: { id: "u", email: "a@b.c", displayName: "A", roleId: "r", role: "R", permissions, mfaEnabled: false, isActive: true, lastLoginAt: null, mustChangePassword: false } });

beforeEach(() => vi.clearAllMocks());
afterEach(() => useOfficeStore.setState({ status: "signedOut", user: null }));

const policy = { requireCurrentYear: true, requireStructure: true, requireStaffAndStudents: true, requireClassTeachers: false, minStaffProfilesApprovedPercent: 100, minStudentProfilesApprovedPercent: 90, minAccountsActivatedPercent: 80 };

const report = (over: Partial<ReadinessReport> = {}): ReadinessReport => ({
  schoolId: "s1", provisioned: true, ready: true, passed: 2, outstanding: 0, blockers: [], policy,
  checks: [
    { key: "year", label: "A current academic year is set", required: true, passed: true, detail: "Set." },
    { key: "class-teachers", label: "Every section has a class teacher", required: false, passed: false, detail: "3 section(s) have none." },
  ],
  goLive: { stage: "Administrator invited", subscriptionStatus: "Pending", subscriptionId: "sub1", markedReadyAt: null, markedReadyBy: null, canActivate: false }, problem: null, ...over,
});

const ALL = ["onboarding.view", "onboarding.manage", "onboarding.golive.mark-ready", "subscriptions.view"];

describe("Readiness card", () => {
  it("lists every check with its finding and marks optional ones as not required", async () => {
    asUser(ALL);
    api.getReadiness.mockResolvedValue(report());
    renderWithProviders(<ReadinessCard schoolId="s1" />);

    expect(await screen.findByText("A current academic year is set")).toBeInTheDocument();
    expect(screen.getByText("3 section(s) have none.")).toBeInTheDocument();
    expect(screen.getByText("(not required)")).toBeInTheDocument();
    expect(screen.getByText("Ready to be marked")).toBeInTheDocument();
  });

  it("will not let anyone mark a school ready while a required check fails", async () => {
    asUser(ALL);
    api.getReadiness.mockResolvedValue(report({ ready: false, blockers: ["Classes and sections exist"], checks: [{ key: "structure", label: "Classes and sections exist", required: true, passed: false, detail: "No classes yet." }] }));
    renderWithProviders(<ReadinessCard schoolId="s1" />);

    expect(await screen.findByText("1 blocker")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Mark ready for go-live/ })).toBeDisabled();
  });

  it("asks for confirmation before marking ready", async () => {
    asUser(ALL);
    api.getReadiness.mockResolvedValue(report());
    api.markSchoolReady.mockResolvedValue(report());
    renderWithProviders(<ReadinessCard schoolId="s1" />);

    await userEvent.click(await screen.findByRole("button", { name: /Mark ready for go-live/ }));
    expect(api.markSchoolReady).not.toHaveBeenCalled();
    await userEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Mark ready" }));

    await waitFor(() => expect(api.markSchoolReady).toHaveBeenCalledWith("s1"));
  });

  it("after marking, points to the subscription instead of going live itself", async () => {
    asUser(ALL);
    api.getReadiness.mockResolvedValue(report({ goLive: { stage: "Data import and initial setup completed", subscriptionStatus: "Pending", subscriptionId: "sub1", markedReadyAt: "2026-10-25T10:00:00Z", markedReadyBy: "ops@office.test", canActivate: true } }));
    renderWithProviders(<ReadinessCard schoolId="s1" />);

    expect(await screen.findByText("Marked ready")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Go to the subscription/ })).toHaveAttribute("href", "/office/subscriptions/sub1");
    expect(screen.queryByRole("button", { name: /Mark ready for go-live/ })).not.toBeInTheDocument();
  });

  it("hides the actions without the permissions, and saves changed rules", async () => {
    asUser(["onboarding.view"]);
    api.getReadiness.mockResolvedValue(report());
    const { unmount } = renderWithProviders(<ReadinessCard schoolId="s1" />);
    await screen.findByText("Setup status");
    expect(screen.queryByRole("button", { name: /Mark ready/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Readiness rules/ })).not.toBeInTheDocument();
    unmount();

    asUser(ALL);
    api.saveReadinessPolicy.mockResolvedValue(policy);
    renderWithProviders(<ReadinessCard schoolId="s1" />);
    await userEvent.click(await screen.findByRole("button", { name: /Readiness rules/ }));
    const dialog = await screen.findByRole("dialog");
    const staff = within(dialog).getByLabelText("Staff profiles approved (%)");
    await userEvent.clear(staff);
    await userEvent.type(staff, "75");
    await userEvent.click(within(dialog).getByRole("button", { name: "Save rules" }));

    await waitFor(() => expect(api.saveReadinessPolicy).toHaveBeenCalledWith("s1", { ...policy, minStaffProfilesApprovedPercent: 75 }));
  });
});
