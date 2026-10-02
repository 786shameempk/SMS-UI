import { ALL_SECTIONS, emptyWizard, fromDetail, newKey, publishBlockers, toInput, totalMarks, validateStep, windowUtc, type WizardState } from "./wizardState";
import { utcToZoned, zonedToUtcIso } from "../../timeZone";
import type { QuestionContent } from "../../types";

const mcq = (overrides: Partial<QuestionContent> = {}): QuestionContent => ({
  type: "SingleChoice", text: "2 + 2?", marks: 2, explanation: null, modelAnswer: null, acceptedAnswers: null, caseSensitive: false,
  options: [{ text: "3", isCorrect: false }, { text: "4", isCorrect: true }], ...overrides,
});

const wizard = (overrides: Partial<WizardState> = {}): WizardState => ({
  ...emptyWizard(),
  name: "Unit test 1", subjectId: "math", classId: "c5", timeZoneId: "Asia/Kolkata",
  startDate: "2099-01-10", startTime: "10:00", endDate: "2099-01-10", endTime: "11:00", durationMinutes: 45,
  questions: [{ key: "k1", sourceQuestionId: null, content: mcq() }],
  ...overrides,
});

describe("online exam wizard state", () => {
  it("starts empty with sensible defaults for tomorrow", () => {
    const state = emptyWizard();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    expect(state).toMatchObject({ name: "", sectionId: ALL_SECTIONS, startTime: "10:00", endTime: "11:00", durationMinutes: 45, assignMode: "class", questions: [] });
    expect(state.startDate).toBe(`${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`);
    expect(newKey()).not.toBe(newKey());
  });

  it("round-trips an existing exam through fromDetail and toInput", () => {
    const startUtc = zonedToUtcIso("2099-01-10", "10:00", "Asia/Kolkata");
    const endUtc = zonedToUtcIso("2099-01-10", "11:30", "Asia/Kolkata");
    const detail = {
      name: "Term 1", description: null, academicYearId: "ay", examType: "Midterm", subjectId: "math", classId: "c5", sectionId: null, teacherStaffId: "sf1",
      startUtc, endUtc, durationMinutes: 60, timeZoneId: "Asia/Kolkata", settings: { passingMarks: 1, maxAttempts: 1, negativeMarkPerWrong: 0 },
      questions: [
        { sortOrder: 2, sourceQuestionId: null, type: "ShortAnswer", text: "Why?", marks: 3, explanation: null, modelAnswer: "Because", acceptedAnswers: null, caseSensitive: false, options: [] },
        { sortOrder: 1, sourceQuestionId: "bank1", type: "SingleChoice", text: "2 + 2?", marks: 2, explanation: null, modelAnswer: null, acceptedAnswers: null, caseSensitive: false,
          options: [{ sortOrder: 2, text: "4", isCorrect: true }, { sortOrder: 1, text: "3", isCorrect: false }] },
      ],
      assignments: [{ kind: "Section", targetId: "secA" }],
    };

    const state = fromDetail(detail as never);

    expect(state).toMatchObject({ description: "", sectionId: ALL_SECTIONS, startDate: "2099-01-10", startTime: "10:00", endTime: "11:30", assignMode: "sections", sectionIds: ["secA"] });
    expect(state.questions.map((q) => q.content.text)).toEqual(["2 + 2?", "Why?"]);
    expect(state.questions[0].content.options).toEqual([{ text: "3", isCorrect: false }, { text: "4", isCorrect: true }]);
    expect(state.questions[1].content.options).toBeNull();

    const input = toInput({ ...state, description: "  " });
    expect(input).toMatchObject({ name: "Term 1", description: null, sectionId: null, startUtc, endUtc, assignments: [{ kind: "Section", targetId: "secA" }] });
    expect(input.questions[0]).toEqual({ sourceQuestionId: "bank1", content: state.questions[0].content });
  });

  it("assigns to students, sections or the whole class", () => {
    expect(fromDetail({ ...fromDetailBase(), assignments: [{ kind: "Student", targetId: "st1" }] } as never).assignMode).toBe("students");
    expect(fromDetail({ ...fromDetailBase(), assignments: [] } as never).assignMode).toBe("class");
    expect(toInput(wizard({ assignMode: "students", studentIds: ["st1"] })).assignments).toEqual([{ kind: "Student", targetId: "st1" }]);
    expect(toInput(wizard()).assignments).toEqual([{ kind: "Class", targetId: "c5" }]);
    expect(toInput(wizard({ sectionId: "secA" })).sectionId).toBe("secA");
  });

  it("totals marks ignoring invalid numbers", () => {
    expect(totalMarks(wizard({ questions: [{ key: "a", sourceQuestionId: null, content: mcq() }, { key: "b", sourceQuestionId: null, content: mcq({ marks: NaN }) }] }))).toBe(2);
  });

  it("converts the window to UTC, or null when incomplete or invalid", () => {
    const w = windowUtc(wizard())!;
    expect(utcToZoned(w.start, "Asia/Kolkata")).toEqual({ date: "2099-01-10", time: "10:00" });
    expect(Date.parse(w.end) - Date.parse(w.start)).toBe(3_600_000);
    expect(windowUtc(wizard({ endTime: "" }))).toBeNull();
    expect(windowUtc(wizard({ timeZoneId: "Not/AZone" }))).toBeNull();
  });

  it("validates each step", () => {
    expect(validateStep(0, wizard({ name: " ab ", subjectId: "", classId: "" }))).toEqual({
      name: "Give the exam a name (at least 3 characters).", subjectId: "Choose a subject.", classId: "Choose a class.",
    });
    expect(validateStep(0, wizard())).toEqual({});

    expect(validateStep(1, wizard({ startDate: "" }))).toEqual({ window: "Enter the start and end date and time." });
    expect(validateStep(1, wizard({ endTime: "09:00" }))).toEqual({ window: "The exam must end after it starts." });
    expect(validateStep(1, wizard({ durationMinutes: 90 }))).toEqual({ durationMinutes: "The duration can't be longer than the exam window (60 min)." });
    expect(validateStep(1, wizard({ durationMinutes: 0 })).durationMinutes).toBe("Duration must be between 1 and 600 minutes.");
    expect(validateStep(1, wizard())).toEqual({});

    expect(Object.keys(validateStep(2, wizard({ settings: { ...emptyWizard().settings, passingMarks: -1, maxAttempts: 6, negativeMarkPerWrong: -0.5 } })))).toEqual([
      "passingMarks", "maxAttempts", "negativeMarkPerWrong",
    ]);
    expect(validateStep(2, wizard())).toEqual({});

    const incomplete = wizard({ questions: [{ key: "a", sourceQuestionId: null, content: mcq() }, { key: "b", sourceQuestionId: null, content: mcq({ text: "" }) }] });
    expect(validateStep(3, incomplete)).toEqual({ questions: "Question 2 is incomplete - open it to fix." });
    expect(validateStep(3, wizard())).toEqual({});

    expect(validateStep(4, wizard({ assignMode: "sections" }))).toEqual({ assign: "Choose at least one section." });
    expect(validateStep(4, wizard({ assignMode: "students" }))).toEqual({ assign: "Choose at least one student." });
    expect(validateStep(4, wizard())).toEqual({});
  });

  it("lists what blocks publishing", () => {
    expect(publishBlockers(wizard(), 30)).toEqual([]);
    expect(
      publishBlockers(wizard({ questions: [], settings: { ...emptyWizard().settings, passingMarks: 5 }, startDate: "2000-01-01", endDate: "2000-01-01" }), 0),
    ).toEqual(["Add at least one question.", "Passing marks (5) are more than the total (0).", "No students are selected.", "The exam's end time has already passed."]);
  });
});

function fromDetailBase() {
  return {
    name: "X", description: "d", academicYearId: null, examType: "UnitTest", subjectId: "s", classId: "c", sectionId: "secA", teacherStaffId: null,
    startUtc: "2099-01-10T04:30:00Z", endUtc: "2099-01-10T05:30:00Z", durationMinutes: 30, timeZoneId: "UTC", settings: {}, questions: [],
  };
}
