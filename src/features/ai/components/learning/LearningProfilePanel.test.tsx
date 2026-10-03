import userEvent from "@testing-library/user-event";
import { screen } from "@testing-library/react";
import { renderWithProviders, signIn, signOut } from "@/test/utils";
import LearningProfilePanel from "./LearningProfilePanel";
import * as learningApi from "../../learning/api";
import type { ObservedLearningProfile } from "../../learning/types";

vi.mock("../../learning/api", () => ({ getLearningProfile: vi.fn(), interpretLearningProfile: vi.fn() }));
const caps = vi.hoisted(() => ({ ai: true }));
vi.mock("../../capabilities", () => ({ useAiCapabilities: () => ({ can: () => caps.ai, allowed: () => true, unsupported: () => false }) }));

const observed: ObservedLearningProfile = {
  studentId: "s1",
  firstName: "Asha",
  attendanceWindowDays: 90,
  attendancePercent: 66.7,
  attendanceDaysMarked: 12,
  recentAttendancePercent: 60,
  exams: [{ exam: "Term 1", percentage: 81, grade: "A" }],
  cgpa: 7.1,
  resultsChange: 19,
  homeworkAssigned: 4,
  homeworkSubmitted: 1,
  homeworkOverdue: 2,
  homeworkBySubject: [],
  observations: [
    { kind: "attention", area: "attendance", text: "Attendance is 66.7% over the last 90 days, below the 75% guideline." },
    { kind: "positive", area: "results", text: "Results improved by 19 points." },
  ],
  generatedAt: "2026-10-03T09:00:00Z",
};

describe("LearningProfilePanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    caps.ai = true;
  });
  afterEach(signOut);

  it("shows the observed records first and AI suggestions only on request, kept separate", async () => {
    signIn("parent");
    vi.mocked(learningApi.getLearningProfile).mockResolvedValue(observed);
    vi.mocked(learningApi.interpretLearningProfile).mockResolvedValue({
      content: { observed, summary: "Results are rising.", strengths: ["Up 19 points"], focusAreas: [{ area: "Attendance", evidence: "66.7%", suggestion: "Every school day" }], studyTips: ["Do maths homework the day it is set"] },
      aiGenerated: true,
      status: "Draft",
      model: "m",
    });
    const user = userEvent.setup();
    renderWithProviders(<LearningProfilePanel studentId="s1" />);

    expect(await screen.findByText("66.7%")).toBeInTheDocument();
    expect(screen.getByText(/below the 75% guideline/)).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "What the records show" })).toHaveTextContent("No AI");
    expect(learningApi.interpretLearningProfile).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /get ai study suggestions/i }));
    expect(await screen.findByText("Results are rising.")).toBeInTheDocument();
    expect(learningApi.interpretLearningProfile).toHaveBeenCalledWith("s1");
    expect(screen.getByText("Do maths homework the day it is set")).toBeInTheDocument();
  });

  it("still shows the records when the AI provider can't generate", async () => {
    signIn("student");
    caps.ai = false;
    vi.mocked(learningApi.getLearningProfile).mockResolvedValue(observed);
    renderWithProviders(<LearningProfilePanel />);

    expect(await screen.findByText("+19 pts")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /ai study suggestions/i })).not.toBeInTheDocument();
    expect(learningApi.getLearningProfile).toHaveBeenCalledWith(undefined);
  });
});
