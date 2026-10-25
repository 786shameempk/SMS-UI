import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/utils";
import BulkImportPage from "./pages/BulkImportPage";
import { OFFICE_PAGES } from "./pages/registry";
import { OFFICE_NAV, visibleNav } from "./navigation";
import { useOfficeStore } from "./store";
import type { ImportBatch, ImportDetail, ImportTemplate } from "./api/onboardingImport";

const api = vi.hoisted(() => ({
  listImportTemplates: vi.fn(),
  schoolImportStatus: vi.fn(),
  importHistory: vi.fn(),
  importDetail: vi.fn(),
  uploadImport: vi.fn(),
  confirmImport: vi.fn(),
  discardImport: vi.fn(),
  downloadTemplate: vi.fn(),
  downloadErrorReport: vi.fn(),
  listInvitations: vi.fn(),
  resendInvitation: vi.fn(),
}));
vi.mock("./api/onboardingImport", () => api);
vi.mock("./api/sales", () => ({
  listSchools: vi.fn().mockResolvedValue({
    items: [
      { id: "s1", schoolName: "Green Valley", code: "GV", tenantId: "t1" },
      { id: "s2", schoolName: "Lead School", code: "LS", tenantId: null },
    ],
  }),
}));

const asUser = (permissions: string[]) =>
  useOfficeStore.setState({ status: "signedIn", user: { id: "u", email: "a@b.c", displayName: "A", roleId: "r", role: "R", permissions, mfaEnabled: false, isActive: true, lastLoginAt: null, mustChangePassword: false } });

beforeEach(() => vi.clearAllMocks());
afterEach(() => useOfficeStore.setState({ status: "signedOut", user: null }));

const template: ImportTemplate = {
  type: "academic-years", label: "Academic years", order: 1, description: "The school years.", dependsOn: [],
  columns: [{ name: "name", required: true, description: "Name", example: "2026-27" }],
};

const batch = (over: Partial<ImportBatch> = {}): ImportBatch => ({
  id: "b1", schoolId: "s1", type: "academic-years", fileName: "years.csv", status: "Validated", totalRows: 3, validRows: 1, reusedRows: 1, errorRows: 1, createdCount: 0, reusedCount: 0, rejectedCount: 0,
  uploadedByEmail: "ops@x.test", uploadedAt: "2026-10-25T10:00:00Z", confirmedByEmail: null, confirmedAt: null, completedAt: null, ...over,
});

const detail = (over: Partial<ImportBatch> = {}): ImportDetail => ({
  batch: batch(over),
  rows: {
    items: [
      { line: 2, status: "Ok", outcome: null, messages: [], data: { name: "2026-27" } },
      { line: 3, status: "Reuse", outcome: null, messages: [], data: { name: "2025-26" } },
      { line: 4, status: "Error", outcome: null, messages: ["name is required."], data: { name: "" } },
    ],
    pageNumber: 1, totalPages: 1, totalCount: 3, hasPreviousPage: false, hasNextPage: false,
  },
});

const invite = (over = {}) => ({
  id: "i1", name: "Asha Nair", email: "asha@school.test", role: "teacher", accountStatus: "InvitationFailed", sendCount: 1, lastSentAt: "2026-10-25T10:00:00Z", lastError: "SMTP is down", lastLoginAt: null, createdAt: "2026-10-25T10:00:00Z", ...over,
});

const setup = (permissions: string[]) => {
  asUser(permissions);
  api.listImportTemplates.mockResolvedValue([template]);
  api.schoolImportStatus.mockResolvedValue({ schoolId: "s1", schoolName: "Green Valley", tenantId: "t1", provisioned: true, existing: { academicYears: 1, classes: 0, sections: 0, staff: 2, students: 3 }, problem: null });
  api.importHistory.mockResolvedValue([batch()]);
  api.importDetail.mockResolvedValue(detail());
  api.listInvitations.mockResolvedValue({ page: { items: [invite()], pageNumber: 1, totalPages: 1, totalCount: 1, hasPreviousPage: false, hasNextPage: false }, totals: { InvitationFailed: 1 } });
  renderWithProviders(<BulkImportPage />, { route: "/office/bulk-import?school=s1" });
};

