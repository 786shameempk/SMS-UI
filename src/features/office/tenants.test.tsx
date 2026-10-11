import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/utils";
import { SchoolAdminsTab } from "./components/SchoolAdminsTab";
import SchoolsPage from "./pages/SchoolsPage";
import { useOfficeStore } from "./store";
import type { SchoolAdmin, UnmanagedTenant } from "./salesTypes";

const api = vi.hoisted(() => ({
  listSchools: vi.fn(),
  createSchool: vi.fn(),
  unmanagedTenants: vi.fn(),
  adoptSchool: vi.fn(),
  schoolAdmins: vi.fn(),
  addSchoolAdmin: vi.fn(),
  replaceSchoolAdmin: vi.fn(),
  resetSchoolAdminPassword: vi.fn(),
  changeSchoolAdminEmail: vi.fn(),
  setSchoolAdminActive: vi.fn(),
}));
vi.mock("./api/sales", () => api);
vi.mock("./api/plans", () => ({ sellablePlans: vi.fn().mockResolvedValue([{ id: "p1", name: "Standard", publishedVersion: 1 }]) }));

const page = <T,>(items: T[]) => ({ items, pageNumber: 1, totalPages: 1, totalCount: items.length, hasPreviousPage: false, hasNextPage: false });
const asUser = (permissions: string[]) =>
  useOfficeStore.setState({ status: "signedIn", user: { id: "u", email: "a@b.c", displayName: "A", roleId: "r", role: "R", permissions, mfaEnabled: false, isActive: true, lastLoginAt: null, mustChangePassword: false } });

beforeEach(() => {
  vi.clearAllMocks();
  api.listSchools.mockResolvedValue(page([]));
});
afterEach(() => useOfficeStore.setState({ status: "signedOut", user: null }));

const legacy: UnmanagedTenant = { tenantId: "tenant-old", schoolName: "Old School", subdomain: "old", status: "Active", planName: "Growth", users: 12, branches: 2, adminEmail: "head@old.test", createdAt: "2026-01-01T00:00:00Z" };

describe("Adopting an existing school", () => {
  it("warns about schools the office does not manage, only to people who control tenants", async () => {
    api.unmanagedTenants.mockResolvedValue([legacy]);
    asUser(["schools.view"]);
    const first = renderWithProviders(<SchoolsPage />);
    await screen.findByText("No schools match");
    expect(screen.queryByRole("button", { name: /Adopt existing school/ })).not.toBeInTheDocument();
    expect(api.unmanagedTenants).not.toHaveBeenCalled();
    first.unmount();

    asUser(["schools.view", "tenants.control"]);
    renderWithProviders(<SchoolsPage />);
    expect(await screen.findByText(/1 school is not managed by the office/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Adopt existing school/ })).toBeInTheDocument();
  });

  it("sends the school, plan and the keep-what-it-has choice", async () => {
    api.unmanagedTenants.mockResolvedValue([legacy]);
    api.adoptSchool.mockResolvedValue({ schoolId: "s9", schoolName: "Old School" });
    asUser(["schools.view", "tenants.control"]);
    renderWithProviders(<SchoolsPage />);
    await userEvent.click(await screen.findByRole("button", { name: /Adopt existing school/ }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("button", { name: "Adopt school" })).toBeDisabled();

    // Radix selects open on pointer events; drive them through the keyboard-free helper in the DOM.
    for (const [label, option] of [["School", "Old School (old)"], ["Office plan", "Standard (v1)"]] as const) {
      await userEvent.click(within(dialog).getByRole("combobox", { name: label }));
      await userEvent.click(await screen.findByRole("option", { name: option }));
    }
    expect(await within(dialog).findByText(/12 users · 2 branches/)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: "Adopt school" }));

    await waitFor(() => expect(api.adoptSchool).toHaveBeenCalledTimes(1));
    expect(api.adoptSchool.mock.calls[0][0]).toMatchObject({ tenantId: "tenant-old", planId: "p1", termMonths: 12, keepCurrentEntitlements: true, autoRenew: true });
  });

  it("says so when there is nothing left to adopt", async () => {
    api.unmanagedTenants.mockResolvedValue([]);
    asUser(["schools.view", "tenants.control"]);
    renderWithProviders(<SchoolsPage />);
    await userEvent.click(await screen.findByRole("button", { name: /Adopt existing school/ }));
    expect(await screen.findByText(/Every school is already managed/)).toBeInTheDocument();
  });
});

