import type { QuestionBankInput, QuestionDifficulty, QuestionType } from "@/features/online-exams/types";
import type { AiDifficulty, AiQuestionKind, ExamRequest, ExamSectionRequest, GeneratedQuestion } from "./types";

const TYPE_TO_BANK: Record<AiQuestionKind, QuestionType> = {
  MCQ: "SingleChoice",
  TrueFalse: "TrueFalse",
  FillInBlank: "FillInBlank",
  ShortAnswer: "ShortAnswer",
  LongAnswer: "LongAnswer",
};

export const AI_QUESTION_KINDS = Object.keys(TYPE_TO_BANK) as AiQuestionKind[];
export const AI_DIFFICULTIES: AiDifficulty[] = ["Easy", "Medium", "Hard"];

export const KIND_LABEL: Record<AiQuestionKind, string> = {
  MCQ: "Multiple choice",
  TrueFalse: "True / False",
  FillInBlank: "Fill in the blank",
  ShortAnswer: "Short answer",
  LongAnswer: "Long answer",
};

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * Turns reviewed AI questions into question-bank entries. This is the human-approved step: it runs only when the teacher
 * presses Approve, and the questions are tagged so they can always be told apart from hand-written ones.
 */
export function toQuestionBankInputs(questions: GeneratedQuestion[], subjectId: string, classId: string, topic: string | null): QuestionBankInput[] {
  return questions.map((q) => {
    const options =
      q.type === "MCQ"
        ? q.options.map((text) => ({ text: text.trim(), isCorrect: same(text, q.correctAnswer) }))
        : q.type === "TrueFalse"
          ? ["True", "False"].map((text) => ({ text, isCorrect: same(text, q.correctAnswer) }))
          : null;
    return {
      content: {
        type: TYPE_TO_BANK[q.type],
        text: q.question.trim(),
        marks: q.marks,
        explanation: q.explanation || null,
        modelAnswer: q.type === "ShortAnswer" || q.type === "LongAnswer" ? q.correctAnswer : null,
        acceptedAnswers: q.type === "FillInBlank" ? [q.correctAnswer] : null,
        caseSensitive: false,
        options,
      },
      subjectId,
      classId,
      topic,
      difficulty: q.difficulty as QuestionDifficulty,
      tags: ["ai-generated"],
    };
  });
}

export const totalQuestions = (sections: ExamSectionRequest[]) => sections.reduce((n, s) => n + s.count, 0);
export const totalMarks = (sections: ExamSectionRequest[]) => sections.reduce((n, s) => n + s.count * s.marksEach, 0);

/** The first problem with an exam request, or null when it can be sent. The server validates again. */
export function validateExamRequest(r: ExamRequest): string | null {
  if (!r.classId) return "Choose a class.";
  if (!r.subjectId) return "Choose a subject.";
  if (r.chapters.length === 0) return "Enter at least one chapter.";
  if (r.easy < 0 || r.medium < 0 || r.hard < 0 || r.easy + r.medium + r.hard !== 100) return "Difficulty split must add up to 100%.";
  if (r.sections.length === 0) return "Add at least one section.";
  if (r.sections.some((s) => !Number.isInteger(s.count) || s.count < 1)) return "Each section needs at least one question.";
  if (r.sections.some((s) => !(s.marksEach > 0))) return "Marks per question must be greater than zero.";
  if (totalQuestions(r.sections) > 60) return "A paper can have at most 60 questions.";
  if (!(r.durationMinutes >= 10)) return "Duration must be at least 10 minutes.";
  return null;
}
