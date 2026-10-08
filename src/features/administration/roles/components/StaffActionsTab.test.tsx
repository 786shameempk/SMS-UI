import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders, signIn, signOut } from "@/test/utils";
import StaffActionsTab from "./StaffActionsTab";
import * as rolesApi from "../api";

vi.mock("react-hot-toast", () => ({ default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));
vi.mock("../api", async (original) => ({
  ...(await original<typeof import("../api")>()),
  listRoles: vi.fn(),
  getStaffPermissions: vi.fn(),
  setRoleStaffPermissions: vi.fn(),
  resetRoleStaffPermissions: vi.fn(),
}));

const role = (id: string, key: string, name: string) => ({ id, key, name, tenantId: "", description: "", isSystem: true, grantsAllBranchAccess: false, createdAt: "" });
const catalog = [
  { key: "Library.IssueBook", label: "Issue books", description: "Lend books.", module: "module.library" },
  { key: "Library.ReturnBook", label: "Return books", description: "Check books in.", module: "module.library" },
  { key: "Visitors.CheckIn", label: "Check visitors in", description: "At the gate.", module: "module.visitors" },
];

describe("StaffActionsTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(rolesApi.listRoles).mockResolvedValue([role("l", "librarian", "Librarian"), role("s", "student", "Student"), role("g", "custom-security", "Security")]);
    vi.mocked(rolesApi.getStaffPermissions).mockResolvedValue({
      catalog,
      roles: [
        { roleId: "l", permissions: ["Library.IssueBook", "Library.ReturnBook"], configured: false },
        { roleId: "s", permissions: [], configured: false },
        { roleId: "g", permissions: ["Visitors.CheckIn"], configured: true },
      ],
    });
  });
  afterEach(signOut);

  it("groups actions by module and saves the exact ticked list", async () => {
    signIn("admin");
    vi.mocked(rolesApi.setRoleStaffPermissions).mockResolvedValue({ roleId: "l", permissions: ["Library.IssueBook"], configured: true });
    const user = userEvent.setup();
    renderWithProviders(<StaffActionsTab />);

    expect(await screen.findByText("Using defaults")).toBeInTheDocument();
    expect(screen.getByText("Library")).toBeInTheDocument();
    expect(screen.getByText("Visitor management")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();

    await user.click(screen.getByRole("checkbox", { name: "Return books" }));
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(rolesApi.setRoleStaffPermissions).toHaveBeenCalledWith("l", ["Library.IssueBook"]));
  });

  it("never offers staff actions to family roles, and resets a customised role", async () => {
    signIn("admin");
    vi.mocked(rolesApi.resetRoleStaffPermissions).mockResolvedValue({ roleId: "g", permissions: [], configured: false });
    const user = userEvent.setup();
    renderWithProviders(<StaffActionsTab />);
    await screen.findByText("Using defaults");

    await user.click(screen.getByRole("combobox", { name: "Role" }));
    await user.click(await screen.findByRole("option", { name: "Student" }));
    expect(screen.getByRole("checkbox", { name: "Issue books" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();

    await user.click(screen.getByRole("combobox", { name: "Role" }));
    await user.click(await screen.findByRole("option", { name: "Security" }));
    expect(await screen.findByText("Customised for this school")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Reset to defaults/ }));

    await waitFor(() => expect(rolesApi.resetRoleStaffPermissions).toHaveBeenCalledWith("g"));
  });
});
