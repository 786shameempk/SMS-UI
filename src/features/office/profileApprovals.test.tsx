import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/utils";
import ProfileApprovalsPage from "./pages/ProfileApprovalsPage";
import { OFFICE_PAGES } from "./pages/registry";
import { OFFICE_NAV, visibleNav } from "./navigation";
import { useOfficeStore } from "./store";
import type { ProfileQueueItem, ProfileReview } from "./api/onboardingImport";

const api = vi.hoisted(() => ({ profileQueue: vi.fn(), reviewProfile: vi.fn(), approveProfile: vi.fn(), requestProfileChanges: vi.fn(), bulkApproveProfiles: vi.fn() }));
vi.mock("./api/onboardingImport", () => api);
vi.mock("./api/sales", () => ({ listSchools: vi.fn().mockResolvedValue({ items: [{ id: "s1", schoolName: "Green Valley", code: "GV", tenantId: "t1" }] }) }));

const asUser = (permissions: string[]) =>
  useOfficeStore.setState({ status: "signedIn", user: { id: "u", email: "a@b.c", displayName: "A", roleId: "r", role: "R", permissions, mfaEnabled: false, isActive: true, lastLoginAt: null, mustChangePassword: false } });

beforeEach(() => vi.clearAllMocks());
afterEach(() => useOfficeStore.setState({ status: "signedOut", user: null }));

const item = (over: Partial<ProfileQueueItem> = {}): ProfileQueueItem => ({
  profileId: "p1", personType: "staff", personId: "t1", name: "Asha Nair", subtitle: "Teacher · Science", status: "PendingApproval", submittedAt: new Date().toISOString(), version: 1, changeCount: 1, hasProtectedChange: false, ...over,
});

const review = (): ProfileReview => ({
  summary: item(),
  changes: [{ key: "address", label: "Address", protected: false, imported: null, approved: null, current: "12 Lake Road" }, { key: "last_name", label: "Last name", protected: true, imported: "Nair", approved: "Nair", current: "Menon" }],
  details: [{ label: "Employee ID", group: "Identity", value: "T1" }],
  history: [{ kind: "Submitted", at: "2026-10-25T10:00:00Z", by: "asha@school.test", reason: null, version: 1 }],
});

const setup = (permissions: string[], items = [item(), item({ profileId: "p2", name: "Ravi Kumar", personType: "student", hasProtectedChange: true })]) => {
  asUser(permissions);
  api.profileQueue.mockResolvedValue({ items, total: items.length, page: 1, pageSize: 25, counts: { PendingApproval: items.length } });
  api.reviewProfile.mockResolvedValue(review());
  renderWithProviders(<ProfileApprovalsPage />, { route: "/office/profile-approvals?school=s1" });
};

describe("Profile approvals", () => {
  it("is a menu entry only for people who can view profiles", () => {
    expect(OFFICE_PAGES["profile-approvals"]).toBeDefined();
    expect(OFFICE_NAV.find((n) => n.to === "profile-approvals")?.permission).toBe("onboarding.profiles.view");
    const built = new Set(Object.keys(OFFICE_PAGES));
    expect(visibleNav(["onboarding.profiles.view"], built).some((n) => n.to === "profile-approvals")).toBe(true);
    expect(visibleNav(["schools.view"], built).some((n) => n.to === "profile-approvals")).toBe(false);
  });

  it("lists the waiting profiles and flags name or date-of-birth changes", async () => {
    setup(["onboarding.profiles.view"]);
    expect(await screen.findByText("Asha Nair")).toBeInTheDocument();
    expect(screen.getByText("Ravi Kumar")).toBeInTheDocument();
    expect(screen.getByText("Name / DOB")).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("shows the diff in the review and approves with the version it was reviewing", async () => {
    setup(["onboarding.profiles.view", "onboarding.profiles.approve", "onboarding.profiles.request-changes"]);
    api.approveProfile.mockResolvedValue({ profileId: "p1", outcome: "Approved", message: null });
    await userEvent.click((await screen.findAllByRole("button", { name: "Review" }))[0]);

    const dialog = await screen.findByRole("dialog");
    expect(await within(dialog).findByText("12 Lake Road")).toBeInTheDocument();
    expect(within(dialog).getByText("Protected")).toBeInTheDocument();
    expect(within(dialog).getByText("Menon")).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: /Approve/ }));

    await waitFor(() => expect(api.approveProfile).toHaveBeenCalledWith("s1", "p1", 1));
  });

  it("will not request changes without a reason, and sends the reason when given", async () => {
    setup(["onboarding.profiles.view", "onboarding.profiles.request-changes"]);
    api.requestProfileChanges.mockResolvedValue({ profileId: "p1", outcome: "ChangesRequested", message: null });
    await userEvent.click((await screen.findAllByRole("button", { name: "Review" }))[0]);
    const dialog = await screen.findByRole("dialog");
    await userEvent.click(await within(dialog).findByRole("button", { name: /Request changes/ }));

    const ask = (await screen.findAllByRole("dialog")).at(-1)!;
    await userEvent.click(within(ask).getByRole("button", { name: "Send back" }));
    expect(api.requestProfileChanges).not.toHaveBeenCalled();
    await userEvent.type(within(ask).getByLabelText("What needs to change?"), "Add the pin code.");
    await userEvent.click(within(ask).getByRole("button", { name: "Send back" }));

    await waitFor(() => expect(api.requestProfileChanges).toHaveBeenCalledWith("s1", "p1", "Add the pin code.", 1));
  });

  it("offers no decision buttons without the permissions", async () => {
    setup(["onboarding.profiles.view"]);
    await userEvent.click((await screen.findAllByRole("button", { name: "Review" }))[0]);
    const dialog = await screen.findByRole("dialog");
    await within(dialog).findByText("12 Lake Road");
    expect(within(dialog).queryByRole("button", { name: /Approve/ })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: /Request changes/ })).not.toBeInTheDocument();
  });

  it("bulk approves only profiles without protected changes and shows what was skipped", async () => {
    setup(["onboarding.profiles.view", "onboarding.profiles.approve"]);
    api.bulkApproveProfiles.mockResolvedValue([{ profileId: "p1", outcome: "Approved", message: null }, { profileId: "p9", outcome: "Skipped", message: "Last name changed. Review it individually." }]);
    expect(await screen.findAllByRole("checkbox")).toHaveLength(1);

    await userEvent.click(screen.getByRole("button", { name: /Select all without/ }));
    await userEvent.click(screen.getByRole("button", { name: "Approve selected" }));
    await userEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Approve" }));

    await waitFor(() => expect(api.bulkApproveProfiles).toHaveBeenCalledWith("s1", ["p1"]));
    expect(await screen.findByText("Last name changed. Review it individually.")).toBeInTheDocument();
  });
});
