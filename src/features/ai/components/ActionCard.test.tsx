import userEvent from "@testing-library/user-event";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/utils";
import ActionCard from "./ActionCard";
import * as assistantApi from "../assistant/api";
import type { ProposedAction } from "../assistant/types";

vi.mock("../assistant/api", () => ({ confirmAction: vi.fn(), cancelAction: vi.fn() }));

const action: ProposedAction = {
  id: "a1",
  kind: "propose_leave_request",
  summary: "Apply for 2 days of leave (5 Oct 2026 to 6 Oct 2026): Family wedding",
  status: "Pending",
  studentId: "s1",
  expiresAt: "2026-10-03T10:00:00Z",
};

describe("ActionCard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does nothing until confirmed, then shows the server's outcome", async () => {
    vi.mocked(assistantApi.confirmAction).mockResolvedValue({ ...action, status: "Completed", summary: "Leave request sent to the class teacher." });
    const user = userEvent.setup();
    renderWithProviders(<ActionCard action={action} />);

    expect(screen.getByRole("group", { name: "Leave application" })).toHaveTextContent("Nothing has been sent yet");
    expect(assistantApi.confirmAction).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: /confirm/i }));

    expect(await screen.findByText("Leave request sent to the class teacher.")).toBeInTheDocument();
    expect(assistantApi.confirmAction).toHaveBeenCalledWith("a1");
    expect(screen.queryByRole("button", { name: /confirm/i })).not.toBeInTheDocument();
  });

  it("cancels, and shows a refusal from the server", async () => {
    vi.mocked(assistantApi.confirmAction).mockRejectedValue(new Error("This action expired. Ask the assistant again if you still need it."));
    vi.mocked(assistantApi.cancelAction).mockResolvedValue({ ...action, status: "Cancelled" });
    const user = userEvent.setup();
    renderWithProviders(<ActionCard action={action} />);

    await user.click(screen.getByRole("button", { name: /confirm/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("expired");

    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(await screen.findByText("Cancelled. Nothing was sent.")).toBeInTheDocument();
  });
});
