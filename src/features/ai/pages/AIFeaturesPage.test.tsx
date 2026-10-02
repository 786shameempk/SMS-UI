import { screen } from "@testing-library/react";
import { renderWithProviders, signIn, signOut } from "@/test/utils";
import AIFeaturesPage from "./AIFeaturesPage";

vi.mock("../components/AssistantTab", () => ({ default: () => <div>assistant</div> }));
vi.mock("../components/InsightsTab", () => ({ default: () => <div>insights</div> }));
vi.mock("../components/AtRiskStudentsTab", () => ({ default: () => <div>at-risk</div> }));
vi.mock("../components/ContentAssistantTab", () => ({ default: () => <div>content</div> }));
vi.mock("../components/GeneratorsTab", () => ({ default: () => <div>generators</div> }));
vi.mock("../components/study/StudyAssistantTab", () => ({ default: () => <div>study</div> }));
vi.mock("../components/study/StudyMaterialsPanel", () => ({ default: () => <div>materials</div> }));
vi.mock("../components/UsageTab", () => ({ default: () => <div>usage</div> }));

describe("AIFeaturesPage authorization", () => {
  afterEach(signOut);

  it.each(["teacher", "admin", "principal"] as const)("shows Teacher Tools to %s", (role) => {
    signIn(role);
    renderWithProviders(<AIFeaturesPage />);
    expect(screen.getByRole("tab", { name: "Teacher Tools" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Study Materials" })).toBeInTheDocument();
  });

  it.each(["parent", "student"] as const)("hides Teacher Tools from %s", (role) => {
    signIn(role);
    renderWithProviders(<AIFeaturesPage />);
    expect(screen.queryByRole("tab", { name: "Teacher Tools" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Study Materials" })).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Study Assistant" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Ask School AI" })).toBeInTheDocument();
  });

  it.each([["admin", true], ["principal", true], ["teacher", false], ["parent", false]] as const)("AI Usage tab for %s: %s", (role, visible) => {
    signIn(role);
    renderWithProviders(<AIFeaturesPage />);
    expect(Boolean(screen.queryByRole("tab", { name: "AI Usage" }))).toBe(visible);
  });
});
