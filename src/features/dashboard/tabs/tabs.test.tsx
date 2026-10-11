import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { academicHttpClient, campusHttpClient, engagementHttpClient, financeHttpClient } from "@/lib/httpClient";
import { useUiStore } from "@/store/useUiStore";
import { apiError, renderWithProviders, signIn, signOut, stubClient } from "@/test/utils";
import DashboardPage from "../pages/DashboardPage";
import DashboardTabPanel from "./DashboardTabPanel";
import type { DashboardTabId } from "./catalog";
import { MOCK_ACADEMICS, MOCK_CAMPUS, MOCK_ENGAGEMENT, MOCK_FINANCE, MOCK_TEACHER } from "./mock";

vi.mock("@/utils/mockDelay", () => ({ mockDelay: <T,>(data: T) => Promise.resolve(data) }));

const range = { preset: "last6Months" } as const;
const panel = (tab: Exclude<DashboardTabId, "overview">, source: "live" | "mock" = "mock") =>
  renderWithProviders(<DashboardTabPanel tab={tab} source={source} dateRange={range} rangeLabel="Last 6 months" />);

afterEach(() => {
  vi.restoreAllMocks();
  signOut();
});

describe("dashboard tabs on demo data", () => {
  beforeEach(() => signIn("principal"));

  it.each<[Exclude<DashboardTabId, "overview">, string[]]>([
    ["executive", ["Attendance today", "Needs your attention", "Fees collected vs falling due", "Branch comparison"]],
    ["finance", ["Collected today", "Dues by age", "How people paid", "Refunds & payroll"]],
    ["admissions", ["Admission funnel", "Seats against capacity", "Applications by month"]],
    ["campus", ["Needs action today", "Library", "Transport", "Hostel", "Inventory", "Visitors", "Health"]],
    ["engagement", ["Open tickets", "Response targets", "Surveys", "Message delivery"]],
    ["hr", ["Active staff", "Staff by department", "Away in the next 14 days"]],
    ["academics", ["Average score", "Results by class", "Grade distribution", "Students to support"]],
  ])("%s shows its sections", async (tab, expected) => {
    panel(tab);
    for (const text of expected) expect((await screen.findAllByText(text)).length).toBeGreaterThan(0);
  });

  it("the teacher's tab lists today's periods and marks covered periods", async () => {
    panel("teacher");
    expect(await screen.findByText("Today's timetable")).toBeInTheDocument();
    expect(screen.getByText("Covering")).toBeInTheDocument();
    expect(screen.getByText(`${MOCK_TEACHER.todayPeriods.length}`)).toBeInTheDocument();
  });

  it("explains a teacher login that is not linked to a staff record", async () => {
    useUiStore.setState({ dashboardDataSource: "live" });
    stubClient(academicHttpClient, { "GET /api/dashboard/teacher-summary": { ...MOCK_TEACHER, isTeacher: false, todayPeriods: [] } });
    panel("teacher", "live");
    expect(await screen.findByText(/isn't linked to a staff record/)).toBeInTheDocument();
  });
});

describe("dashboard tabs on live data", () => {
  beforeEach(() => signIn("principal"));

  it("asks the service for the selected range and today's date", async () => {
    const calls = stubClient(academicHttpClient, { "GET /api/dashboard/academics-summary": MOCK_ACADEMICS });
    panel("academics", "live");
    expect(await screen.findByText("Results by class")).toBeInTheDocument();
    const params = (calls[0].config as { params: Record<string, string> }).params;
    expect(params.from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(params.to).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(params.today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("shows a friendly access message when the service refuses (403), never the raw error", async () => {
    vi.spyOn(academicHttpClient, "get").mockRejectedValue(apiError(403, { title: "Forbidden: secret detail" }));
    panel("hr", "live");
    expect(await screen.findByText("You don't have access to this view")).toBeInTheDocument();
    expect(screen.queryByText(/secret detail/)).not.toBeInTheDocument();
  });

  it("offers a retry when a request fails for another reason", async () => {
    vi.spyOn(academicHttpClient, "get").mockRejectedValue(apiError(500));
    panel("hr", "live");
    expect(await screen.findByRole("button", { name: /try again|retry/i })).toBeInTheDocument();
  });

  it("builds the Campus tab from whichever sections the service returned", async () => {
    stubClient(campusHttpClient, { "GET /api/dashboard/campus-summary": { ...MOCK_CAMPUS, hostel: null, transport: null, health: null } });
    panel("campus", "live");
    expect(await screen.findByRole("heading", { name: "Library" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Hostel" })).not.toBeInTheDocument();
    expect(screen.getByText("Only the modules open to your role are shown.")).toBeInTheDocument();
  });

  it("Engagement still shows surveys and messages when the Help Desk refuses", async () => {
    vi.spyOn(campusHttpClient, "get").mockRejectedValue(apiError(403));
    stubClient(engagementHttpClient, { "GET /api/dashboard/engagement-summary": MOCK_ENGAGEMENT });
    panel("engagement", "live");
    expect(await screen.findByText("Message delivery")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Surveys" })).toBeInTheDocument();
    expect(screen.queryByText("Response targets")).not.toBeInTheDocument();
    expect(screen.getByText("Only the parts of Engagement open to your role are shown.")).toBeInTheDocument();
  });

  it("Engagement shows the access message when every part is refused", async () => {
    vi.spyOn(campusHttpClient, "get").mockRejectedValue(apiError(403));
    vi.spyOn(engagementHttpClient, "get").mockRejectedValue(apiError(403));
    panel("engagement", "live");
    expect(await screen.findByText("You don't have access to this view")).toBeInTheDocument();
  });

  it("Finance hides payroll when the service returns none", async () => {
    stubClient(financeHttpClient, {
      "GET /api/dashboard/finance-summary": { ...MOCK_FINANCE, payrollCostInRange: null, payslipsUnpaid: null, payslipsUnpaidAmount: null, months: MOCK_FINANCE.months.map((m) => ({ ...m, payrollCost: null })) },
      // The defaulters card reuses the Overview's loaders.
      "GET /api/dashboard/fee-summary": { currency: "INR", collectedInRange: 0, collectedPreviousRange: 0, pending: 0, overdueCount: 0, overdueAmount: 0, paymentsToday: 0, collectedToday: 0, months: [], statusBreakdown: [], topDefaulters: [] },
    });
    stubClient(academicHttpClient, { "GET /api/people/me": { staffId: null, learners: [] } });
    panel("finance", "live");
    expect(await screen.findByText("Fee collection")).toBeInTheDocument();
    expect(screen.getByText(/Payroll figures are shown to administrators/)).toBeInTheDocument();
    expect(screen.queryByText("Fee income vs payroll cost")).not.toBeInTheDocument();
  });
});

describe("DashboardPage tab switcher", () => {
  const initialUi = useUiStore.getState();
  beforeEach(() => useUiStore.setState({ ...initialUi, dashboardDataSource: "mock", dashboardLayouts: {} }, true));

  it("shows the tabs a principal may open and switches the page, keeping the choice in the address bar", async () => {
    signIn("principal");
    renderWithProviders(<DashboardPage />, { route: "/dashboard" });
    const tablist = await screen.findByRole("tablist", { name: "Dashboard sections" });
    const names = within(tablist).getAllByRole("tab").map((t) => t.textContent);
    expect(names).toEqual(["Overview", "Executive", "Finance", "Admissions", "Campus operations", "Engagement", "HR & Payroll", "Academics"]);

    await userEvent.click(within(tablist).getByRole("tab", { name: "Finance" }));
    expect(await screen.findByText("Dues by age")).toBeInTheDocument();
    // The Overview's customize controls belong to the Overview only.
    expect(screen.queryByRole("button", { name: "Customize" })).not.toBeInTheDocument();

    await userEvent.click(within(tablist).getByRole("tab", { name: "Overview" }));
    expect(await screen.findByRole("button", { name: "Customize" })).toBeInTheDocument();
  });

  it("opens straight on a tab named in the address bar, and ignores one the role may not open", async () => {
    signIn("teacher");
    const { unmount } = renderWithProviders(<DashboardPage />, { route: "/dashboard?tab=teacher" });
    expect(await screen.findByText("Today's timetable")).toBeInTheDocument();
    unmount();

    renderWithProviders(<DashboardPage />, { route: "/dashboard?tab=finance" });
    await waitFor(() => expect(screen.getByRole("tab", { name: "Overview", selected: true })).toBeInTheDocument());
    expect(screen.queryByText("Dues by age")).not.toBeInTheDocument();
  });

  it("gives parents and students no tab bar at all", async () => {
    signIn("parent");
    renderWithProviders(<DashboardPage />, { route: "/dashboard?tab=finance" });
    await screen.findByText(/dashboard/i);
    await waitFor(() => expect(screen.queryByRole("tablist", { name: "Dashboard sections" })).not.toBeInTheDocument());
  });
});

