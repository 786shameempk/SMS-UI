import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders, signIn, signOut } from "@/test/utils";
import ContentReviewTab from "./ContentReviewTab";
import * as contentApi from "../../content/api";
import type { ContentItem } from "../../content/types";

vi.mock("../../content/api", async (original) => ({
  ...(await original<typeof import("../../content/api")>()),
  listContent: vi.fn(),
  getContent: vi.fn(),
  transitionContent: vi.fn(),
  updateContent: vi.fn(),
  deleteContent: vi.fn(),
}));
vi.mock("react-hot-toast", () => ({ default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

const item = (over: Partial<ContentItem> = {}): ContentItem => ({
  id: "c1",
  kind: "Notice",
  status: "Reviewed",
  title: "Sports day",
  body: "Sports day is on 12 Oct.",
  audience: "parent",
  metadata: null,
  aiGenerated: true,
  sourceFeature: "generate-notification",
  isMine: false,
  createdByRole: "teacher",
  createdByUserId: "u1",
  createdAt: "2026-10-01T09:00:00Z",
  updatedAt: "2026-10-02T09:00:00Z",
  publishedAt: null,
  publishedTarget: null,
  version: 2,
  allowedActions: ["Approve", "SendBack"],
  canEdit: false,
  history: [{ action: "Created", fromStatus: null, toStatus: "Draft", actorUserId: "u1", actorRole: "teacher", comment: null, at: "2026-10-01T09:00:00Z" }],
  ...over,
});

describe("ContentReviewTab", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(signOut);

  it("lists the approval queue and shows only the actions the server allows", async () => {
    signIn("admin");
    vi.mocked(contentApi.listContent).mockResolvedValue([item()]);
    vi.mocked(contentApi.getContent).mockResolvedValue(item());
    const approved = item({ status: "Approved", version: 3, allowedActions: ["Publish", "SendBack"] });
    vi.mocked(contentApi.transitionContent).mockResolvedValue(approved);
    const user = userEvent.setup();
    renderWithProviders(<ContentReviewTab />);

    expect(vi.mocked(contentApi.listContent).mock.calls[0][0]).toEqual({ status: "Reviewed" });
    await user.click(await screen.findByRole("button", { name: "Open" }));

    expect(await screen.findByText("Sports day is on 12 Oct.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /publish/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^edit$/i })).not.toBeInTheDocument();

    vi.mocked(contentApi.getContent).mockResolvedValue(approved);
    await user.click(screen.getByRole("button", { name: "Approve" }));
    await waitFor(() => expect(contentApi.transitionContent).toHaveBeenCalledWith("c1", "Approve", 2, undefined));
    expect(await screen.findByRole("button", { name: "Publish" })).toBeInTheDocument();
  });

  it("asks for a reason before sending back and confirms before publishing", async () => {
    signIn("admin");
    vi.mocked(contentApi.listContent).mockResolvedValue([item()]);
    vi.mocked(contentApi.getContent).mockResolvedValue(item({ status: "Approved", version: 3, allowedActions: ["Publish", "SendBack"] }));
    vi.mocked(contentApi.transitionContent).mockResolvedValue(item({ status: "Published", version: 4, allowedActions: [] }));
    const user = userEvent.setup();
    renderWithProviders(<ContentReviewTab />);
    await user.click(await screen.findByRole("button", { name: "Open" }));

    await user.click(await screen.findByRole("button", { name: "Send back" }));
    expect(screen.getByRole("button", { name: /confirm send back/i })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    await user.click(screen.getByRole("button", { name: "Publish" }));
    expect(screen.getByText(/posts the notice to parents now/i)).toBeInTheDocument();
    expect(contentApi.transitionContent).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: /confirm publish/i }));

    await waitFor(() => expect(contentApi.transitionContent).toHaveBeenCalledWith("c1", "Publish", 3, undefined));
  });
});
