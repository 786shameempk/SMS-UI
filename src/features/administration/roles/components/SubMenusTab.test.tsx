import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders, signIn, signOut } from "@/test/utils";
import SubMenusTab from "./SubMenusTab";
import * as rolesApi from "../api";

vi.mock("react-hot-toast", () => ({ default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));
vi.mock("../api", async (original) => ({
  ...(await original<typeof import("../api")>()),
  listRoles: vi.fn(),
  getRolePermissions: vi.fn(),
  getMatrixModules: vi.fn(),
  getRoleSubMenus: vi.fn(),
  setRoleSubMenus: vi.fn(),
  resetRoleSubMenus: vi.fn(),
}));

const role = (id: string, key: string, name: string) => ({ id, key, name, tenantId: "", description: "", isSystem: true, grantsAllBranchAccess: false, createdAt: "" });

describe("SubMenusTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(rolesApi.listRoles).mockResolvedValue([role("t", "teacher", "Teacher"), role("a", "admin", "Administrator")]);
    // The teacher can open Students and Fee Management's menu is off for them.
    vi.mocked(rolesApi.getRolePermissions).mockResolvedValue({ t: ["perm-students-menu", "perm-attendance-menu"], a: [] });
    vi.mocked(rolesApi.getMatrixModules).mockResolvedValue({ modules: ["Students", "Attendance", "Fee Management"], restricted: false, planName: "Pro" });
    vi.mocked(rolesApi.getRoleSubMenus).mockResolvedValue([
      { roleId: "t", hidden: [], configured: false },
      { roleId: "a", hidden: [], configured: false },
    ]);
  });
  afterEach(signOut);

  it("lists only the modules the role can open, with every tab ticked, and saves the unticked ones as hidden", async () => {
    signIn("admin");
    vi.mocked(rolesApi.setRoleSubMenus).mockResolvedValue({ roleId: "t", hidden: ["students.list:admissions"], configured: true });
    const user = userEvent.setup();
    renderWithProviders(<SubMenusTab />);

    expect(await screen.findByText("Student management")).toBeInTheDocument();
    expect(screen.getByText("Attendance management")).toBeInTheDocument();
    expect(screen.queryByText("Fee management")).not.toBeInTheDocument(); // the role can't open Fee Management
    expect(screen.getByRole("checkbox", { name: "Student management: Admissions" })).toBeChecked();
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();

    await user.click(screen.getByRole("checkbox", { name: "Student management: Admissions" }));
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(rolesApi.setRoleSubMenus).toHaveBeenCalledWith("t", ["students.list:admissions"]));
  });

  it("shows the administrator role as locked with every tab on", async () => {
    signIn("admin");
    const user = userEvent.setup();
    renderWithProviders(<SubMenusTab />);
    await screen.findByText("Student management");

    await user.click(screen.getByRole("combobox", { name: "Role" }));
    await user.click(await screen.findByRole("option", { name: "Administrator" }));

    expect(await screen.findByText(/always see every tab/)).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Fee management: Refunds" })).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: "Fee management: Refunds" })).toBeChecked();
    expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
  });

  it("offers to show every tab again for a customised role", async () => {
    signIn("admin");
    vi.mocked(rolesApi.getRoleSubMenus).mockResolvedValue([
      { roleId: "t", hidden: ["students.list:promotion"], configured: true },
      { roleId: "a", hidden: [], configured: false },
    ]);
    vi.mocked(rolesApi.resetRoleSubMenus).mockResolvedValue({ roleId: "t", hidden: [], configured: false });
    const user = userEvent.setup();
    renderWithProviders(<SubMenusTab />);

    expect(await screen.findByText("Customised for this school")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Student management: Promotion & Graduation" })).not.toBeChecked();
    await user.click(screen.getByRole("button", { name: /Show every tab/ }));

    await waitFor(() => expect(rolesApi.resetRoleSubMenus).toHaveBeenCalledWith("t"));
  });
});
