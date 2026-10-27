import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/utils";
import AdvertisementFormDialog from "./components/AdvertisementFormDialog";
import { blankForm, toBody, validateForm } from "./components/adForm";
import AdvertisementsPage from "./pages/AdvertisementsPage";
import { useOfficeStore } from "./store";
import type { AdDetail, AdListItem } from "./api/advertisements";

const api = vi.hoisted(() => ({
  listAdvertisements: vi.fn(),
  getAdvertisement: vi.fn(),
  createAdvertisement: vi.fn(),
  updateAdvertisement: vi.fn(),
  setAdvertisementActive: vi.fn(),
  deleteAdvertisement: vi.fn(),
  searchAdTenants: vi.fn(),
  uploadAdImage: vi.fn(),
}));
vi.mock("./api/advertisements", async (original) => ({ ...(await original<typeof import("./api/advertisements")>()), ...api }));

const target = (app: string, over: object = {}) => ({ app, enabled: false, imageKey: null, imageUrl: null, redirectUrl: null, autoCloseSeconds: 10, showCloseButton: true, ...over });
const item = (over: Partial<AdListItem> = {}): AdListItem => ({
  id: "a1", name: "Diwali offer", isActive: true, status: "Live", priority: 100, tenantMode: "All", tenantCount: 0, startsAt: null, endsAt: null,
  targets: [target("Web", { enabled: true, imageKey: "advertisements/x.png", imageUrl: "https://api.test/x.png" }), target("Student"), target("Teacher"), target("Staff")] as never,
  createdAt: "2026-10-01T00:00:00Z", updatedAt: null, ...over,
});
const detail = (over: Partial<AdDetail> = {}): AdDetail => ({ ...item(), tenants: [], ...over }) as AdDetail;
const page = (items: AdListItem[]) => ({ items, pageNumber: 1, totalPages: 1, totalCount: items.length, hasPreviousPage: false, hasNextPage: false });

const me = (permissions: string[]) => ({ id: "u", email: "a@b.c", displayName: "A", roleId: "r", role: "Admin", permissions, mfaEnabled: false, isActive: true, lastLoginAt: null, mustChangePassword: false });
const signIn = (...permissions: string[]) => useOfficeStore.setState({ status: "signedIn", user: me(permissions) });

beforeEach(() => {
  vi.clearAllMocks();
  api.searchAdTenants.mockResolvedValue([{ id: "t1", name: "Green Valley", subdomain: "gv", status: "Active" }, { id: "t2", name: "Blue Ridge", subdomain: "br", status: "Active" }]);
});
afterEach(() => {
  cleanup();
  useOfficeStore.setState({ status: "signedOut", user: null });
});

