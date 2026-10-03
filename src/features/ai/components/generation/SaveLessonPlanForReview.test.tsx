import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test/utils";
import SaveLessonPlanForReview from "./SaveLessonPlanForReview";
import * as contentApi from "../../content/api";
import type { LessonPlan } from "../../generation/types";

vi.mock("../../content/api", () => ({ CONTENT_KEY: ["ai", "content"], createContent: vi.fn(async () => ({ id: "c1" })) }));
vi.mock("react-hot-toast", () => ({ default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

const plan: LessonPlan = {
  title: "Adding fractions",
  learningObjectives: ["Add fractions with like denominators"],
  introduction: { title: "Warm-up", minutes: 5, description: "Pizza slices" },
  teachingActivities: [{ title: "Model", minutes: 15, description: "Worked examples" }],
  examples: ["1/4 + 2/4"],
  studentActivities: [{ title: "Pairs", minutes: 20, description: "Practice sheet" }],
  assessment: "Exit ticket",
  homework: "Five sums",
  materialsRequired: ["Fraction strips"],
  differentiationSuggestions: ["Use visuals"],
};

describe("SaveLessonPlanForReview", () => {
  it("sends the plan as text with its class, subject and week for review", async () => {
    const user = userEvent.setup();
    renderWithProviders(<SaveLessonPlanForReview plan={plan} classId="c-6" subjectId="s-math" />);

    const week = screen.getByLabelText("Week of");
    await user.clear(week);
    await user.type(week, "2026-10-05");
    await user.click(screen.getByRole("button", { name: /save for review/i }));

    await waitFor(() => expect(contentApi.createContent).toHaveBeenCalled());
    const body = vi.mocked(contentApi.createContent).mock.calls[0][0];
    expect(body).toMatchObject({ kind: "LessonPlan", title: "Adding fractions", aiGenerated: true, sourceFeature: "generate-lesson-plan" });
    expect(JSON.parse(body.metadata!)).toEqual({ classId: "c-6", subjectId: "s-math", weekOf: "2026-10-05" });
    expect(body.body).toContain("- Warm-up (5 min): Pizza slices");
    expect(body.body).toContain("Assessment: Exit ticket");
    expect(await screen.findByText("Saved for review.")).toBeInTheDocument();
  });
});
