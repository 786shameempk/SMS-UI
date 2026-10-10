import userEvent from "@testing-library/user-event";
import { screen } from "@testing-library/react";
import type { ModulePermissions } from "@/types/auth";
import { renderWithProviders, signIn, signOut } from "@/test/utils";
import AssistantChat from "./AssistantChat";
import * as stream from "../assistant/stream";

vi.mock("virtual:help-catalog", async () => ({ default: (await import("@/features/help/testCatalog")).TEST_CATALOG }));
vi.mock("../assistant/api", () => ({ sendAssistantMessage: vi.fn(), listConversations: vi.fn(async () => []), getConversation: vi.fn(), deleteConversation: vi.fn(), AI_MOCK_ENABLED: false }));
vi.mock("../assistant/stream", async (original) => ({ ...(await original<typeof import("../assistant/stream")>()), streamAssistantMessage: vi.fn() }));
vi.mock("../capabilities", () => ({ useAiCapabilities: () => ({ capabilities: { streaming: true }, can: () => true, unsupported: () => false }) }));
vi.mock("@/features/parent-portal/api", () => ({ getMyChildren: vi.fn(async () => []) }));

const perms = (...on: string[]) => Object.fromEntries(on.map((k) => [k, true])) as unknown as ModulePermissions;

/** The guide is fetched when the chat opens; wait for it so a question is not sent to the AI service instead. */
async function guideLoaded() {
  await import("@/features/help/answer");
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("Ask School AI answering from the guide", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(signOut);

  it("answers a how-to question from the documentation, with no AI request", async () => {
    signIn("teacher", {}, perms("students"));
    const user = userEvent.setup();
    renderWithProviders(<AssistantChat />);
    await guideLoaded();

    await user.type(screen.getByLabelText("Message"), "How do I add a student?{enter}");

    expect(await screen.findByText("Open Students.")).toBeInTheDocument();
    expect(screen.getByText("Menu:").parentElement).toHaveTextContent("Academics → Students");
    expect(screen.getByRole("link", { name: /Read the full guide/ })).toHaveAttribute("href", "/help/a/students-add");
    expect(stream.streamAssistantMessage).not.toHaveBeenCalled();
  });

  it("tells a reader their account cannot open the screen, instead of giving steps", async () => {
    signIn("teacher", {}, perms("homework"));
    const user = userEvent.setup();
    renderWithProviders(<AssistantChat />);
    await guideLoaded();

    await user.type(screen.getByLabelText("Message"), "take me to add a student{enter}");

    expect(await screen.findByText("I can't open Add a new student for you")).toBeInTheDocument();
    expect(screen.queryByText("Open Students.")).not.toBeInTheDocument();
    expect(stream.streamAssistantMessage).not.toHaveBeenCalled();
  });

  it("sends everything the guide does not cover to the AI service as before", async () => {
    signIn("teacher", {}, perms("students"));
    vi.mocked(stream.streamAssistantMessage).mockResolvedValue({ conversationId: "c1", reply: "Monday starts with maths.", sources: ["timetable"] });
    const user = userEvent.setup();
    renderWithProviders(<AssistantChat />);
    await guideLoaded();

    await user.type(screen.getByLabelText("Message"), "what is on the timetable on monday{enter}");

    expect(await screen.findByText("Monday starts with maths.")).toBeInTheDocument();
    expect(stream.streamAssistantMessage).toHaveBeenCalledTimes(1);
  });

  it("does not use the guide for the admin analytics assistant", async () => {
    signIn("admin", {}, perms("students", "administration"));
    vi.mocked(stream.streamAssistantMessage).mockResolvedValue({ conversationId: "c2", reply: "39% collected.", sources: ["fees"] });
    const user = userEvent.setup();
    renderWithProviders(<AssistantChat mode="analytics" />);
    await guideLoaded();

    await user.type(screen.getByLabelText("Message"), "how do I add a student{enter}");

    expect(await screen.findByText("39% collected.")).toBeInTheDocument();
    expect(stream.streamAssistantMessage).toHaveBeenCalledTimes(1);
  });

  it("lets the reader pick between near-identical tasks, then answers the one chosen", async () => {
    signIn("admin", {}, perms("students"));
    const user = userEvent.setup();
    renderWithProviders(<AssistantChat />);
    await guideLoaded();

    await user.type(screen.getByLabelText("Message"), "student guardian{enter}");
    await user.click(await screen.findByRole("button", { name: "Add a guardian" }));

    expect(await screen.findAllByText(/Source: the School Sphere guide/)).not.toHaveLength(0);
    expect(stream.streamAssistantMessage).not.toHaveBeenCalled();
  });
});
