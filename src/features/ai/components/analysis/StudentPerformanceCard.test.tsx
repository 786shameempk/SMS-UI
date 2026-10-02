import userEvent from "@testing-library/user-event";
import { screen, within } from "@testing-library/react";
import { renderWithProviders } from "@/test/utils";
import StudentPerformanceCard from "./StudentPerformanceCard";
import * as generationApi from "../../generation/api";

vi.mock("../../generation/api", () => ({ analyzeStudentPerformance: vi.fn() }));

const result = {
  content: {
    summary: "The student has improved steadily, rising from 52% to 70%.",
    strengths: [{ area: "Maths", evidence: "Up from 60% to 88%" }],
    areasToImprove: [{ area: "Science", evidence: "Down from 78% to 55%", suggestion: "Short weekly revision quizzes" }],
    talkingPoints: ["Celebrate the Maths progress"],
    exams: [
      { exam: "Unit 1", percentage: 52, grade: "C" },
      { exam: "Unit 3", percentage: 70, grade: "B" },
    ],
    recentExamNames: ["Unit 2", "Midterm", "Unit 3"],
    subjects: [
      { subject: "Maths", percentages: [60, 75, 88], change: 28 },
      { subject: "Science", percentages: [78, null, 55], change: -23 },
      { subject: "English", percentages: [70, 71, 71], change: 1 },
    ],
    attendancePercent: 75,
    attendanceDays: 4,
  },
  aiGenerated: true,
  status: "Draft" as const,
  model: "m",
};

describe("StudentPerformanceCard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("summarises progress on request and shows subject trends with labelled changes", async () => {
    vi.mocked(generationApi.analyzeStudentPerformance).mockResolvedValue(result);
    const user = userEvent.setup();
    renderWithProviders(<StudentPerformanceCard studentId="s1" />);

    expect(generationApi.analyzeStudentPerformance).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: /summarise progress/i }));

    expect(await screen.findByLabelText("Summary")).toHaveTextContent("rising from 52% to 70%");
    expect(generationApi.analyzeStudentPerformance).toHaveBeenCalledWith("s1");
    expect(within(screen.getByRole("region", { name: "Areas to improve" })).getByText("Short weekly revision quizzes")).toBeInTheDocument();
    expect(screen.getByText("Celebrate the Maths progress")).toBeInTheDocument();

    const trends = screen.getByRole("region", { name: "Subject trends" });
    expect(within(trends).getByText("up 28")).toBeInTheDocument();
    expect(within(trends).getByText("down 23")).toBeInTheDocument();
    expect(within(trends).getByText("steady")).toBeInTheDocument();
    expect(within(trends).getByText("—")).toBeInTheDocument(); // absent in the Midterm
    expect(screen.getByText(/75% of 4 marked days/)).toBeInTheDocument();
  });

  it("shows why no summary could be made", async () => {
    vi.mocked(generationApi.analyzeStudentPerformance).mockRejectedValue(new Error("This student has no exam results yet, so there is nothing to analyse."));
    const user = userEvent.setup();
    renderWithProviders(<StudentPerformanceCard studentId="s1" />);

    await user.click(screen.getByRole("button", { name: /summarise progress/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("nothing to analyse");
  });
});
