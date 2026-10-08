import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { authHttpClient } from "@/lib/httpClient";
import { apiError, renderWithProviders, signIn, signOut, stubClient } from "@/test/utils";
import type { AdminWidgetSetting } from "../layoutApi";
import WidgetManagementTab from "./WidgetManagementTab";

vi.mock("react-hot-toast", () => ({ default: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }) }));

const setting = (over: Partial<AdminWidgetSetting>): AdminWidgetSetting => ({
  id: "stats",
  name: "Key stats",
  catalogRoles: null,
  requiredModule: null,
  allBranchesOnly: false,
  enabled: true,
  allowedRoles: null,
  defaultVisible: true,
  defaultOrder: 10,
  defaultWidth: 12,
  defaultHeight: 1,
  configurable: true,
  refreshInterval: 300,
  customized: false,
  updatedAt: null,
  ...over,
});

const WIDGETS: AdminWidgetSetting[] = [
  setting({}),
  setting({ id: "revenue", name: "Fee revenue", catalogRoles: ["admin", "superAdmin", "principal", "accountant"], requiredModule: "module.fees", defaultOrder: 70, defaultWidth: 8, defaultHeight: 2, refreshInterval: 0 }),
  setting({ id: "notifications", name: "Notifications", defaultOrder: 140, defaultWidth: 4, refreshInterval: 60, enabled: false, customized: true }),
];

describe("WidgetManagementTab", () => {
  beforeEach(() => signIn("admin"));
  afterEach(() => {
    signOut();
    vi.restoreAllMocks();
  });

  it("lists the school's widgets by category with their settings", async () => {
    stubClient(authHttpClient, { "GET /api/dashboard/admin/widgets": WIDGETS });
    renderWithProviders(<WidgetManagementTab />);

    expect(await screen.findByText("Fee revenue")).toBeInTheDocument();
    expect(screen.getByText("2 of 3 widgets on · 1 customized for this school.")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Finance" })).toHaveTextContent("Administrator, Super admin, Principal, Accountant");
    expect(screen.getByRole("switch", { name: "Notifications available in this school" })).not.toBeChecked();
  });

  it("filters by role and search", async () => {
    const user = userEvent.setup();
    stubClient(authHttpClient, { "GET /api/dashboard/admin/widgets": WIDGETS });
    renderWithProviders(<WidgetManagementTab />);
    await screen.findByText("Fee revenue");

    await user.click(within(screen.getByRole("group", { name: "Show widgets for role" })).getByRole("button", { name: "Teacher" }));
    expect(screen.queryByText("Fee revenue")).not.toBeInTheDocument();
    expect(screen.getByText("Key stats")).toBeInTheDocument();

    await user.click(within(screen.getByRole("group", { name: "Show widgets for role" })).getByRole("button", { name: "All roles" }));
    await user.type(screen.getByRole("searchbox", { name: "Search widgets" }), "notif");
    expect(screen.queryByText("Key stats")).not.toBeInTheDocument();
    expect(screen.getByText("Notifications")).toBeInTheDocument();
  });

  it("switches a widget on from the list", async () => {
    const user = userEvent.setup();
    const calls = stubClient(authHttpClient, {
      "GET /api/dashboard/admin/widgets": WIDGETS,
      "PUT /api/dashboard/admin/widgets/notifications": (_: string, body: object) => ({ ...WIDGETS[2], ...body }),
    });
    renderWithProviders(<WidgetManagementTab />);

    await user.click(await screen.findByRole("switch", { name: "Notifications available in this school" }));

    await waitFor(() => expect(screen.getByRole("switch", { name: "Notifications available in this school" })).toBeChecked());
    expect(calls.find((c) => c.method === "PUT")?.body).toMatchObject({ enabled: true, refreshInterval: 60, allowedRoles: null });
  });

  it("edits roles and defaults, narrowing within the catalog", async () => {
    const user = userEvent.setup();
    const calls = stubClient(authHttpClient, {
      "GET /api/dashboard/admin/widgets": WIDGETS,
      "PUT /api/dashboard/admin/widgets/revenue": (_: string, body: object) => ({ ...WIDGETS[1], ...body, customized: true }),
    });
    renderWithProviders(<WidgetManagementTab />);
    await user.click(await screen.findByRole("button", { name: "Edit Fee revenue" }));

    const dialog = await screen.findByRole("dialog", { name: "Fee revenue" });
    const roles = within(dialog).getByRole("group", { name: "Roles that get this widget" });
    // Only the catalog's roles are offered.
    expect(within(roles).getAllByRole("button").map((b) => b.textContent)).toEqual(["Administrator", "Super admin", "Principal", "Accountant"]);
    await user.click(within(roles).getByRole("button", { name: "Accountant" }));
    await user.click(within(dialog).getByRole("switch", { name: "Users can customize it" }));
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(calls.find((c) => c.method === "PUT")?.body).toEqual({
      enabled: true,
      allowedRoles: ["admin", "superAdmin", "principal"],
      defaultVisible: true,
      defaultOrder: 70,
      defaultWidth: 8,
      defaultHeight: 2,
      configurable: false,
      refreshInterval: 0,
    });
  });

  it("won't save a widget with no roles", async () => {
    const user = userEvent.setup();
    stubClient(authHttpClient, { "GET /api/dashboard/admin/widgets": WIDGETS });
    renderWithProviders(<WidgetManagementTab />);
    await user.click(await screen.findByRole("button", { name: "Edit Fee revenue" }));
    const dialog = await screen.findByRole("dialog", { name: "Fee revenue" });
    for (const name of ["Administrator", "Super admin", "Principal", "Accountant"]) {
      await user.click(within(dialog).getByRole("button", { name }));
    }
    expect(within(dialog).getByText("Pick at least one role, or switch the widget off.")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("resets a customized widget and a role's dashboards", async () => {
    const user = userEvent.setup();
    const calls = stubClient(authHttpClient, {
      "GET /api/dashboard/admin/widgets": WIDGETS,
      "DELETE /api/dashboard/admin/widgets/notifications": { ...WIDGETS[2], enabled: true, customized: false },
      "POST /api/dashboard/admin/layouts/reset": { reset: 3 },
    });
    renderWithProviders(<WidgetManagementTab />);

    await user.click(await screen.findByRole("button", { name: "Edit Notifications" }));
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Reset to defaults" }));
    await waitFor(() => expect(screen.getByRole("switch", { name: "Notifications available in this school" })).toBeChecked());

    await user.click(screen.getByRole("button", { name: "Reset a role's dashboards" }));
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Reset dashboards" }));
    await waitFor(() => expect(calls.some((c) => c.method === "POST")).toBe(true));
    expect(calls.find((c) => c.method === "POST")?.body).toEqual({ role: "teacher" });
  });

  it("shows the server's refusal", async () => {
    stubClient(authHttpClient, {
      "GET /api/dashboard/admin/widgets": () => {
        throw apiError(403, { title: "A tenant context is required to manage dashboard widgets." });
      },
    });
    renderWithProviders(<WidgetManagementTab />);
    expect(await screen.findByText("A tenant context is required to manage dashboard widgets.")).toBeInTheDocument();
  });
});