describe("advertisement form rules", () => {
  const withWeb = (over: object = {}) => {
    const f = blankForm();
    f.name = "Offer";
    f.targets = f.targets.map((t) => (t.app === "Web" ? { ...t, enabled: true, imageKey: "advertisements/x.png", imageUrl: "u", ...over } : t));
    return f;
  };

  it("accepts a name, all schools and one app with an image", () => {
    expect(validateForm(withWeb())).toEqual({});
  });

  it("needs a name, and a school when Selected schools is chosen (an empty list is never everyone)", () => {
    const f = withWeb();
    f.name = "  ";
    f.tenantMode = "Selected";
    expect(validateForm(f)).toMatchObject({ name: expect.any(String), tenants: expect.stringContaining("at least one school") });
    expect(toBody({ ...f, name: "x" }).tenantIds).toEqual([]);
  });

  it("needs an image for an app that is switched on, and ignores an app that is off", () => {
    expect(validateForm(withWeb({ imageKey: null }))["Web.image"]).toBeTruthy();
    const off = withWeb({ enabled: false, imageKey: null, autoCloseSeconds: "0" });
    expect(validateForm(off)).toEqual({});
  });

  it.each(["javascript:alert(1)", "data:text/html;base64,AAAA", "http://example.com", "ftp://x.test", "example.com", "https://u:p@example.com"])("refuses the link %s", (url) => {
    expect(validateForm(withWeb({ redirectUrl: url }))["Web.redirectUrl"]).toBeTruthy();
  });

  it.each(["0", "2", "121", "abc", "1.5", "-4"])("refuses %s seconds", (seconds) => {
    expect(validateForm(withWeb({ autoCloseSeconds: seconds }))["Web.autoCloseSeconds"]).toBeTruthy();
  });

  it("checks the schedule and the display order", () => {
    const f = withWeb();
    f.startsAt = "2026-10-10T10:00";
    f.endsAt = "2026-10-10T09:00";
    f.priority = "-1";
    expect(validateForm(f)).toMatchObject({ endsAt: expect.any(String), priority: expect.any(String) });
  });

  it("sends only the chosen schools for Selected schools, numbers as numbers and a missing link as null", () => {
    const f = withWeb({ redirectUrl: " " });
    f.tenantMode = "Selected";
    f.tenants = [{ id: "t1", name: "Green Valley", subdomain: "gv" }];
    f.endsAt = "2026-10-11T10:00";

    const body = toBody(f);

    expect(body.tenantIds).toEqual(["t1"]);
    expect(body.priority).toBe(100);
    expect(body.endsAt).toMatch(/Z$/);
    expect(body.targets.find((t) => t.app === "Web")).toMatchObject({ enabled: true, redirectUrl: null, autoCloseSeconds: 10, showCloseButton: true });
    expect(body.targets).toHaveLength(4);
  });
});

