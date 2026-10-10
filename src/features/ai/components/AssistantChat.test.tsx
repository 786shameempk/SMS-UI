import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders, signIn, signOut } from "@/test/utils";
import AssistantChat from "./AssistantChat";
import * as stream from "../assistant/stream";
import type { AssistantStreamEvent } from "../assistant/stream";

vi.mock("../assistant/api", () => ({
  sendAssistantMessage: vi.fn(),
  listConversations: vi.fn(async () => []),
  getConversation: vi.fn(),
  deleteConversation: vi.fn(),
  AI_MOCK_ENABLED: false,
}));
vi.mock("../assistant/stream", async (original) => ({ ...(await original<typeof import("../assistant/stream")>()), streamAssistantMessage: vi.fn() }));
vi.mock("../capabilities", () => ({
  useAiCapabilities: () => ({ capabilities: { streaming: true }, can: () => true, unsupported: () => false }),
}));
vi.mock("@/features/parent-portal/api", () => ({ getMyChildren: vi.fn(async () => []) }));
vi.mock("react-hot-toast", () => ({ default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

type Emit = (e: AssistantStreamEvent) => void;

describe("AssistantChat streaming", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(signOut);

  it("shows text as it arrives, a lookup status, and the final answer with its sources", async () => {
    signIn("parent");
    let emit!: Emit;
    let finish!: () => void;
    vi.mocked(stream.streamAssistantMessage).mockImplementation((_req, onEvent) => {
      emit = onEvent;
      return new Promise((resolve) => (finish = () => resolve({ conversationId: "c1", reply: "Rs 600 is due on 10 Oct.", sources: ["fees"] })));
    });
    const user = userEvent.setup();
    renderWithProviders(<AssistantChat page="Fees" />);

    await user.type(screen.getByLabelText("Message"), "fees?{enter}");
    emit({ type: "start", conversationId: "c1" });
    emit({ type: "lookup", source: "fees" });
    expect(await screen.findByText("Checking fees…")).toBeInTheDocument();
    emit({ type: "delta", text: "Rs 600 " });
    expect(await screen.findByText("Rs 600")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /stop/i })).toBeInTheDocument();

    finish();
    expect(await screen.findByText("Rs 600 is due on 10 Oct.")).toBeInTheDocument();
    expect(screen.getByText("Fees")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send/i })).toBeInTheDocument();
    expect(vi.mocked(stream.streamAssistantMessage).mock.calls[0][0]).toMatchObject({ message: "fees?", page: "Fees" });
  });

  it("talks to the analytics assistant in analytics mode, without a child switcher", async () => {
    signIn("admin");
    vi.mocked(stream.streamAssistantMessage).mockResolvedValue({ conversationId: "c9", reply: "39% collected.", sources: ["fees"] });
    const user = userEvent.setup();
    renderWithProviders(<AssistantChat mode="analytics" />);

    await user.click(screen.getByRole("button", { name: "How is fee collection this term?" }));

    expect(await screen.findByText("39% collected.")).toBeInTheDocument();
    expect(vi.mocked(stream.streamAssistantMessage).mock.calls[0][3]).toBe("analytics");
    expect(vi.mocked(stream.streamAssistantMessage).mock.calls[0][0].studentId).toBeUndefined();
  });

  it("stops generating and keeps what was written", async () => {
    signIn("student");
    vi.mocked(stream.streamAssistantMessage).mockImplementation((_req, onEvent, signal) => {
      onEvent({ type: "delta", text: "The timetable for Monday" });
      return new Promise((_, reject) => signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError"))));
    });
    const user = userEvent.setup();
    renderWithProviders(<AssistantChat />);

    await user.type(screen.getByLabelText("Message"), "monday?{enter}");
    await screen.findByText("The timetable for Monday");
    await user.click(screen.getByRole("button", { name: /stop/i }));

    expect(await screen.findByText(/stopped\. this answer is incomplete/i)).toBeInTheDocument();
    expect(screen.getByText("The timetable for Monday")).toBeInTheDocument();
  });

  it("keeps the partial answer after a failure and retries the same question", async () => {
    signIn("student");
    vi.mocked(stream.streamAssistantMessage)
      .mockRejectedValueOnce(new stream.AssistantStreamError("The connection was interrupted before the answer finished.", null, "Half", "c1"))
      .mockResolvedValueOnce({ conversationId: "c1", reply: "Full answer.", sources: [] });
    const user = userEvent.setup();
    renderWithProviders(<AssistantChat />);

    await user.type(screen.getByLabelText("Message"), "why is the sky blue{enter}");
    expect(await screen.findByText(/connection was interrupted/i)).toBeInTheDocument();
    expect(screen.getByText("Half")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /retry/i }));

    expect(await screen.findByText("Full answer.")).toBeInTheDocument();
    await waitFor(() => expect(stream.streamAssistantMessage).toHaveBeenCalledTimes(2));
    // The retry continues the same conversation.
    expect(vi.mocked(stream.streamAssistantMessage).mock.calls[1][0]).toMatchObject({ message: "why is the sky blue", conversationId: "c1" });
  });
});
