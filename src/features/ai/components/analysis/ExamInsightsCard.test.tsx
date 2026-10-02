import userEvent from "@testing-library/user-event";
import { screen, within } from "@testing-library/react";
import { renderWithProviders } from "@/test/utils";
import ExamInsightsCard from "./ExamInsightsCard";
import * as generationApi from "../../generation/api";

vi.mock("../../generation/api", () => ({ analyzeOnlineExam: vi.fn() }));

const result = {
  content: {
    summary: "The class did well adding fractions but struggled to simplify them.",
    difficultConcepts: [{ concept: "Simplifying fractions", questionNumbers: [2, 3], evidence: "Only 30-40% correct" }],
    revisionTopics: [{ topic: "Simplifying", reason: "Lowest topic average", suggestion: "Practise finding common factors" }],
    teachingSuggestions: ["Use fraction strips"],
    studentsSubmitted: 24,
    classAverage: 58.5,
    topics: [
      { topic: "Simplifying", questionNumbers: [2, 3], averageCorrect: 35 },
      { topic: "Adding fractions", questionNumbers: [1], averageCorrect: 90 },
    ],
    weakestQuestions: [],
  },
  aiGenerated: true,
  status: "Draft" as const,
  model: "m",
};

describe("ExamInsightsCard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("only calls the AI when asked, then shows concepts with question numbers, revision topics and topic results", async () => {
    vi.mocked(generationApi.analyzeOnlineExam).mockResolvedValue(result);
    const user = userEvent.setup();
    renderWithProviders(<ExamInsightsCard examId="e1" />);

    expect(generationApi.analyzeOnlineExam).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: /explain with ai/i }));

    expect(await screen.findByLabelText("Summary")).toHaveTextContent("struggled to simplify");
    expect(generationApi.analyzeOnlineExam).toHaveBeenCalledWith("e1");
    const concepts = screen.getByRole("region", { name: "Difficult concepts" });
    expect(within(concepts).getByText("Q2")).toBeInTheDocument();
    expect(within(concepts).getByText("Q3")).toBeInTheDocument();
    expect(screen.getByText("Practise finding common factors")).toBeInTheDocument();
    const topics = screen.getByRole("region", { name: "Results by topic" });
    expect(within(topics).getByText("35%")).toBeInTheDocument();
    expect(screen.getByText(/from 24 submissions/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /refresh/i })).toBeInTheDocument();
  });

  it("shows why there are no insights", async () => {
    vi.mocked(generationApi.analyzeOnlineExam).mockRejectedValue(new Error("No students have submitted this exam yet, so there is nothing to analyse."));
    const user = userEvent.setup();
    renderWithProviders(<ExamInsightsCard examId="e1" />);

    await user.click(screen.getByRole("button", { name: /explain with ai/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("nothing to analyse");
  });
});
