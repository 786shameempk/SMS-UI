import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test/utils";
import ClassRemarksDialog from "./ClassRemarksDialog";
import * as examApi from "@/features/examinations/api";
import * as classRemarks from "../../generation/classRemarks";
import type { StudentExamSummary } from "@/features/examinations/types";

vi.mock("react-hot-toast", () => ({ default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));
vi.mock("@/features/examinations/api", () => ({ getRemark: vi.fn(), saveRemark: vi.fn() }));
vi.mock("../../generation/classRemarks", () => ({ draftClassRemarks: vi.fn() }));

const student = (studentId: string, studentName: string, percentage: number): StudentExamSummary => ({
  studentId, studentName, admissionNumber: studentId.toUpperCase(), className: "Grade 7", section: "A", subjects: [],
  totalObtained: percentage, totalMax: 100, percentage, grade: "B", gpa: 7, rank: 1,
});

const results = [student("s1", "Ravi Kumar", 70), student("s2", "Meena S", 85), student("s3", "Arjun P", 40)];

describe("ClassRemarksDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Meena already has a remark.
    vi.mocked(examApi.getRemark).mockImplementation(async (_e, id) => (id === "s2" ? "Excellent term." : ""));
    vi.mocked(examApi.saveRemark).mockResolvedValue();
  });

  it("skips students who already have a remark, lets the teacher edit drafts, and saves only the ticked ones", async () => {
    vi.mocked(classRemarks.draftClassRemarks).mockResolvedValue([
      { studentId: "s1", remark: "Ravi did well.", basedOn: ["Exam marks"], errorCode: null, error: null },
      { studentId: "s3", remark: null, basedOn: [], errorCode: "AI_INVALID_RESPONSE", error: "The AI returned an unusable draft." },
    ]);
    const user = userEvent.setup();
    renderWithProviders(<ClassRemarksDialog open onOpenChange={vi.fn()} examId="e1" examName="Midterm" results={results} />);

    const start = await screen.findByRole("button", { name: "Draft 2 remarks" });
    expect(screen.getByText(/also redraft the 1 student who already has a remark/i)).toBeInTheDocument();
    await user.click(start);

    expect(vi.mocked(classRemarks.draftClassRemarks).mock.calls[0].slice(0, 3)).toEqual(["e1", ["s1", "s3"], { tone: "Encouraging", length: "Medium" }]);
    const ravi = await screen.findByLabelText("Remark for Ravi Kumar");
    expect(screen.getByText("The AI returned an unusable draft.")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Save remark for Arjun P" })).toBeDisabled();

    await user.clear(ravi);
    await user.type(ravi, "Ravi worked hard this term.");
    await user.click(screen.getByRole("button", { name: "Save 1 remark" }));

    await waitFor(() => expect(examApi.saveRemark).toHaveBeenCalledTimes(1));
    expect(examApi.saveRemark).toHaveBeenCalledWith("e1", "s1", "Ravi worked hard this term.");
  });

  it("includes students with remarks when asked and shows what a draft would replace", async () => {
    vi.mocked(classRemarks.draftClassRemarks).mockImplementation(async (_e, ids) => ids.map((studentId) => ({ studentId, remark: "Draft.", basedOn: [], errorCode: null, error: null })));
    const user = userEvent.setup();
    renderWithProviders(<ClassRemarksDialog open onOpenChange={vi.fn()} examId="e1" examName="Midterm" results={results} />);

    await user.click(await screen.findByLabelText(/also redraft/i));
    await user.click(screen.getByRole("button", { name: "Draft 3 remarks" }));

    expect(await screen.findByText("Replaces: Excellent term.")).toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: "Save remark for Meena S" }));
    expect(screen.getByRole("button", { name: "Save 2 remarks" })).toBeEnabled();
  });
});
