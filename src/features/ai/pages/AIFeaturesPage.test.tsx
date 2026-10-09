import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders, signIn, signOut } from "@/test/utils";
import AIFeaturesPage from "./AIFeaturesPage";
import type { AiFeatureKey } from "../capabilities";

vi.mock("../components/AssistantTab", () => ({ default: () => <div>assistant</div> }));
vi.mock("../components/InsightsTab", () => ({ default: () => <div>insights</div> }));
vi.mock("../components/AtRiskStudentsTab", () => ({ default: () => <div>at-risk</div> }));
vi.mock("../components/ContentAssistantTab", () => ({ default: () => <div>content</div> }));
vi.mock("../components/GeneratorsTab", () => ({ default: () => <div>generators</div> }));
vi.mock("../components/study/StudyAssistantTab", () => ({ default: () => <div>study</div> }));
vi.mock("../components/study/StudyMaterialsPanel", () => ({ default: () => <div>materials</div> }));
vi.mock("../components/UsageTab", () => ({ default: () => <div>usage</div> }));
vi.mock("../components/learning/LearningProfilePanel", () => ({ default: () => <div>learning profile</div> }));
vi.mock("../components/content/ContentReviewTab", () => ({ default: () => <div>review</div> }));
vi.mock("../components/AssistantChat", () => ({ default: ({ mode }: { mode?: string }) => <div>chat {mode}</div> }));

// What the backend reports, per test.
let features: Partial<Record<AiFeatureKey, { allowed: boolean; available: boolean }>> = {};
vi.mock("../capabilities", () => ({
  useAiCapabilities: () => ({
    can: (f: AiFeatureKey) => Boolean(features[f]?.available),
    unsupported: (f: AiFeatureKey) => Boolean(features[f]?.allowed && !features[f]?.available),
    allowed: (f: AiFeatureKey) => Boolean(features[f]?.allowed),
  }),
}));

const on = { allowed: true, available: true };
const unsupportedHere = { allowed: true, available: false };

