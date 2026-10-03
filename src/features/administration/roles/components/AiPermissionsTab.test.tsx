import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders, signIn, signOut } from "@/test/utils";
import AiPermissionsTab from "./AiPermissionsTab";
import * as rolesApi from "../api";

vi.mock("react-hot-toast", () => ({ default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));
vi.mock("../api", async (original) => ({
  ...(await original<typeof import("../api")>()),
  listRoles: vi.fn(),
  getAiPermissions: vi.fn(),
  setRoleAiPermissions: vi.fn(),
  resetRoleAiPermissions: vi.fn(),
}));

const role = (id: string, key: string, name: string) => ({ id, key, name, tenantId: "", description: "", isSystem: true, grantsAllBranchAccess: false, createdAt: "" });
const catalog = [
  { key: "AI.Chat", label: "Ask School AI", description: "Chat", staffOnly: false },
  { key: "AI.ReportCard", label: "Report card remarks", description: "Remarks", staffOnly: true },
];

describe("AiPermissionsTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(rolesApi.listRoles).mockResolvedValue([role("t", "teacher", "Teacher"), role("p", "parent", "Parent")]);
    vi.mocked(rolesApi.getAiPermissions).mockResolvedValue({
      catalog,
      roles: [
        { roleId: "t", permissions: ["AI.Chat", "AI.ReportCard"], configured: false },
        { roleId: "p", permissions: ["AI.Chat"], configured: true },
      ],
    });
  });
  afterEach(signOut);

  it("shows a role's defaults and saves the exact ticked list", async () => {
    signIn("admin");
    vi.mocked(rolesApi.setRoleAiPermissions).mockResolvedValue({ roleId: "t", permissions: ["AI.Chat"], configured: true });
    const user = userEvent.setup();
    renderWithProviders(<AiPermissionsTab />);

    expect(await screen.findByText("Using defaults")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    await user.click(screen.getByRole("checkbox", { name: "Report card remarks" }));
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(rolesApi.setRoleAiPermissions).toHaveBeenCalledWith("t", ["AI.Chat"]));
  });

  it("never offers staff-only AI to parents and can reset a customised role", async () => {
    signIn("admin");
    vi.mocked(rolesApi.resetRoleAiPermissions).mockResolvedValue({ roleId: "p", permissions: ["AI.Chat"], configured: false });
    const user = userEvent.setup();
    renderWithProviders(<AiPermissionsTab />);
    await screen.findByText("Using defaults");

    await user.click(screen.getByRole("combobox", { name: "Role" }));
    await user.click(await screen.findByRole("option", { name: "Parent" }));

    expect(await screen.findByText("Customised for this school")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Report card remarks" })).toBeDisabled();
    expect(screen.getByText("Only for school staff.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /reset to defaults/i }));
    await waitFor(() => expect(rolesApi.resetRoleAiPermissions).toHaveBeenCalledWith("p"));
  });
});
