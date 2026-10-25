import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/utils";
import MissingLoginsDialog from "./MissingLoginsDialog";
import type { ReconcileReport } from "../api";

const api = vi.hoisted(() => ({ reconcileLogins: vi.fn() }));
vi.mock("../api", () => api);

const report = (over: Partial<ReconcileReport> = {}): ReconcileReport => ({
  dryRun: true, created: 0, linked: 0, skipped: 0, failed: 0, remaining: 0, studentsWithoutLogin: 0,
  items: [{ kind: "staff", name: "Asha Teacher", email: "asha@school.test", outcome: "WouldCreateOrLink", message: null }], ...over,
});

beforeEach(() => vi.clearAllMocks());

describe("Create missing accounts", () => {
  it("shows what would happen first, then creates and reports each outcome", async () => {
    api.reconcileLogins.mockResolvedValueOnce(report());
    renderWithProviders(<MissingLoginsDialog open onOpenChange={() => {}} />);

    await userEvent.click(screen.getByRole("button", { name: "Check what is missing" }));
    expect(await screen.findByText("1 account(s) can be created or linked.")).toBeInTheDocument();
    expect(api.reconcileLogins).toHaveBeenCalledWith(true);

    api.reconcileLogins.mockResolvedValueOnce(report({
      dryRun: false, created: 1, failed: 1,
      items: [
        { kind: "staff", name: "Asha Teacher", email: "asha@school.test", outcome: "Created", message: null },
        { kind: "parent", name: "Sita", email: "taken@home.test", outcome: "Failed", message: "An account with the email taken@home.test already exists." },
      ],
    }));
    await userEvent.click(screen.getByRole("button", { name: /Create missing accounts/ }));

    await waitFor(() => expect(api.reconcileLogins).toHaveBeenLastCalledWith(false));
    expect(await screen.findByText(/1 created, 0 linked, 0 skipped, 1 failed/)).toBeInTheDocument();
    const list = screen.getByRole("list");
    expect(within(list).getByText("An account with the email taken@home.test already exists.")).toBeInTheDocument();
  });

  it("says when more are waiting and explains students without their own sign-in", async () => {
    api.reconcileLogins.mockResolvedValue(report({ remaining: 40, studentsWithoutLogin: 12, items: [] }));
    renderWithProviders(<MissingLoginsDialog open onOpenChange={() => {}} />);

    await userEvent.click(screen.getByRole("button", { name: "Check what is missing" }));

    expect(await screen.findByText(/40 more are waiting/)).toBeInTheDocument();
    expect(screen.getByText(/12 student\(s\) have no sign-in of their own/)).toBeInTheDocument();
  });

  it("shows the server's reason when it fails", async () => {
    api.reconcileLogins.mockRejectedValue(new Error("You don't have permission to do this."));
    renderWithProviders(<MissingLoginsDialog open onOpenChange={() => {}} />);

    await userEvent.click(screen.getByRole("button", { name: "Check what is missing" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("You don't have permission to do this.");
  });
});