describe("Bulk import page", () => {
  it("is in the menu only for people who can view imports, and is a built page", () => {
    expect(OFFICE_PAGES["bulk-import"]).toBeDefined();
    expect(OFFICE_NAV.find((n) => n.to === "bulk-import")?.permission).toBe("onboarding.import.view");
    const implemented = new Set(Object.keys(OFFICE_PAGES));
    expect(visibleNav(["onboarding.import.view"], implemented).some((n) => n.to === "bulk-import")).toBe(true);
    expect(visibleNav(["schools.view"], implemented).some((n) => n.to === "bulk-import")).toBe(false);
  });

  it("shows the templates in order with their columns and the school's existing counts", async () => {
    setup(["onboarding.import.view", "onboarding.import.upload"]);
    expect(await screen.findByText("1. Academic years")).toBeInTheDocument();
    expect(screen.getByText("name")).toBeInTheDocument();
    expect(await screen.findByText("Academic years", { selector: "p, div, span" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Download template/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Upload and check/ })).toBeInTheDocument();
  });

  it("hides upload and confirm from a view-only user", async () => {
    setup(["onboarding.import.view"]);
    await screen.findByText("1. Academic years");
    expect(screen.queryByRole("button", { name: /Upload and check/ })).not.toBeInTheDocument();
    await userEvent.click(await screen.findByRole("button", { name: "Open" }));
    await screen.findByText("name is required.");
    expect(screen.queryByRole("button", { name: /Confirm import/ })).not.toBeInTheDocument();
  });

  it("previews every row and makes the user acknowledge errors before confirming", async () => {
    setup(["onboarding.import.view", "onboarding.import.upload", "onboarding.import.confirm"]);
    api.confirmImport.mockResolvedValue(detail({ status: "Completed", createdCount: 1, reusedCount: 1, rejectedCount: 1 }));
    await userEvent.click(await screen.findByRole("button", { name: "Open" }));

    expect(await screen.findByText("name is required.")).toBeInTheDocument();
    const confirm = screen.getByRole("button", { name: /Confirm import/ });
    expect(confirm).toBeDisabled();

    await userEvent.click(screen.getByRole("checkbox"));
    expect(confirm).toBeEnabled();
    await userEvent.click(confirm);

    await waitFor(() => expect(api.confirmImport).toHaveBeenCalledWith("b1", true));
  });

  it("shows the server's reason when confirming fails, and keeps the upload open", async () => {
    setup(["onboarding.import.view", "onboarding.import.confirm"]);
    api.confirmImport.mockRejectedValue({ isAxiosError: true, response: { status: 502, data: { title: "The school service cannot be reached. Try again shortly." } } });
    await userEvent.click(await screen.findByRole("button", { name: "Open" }));
    await userEvent.click(await screen.findByRole("checkbox"));
    await userEvent.click(screen.getByRole("button", { name: /Confirm import/ }));
    expect(await screen.findByText(/cannot be reached/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Confirm import/ })).toBeInTheDocument();
  });

  it("offers the error report when rows were not imported", async () => {
    setup(["onboarding.import.view"]);
    await userEvent.click(await screen.findByRole("button", { name: "Open" }));
    await userEvent.click(await screen.findByRole("button", { name: /Download error report/ }));
    await waitFor(() => expect(api.downloadErrorReport).toHaveBeenCalledWith("b1", "academic-years"));
  });

  it("lists imported people with their invitation state and lets an allowed user resend", async () => {
    setup(["onboarding.import.view", "onboarding.users.view", "onboarding.import.confirm"]);
    api.resendInvitation.mockResolvedValue(invite({ accountStatus: "InvitationSent", lastError: null }));
    expect(await screen.findByText("Asha Nair")).toBeInTheDocument();
    expect(screen.getByText("SMTP is down")).toBeInTheDocument();
    expect(screen.getByText("Email failed", { selector: "span, div" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Resend" }));
    await waitFor(() => expect(api.resendInvitation).toHaveBeenCalledWith("i1"));
  });

  it("hides the people list without the users permission and Resend without the confirm permission", async () => {
    setup(["onboarding.import.view"]);
    await screen.findByText("1. Academic years");
    expect(screen.queryByText("People and invitations")).not.toBeInTheDocument();
    expect(api.listInvitations).not.toHaveBeenCalled();
  });

  it("shows how many staff and students the school already has", async () => {
    setup(["onboarding.import.view"]);
    expect(await screen.findByText("Students")).toBeInTheDocument();
    expect(screen.getByText("Staff")).toBeInTheDocument();
  });
});
