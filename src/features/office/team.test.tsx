import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/utils";
import OfficeRolesPage from "./pages/OfficeRolesPage";
import SecurityPage from "./pages/SecurityPage";
import { useOfficeStore } from "./store";

const auth = vi.hoisted(() => ({
  changeOwnPassword: vi.fn(),
  beginMfaEnrollment: vi.fn(),
  confirmMfaEnrollment: vi.fn(),
  disableMfa: vi.fn(),
  getMe: vi.fn(),
  logoutEverywhere: vi.fn(),
}));
const team = vi.hoisted(() => ({
  listOfficeRoles: vi.fn(),
  listOfficePermissions: vi.fn(),
  saveOfficeRole: vi.fn(),
  deleteOfficeRole: vi.fn(),
}));
vi.mock("./api/auth", () => auth);
vi.mock("./api/team", () => team);

const me = (over: Partial<{ permissions: string[]; mfaEnabled: boolean }> = {}) => ({
  id: "u", email: "a@b.c", displayName: "A", roleId: "r", role: "Admin", permissions: [], mfaEnabled: false, isActive: true, lastLoginAt: null, mustChangePassword: false, ...over,
});
const signIn = (over?: Parameters<typeof me>[0]) => useOfficeStore.setState({ status: "signedIn", user: me(over) });

beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  cleanup();
  useOfficeStore.setState({ status: "signedOut", user: null });
});

describe("My security", () => {
  it("will not change the password when the confirmation differs, and sends nothing", async () => {
    signIn();
    renderWithProviders(<SecurityPage />);
    await userEvent.type(screen.getByLabelText("Current password"), "old-Password1!");
    await userEvent.type(screen.getByLabelText("New password"), "New-Password1!");
    await userEvent.type(screen.getByLabelText("Confirm new password"), "Different1!");
    await userEvent.click(screen.getByRole("button", { name: "Change password" }));
    expect(await screen.findByText("The two passwords do not match.")).toBeInTheDocument();
    expect(auth.changeOwnPassword).not.toHaveBeenCalled();
  });

  it("changes the password and clears the fields", async () => {
    auth.changeOwnPassword.mockResolvedValue(undefined);
    signIn();
    renderWithProviders(<SecurityPage />);
    await userEvent.type(screen.getByLabelText("Current password"), "old-Password1!");
    await userEvent.type(screen.getByLabelText("New password"), "New-Password1!");
    await userEvent.type(screen.getByLabelText("Confirm new password"), "New-Password1!");
    await userEvent.click(screen.getByRole("button", { name: "Change password" }));
    await waitFor(() => expect(auth.changeOwnPassword).toHaveBeenCalledWith("old-Password1!", "New-Password1!"));
    await waitFor(() => expect(screen.getByLabelText("Current password")).toHaveValue(""));
  });

  it("shows the reason the server gave when the current password is wrong", async () => {
    auth.changeOwnPassword.mockRejectedValue(Object.assign(new Error("x"), { isAxiosError: true, response: { status: 400, data: { title: "Current password is incorrect." } } }));
    signIn();
    renderWithProviders(<SecurityPage />);
    await userEvent.type(screen.getByLabelText("Current password"), "nope");
    await userEvent.type(screen.getByLabelText("New password"), "New-Password1!");
    await userEvent.type(screen.getByLabelText("Confirm new password"), "New-Password1!");
    await userEvent.click(screen.getByRole("button", { name: "Change password" }));
    expect(await screen.findByText(/incorrect/i)).toBeInTheDocument();
  });

  it("enrols two-step verification: shows the key, needs a 6-digit code, then refreshes the profile", async () => {
    auth.beginMfaEnrollment.mockResolvedValue({ secret: "JBSWY3DPEHPK3PXP", otpAuthUri: "otpauth://x" });
    auth.confirmMfaEnrollment.mockResolvedValue(undefined);
    auth.getMe.mockResolvedValue(me({ mfaEnabled: true }));
    signIn();
    renderWithProviders(<SecurityPage />);
    await userEvent.click(screen.getByRole("button", { name: /Set up two-step verification/ }));
    expect(await screen.findByTestId("mfa-secret")).toHaveTextContent("JBSWY3DPEHPK3PXP");
    const turnOn = screen.getByRole("button", { name: "Turn on" });
    expect(turnOn).toBeDisabled();
    await userEvent.type(screen.getByLabelText("6-digit code"), "123 456");
    expect(turnOn).toBeEnabled();
    await userEvent.click(turnOn);
    await waitFor(() => expect(auth.confirmMfaEnrollment).toHaveBeenCalledWith("123 456"));
    await waitFor(() => expect(useOfficeStore.getState().user?.mfaEnabled).toBe(true));
  });

  it("turning it off needs the password and a current code", async () => {
    auth.disableMfa.mockResolvedValue(undefined);
    auth.getMe.mockResolvedValue(me({ mfaEnabled: false }));
    signIn({ mfaEnabled: true });
    renderWithProviders(<SecurityPage />);
    const off = screen.getByRole("button", { name: "Turn off" });
    expect(off).toBeDisabled();
    await userEvent.type(screen.getByLabelText("Password"), "Pass-word1!");
    await userEvent.type(screen.getByLabelText("Current code"), "654321");
    await userEvent.click(off);
    await waitFor(() => expect(auth.disableMfa).toHaveBeenCalledWith("Pass-word1!", "654321"));
  });
});

describe("Roles & permissions", () => {
  const roles = [
    { id: "r1", name: "Super Admin", description: "Everything", isSystem: true, permissions: ["schools.view"], users: 1 },
    { id: "r2", name: "Sales", description: null, isSystem: false, permissions: ["schools.view", "quotations.manage"], users: 3 },
  ];
  const catalog = [
    { key: "schools.view", group: "Schools", label: "View schools" },
    { key: "quotations.manage", group: "Sales", label: "Manage quotations" },
  ];
  beforeEach(() => {
    team.listOfficeRoles.mockResolvedValue(roles);
    team.listOfficePermissions.mockResolvedValue(catalog);
  });

  it("lists roles with friendly permission names; built-in roles cannot be edited", async () => {
    signIn({ permissions: ["roles.manage"] });
    renderWithProviders(<OfficeRolesPage />);
    const list = await screen.findByRole("list", { name: "Sales permissions" });
    expect(within(list).getByText("Manage quotations")).toBeInTheDocument();
    expect(screen.getByText("3 users")).toBeInTheDocument();
    expect(screen.getByText("Built-in")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Edit/ })).toHaveLength(1);
  });

  it("people without roles.manage see the roles but no controls", async () => {
    signIn({ permissions: ["schools.view"] });
    renderWithProviders(<OfficeRolesPage />);
    await screen.findByText("Sales");
    expect(screen.queryByRole("button", { name: /New role/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Edit/ })).not.toBeInTheDocument();
  });

  it("deleting a role asks first, then deletes it", async () => {
    team.deleteOfficeRole.mockResolvedValue(undefined);
    signIn({ permissions: ["roles.manage"] });
    renderWithProviders(<OfficeRolesPage />);
    await userEvent.click(await screen.findByRole("button", { name: /Delete/ }));
    expect(team.deleteOfficeRole).not.toHaveBeenCalled();
    await userEvent.click(await screen.findByRole("button", { name: "Delete role" }));
    await waitFor(() => expect(team.deleteOfficeRole).toHaveBeenCalledWith("r2"));
  });
});
