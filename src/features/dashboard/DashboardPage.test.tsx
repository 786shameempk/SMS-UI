import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AxiosError, AxiosHeaders, type AxiosResponse } from "axios";
import { useUiStore } from "@/store/useUiStore";
import { allModules, renderWithProviders, signIn, signOut } from "@/test/utils";
import DashboardPage from "./pages/DashboardPage";
import WidgetShell, { type WidgetQuery } from "./components/WidgetShell";
import { toSavedLayout } from "./layout";

// Demo data normally arrives after a random 250-600 ms "network" delay; under a busy parallel test run that made
// these tests flaky. Resolve immediately so they test the page, not the clock.
vi.mock("@/utils/mockDelay", () => ({ mockDelay: <T,>(data: T) => Promise.resolve(data) }));

const widgetIds = (container: HTMLElement) => [...container.querySelectorAll("[data-widget]")].map((el) => el.getAttribute("data-widget"));

describe("DashboardPage", () => {
  const initialUi = useUiStore.getState();
  beforeEach(() => useUiStore.setState({ ...initialUi, dashboardDataSource: "mock", dashboardLayouts: {} }, true));
  afterEach(signOut);

  it("renders the role's default widgets", async () => {
    signIn("teacher");
    const { container } = renderWithProviders(<DashboardPage />);
    await waitFor(() => expect(widgetIds(container)).toContain("todayClasses"));
    const ids = widgetIds(container);
    expect(ids[0]).toBe("stats");
    expect(ids).not.toContain("revenue");
    expect(ids).not.toContain("recentActivity");
    expect(ids).not.toContain("scopeOverview");
  });

  it("never renders a widget the user lacks the permission for", async () => {
    signIn("teacher", {}, { ...allModules(), library: false, homework: false });
    const { container } = renderWithProviders(<DashboardPage />);
    await waitFor(() => expect(widgetIds(container)).toContain("stats"));
    expect(widgetIds(container)).not.toContain("libraryDue");
    expect(widgetIds(container)).not.toContain("pendingAssignments");
  });

  it("restores the user's saved order and hidden widgets, ignoring widgets they are not allowed", async () => {
    const user = signIn("teacher");
    useUiStore.getState().setDashboardLayout(
      user.id,
      toSavedLayout([
        { id: "revenue", visible: true, w: 8, h: 2 }, // admin-only: must stay off a teacher's dashboard
        { id: "notifications", visible: true, w: 4, h: 1 },
        { id: "stats", visible: false, w: 12, h: 1 },
      ]),
    );
    const { container } = renderWithProviders(<DashboardPage />);
    await waitFor(() => expect(widgetIds(container)[0]).toBe("notifications"));
    expect(widgetIds(container)).not.toContain("stats");
    expect(widgetIds(container)).not.toContain("revenue");
  });

  it("keeps layouts per user", async () => {
    useUiStore.getState().setDashboardLayout("someone-else", toSavedLayout([{ id: "stats", visible: false, w: 12, h: 1 }]));
    signIn("teacher");
    const { container } = renderWithProviders(<DashboardPage />);
    await waitFor(() => expect(widgetIds(container)).toContain("stats"));
  });

  it("offers a reset when every widget is hidden, and resetting restores the default dashboard", async () => {
    const user = signIn("student");
    const { container } = renderWithProviders(<DashboardPage />);
    await waitFor(() => expect(widgetIds(container).length).toBeGreaterThan(0));
    const defaults = widgetIds(container);

    act(() => {
      useUiStore.getState().setDashboardLayout(user.id, toSavedLayout(defaults.map((id) => ({ id: id as never, visible: false, w: 4, h: 1 }))));
    });
    expect(await screen.findByText("Your dashboard is empty")).toBeInTheDocument();

    act(() => screen.getByRole("button", { name: "Reset to default" }).click());
    await waitFor(() => expect(widgetIds(container)).toEqual(defaults));
    expect(useUiStore.getState().dashboardLayouts[user.id]).toBeUndefined();
  });
});