describe("AIFeaturesPage", () => {
  beforeEach(() => localStorage.clear());

  afterEach(() => {
    signOut();
    features = {};
  });

  it("shows the AI tabs the backend says this user can use", () => {
    signIn("teacher");
    features = { chat: on, "study-assistant": on, "generate-questions": on, "upload-document": on };
    renderWithProviders(<AIFeaturesPage />);

    for (const name of ["Ask School AI", "Study Assistant", "Teacher Tools", "Study Materials"]) {
      expect(screen.getByRole("tab", { name })).toBeInTheDocument();
    }
    expect(screen.queryByRole("tab", { name: "AI Usage" })).not.toBeInTheDocument();
  });

  it("offers the analytics assistant only when the backend allows it", async () => {
    signIn("admin");
    features = { chat: on, analytics: on };
    const user = userEvent.setup();
    const { unmount } = renderWithProviders(<AIFeaturesPage />);
    await user.click(screen.getByRole("tab", { name: "Analytics Assistant" }));
    expect(screen.getByText("chat analytics")).toBeInTheDocument();
    unmount();

    signIn("teacher");
    features = { chat: on };
    renderWithProviders(<AIFeaturesPage />);
    expect(screen.queryByRole("tab", { name: "Analytics Assistant" })).not.toBeInTheDocument();
  });

  it("hides staff tools from families", () => {
    signIn("parent");
    features = { chat: on, "study-assistant": on };
    renderWithProviders(<AIFeaturesPage />);

    expect(screen.queryByRole("tab", { name: "Teacher Tools" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Study Materials" })).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Study Assistant" })).toBeInTheDocument();
  });

  it("explains when the role may use teacher tools but the AI provider cannot", async () => {
    signIn("teacher");
    features = { chat: on, "generate-questions": unsupportedHere };
    const user = userEvent.setup();
    renderWithProviders(<AIFeaturesPage />);

    await user.click(screen.getByRole("tab", { name: "Teacher Tools" }));

    expect(screen.getByRole("status")).toHaveTextContent("AI teacher tools isn't available with this school's current AI setup");
    expect(screen.queryByText("generators")).not.toBeInTheDocument();
  });

  it("shows AI usage only when the backend allows it", () => {
    signIn("admin");
    features = { chat: on, "view-usage": on };
    renderWithProviders(<AIFeaturesPage />);
    expect(screen.getByRole("tab", { name: "AI Usage" })).toBeInTheDocument();
  });
  it("opens the tab named in the link, and remembers a chosen tab in the address", async () => {
    signIn("admin");
    features = { chat: on, "view-usage": on };
    const user = userEvent.setup();
    renderWithProviders(<AIFeaturesPage />, { route: "/ai?tab=usage" });

    expect(screen.getByRole("tab", { name: "AI Usage" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("usage")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Insights" }));
    expect(screen.getByText("insights")).toBeInTheDocument();
  });

  it("opens on the landing view when the link names a feature the user cannot use", () => {
    signIn("parent");
    features = { chat: on };
    renderWithProviders(<AIFeaturesPage />, { route: "/ai?tab=usage" });

    expect(screen.getByRole("tab", { name: "Overview" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("heading", { level: 2, name: "What would you like to do?" })).toBeInTheDocument();
  });

  it("lands on feature cards for only what this user may use, grouped by purpose", () => {
    signIn("teacher");
    features = { chat: on, "generate-questions": on };
    renderWithProviders(<AIFeaturesPage />);

    expect(screen.getByRole("tablist", { name: "AI features" })).toBeInTheDocument();
    for (const group of ["Ask & learn", "Teach & create"]) expect(screen.getAllByText(group).length).toBeGreaterThan(0);
    // Cards are buttons in the panel; the same features are tabs in the list.
    expect(screen.getAllByRole("button", { name: /Ask School AI/ }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: /Teacher Tools/ }).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /Analytics Assistant/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /AI Usage/ })).not.toBeInTheDocument();
    expect(screen.queryByText("assistant")).not.toBeInTheDocument();
  });

  it("a card opens its feature, and Overview brings the cards back", async () => {
    signIn("teacher");
    features = { chat: on };
    const user = userEvent.setup();
    renderWithProviders(<AIFeaturesPage />);

    await user.click(screen.getAllByRole("button", { name: /Ask School AI/ })[0]);
    expect(screen.getByRole("tab", { name: "Ask School AI" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("assistant")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Ask School AI" })).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Overview" }));
    expect(screen.getByRole("heading", { level: 2, name: "What would you like to do?" })).toBeInTheDocument();
    expect(screen.queryByText("assistant")).not.toBeInTheDocument();
  });

  it("recommends a short row for the role above the full list, only from features the user can use", () => {
    signIn("teacher");
    features = { chat: on, "generate-questions": on };
    renderWithProviders(<AIFeaturesPage />);

    const row = screen.getByRole("region", { name: "Recommended for you" });
    expect(within(row).getAllByRole("button").map((b) => b.textContent)).toEqual([
      expect.stringContaining("Teacher Tools"),
      expect.stringContaining("Content Assistant"),
      expect.stringContaining("Ask School AI"),
    ]);
    // The full catalogue is still below the row.
    expect(screen.getAllByRole("button", { name: /Ask School AI/ })).toHaveLength(2);
  });

  it("brings the feature you used last to the front next time", async () => {
    signIn("teacher");
    features = { chat: on, "generate-questions": on };
    const user = userEvent.setup();
    renderWithProviders(<AIFeaturesPage />);

    await user.click(within(screen.getByRole("region", { name: "Recommended for you" })).getByRole("button", { name: /Ask School AI/ }));
    await user.click(screen.getByRole("tab", { name: "Overview" }));

    const row = screen.getByRole("region", { name: "Recommended for you" });
    expect(within(row).getAllByRole("button")[0]).toHaveTextContent("Ask School AI");
    expect(within(row).getByText("You used this last")).toBeInTheDocument();
  });
});
