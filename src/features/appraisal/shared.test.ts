import { describe, expect, it } from "vitest";
import { answeredCount, hasProblems, isAnswered, setAnswer, validateReview } from "./shared";
import type { Answer, FormQuestion, ScaleLevel } from "./types";

const scale: ScaleLevel[] = [1, 2, 3, 4, 5].map((value) => ({ value, label: String(value) }));
const q = (over: Partial<FormQuestion> & { id: string }): FormQuestion => ({ text: over.id, type: "Rating", required: true, allowNotApplicable: false, allowComment: false, ...over });

describe("review form rules", () => {
  it("asks for every required question and accepts them once answered", () => {
    const form = { scale, commentsRequired: false, questions: [q({ id: "a" }), q({ id: "b", type: "YesNo" }), q({ id: "c", type: "Comment", required: false })] };
    const missing = validateReview(form, [{ questionId: "a", rating: 4 }]);
    expect(Object.keys(missing.questions)).toEqual(["b"]);
    expect(hasProblems(missing)).toBe(true);
    expect(hasProblems(validateReview(form, [{ questionId: "a", rating: 4 }, { questionId: "b", yesNo: false }]))).toBe(false);
  });

  it("treats a zero-looking answer as answered but blank text as not", () => {
    const rating = q({ id: "a" });
    expect(isAnswered(rating, { questionId: "a", rating: 0 })).toBe(true);
    const comment = q({ id: "b", type: "Comment" });
    expect(isAnswered(comment, { questionId: "b", text: "   " })).toBe(false);
    expect(isAnswered(comment, { questionId: "b", text: "Helpful" })).toBe(true);
  });

  it("accepts not-applicable only where the question allows it", () => {
    const form = { scale, commentsRequired: false, questions: [q({ id: "a", allowNotApplicable: true }), q({ id: "b" })] };
    const result = validateReview(form, [{ questionId: "a", notApplicable: true }, { questionId: "b", notApplicable: true }]);
    expect(result.questions.a).toBeUndefined();
    expect(result.questions.b).toMatch(/Not applicable/);
  });

  it("rejects a rating outside the scale and a choice that isn't offered", () => {
    const form = {
      scale,
      commentsRequired: false,
      questions: [q({ id: "a" }), q({ id: "m", type: "MultipleChoice", options: [{ value: "x", label: "X" }] })],
    };
    const result = validateReview(form, [{ questionId: "a", rating: 9 }, { questionId: "m", choice: "zzz" }]);
    expect(Object.keys(result.questions).sort()).toEqual(["a", "m"]);
  });

  it("requires some written comment when the group's rule says so", () => {
    const form = { scale, commentsRequired: true, questions: [q({ id: "a" })] };
    expect(validateReview(form, [{ questionId: "a", rating: 3 }]).form).toBeTruthy();
    expect(validateReview(form, [{ questionId: "a", rating: 3, text: "Clear explanations" }]).form).toBeUndefined();
  });

  it("counts progress and replaces an answer without keeping stale fields", () => {
    const form = { questions: [q({ id: "a" }), q({ id: "b" })] };
    let answers: Answer[] = [];
    answers = setAnswer(answers, { questionId: "a", rating: 2 });
    answers = setAnswer(answers, { questionId: "a", notApplicable: true });
    expect(answers).toEqual([{ questionId: "a", notApplicable: true }]);
    expect(answeredCount(form, answers)).toEqual({ answered: 0, total: 2 });
    answers = setAnswer(answers, { questionId: "a" });
    expect(answers).toEqual([]);
  });
});
