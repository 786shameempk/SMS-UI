import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/utils";
import ProfileApprovalsPage from "./ProfileApprovalsPage";
import type { ChangeDetail, ChangePage, ProfileChange } from "./api";

const api = vi.hoisted(() => ({ listApprovals: vi.fn(), getApproval: vi.fn(), approveChange: vi.fn(), rejectChange: vi.fn() }));
vi.mock("./api", () => api);

const request = (over: Partial<ProfileChange> = {}): ProfileChange => ({
  id: "r1", status: "Pending", personType: "student", personId: "s1", subjectName: "Ravi Kumar", subjectDetail: "Grade 1 · A · A1", requesterName: "Sita Kumar", requesterRole: "parent",
  changes: [{ key: "address", label: "Home address", from: "5 Lake Road", to: "9 Hill Road", sensitive: false }, { key: "first_name", label: "First name", from: "Ravi", to: "Ravindra", sensitive: true }],
  approverName: "Maya Test", approverRule: "ClassTeacher", submittedAt: "2026-10-27T09:00:00Z", reviewedAt: null, reviewedByName: null, reviewerComment: null, canDecide: true, ...over,
});

const page = (items: ProfileChange[], counts: Record<string, number> = { Pending: items.length, All: items.length }): ChangePage => ({ items, total: items.length, page: 1, pageSize: 25, counts });
const detail = (r: ProfileChange): ChangeDetail => ({ request: r, history: [{ action: "Submitted", at: "2026-10-27T09:00:00Z", by: "who@school.test", details: "Ravi Kumar: address -> ClassTeacher" }] });

beforeEach(() => vi.clearAllMocks());

describe("Profile approvals", () => {
  it("lists what is waiting with who asked, what for and who approves, and counts each tab", async () => {
    api.listApprovals.mockResolvedValue(page([request()], { Pending: 1, Approved: 4, Rejected: 2, All: 7 }));
    renderWithProviders(<ProfileApprovalsPage />);

    expect(await screen.findByText("Ravi Kumar")).toBeInTheDocument();
    expect(screen.getByText("Grade 1 · A · A1")).toBeInTheDocument();
    expect(screen.getByText(/Home address, First name/)).toBeInTheDocument();
    expect(screen.getByText(/Requested by Sita Kumar/)).toBeInTheDocument();
    expect(screen.getByText(/Approver: Maya Test/)).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Rejected/ })).toHaveTextContent("2");
    expect(api.listApprovals).toHaveBeenCalledWith("pending", "", 1);
  });

  it("asks for the tab the approver picks", async () => {
    api.listApprovals.mockResolvedValue(page([]));
    renderWithProviders(<ProfileApprovalsPage />);
    await screen.findByText("Nothing is waiting for you");

    await userEvent.click(screen.getByRole("tab", { name: /Approved/ }));

    await waitFor(() => expect(api.listApprovals).toHaveBeenCalledWith("approved", "", 1));
  });

  it("shows the current value beside the proposed one and approves with a comment", async () => {
    const r = request();
    api.listApprovals.mockResolvedValue(page([r]));
    api.getApproval.mockResolvedValue(detail(r));
    api.approveChange.mockResolvedValue(detail({ ...r, status: "Approved" }));
    renderWithProviders(<ProfileApprovalsPage />);
    await userEvent.click(await screen.findByRole("button", { name: "View details" }));

    const dialog = await screen.findByRole("dialog");
    const row = within(dialog).getByText("Home address").closest("tr")!;
    expect(within(row).getByText("5 Lake Road")).toBeInTheDocument();
    expect(within(row).getByText("9 Hill Road")).toBeInTheDocument();
    expect(within(dialog).getByText(/protected/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Submitted/)).toBeInTheDocument();

    await userEvent.type(within(dialog).getByLabelText(/Comment/), "Checked with the family");
    await userEvent.click(within(dialog).getByRole("button", { name: "Approve" }));

    await waitFor(() => expect(api.approveChange).toHaveBeenCalledWith("r1", "Checked with the family"));
  });

  it("will not reject without a reason", async () => {
    const r = request();
    api.listApprovals.mockResolvedValue(page([r]));
    api.getApproval.mockResolvedValue(detail(r));
    api.rejectChange.mockResolvedValue(detail({ ...r, status: "Rejected" }));
    renderWithProviders(<ProfileApprovalsPage />);
    await userEvent.click(await screen.findByRole("button", { name: "View details" }));
    const dialog = await screen.findByRole("dialog");

    expect(within(dialog).getByRole("button", { name: "Reject" })).toBeDisabled();
    await userEvent.type(within(dialog).getByLabelText(/Comment/), "Wrong address");
    await userEvent.click(within(dialog).getByRole("button", { name: "Reject" }));

    await waitFor(() => expect(api.rejectChange).toHaveBeenCalledWith("r1", "Wrong address"));
  });

  it("keeps the request open and shows the server's message when approval is refused", async () => {
    const r = request();
    api.listApprovals.mockResolvedValue(page([r]));
    api.getApproval.mockResolvedValue(detail(r));
    api.approveChange.mockRejectedValue(new Error("Home address changed after this request was made."));
    renderWithProviders(<ProfileApprovalsPage />);
    await userEvent.click(await screen.findByRole("button", { name: "View details" }));
    const dialog = await screen.findByRole("dialog");

    await userEvent.click(within(dialog).getByRole("button", { name: "Approve" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent("changed after this request");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("offers no decision to someone who is only looking", async () => {
    const r = request({ canDecide: false, status: "Approved", reviewedByName: "Maya Test", reviewerComment: "Fine" });
    api.listApprovals.mockResolvedValue(page([r]));
    api.getApproval.mockResolvedValue(detail(r));
    renderWithProviders(<ProfileApprovalsPage />);
    await userEvent.click(await screen.findByRole("button", { name: "View details" }));
    const dialog = await screen.findByRole("dialog");

    expect(within(dialog).queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
    expect(within(dialog).getByText(/by Maya Test/)).toBeInTheDocument();
    expect(within(dialog).getByText("Fine")).toBeInTheDocument();
  });

  it("shows a load failure with a retry instead of an empty list", async () => {
    api.listApprovals.mockRejectedValue(new Error("The service is unavailable."));
    renderWithProviders(<ProfileApprovalsPage />);
    expect(await screen.findByText("The service is unavailable.")).toBeInTheDocument();
  });
});
