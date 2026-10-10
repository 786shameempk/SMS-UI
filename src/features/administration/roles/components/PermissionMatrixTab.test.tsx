import userEvent from "@testing-library/user-event";
import { screen, waitFor, within } from "@testing-library/react";
import { renderWithProviders, signIn, signOut } from "@/test/utils";
import PermissionMatrixTab from "./PermissionMatrixTab";
import * as rolesApi from "../api";
import { PERMISSION_CATALOG } from "../constants";

vi.mock("react-hot-toast", () => ({ default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));
vi.mock("../api", async (original) => ({
  ...(await original<typeof import("../api")>()),
  listRoles: vi.fn(),
  getRolePermissions: vi.fn(),
  getMatrixModules: vi.fn(),
  setRolePermission: vi.fn(),
  putRolePermission: vi.fn(),
}));

const role = (id: string, name: string) => ({ id, key: name.toLowerCase(), name, tenantId: "", description: "", isSystem: false, grantsAllBranchAccess: false, createdAt: "" });
const id = (module: string, category = "menu") => PERMISSION_CATALOG.find((p) => p.module === module && p.category === category)!.id;

describe("PermissionMatrixTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signIn("admin");
    vi.mocked(rolesApi.listRoles).mockResolvedValue([role("w", "Warden"), role("m", "Manager")]);
    vi.mocked(rolesApi.getRolePermissions).mockResolvedValue({ w: [id("Hostel Management")], m: [] });
    vi.mocked(rolesApi.getMatrixModules).mockResolvedValue({ restricted: true, planName: "Professional", modules: ["Library Management", "Transport Management", "Hostel Management", "Students"] });
    vi.mocked(rolesApi.putRolePermission).mockResolvedValue();
  });
  afterEach(signOut);

  it("shows only the plan's modules, under their menu groups, with the saved grants ticked", async () => {
    renderWithProviders(<PermissionMatrixTab />);

    const campus = (await screen.findByText("Campus Operations")).closest("tr")!;
    expect(campus).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /Hostel Management.*for Warden/ })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /Hostel Management.*for Manager/ })).not.toBeChecked();
    expect(screen.queryByText("Inventory Management")).not.toBeInTheDocument(); // not in this school's plan
    expect(screen.queryByText("Payroll")).not.toBeInTheDocument();
  });

  it("grants every shown permission to a role in one step, changing only what is not already granted", async () => {
    const user = userEvent.setup();
    renderWithProviders(<PermissionMatrixTab />);
    await screen.findByText("Campus Operations");

    await user.click(screen.getByRole("button", { name: /Grant every .* permission shown to Warden/ }));

    await waitFor(() => expect(rolesApi.putRolePermission).toHaveBeenCalledTimes(3));
    const changed = vi.mocked(rolesApi.putRolePermission).mock.calls.map((c) => c[1]).sort();
    expect(changed).toEqual([id("Library Management"), id("Students"), id("Transport Management")].sort());
    expect(vi.mocked(rolesApi.putRolePermission).mock.calls.every((c) => c[0] === "w" && c[2] === true)).toBe(true);
  });

  it("clears a role's shown permissions, and reports ones the server refused", async () => {
    const user = userEvent.setup();
    const toast = (await import("react-hot-toast")).default;
    vi.mocked(rolesApi.putRolePermission).mockRejectedValueOnce(new Error("protected"));
    renderWithProviders(<PermissionMatrixTab />);
    await screen.findByText("Campus Operations");

    await user.click(screen.getByRole("button", { name: /Clear every .* permission shown for Warden/ }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("1 could not be changed")));
    expect(rolesApi.putRolePermission).toHaveBeenCalledWith("w", id("Hostel Management"), false);
  });

  it("saves a single tick through the same change the server checks", async () => {
    const user = userEvent.setup();
    vi.mocked(rolesApi.setRolePermission).mockResolvedValue({ w: [id("Hostel Management")], m: [id("Transport Management")] });
    renderWithProviders(<PermissionMatrixTab />);
    const row = (await screen.findByText("Transport Management")).closest("tr")!;

    await user.click(within(row).getByRole("checkbox", { name: /for Manager/ }));

    expect(rolesApi.setRolePermission).toHaveBeenCalledWith("m", id("Transport Management"), true);
  });
});
