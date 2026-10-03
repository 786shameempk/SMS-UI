import userEvent from "@testing-library/user-event";
import { screen } from "@testing-library/react";
import { renderWithProviders, signIn, signOut } from "@/test/utils";
import InsightExplanationPanel from "./InsightExplanationPanel";
import AtRiskExplanationPanel from "./AtRiskExplanationPanel";
import * as generationApi from "../../generation/api";

vi.mock("../../generation/api", () => ({ explainInsight: vi.fn(), explainAtRisk: vi.fn() }));
vi.mock("react-hot-toast", () => ({ default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

const result = <T,>(content: T) => ({ content, aiGenerated: true, status: "Draft" as const, model: "m" });

describe("AI explanations", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(signOut);

  it("explains an insight area, keeping findings, possible reasons and next steps apart", async () => {
    signIn("admin");
    vi.mocked(generationApi.explainInsight).mockResolvedValue(
      result({
        area: "Fees",
        summary: "39.1% of billed fees are collected.",
        findings: [{ finding: "Most dues are tuition", evidence: "1,400 outstanding" }],
        possibleReasons: ["Reminders may not have gone out"],
        suggestedActions: ["Send reminders for overdue tuition"],
        metrics: { collectionRate: 39.1 },
      }),
    );
    const user = userEvent.setup();
    renderWithProviders(<InsightExplanationPanel area="fees" />);

    await user.click(screen.getByRole("button", { name: /explain with ai/i }));

    expect(await screen.findByText("39.1% of billed fees are collected.")).toBeInTheDocument();
    expect(generationApi.explainInsight).toHaveBeenCalledWith("Fees");
    expect(screen.getByText("Possible reasons to check")).toBeInTheDocument();
    expect(screen.getByText("Send reminders for overdue tuition")).toBeInTheDocument();
  });

  it("shows the server's reason when an area can't be explained", async () => {
    signIn("admin");
    vi.mocked(generationApi.explainInsight).mockRejectedValue(new Error("There isn't enough data in this area yet to explain."));
    const user = userEvent.setup();
    renderWithProviders(<InsightExplanationPanel area="admissions" />);

    await user.click(screen.getByRole("button", { name: /explain with ai/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("enough data");
  });

  it("explains why a student is flagged with labelled factors and a family conversation starter", async () => {
    signIn("teacher");
    vi.mocked(generationApi.explainAtRisk).mockResolvedValue(
      result({
        studentId: "s1",
        studentName: "Asha N",
        riskScore: 65,
        flags: [{ reason: "low_attendance" as const, detail: "Present 50%" }],
        summary: "The student has missed half of recent school days.",
        factors: [{ reason: "low_attendance", explanation: "Present on 1 of 2 marked days." }],
        interventions: ["Check in with the student this week"],
        familyConversationStarter: "We would love to hear how things are going.",
        metrics: {},
      }),
    );
    const user = userEvent.setup();
    renderWithProviders(<AtRiskExplanationPanel studentId="s1" />);

    await user.click(screen.getByRole("button", { name: /why flagged/i }));

    expect(await screen.findByText("Present on 1 of 2 marked days.")).toBeInTheDocument();
    expect(generationApi.explainAtRisk).toHaveBeenCalledWith("s1");
    expect(screen.getByText("Low attendance:")).toBeInTheDocument();
    expect(screen.getByText(/We would love to hear how things are going/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copy conversation starter/i })).toBeInTheDocument();
  });
});
