import { CSV_TEMPLATE, parseCsv, parseQuestionsCsv } from "./csvQuestions";

describe("parseCsv", () => {
  it("handles quotes, doubled quotes, embedded commas/newlines, CRLF, a BOM and blank lines", () => {
    const text = '﻿a,b,c\r\n"x, y","say ""hi""","line1\nline2"\n\n , ,\nlast,,';

    expect(parseCsv(text)).toEqual([
      ["a", "b", "c"],
      ["x, y", 'say "hi"', "line1\nline2"],
      ["last", "", ""],
    ]);
  });

  it("returns no rows for empty input", () => {
    expect(parseCsv("")).toEqual([]);
  });
});

describe("parseQuestionsCsv", () => {
  it("parses the downloadable template without errors", () => {
    const { questions, errors } = parseQuestionsCsv(CSV_TEMPLATE);

    expect(errors).toEqual([]);
    expect(questions.map((q) => q.content.type)).toEqual(["SingleChoice", "MultipleSelect", "TrueFalse", "FillInBlank", "ShortAnswer"]);

    const [mcq, multi, tf, fill, short] = questions;
    expect(mcq).toMatchObject({ row: 2, difficulty: "Easy", topic: "Multiplication", tags: ["revision"] });
    expect(mcq.content).toMatchObject({ text: "What is 7 × 8?", marks: 2, explanation: "7 × 8 = 56.", modelAnswer: null, acceptedAnswers: null, caseSensitive: false });
    expect(mcq.content.options!.map((o) => o.isCorrect)).toEqual([false, true, false, false]);
    expect(multi.content.options!.filter((o) => o.isCorrect).map((o) => o.text)).toEqual(["2", "11"]);
    expect(multi.difficulty).toBe("Medium");
    expect(tf.content.options).toEqual([{ text: "True", isCorrect: true }, { text: "False", isCorrect: false }]);
    expect(fill.content).toMatchObject({ acceptedAnswers: ["3.14"], options: null });
    expect(short.content).toMatchObject({ marks: 3, modelAnswer: "A letter that stands for an unknown number.", options: null });
  });

  it("accepts type aliases, header variants and correct answers given as text or 1-based numbers", () => {
    const csv = [
      "Type,Question,Model-Answer,Difficulty,Options,Correct,Tags",
      'Multiple choice,Capital of India?,,hard,Delhi|Mumbai,delhi,"geo, capitals"',
      "single,Pick two,,,a|b|c,2,",
      "true/false,The sky is green,,,,false,",
      "Essay,Describe monsoon,Rain,,,,",
    ].join("\n");

    const { questions, errors } = parseQuestionsCsv(csv);

    expect(errors).toEqual([]);
    expect(questions[0]).toMatchObject({ difficulty: "Hard", tags: ["geo", "capitals"], topic: null });
    expect(questions[0].content.options!.map((o) => o.isCorrect)).toEqual([true, false]);
    expect(questions[0].content.marks).toBe(1);
    expect(questions[1].content.options!.map((o) => o.isCorrect)).toEqual([false, true, false]);
    expect(questions[2].content.options).toEqual([{ text: "True", isCorrect: false }, { text: "False", isCorrect: true }]);
    expect(questions[3].content).toMatchObject({ type: "LongAnswer", modelAnswer: "Rain" });
  });

  it("reports row-level problems and keeps the good rows", () => {
    const csv = ["type,question,correct,marks", "riddle,What?,,1", "tf,No answer given,,1", "short,Fine,,abc"].join("\n");

    const { questions, errors } = parseQuestionsCsv(csv);

    expect(errors).toEqual(['Row 2: unknown type "riddle".', 'Row 3: say whether the statement is True or False in "correct".']);
    expect(questions).toHaveLength(1);
    expect(questions[0].row).toBe(4);
    expect(questions[0].content.marks).toBeNaN();
  });

  it("rejects files without a header and a question, or without the required columns", () => {
    expect(parseQuestionsCsv("type,question").errors).toEqual(["The file needs a header row and at least one question."]);
    expect(parseQuestionsCsv("kind,text\nmcq,Hi").errors).toEqual(['The header row must include "type" and "question" columns.']);
  });
});