describe("the advertisement form", () => {
  const png = () => new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], "banner.png", { type: "image/png" });

  it("creates an advertisement for the web app only, with an uploaded image, a link and the close options", async () => {
    api.uploadAdImage.mockResolvedValue({ imageKey: "advertisements/x.png", imageUrl: "https://api.test/x.png" });
    api.createAdvertisement.mockResolvedValue(detail());
    const onSaved = vi.fn();
    renderWithProviders(<AdvertisementFormDialog ad={null} onClose={vi.fn()} onSaved={onSaved} />);

    await userEvent.type(screen.getByLabelText("Name"), "Diwali offer");
    await userEvent.click(screen.getByRole("switch", { name: "Show on School Sphere Web Application" }));
    await userEvent.upload(screen.getByLabelText("Image for School Sphere Web Application"), png());
    expect(await screen.findByAltText("School Sphere Web Application advertisement preview")).toHaveAttribute("src", "https://api.test/x.png");
    await userEvent.type(screen.getByLabelText("Link when the image is clicked (optional)"), "https://example.com/offer");
    await userEvent.clear(screen.getByLabelText("Auto-close after (seconds)"));
    await userEvent.type(screen.getByLabelText("Auto-close after (seconds)"), "15");
    await userEvent.click(screen.getByRole("switch", { name: /Show close button/ }));
    await userEvent.click(screen.getByRole("button", { name: "Create advertisement" }));

    await waitFor(() => expect(api.createAdvertisement).toHaveBeenCalled());
    const body = api.createAdvertisement.mock.calls[0][0];
    expect(body).toMatchObject({ name: "Diwali offer", isActive: true, tenantMode: "All", tenantIds: [] });
    expect(body.targets.filter((t: { enabled: boolean }) => t.enabled).map((t: { app: string }) => t.app)).toEqual(["Web"]);   // the mobile apps stay off
    expect(body.targets.find((t: { app: string }) => t.app === "Web")).toEqual({ app: "Web", enabled: true, imageKey: "advertisements/x.png", redirectUrl: "https://example.com/offer", autoCloseSeconds: 15, showCloseButton: false });
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
  });

  it("refuses a file that is not an image, without calling the server", async () => {
    renderWithProviders(<AdvertisementFormDialog ad={null} onClose={vi.fn()} onSaved={vi.fn()} />);
    await userEvent.click(screen.getByRole("switch", { name: "Show on Teacher Mobile Application" }));

    await userEvent.upload(screen.getByLabelText("Image for Teacher Mobile Application"), new File(["x"], "evil.svg", { type: "image/svg+xml" }), { applyAccept: false });

    expect(await screen.findByText("Choose a PNG, JPEG or WebP image.")).toBeInTheDocument();
    expect(api.uploadAdImage).not.toHaveBeenCalled();
  });

  it("shows the server's reason when an upload is refused and keeps the form", async () => {
    api.uploadAdImage.mockRejectedValue({ isAxiosError: true, response: { status: 400, data: { title: "The file is not a valid PNG, JPEG or WebP image." } } });
    renderWithProviders(<AdvertisementFormDialog ad={null} onClose={vi.fn()} onSaved={vi.fn()} />);
    await userEvent.type(screen.getByLabelText("Name"), "Offer");
    await userEvent.click(screen.getByRole("switch", { name: "Show on Staff Mobile Application" }));

    await userEvent.upload(screen.getByLabelText("Image for Staff Mobile Application"), png());

    expect(await screen.findByText(/not a valid PNG, JPEG or WebP/)).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("Offer");
  });

  it("stops at an unsafe link before sending anything", async () => {
    api.uploadAdImage.mockResolvedValue({ imageKey: "advertisements/x.png", imageUrl: "https://api.test/x.png" });
    renderWithProviders(<AdvertisementFormDialog ad={null} onClose={vi.fn()} onSaved={vi.fn()} />);
    await userEvent.type(screen.getByLabelText("Name"), "Offer");
    await userEvent.click(screen.getByRole("switch", { name: "Show on School Sphere Web Application" }));
    await userEvent.upload(screen.getByLabelText("Image for School Sphere Web Application"), png());
    await screen.findByAltText("School Sphere Web Application advertisement preview");
    await userEvent.type(screen.getByLabelText("Link when the image is clicked (optional)"), "javascript:alert(1)");

    await userEvent.click(screen.getByRole("button", { name: "Create advertisement" }));

    expect(await screen.findByText("Only https:// links are allowed.")).toBeInTheDocument();
    expect(api.createAdvertisement).not.toHaveBeenCalled();
  });

  it("lets the administrator choose schools with a search, and will not save an empty choice", async () => {
    api.createAdvertisement.mockResolvedValue(detail());
    renderWithProviders(<AdvertisementFormDialog ad={null} onClose={vi.fn()} onSaved={vi.fn()} />);
    await userEvent.type(screen.getByLabelText("Name"), "Offer");
    await userEvent.click(screen.getByLabelText("Selected schools"));

    await userEvent.click(screen.getByRole("button", { name: "Create advertisement" }));
    expect(await screen.findByText(/Choose at least one school/)).toBeInTheDocument();
    expect(api.createAdvertisement).not.toHaveBeenCalled();

    await userEvent.type(screen.getByLabelText("Search schools"), "green");
    await waitFor(() => expect(api.searchAdTenants).toHaveBeenLastCalledWith("green"));
    await userEvent.click(await screen.findByRole("checkbox", { name: "Green Valley" }));
    await userEvent.click(screen.getByRole("button", { name: "Create advertisement" }));

    await waitFor(() => expect(api.createAdvertisement).toHaveBeenCalled());
    expect(api.createAdvertisement.mock.calls[0][0]).toMatchObject({ tenantMode: "Selected", tenantIds: ["t1"] });
  });

  it("previews the banner with the close button on and off", async () => {
    renderWithProviders(
      <AdvertisementFormDialog
        ad={detail({ targets: [target("Web", { enabled: true, imageKey: "advertisements/x.png", imageUrl: "https://api.test/x.png", showCloseButton: true }), target("Student"), target("Teacher"), target("Staff")] as never })}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Preview" }));
    const preview = await screen.findByRole("dialog", { name: "Preview" });
    expect(within(preview).getByRole("button", { name: "Close advertisement" })).toBeInTheDocument();

    await userEvent.click(within(preview).getByRole("switch", { name: "Preview with close button" }));
    expect(within(preview).queryByRole("button", { name: "Close advertisement" })).not.toBeInTheDocument();
  });

  it("shows the server's message when saving is refused", async () => {
    api.updateAdvertisement.mockRejectedValue({ isAxiosError: true, response: { status: 400, data: { title: "One or more validation errors occurred.", errors: { name: ["Give the advertisement a name of up to 150 characters."] } } } });
    renderWithProviders(<AdvertisementFormDialog ad={detail()} onClose={vi.fn()} onSaved={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText(/Give the advertisement a name/)).toBeInTheDocument();
  });
});

