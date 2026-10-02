import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders, signIn, signOut } from "@/test/utils";
import AssistantTab from "./AssistantTab";
import * as assistantApi from "../assistant/api";

vi.mock("../assistant/api", () => ({
  sendAssistantMessage: vi.fn(),
  listConversations: vi.fn(async () => []),
  getConversation: vi.fn(),
  deleteConversation: vi.fn(),
  AI_MOCK_ENABLED: false,
}));
vi.mock("@/features/parent-portal/api", () => ({ getMyChildren: vi.fn(async () => []) }));
vi.mock("react-hot-toast", () => ({ default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

describe("AssistantTab", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(signOut);

  it("shows suggested questions for the role and sends one", async () => {
    signIn("teacher");
    vi.mocked(assistantApi.sendAssistantMessage).mockResolvedValue({ conversationId: "c1", reply: "12 students are absent.", sources: ["attendance"] });
    const user = userEvent.setup();
    renderWithProviders(<AssistantTab />);

    await user.click(screen.getByRole("button", { name: "How many students are absent today?" }));

    expect(await screen.findByText("12 students are absent.")).toBeInTheDocument();
    expect(screen.getByText("Attendance")).toBeInTheDocument();
    // React Query passes extra arguments to the mutation function, so look at the first one only.
    expect(vi.mocked(assistantApi.sendAssistantMessage).mock.calls[0][0]).toEqual({ conversationId: undefined, message: "How many students are absent today?", studentId: undefined });
  });

  it("keeps the conversation id for follow-up questions", async () => {
    signIn("student");
    vi.mocked(assistantApi.sendAssistantMessage).mockResolvedValue({ conversationId: "c1", reply: "ok", sources: [] });
    const user = userEvent.setup();
    renderWithProviders(<AssistantTab />);

    await user.type(screen.getByLabelText("Message"), "first{enter}");
    await screen.findByText("ok");
    await user.type(screen.getByLabelText("Message"), "second{enter}");

    await waitFor(() => expect(assistantApi.sendAssistantMessage).toHaveBeenCalledTimes(2));
    expect(vi.mocked(assistantApi.sendAssistantMessage).mock.calls[1][0]).toMatchObject({ conversationId: "c1", message: "second" });
  });

  it("shows the error in the conversation and keeps the input usable", async () => {
    signIn("student");
    vi.mocked(assistantApi.sendAssistantMessage).mockRejectedValue(new Error("You have reached your daily AI request limit."));
    const user = userEvent.setup();
    renderWithProviders(<AssistantTab />);

    await user.type(screen.getByLabelText("Message"), "hello{enter}");

    expect(await screen.findByText("You have reached your daily AI request limit.")).toBeInTheDocument();
    expect(screen.getByLabelText("Message")).toBeEnabled();
  });

  it("does not send an empty message", async () => {
    signIn("student");
    const user = userEvent.setup();
    renderWithProviders(<AssistantTab />);

    expect(screen.getByRole("button", { name: /send/i })).toBeDisabled();
    await user.type(screen.getByLabelText("Message"), "   {enter}");

    expect(assistantApi.sendAssistantMessage).not.toHaveBeenCalled();
  });

  it("shows a thinking indicator while waiting", async () => {
    signIn("student");
    let release!: (v: { conversationId: string; reply: string; sources: [] }) => void;
    vi.mocked(assistantApi.sendAssistantMessage).mockReturnValue(new Promise((r) => (release = r)));
    const user = userEvent.setup();
    renderWithProviders(<AssistantTab />);

    await user.type(screen.getByLabelText("Message"), "hi{enter}");

    expect(await screen.findByText(/thinking/i)).toBeInTheDocument();
    release({ conversationId: "c", reply: "done", sources: [] });
    await screen.findByText("done");
    expect(screen.queryByText(/thinking/i)).not.toBeInTheDocument();
  });

  describe("history", () => {
    const past = { id: "c9", title: "Fees for October", feature: "chat", studentId: "kid-2", updatedAt: "2026-09-30T08:00:00Z" };

    it("reopens a past conversation and continues it", async () => {
      signIn("student");
      vi.mocked(assistantApi.listConversations).mockResolvedValue([past]);
      vi.mocked(assistantApi.getConversation).mockResolvedValue({
        id: "c9", title: past.title,
        messages: [
          { role: "user", content: "What fees are due?", sources: [], createdAt: "2026-09-30T08:00:00Z" },
          { role: "assistant", content: "Tuition of 600 is due.", sources: ["fees", "unknown-tool"], createdAt: "2026-09-30T08:00:05Z" },
        ],
      });
      vi.mocked(assistantApi.sendAssistantMessage).mockResolvedValue({ conversationId: "c9", reply: "Due on 10 October.", sources: [] });
      const user = userEvent.setup();
      renderWithProviders(<AssistantTab />);

      await user.click(screen.getByRole("button", { name: "History" }));
      await user.click(await screen.findByRole("button", { name: /^fees for october/i }));

      expect(await screen.findByText("Tuition of 600 is due.")).toBeInTheDocument();
      expect(screen.getByText("Fees")).toBeInTheDocument(); // unknown sources are dropped, known ones keep their chip
      await user.type(screen.getByLabelText("Message"), "When?{enter}");
      await waitFor(() => expect(assistantApi.sendAssistantMessage).toHaveBeenCalled());
      expect(vi.mocked(assistantApi.sendAssistantMessage).mock.calls[0][0]).toMatchObject({ conversationId: "c9", message: "When?" });
    });

    it("starts a fresh conversation with New chat", async () => {
      signIn("student");
      vi.mocked(assistantApi.sendAssistantMessage).mockResolvedValue({ conversationId: "c1", reply: "first answer", sources: [] });
      const user = userEvent.setup();
      renderWithProviders(<AssistantTab />);

      expect(screen.getByRole("button", { name: /new chat/i })).toBeDisabled();
      await user.type(screen.getByLabelText("Message"), "first{enter}");
      await screen.findByText("first answer");
      await user.click(screen.getByRole("button", { name: /new chat/i }));

      expect(screen.queryByText("first answer")).not.toBeInTheDocument();
      await user.type(screen.getByLabelText("Message"), "second{enter}");
      await waitFor(() => expect(assistantApi.sendAssistantMessage).toHaveBeenCalledTimes(2));
      expect(vi.mocked(assistantApi.sendAssistantMessage).mock.calls[1][0]).toMatchObject({ conversationId: undefined });
    });

    it("deletes a conversation after confirmation", async () => {
      signIn("student");
      vi.mocked(assistantApi.listConversations).mockResolvedValue([past]);
      vi.mocked(assistantApi.deleteConversation).mockResolvedValue();
      const user = userEvent.setup();
      renderWithProviders(<AssistantTab />);

      await user.click(screen.getByRole("button", { name: "History" }));
      await user.click(await screen.findByRole("button", { name: /delete conversation: fees for october/i }));
      await user.click(screen.getByRole("button", { name: "Delete" }));

      await waitFor(() => expect(vi.mocked(assistantApi.deleteConversation).mock.calls[0][0]).toBe("c9"));
    });
  });
});
