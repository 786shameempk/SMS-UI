import { escapeHtml, examToHtml, homeworkToHtml, worksheetToHtml } from "./printable";
import type { ExamPaper } from "./types";

describe("printable documents", () => {
  it("escapes markup in AI text", () => {
    expect(escapeHtml(`<img src=x onerror="alert(1)"> & 'q'`)).toBe("&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; &#39;q&#39;");
  });

  it("never lets generated text become HTML", () => {
    const evil = "<script>alert(1)</script>";
    const paper: ExamPaper = {
      title: evil, totalMarks: 1, durationMinutes: 30, difficultyCounts: {}, answerKey: [{ section: "A", number: 1, answer: evil, explanation: evil, marks: 1 }],
      sections: [{ name: "Section A", instructions: evil, questions: [{ question: evil, type: "MCQ", marks: 1, difficulty: "Easy", options: [evil], correctAnswer: evil, explanation: evil, learningObjective: evil }] }],
    };
    expect(examToHtml(paper, true)).not.toContain("<script>");
    expect(worksheetToHtml({ title: evil, sections: [{ kind: evil, instructions: evil, items: [{ prompt: evil, options: [evil], answer: evil, marks: 1 }] }] }, true)).not.toContain("<script>");
    expect(homeworkToHtml({ title: evil, instructions: evil, tasks: [], extensionTask: evil, supportTask: evil })).not.toContain("<script>");
  });

  it("includes the answer key only when asked", () => {
    const paper: ExamPaper = {
      title: "T", totalMarks: 1, durationMinutes: 30, difficultyCounts: {}, answerKey: [{ section: "Section A", number: 1, answer: "SECRET", explanation: "e", marks: 1 }],
      sections: [{ name: "Section A", instructions: "i", questions: [{ question: "Q?", type: "ShortAnswer", marks: 1, difficulty: "Easy", options: [], correctAnswer: "SECRET", explanation: "e", learningObjective: "o" }] }],
    };
    expect(examToHtml(paper, false)).not.toContain("SECRET");
    expect(examToHtml(paper, true)).toContain("SECRET");
  });
});
