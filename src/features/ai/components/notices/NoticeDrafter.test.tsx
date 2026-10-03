import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders, signIn, signOut } from "@/test/utils";
import NoticeDrafter from "./NoticeDrafter";
import * as noticesApi from "../../notices/api";
import * as notificationsApi from "@/features/notifications/api";
import * as contentApi from "../../content/api";

vi.mock("react-hot-toast", () => ({ default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));
vi.mock("../../notices/api", () => ({ draftNotice: vi.fn(), rewriteContent: vi.fn() }));
vi.mock("@/features/notifications/api", () => ({ postAnnouncement: vi.fn() }));
vi.mock("../../content/api", () => ({ CONTENT_KEY: ["ai", "content"], createContent: vi.fn(async () => ({ id: "c1" })) }));
vi.mock("../../capabilities", () => ({
  useAiCapabilities: () => ({ languages: ["English", "Hindi"], can: () => true, unsupported: () => false }),
}));

const draft = (content: string) => ({
  content: { title: "School closed", content, shortVersion: "Closed on 5 Oct.", formalVersion: "Please be informed the school shall remain closed on 5 Oct." },
  aiGenerated: true,
  status: "Draft" as const,
  model: "m",
});

describe("NoticeDrafter", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(signOut);

  it("drafts from an instruction, rewrites only the visible version, and keeps edits", async () => {
    signIn("teacher");
    vi.mocked(noticesApi.draftNotice).mockResolvedValue(draft("Dear parents, school is closed on 5 Oct."));
    vi.mocked(noticesApi.rewriteContent).mockResolvedValue({ content: { text: "School is closed on 5 Oct." }, aiGenerated: true, status: "Draft", model: "m" });
    const user = userEvent.setup();
    renderWithProviders(<NoticeDrafter />);

    await user.type(screen.getByLabelText(/what should it say/i), "Holiday on 5 Oct");
    await user.click(screen.getByRole("button", { name: /draft with ai/i }));

    expect(await screen.findByLabelText("Notice text")).toHaveValue("Dear parents, school is closed on 5 Oct.");
    expect(vi.mocked(noticesApi.draftNotice).mock.calls[0][0]).toMatchObject({ kind: "Notice", instruction: "Holiday on 5 Oct", tone: "Neutral", language: "English" });

    await user.click(screen.getByRole("button", { name: /more concise/i }));
    await waitFor(() => expect(screen.getByLabelText("Notice text")).toHaveValue("School is closed on 5 Oct."));
    expect(vi.mocked(noticesApi.rewriteContent).mock.calls[0][0]).toEqual({ text: "Dear parents, school is closed on 5 Oct.", action: "MoreConcise", language: undefined });

    // Teachers draft and copy; posting school-wide is for admins and principals.
    expect(screen.queryByRole("button", { name: /post as announcement/i })).not.toBeInTheDocument();
  });

  it("lets an admin post the visible version, but not while placeholders remain", async () => {
    signIn("admin");
    vi.mocked(noticesApi.draftNotice).mockResolvedValue(draft("School is closed on [date]."));
    vi.mocked(notificationsApi.postAnnouncement).mockResolvedValue({} as never);
    const user = userEvent.setup();
    renderWithProviders(<NoticeDrafter />);

    await user.type(screen.getByLabelText(/what should it say/i), "Holiday");
    await user.click(screen.getByRole("button", { name: /draft with ai/i }));
    await screen.findByLabelText("Notice text");
    expect(screen.getByText(/fill in the \[placeholders\]/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /post as announcement/i }));
    expect(screen.getByRole("button", { name: /^post$/i })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: /cancel/i }));

    const text = screen.getByLabelText("Notice text");
    await user.clear(text);
    await user.click(text);
    await user.paste("School is closed on 5 Oct.");
    await user.click(screen.getByRole("button", { name: /post as announcement/i }));
    await user.click(screen.getByRole("button", { name: /^post$/i }));

    await waitFor(() => expect(notificationsApi.postAnnouncement).toHaveBeenCalledWith({ title: "School closed", body: "School is closed on 5 Oct.", category: "announcement", audience: "everyone" }));
  });

  it("submits the visible version for approval instead of sending it", async () => {
    signIn("teacher");
    vi.mocked(noticesApi.draftNotice).mockResolvedValue(draft("School is closed on 5 Oct."));
    const user = userEvent.setup();
    renderWithProviders(<NoticeDrafter />);

    await user.type(screen.getByLabelText(/what should it say/i), "Holiday");
    await user.click(screen.getByRole("button", { name: /draft with ai/i }));
    await screen.findByLabelText("Notice text");
    await user.click(screen.getByRole("button", { name: /submit for approval/i }));
    await user.click(screen.getByRole("button", { name: /^submit$/i }));

    await waitFor(() =>
      expect(contentApi.createContent).toHaveBeenCalledWith({
        kind: "Notice",
        title: "School closed",
        body: "School is closed on 5 Oct.",
        audience: "everyone",
        aiGenerated: true,
        sourceFeature: "generate-notification",
      }),
    );
    expect(notificationsApi.postAnnouncement).not.toHaveBeenCalled();
  });

  it("shows the server's reason when drafting fails", async () => {
    signIn("teacher");
    vi.mocked(noticesApi.draftNotice).mockRejectedValue(new Error("You have reached your daily AI request limit."));
    const user = userEvent.setup();
    renderWithProviders(<NoticeDrafter />);

    await user.click(screen.getByRole("button", { name: /remind parents about pending fees/i }));
    await user.click(screen.getByRole("button", { name: /draft with ai/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("daily AI request limit");
  });
});