describe("DashboardPage role widgets", () => {
  const initialUi = useUiStore.getState();
  beforeEach(() => useUiStore.setState({ ...initialUi, dashboardDataSource: "mock", dashboardLayouts: {} }, true));
  afterEach(signOut);

  it.each([
    ["superAdmin", ["schools"], ["learnerAttendance"]],
    ["admin", ["alerts", "feeStatus", "classAttendance", "topPerformers", "feeDefaulters"], ["schools", "learnerAttendance"]],
    ["accountant", ["feeStatus", "feeDefaulters"], ["alerts", "classAttendance", "topPerformers"]],
    ["teacher", ["classAttendance"], ["alerts", "feeStatus", "feeDefaulters", "topPerformers"]],
    ["parent", ["learnerAttendance"], ["alerts", "classAttendance", "feeDefaulters", "schools"]],
    ["student", ["learnerAttendance"], ["feeStatus", "topPerformers"]],
  ] as const)("%s gets their role's widgets", async (role, expected, absent) => {
    signIn(role);
    const { container } = renderWithProviders(<DashboardPage />);
    await waitFor(() => expect(widgetIds(container)).toEqual(expect.arrayContaining([...expected])));
    for (const id of absent) expect(widgetIds(container)).not.toContain(id);
  });

  it("lets a parent focus the dashboard on one child", async () => {
    signIn("parent");
    const user = userEvent.setup();
    const { container } = renderWithProviders(<DashboardPage />);
    const card = () => container.querySelector('[data-widget="learnerAttendance"]')!;
    await waitFor(() => expect(card().textContent).toContain("Kabir Kapoor"), { timeout: 4000 });
    expect(card().textContent).toContain("Riya Kapoor");

    await user.click(screen.getByRole("combobox", { name: "Show the dashboard for" }));
    await user.click(await screen.findByRole("option", { name: /Kabir/ }));

    // The card refetches for the focused child: wait until it shows Kabir alone.
    await waitFor(
      () => {
        expect(card().textContent).toContain("Kabir Kapoor");
        expect(card().textContent).not.toContain("Riya Kapoor");
      },
      { timeout: 4000 },
    );
  });

  it("doesn't offer a child switcher with only one child", async () => {
    signIn("student");
    const { container } = renderWithProviders(<DashboardPage />);
    await waitFor(() => expect(widgetIds(container)).toContain("learnerAttendance"));
    expect(screen.queryByRole("combobox", { name: "Show the dashboard for" })).not.toBeInTheDocument();
  });
});

describe("DashboardPage customization", () => {
  const initialUi = useUiStore.getState();
  beforeEach(() => useUiStore.setState({ ...initialUi, dashboardDataSource: "mock", dashboardLayouts: {} }, true));
  afterEach(signOut);

  const click = (name: string | RegExp) => act(() => screen.getByRole("button", { name }).click());

  it("moves, hides and re-adds widgets in edit mode, and saves only on Save", async () => {
    const user = signIn("teacher");
    const { container } = renderWithProviders(<DashboardPage />);
    await waitFor(() => expect(widgetIds(container)[0]).toBe("stats"));
    const before = widgetIds(container);

    click("Customize");
    expect(screen.getByRole("region", { name: "Customize dashboard" })).toBeInTheDocument();
    // The first widget can't move earlier; widgets are previews (inert) while editing.
    expect(screen.getByRole("button", { name: "Move Key stats earlier" })).toBeDisabled();

    click("Move Attendance summary earlier");
    expect(widgetIds(container).slice(0, 2)).toEqual(["attendance", "stats"]);
    expect(screen.getByText(/Attendance summary moved to position 1 of/)).toBeInTheDocument();

    click("Hide Holidays");
    expect(widgetIds(container)).not.toContain("holidays");
    // Nothing saved yet.
    expect(useUiStore.getState().dashboardLayouts[user.id]).toBeUndefined();

    click("Show Holidays");
    expect(widgetIds(container)).toContain("holidays");
    click("Hide Holidays");

    click("Save layout");
    expect(screen.queryByRole("region", { name: "Customize dashboard" })).not.toBeInTheDocument();
    const saved = useUiStore.getState().dashboardLayouts[user.id]!;
    expect(saved.items[0].id).toBe("attendance");
    expect(saved.items.find((i) => i.id === "holidays")?.visible).toBe(false);
    expect(widgetIds(container)).toEqual(["attendance", "stats", ...before.filter((id) => id !== "stats" && id !== "attendance" && id !== "holidays")]);
  });

  it("Cancel discards the edits", async () => {
    const user = signIn("teacher");
    const { container } = renderWithProviders(<DashboardPage />);
    await waitFor(() => expect(widgetIds(container)[0]).toBe("stats"));
    const before = widgetIds(container);

    click("Customize");
    click("Move Attendance summary earlier");
    click("Cancel");

    expect(widgetIds(container)).toEqual(before);
    expect(useUiStore.getState().dashboardLayouts[user.id]).toBeUndefined();
  });

  it("drag and drop swaps a widget into another's place", async () => {
    signIn("teacher");
    const { container } = renderWithProviders(<DashboardPage />);
    await waitFor(() => expect(widgetIds(container)[0]).toBe("stats"));
    click("Customize");

    const frame = (id: string) => container.querySelector(`[data-widget="${id}"] > div`)!;
    const dataTransfer = { setData: vi.fn(), effectAllowed: "", dropEffect: "" };
    act(() => {
      fireEvent.dragStart(frame("notifications"), { dataTransfer });
      fireEvent.dragOver(frame("stats"), { dataTransfer });
      fireEvent.drop(frame("stats"), { dataTransfer });
    });
    expect(widgetIds(container)[0]).toBe("notifications");
  });

  it("resizes a widget from its toolbar", async () => {
    const user = signIn("teacher");
    const { container } = renderWithProviders(<DashboardPage />);
    await waitFor(() => expect(widgetIds(container)[0]).toBe("stats"));
    click("Customize");

    const trigger = screen.getByRole("button", { name: "Resize Holidays" });
    act(() => {
      fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false, pointerType: "mouse" });
    });
    act(() => screen.getByRole("menuitemradio", { name: "Full width" }).click());
    expect(container.querySelector('[data-widget="holidays"]')!.className).toContain("xl:col-span-12");

    click("Save layout");
    expect(useUiStore.getState().dashboardLayouts[user.id]!.items.find((i) => i.id === "holidays")?.w).toBe(12);
  });
});

