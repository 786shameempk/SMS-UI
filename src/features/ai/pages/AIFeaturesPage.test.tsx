import { screen } from "@testing-library/react";
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
});
