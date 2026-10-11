import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/utils";
import { EndOfLifePanel } from "./components/EndOfLifePanel";
import { useOfficeStore } from "./store";
import type { DeletionRequest, Subscription } from "./salesTypes";

const api = vi.hoisted(() => ({
  restoreSubscription: vi.fn(),
  downloadSchoolExport: vi.fn(),
  latestErasure: vi.fn(),
  requestErasure: vi.fn(),
  withdrawErasure: vi.fn(),
  decideErasure: vi.fn(),
}));
vi.mock("./api/sales", () => api);

const asUser = (permissions: string[]) =>
  useOfficeStore.setState({ status: "signedIn", user: { id: "u", email: "a@b.c", displayName: "A", roleId: "r", role: "R", permissions, mfaEnabled: false, isActive: true, lastLoginAt: null, mustChangePassword: false } });

beforeEach(() => {
  vi.clearAllMocks();
  api.latestErasure.mockResolvedValue(null);
});
afterEach(() => useOfficeStore.setState({ status: "signedOut", user: null }));

const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
const sub = (over: Partial<Subscription> = {}) => ({ id: "sub1", schoolId: "s1", schoolName: "Green Valley", status: "Cancelled", dataRetentionUntil: day(30), dataErasedAt: null, ...over }) as Subscription;
const pending = (over: Partial<DeletionRequest> = {}): DeletionRequest => ({
  id: "r1", schoolId: "s1", status: "Pending", reason: "Retention is over", requestedByName: "Sam", requestedAt: "2026-10-10T00:00:00Z", decidedByName: null, decidedAt: null, decisionNote: null, result: null, canDecide: true, ...over,
});

describe("End of life", () => {
  it("while the data is kept: offers the download and a restore, not erasure", async () => {
    asUser(["tenants.control"]);
    renderWithProviders(<EndOfLifePanel s={sub()} />);
    expect(await screen.findByRole("button", { name: /Download account data/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Restore subscription/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Request erasure/ })).not.toBeInTheDocument();
    expect(screen.getByText(/data is kept until/)).toBeInTheDocument();
    expect(screen.getByText(/are not part of either/)).toBeInTheDocument();
  });

  it("restores only with a reason", async () => {
    asUser(["tenants.control"]);
    api.restoreSubscription.mockResolvedValue(sub({ status: "Suspended" }));
    renderWithProviders(<EndOfLifePanel s={sub()} />);
    await userEvent.click(await screen.findByRole("button", { name: /Restore subscription/ }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Restore" }));
    expect(api.restoreSubscription).not.toHaveBeenCalled();
    await userEvent.type(within(dialog).getByLabelText("Reason"), "They came back");
    await userEvent.click(within(dialog).getByRole("button", { name: "Restore" }));
    await waitFor(() => expect(api.restoreSubscription).toHaveBeenCalledWith("sub1", "They came back"));
  });

  it("after the retention period: offers a request for erasure", async () => {
    asUser(["tenants.control"]);
    api.requestErasure.mockResolvedValue(pending());
    renderWithProviders(<EndOfLifePanel s={sub({ dataRetentionUntil: day(-5) })} />);
    expect(screen.queryByRole("button", { name: /Restore subscription/ })).not.toBeInTheDocument();
    await userEvent.click(await screen.findByRole("button", { name: /Request erasure/ }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.type(within(dialog).getByLabelText("Reason"), "Retention is over");
    await userEvent.click(within(dialog).getByRole("button", { name: "Request erasure" }));
    await waitFor(() => expect(api.requestErasure).toHaveBeenCalledWith("s1", "Retention is over"));
  });

  it("lets a colleague with the delete permission approve, and warns what it does", async () => {
    asUser(["tenants.control", "tenants.delete"]);
    api.latestErasure.mockResolvedValue(pending());
    api.decideErasure.mockResolvedValue(pending({ status: "Executed" }));
    renderWithProviders(<EndOfLifePanel s={sub({ dataRetentionUntil: day(-5) })} />);
    expect(await screen.findByText(/It cannot be undone/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Approve and erase" }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.type(within(dialog).getByLabelText("Confirmation note"), "Confirmed with the school");
    await userEvent.click(within(dialog).getByRole("button", { name: "Erase accounts" }));
    await waitFor(() => expect(api.decideErasure).toHaveBeenCalledWith("r1", true, "Confirmed with the school"));
  });

  it("will not let the requester decide their own request", async () => {
    asUser(["tenants.control", "tenants.delete"]);
    api.latestErasure.mockResolvedValue(pending({ canDecide: false }));
    renderWithProviders(<EndOfLifePanel s={sub({ dataRetentionUntil: day(-5) })} />);
    expect(await screen.findByText(/You requested this/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Approve and erase" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Withdraw request" })).toBeInTheDocument();
  });

  it("shows nothing to approve to someone without the delete permission, and shows an erased school as erased", async () => {
    asUser(["tenants.control"]);
    api.latestErasure.mockResolvedValue(pending());
    const first = renderWithProviders(<EndOfLifePanel s={sub({ dataRetentionUntil: day(-5) })} />);
    await screen.findByText(/Erasure requested by Sam/);
    expect(screen.queryByRole("button", { name: "Approve and erase" })).not.toBeInTheDocument();
    first.unmount();

    api.latestErasure.mockResolvedValue(pending({ status: "Executed", result: "2 account(s) anonymised." }));
    renderWithProviders(<EndOfLifePanel s={sub({ dataErasedAt: "2026-10-11T00:00:00Z" })} />);
    expect(await screen.findByText(/accounts were erased on/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Download account data/ })).not.toBeInTheDocument();
  });
});
