import userEvent from "@testing-library/user-event";
import { screen } from "@testing-library/react";
import { allModules, renderWithProviders, signIn, signOut } from "@/test/utils";
import AskAiLauncher from "./AskAiLauncher";

const caps = vi.hoisted(() => ({ chat: true }));
vi.mock("../capabilities", () => ({
  useAiCapabilities: () => ({ can: (f: string) => f === "chat" && caps.chat, unsupported: () => false, languages: [] }),
}));
vi.mock("./AssistantChat", () => ({
  default: ({ page }: { page?: string }) => <div data-testid="chat">chat on {page ?? "unknown"}</div>,
}));

describe("AskAiLauncher", () => {
  beforeEach(() => {
    caps.chat = true;
  });
  afterEach(signOut);

  it("opens the assistant with the current page as context and closes on Escape", async () => {
    signIn("teacher");
    const user = userEvent.setup();
    renderWithProviders(<AskAiLauncher />, { route: "/attendance/register" });

    await user.click(screen.getByRole("button", { name: "Ask School AI" }));
    expect(screen.getByRole("dialog", { name: "Ask School AI" })).toBeInTheDocument();
    expect(screen.getByTestId("chat")).toHaveTextContent("chat on Attendance");
    expect(screen.getByText("Asking from Attendance")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(await screen.findByRole("button", { name: "Ask School AI" })).toHaveAttribute("aria-expanded", "false");
  });

  it("offers a single close button while open: the panel's X", async () => {
    signIn("teacher");
    const user = userEvent.setup();
    renderWithProviders(<AskAiLauncher />, { route: "/attendance" });

    await user.click(screen.getByRole("button", { name: "Ask School AI" }));
    expect(screen.getAllByRole("button", { name: "Close Ask School AI" })).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Ask School AI" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Close Ask School AI" }));
    expect(await screen.findByRole("button", { name: "Ask School AI" })).toBeInTheDocument();
  });

  it("is hidden when the school turned AI off, chat isn't available, or on the AI page itself", () => {
    signIn("teacher", {}, { ...allModules(), aiFeatures: false });
    const { unmount } = renderWithProviders(<AskAiLauncher />, { route: "/attendance" });
    expect(screen.queryByRole("button", { name: /ask school ai/i })).not.toBeInTheDocument();
    unmount();

    signIn("teacher");
    caps.chat = false;
    const second = renderWithProviders(<AskAiLauncher />, { route: "/attendance" });
    expect(screen.queryByRole("button", { name: /ask school ai/i })).not.toBeInTheDocument();
    second.unmount();

    caps.chat = true;
    renderWithProviders(<AskAiLauncher />, { route: "/ai" });
    expect(screen.queryByRole("button", { name: /ask school ai/i })).not.toBeInTheDocument();
  });
});