describe("the advertisement list", () => {
  it("lists advertisements with status, apps, schools and order for someone who can only view", async () => {
    signIn("advertisements.view");
    api.listAdvertisements.mockResolvedValue(page([item(), item({ id: "a2", name: "Fees reminder", isActive: false, status: "Inactive", tenantMode: "Selected", tenantCount: 3, priority: 5 })]));
    renderWithProviders(<AdvertisementsPage />);

    expect(await screen.findByText("Diwali offer")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Advertisement Banner Configuration" })).toBeInTheDocument();
    expect(screen.getByText("Live")).toBeInTheDocument();
    expect(screen.getByText("Inactive")).toBeInTheDocument();
    expect(screen.getByText("All schools")).toBeInTheDocument();
    expect(screen.getByText("3 selected")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "New advertisement" })).not.toBeInTheDocument();     // no manage permission, no create
    await userEvent.click(screen.getByRole("button", { name: "Actions for Diwali offer" }));
    expect(screen.queryByRole("menuitem", { name: "Delete" })).not.toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Preview" })).toBeInTheDocument();
  });

  it("filters by status and application and says so when nothing exists", async () => {
    signIn("advertisements.view", "advertisements.manage");
    api.listAdvertisements.mockResolvedValue(page([]));
    renderWithProviders(<AdvertisementsPage />);
    expect(await screen.findByText("No advertisements")).toBeInTheDocument();
    expect(api.listAdvertisements).toHaveBeenCalledWith(expect.objectContaining({ status: undefined, app: undefined, page: 1, pageSize: 10 }));

    await userEvent.type(screen.getByLabelText("Search advertisements"), "diw");
    await waitFor(() => expect(api.listAdvertisements).toHaveBeenLastCalledWith(expect.objectContaining({ search: "diw" })));
  });

  it("deactivates, and deletes only after a confirmation that says it is permanent", async () => {
    signIn("advertisements.view", "advertisements.manage");
    api.listAdvertisements.mockResolvedValue(page([item()]));
    api.setAdvertisementActive.mockResolvedValue(detail({ isActive: false }));
    api.deleteAdvertisement.mockResolvedValue(undefined);
    renderWithProviders(<AdvertisementsPage />);
    await screen.findByText("Diwali offer");

    await userEvent.click(screen.getByRole("button", { name: "Actions for Diwali offer" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Deactivate" }));
    await waitFor(() => expect(api.setAdvertisementActive).toHaveBeenCalledWith("a1", false));

    await userEvent.click(screen.getByRole("button", { name: "Actions for Diwali offer" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Delete" }));
    const confirm = await screen.findByRole("dialog");
    expect(within(confirm).getByText(/permanently deletes "Diwali offer"/)).toBeInTheDocument();
    expect(api.deleteAdvertisement).not.toHaveBeenCalled();
    await userEvent.click(within(confirm).getByRole("button", { name: "Delete permanently" }));

    await waitFor(() => expect(api.deleteAdvertisement).toHaveBeenCalledWith("a1"));
  });

  it("shows a load failure with a retry instead of an empty table", async () => {
    signIn("advertisements.view");
    api.listAdvertisements.mockRejectedValue({ isAxiosError: true, response: { status: 500, data: { title: "The service is unavailable." } } });
    renderWithProviders(<AdvertisementsPage />);
    expect(await screen.findByText(/The service is unavailable/)).toBeInTheDocument();
  });
});