const admin = (over: Partial<SchoolAdmin> = {}): SchoolAdmin => ({ id: "a1", email: "head@school.test", name: "Priya Principal", isActive: true, mustChangePassword: false, lastLoginAt: "2026-10-10T00:00:00Z", locked: false, ...over });

describe("School administrators", () => {
  beforeEach(() => api.schoolAdmins.mockResolvedValue([admin()]));

  it("lists the accounts, with actions only for people who control tenants", async () => {
    asUser(["schools.view"]);
    renderWithProviders(<SchoolAdminsTab schoolId="s1" canControl={false} />);
    expect(await screen.findByText("head@school.test", { exact: false })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Add administrator/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Reset password/ })).not.toBeInTheDocument();
  });

  it("resets a password only with a reason", async () => {
    asUser(["tenants.control"]);
    api.resetSchoolAdminPassword.mockResolvedValue(undefined);
    renderWithProviders(<SchoolAdminsTab schoolId="s1" canControl />);
    await userEvent.click(await screen.findByRole("button", { name: "Reset password for head@school.test" }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Reset password" }));
    expect(api.resetSchoolAdminPassword).not.toHaveBeenCalled();
    await userEvent.type(within(dialog).getByLabelText("Reason"), "Locked out");
    await userEvent.click(within(dialog).getByRole("button", { name: "Reset password" }));
    await waitFor(() => expect(api.resetSchoolAdminPassword).toHaveBeenCalledWith("s1", "a1", "Locked out"));
  });

  it("shows the server's refusal when the last administrator cannot be deactivated", async () => {
    asUser(["tenants.control"]);
    api.setSchoolAdminActive.mockRejectedValue({ isAxiosError: true, response: { status: 409, data: { detail: "This is the school's only active administrator." } } });
    renderWithProviders(<SchoolAdminsTab schoolId="s1" canControl />);
    await userEvent.click(await screen.findByRole("button", { name: "Deactivate head@school.test" }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.type(within(dialog).getByLabelText("Reason"), "Left");
    await userEvent.click(within(dialog).getByRole("button", { name: "Deactivate" }));
    await waitFor(() => expect(api.setSchoolAdminActive).toHaveBeenCalledWith("s1", "a1", false, "Left"));
    expect(await within(dialog).findByRole("alert")).toBeInTheDocument();
  });

  it("changes an email and replaces an administrator", async () => {
    asUser(["tenants.control"]);
    api.changeSchoolAdminEmail.mockResolvedValue(admin({ email: "new@school.test" }));
    api.replaceSchoolAdmin.mockResolvedValue(admin({ id: "a2" }));
    const first = renderWithProviders(<SchoolAdminsTab schoolId="s1" canControl />);
    await userEvent.click(await screen.findByRole("button", { name: "Change email for head@school.test" }));
    let dialog = await screen.findByRole("dialog");
    await userEvent.type(within(dialog).getByLabelText("New email"), "new@school.test");
    await userEvent.type(within(dialog).getByLabelText("Reason"), "Changed jobs");
    await userEvent.click(within(dialog).getByRole("button", { name: "Change email" }));
    await waitFor(() => expect(api.changeSchoolAdminEmail).toHaveBeenCalledWith("s1", "a1", "new@school.test", "Changed jobs"));
    first.unmount();

    renderWithProviders(<SchoolAdminsTab schoolId="s1" canControl />);
    await userEvent.click(await screen.findByRole("button", { name: "Replace head@school.test" }));
    dialog = await screen.findByRole("dialog");
    await userEvent.type(within(dialog).getByLabelText("Name"), "Nina New");
    await userEvent.type(within(dialog).getByLabelText("Email"), "nina@school.test");
    await userEvent.type(within(dialog).getByLabelText("Reason"), "Retired");
    await userEvent.click(within(dialog).getByRole("button", { name: "Replace administrator" }));
    await waitFor(() => expect(api.replaceSchoolAdmin).toHaveBeenCalledWith("s1", { userId: "a1", email: "nina@school.test", name: "Nina New", reason: "Retired" }));
  });
});
