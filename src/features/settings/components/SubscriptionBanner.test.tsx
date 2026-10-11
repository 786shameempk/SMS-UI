import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders, signIn, signOut } from "@/test/utils";
import SubscriptionBanner from "./SubscriptionBanner";
import type { Subscription } from "../types";

const api = vi.hoisted(() => ({ getSubscription: vi.fn(), getPlanUsage: vi.fn() }));
vi.mock("../api", () => api);

const base: Subscription = {
  schoolName: "Green Valley", status: "Active", planName: "Standard", tier: "Growth", maxStudents: 500, maxStaff: 50, storageGb: 50, includedModules: [], availableModules: [],
  subscribedSince: "2026-01-01T00:00:00Z", billingContactName: "Accounts", billingContactEmail: "a@gv.test", managedByOffice: true, noticeLevel: "ok", notice: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  try {
    sessionStorage.clear();
  } catch {
    // not available
  }
});
afterEach(() => signOut());

describe("Subscription banner", () => {
  it("tells the school administrator when the subscription is about to end, with no amounts", async () => {
    signIn("admin");
    api.getSubscription.mockResolvedValue({ ...base, noticeLevel: "warning", notice: "Your subscription ends in 5 days. Contact School Sphere to renew without interruption." });
    renderWithProviders(<SubscriptionBanner />);
    expect(await screen.findByText(/ends in 5 days/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View subscription" })).toHaveAttribute("href", "/admin/settings?tab=subscription");
    expect(screen.queryByRole("button", { name: "Dismiss" })).not.toBeInTheDocument(); // a warning is not dismissible
    expect(document.body.textContent).not.toMatch(/₹|INR|\$\d/);
  });

  it("shows a critical state as an alert", async () => {
    signIn("admin");
    api.getSubscription.mockResolvedValue({ ...base, noticeLevel: "critical", notice: "A payment is overdue. Access will be suspended today unless it is paid." });
    renderWithProviders(<SubscriptionBanner />);
    expect(await screen.findByRole("alert")).toHaveTextContent("suspended today");
  });

  it("lets a plain reminder be dismissed for the session", async () => {
    signIn("admin");
    api.getSubscription.mockResolvedValue({ ...base, noticeLevel: "notice", notice: "Your subscription ends on 05 Nov 2026 (25 days)." });
    const { unmount } = renderWithProviders(<SubscriptionBanner />);
    await userEvent.click(await screen.findByRole("button", { name: "Dismiss" }));
    expect(screen.queryByText(/25 days/)).not.toBeInTheDocument();
    unmount();
    renderWithProviders(<SubscriptionBanner />);
    await waitFor(() => expect(api.getSubscription).toHaveBeenCalledTimes(2));
    expect(screen.queryByText(/25 days/)).not.toBeInTheDocument();
  });

  it("stays out of the way: not for other roles, not when nothing is wrong, not for schools the office does not manage", async () => {
    api.getSubscription.mockResolvedValue({ ...base, noticeLevel: "warning", notice: "Your subscription ends in 5 days." });
    signIn("teacher");
    const teacher = renderWithProviders(<SubscriptionBanner />);
    expect(teacher.container).toBeEmptyDOMElement();
    expect(api.getSubscription).not.toHaveBeenCalled(); // teachers never even ask
    teacher.unmount();

    signIn("admin");
    api.getSubscription.mockResolvedValue({ ...base, noticeLevel: "ok", notice: null });
    const fine = renderWithProviders(<SubscriptionBanner />);
    await waitFor(() => expect(api.getSubscription).toHaveBeenCalled());
    expect(fine.container).toBeEmptyDOMElement();
    fine.unmount();

    api.getSubscription.mockResolvedValue({ ...base, managedByOffice: false, noticeLevel: "warning", notice: "should not show" });
    const legacy = renderWithProviders(<SubscriptionBanner />);
    await waitFor(() => expect(api.getSubscription).toHaveBeenCalledTimes(2));
    expect(legacy.container).toBeEmptyDOMElement();
  });
});
