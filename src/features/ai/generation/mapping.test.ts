import { toQuestionBankInputs, validateExamRequest } from "./mapping";
import type { ExamRequest, GeneratedQuestion } from "./types";

const base: GeneratedQuestion = {
  question: " What is force? ",
  type: "ShortAnswer",
  marks: 2,
  difficulty: "Easy",
  options: [],
  correctAnswer: "A push or pull",
  explanation: "Definition",
  learningObjective: "Define force",
};

describe("toQuestionBankInputs", () => {
  it("maps each AI question type to a question-bank type and tags it", () => {
    const mcq: GeneratedQuestion = { ...base, type: "MCQ", options: ["Push", "Pull", "Heat", "Light"], correctAnswer: "pull" };
    const tf: GeneratedQuestion = { ...base, type: "TrueFalse", correctAnswer: "False" };
    const fill: GeneratedQuestion = { ...base, type: "FillInBlank", correctAnswer: "newton" };
    const [m, t, f, s] = toQuestionBankInputs([mcq, tf, fill, base], "sub1", "cls1", "Force");

    expect(m.content.type).toBe("SingleChoice");
    expect(m.content.options?.map((o) => o.isCorrect)).toEqual([false, true, false, false]);
    expect(t.content.options).toEqual([{ text: "True", isCorrect: false }, { text: "False", isCorrect: true }]);
    expect(f.content.acceptedAnswers).toEqual(["newton"]);
    expect(s.content).toMatchObject({ type: "ShortAnswer", text: "What is force?", modelAnswer: "A push or pull", options: null });
    expect([m, t, f, s].every((q) => q.tags.includes("ai-generated") && q.subjectId === "sub1" && q.classId === "cls1" && q.topic === "Force")).toBe(true);
  });
});

describe("validateExamRequest", () => {
  const ok: ExamRequest = {
    classId: "c", subjectId: "s", chapters: ["Force"], durationMinutes: 60, easy: 20, medium: 50, hard: 30,
    sections: [{ type: "MCQ", count: 10, marksEach: 1 }],
  };

  it("accepts a complete request", () => expect(validateExamRequest(ok)).toBeNull());

  it("reports the first problem", () => {
    expect(validateExamRequest({ ...ok, classId: "" })).toMatch(/class/i);
    expect(validateExamRequest({ ...ok, chapters: [] })).toMatch(/chapter/i);
    expect(validateExamRequest({ ...ok, hard: 20 })).toMatch(/100%/);
    expect(validateExamRequest({ ...ok, sections: [] })).toMatch(/section/i);
    expect(validateExamRequest({ ...ok, sections: [{ type: "MCQ", count: 61, marksEach: 1 }] })).toMatch(/60/);
    expect(validateExamRequest({ ...ok, durationMinutes: 5 })).toMatch(/Duration/);
  });
});