describe("PerformanceChart", () => {
  it("explains an empty period instead of drawing a flat 0% line", async () => {
    const { default: PerformanceChart } = await import("./components/PerformanceChart");
    render(<PerformanceChart data={[{ month: "May", averageScore: null, passRate: null }, { month: "Jun", averageScore: null, passRate: null }]} rangeLabel="Last 6 months" />);
    expect(screen.getByText("No exam results in this period")).toBeInTheDocument();
  });
});

describe("WidgetShell states", () => {
  const httpError = (status: number) => {
    const response = { status, data: {}, headers: {}, statusText: "", config: { headers: new AxiosHeaders() } } as AxiosResponse;
    return new AxiosError("failed", String(status), undefined, undefined, response);
  };
  const query = (over: Partial<WidgetQuery<string>>) => ({
    data: undefined,
    error: null,
    isError: false,
    isRefetching: false,
    refetch: vi.fn<() => unknown>(),
    ...over,
  });
  const shell = (q: ReturnType<typeof query>) => render(<WidgetShell query={q} title="Fees due">{(d: string) => <p>data: {d}</p>}</WidgetShell>);

  afterEach(() => Object.defineProperty(navigator, "onLine", { configurable: true, value: true }));

  it("shows a skeleton while loading", () => {
    shell(query({}));
    expect(screen.getByLabelText("Loading Fees due")).toHaveAttribute("aria-busy", "true");
  });

  it("renders the widget once data arrives", () => {
    shell(query({ data: "ok" as never }));
    expect(screen.getByText("data: ok")).toBeInTheDocument();
  });

  it("shows a retry on failure", () => {
    const q = query({ isError: true, error: httpError(500) });
    shell(q);
    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't load this right now.");
    screen.getByRole("button", { name: "Try again" }).click();
    expect(q.refetch).toHaveBeenCalled();
  });

  it("explains a refused request instead of offering a pointless retry", () => {
    for (const status of [401, 403]) {
      const { unmount } = shell(query({ isError: true, error: httpError(status) }));
      expect(screen.getByText("You don't have permission to view this information.")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
      unmount();
    }
  });

  it("says when the device is offline", () => {
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    shell(query({ isError: true, error: new AxiosError("Network Error") }));
    expect(screen.getByText("You're offline. This will load when you reconnect.")).toBeInTheDocument();
  });
});
