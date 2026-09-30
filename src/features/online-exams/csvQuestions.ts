import type { QuestionContent, QuestionDifficulty, QuestionType } from "./types";

/**
 * Question import from CSV (Excel "Save as CSV" works). One question per row; a header row names the columns:
 *   type, question, marks, difficulty, topic, options, correct, answers, explanation, model_answer, tags
 * - type: mcq | multi | tf | fill | short | long (full names like "Multiple choice" work too)
 * - options: separated by |        e.g.  54|56|64|48
 * - correct: option letter(s) or text, separated by |  e.g.  B   or  A|C   (true/false: True or False)
 * - answers: fill-in-the-blank accepted answers, separated by |
 */
export const CSV_TEMPLATE = [
  "type,question,marks,difficulty,topic,options,correct,answers,explanation,model_answer,tags",
  'mcq,"What is 7 × 8?",2,Easy,Multiplication,54|56|64|48,B,,"7 × 8 = 56.",,revision',
  'multi,"Which of these are prime numbers?",2,Medium,Primes,2|9|11|15,A|C,,,,',
  'tf,"Every square is a rectangle.",1,Easy,Shapes,,True,,,,',
  'fill,"The value of π to two decimal places is ____.",1,Easy,Circles,,,3.14,,,',
  'short,"What is a variable in algebra?",3,Medium,Algebra,,,,,"A letter that stands for an unknown number.",',
].join("\n");

export interface ParsedQuestion {
  row: number;
  content: QuestionContent;
  difficulty: QuestionDifficulty;
  topic: string | null;
  tags: string[];
}

export interface ParseResult {
  questions: ParsedQuestion[];
  errors: string[];
}

/** RFC 4180-style CSV: quoted fields, doubled quotes, commas and newlines inside quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      if (row.some((f) => f.trim() !== "")) rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f.trim() !== "")) rows.push(row);
  return rows;
}

const TYPE_ALIASES: Record<string, QuestionType> = {
  mcq: "SingleChoice", single: "SingleChoice", singlechoice: "SingleChoice", multiplechoice: "SingleChoice",
  multi: "MultipleSelect", multiple: "MultipleSelect", multipleselect: "MultipleSelect", checkbox: "MultipleSelect",
  tf: "TrueFalse", truefalse: "TrueFalse", boolean: "TrueFalse",
  fill: "FillInBlank", blank: "FillInBlank", fillintheblank: "FillInBlank", fillinblank: "FillInBlank",
  short: "ShortAnswer", shortanswer: "ShortAnswer",
  long: "LongAnswer", longanswer: "LongAnswer", essay: "LongAnswer",
};

const split = (v: string | undefined) => (v ?? "").split("|").map((p) => p.trim()).filter(Boolean);

export function parseQuestionsCsv(text: string): ParseResult {
  const rows = parseCsv(text);
  if (rows.length < 2) return { questions: [], errors: ["The file needs a header row and at least one question."] };
  const header = rows[0].map((h) => h.trim().toLowerCase().replace(/[\s-]+/g, "_"));
  const col = (name: string) => header.indexOf(name);
  if (col("type") < 0 || col("question") < 0) return { questions: [], errors: ['The header row must include "type" and "question" columns.'] };

  const questions: ParsedQuestion[] = [];
  const errors: string[] = [];
  rows.slice(1).forEach((cells, i) => {
    const rowNo = i + 2;
    const get = (name: string) => (col(name) >= 0 ? (cells[col(name)] ?? "").trim() : "");
    const type = TYPE_ALIASES[get("type").toLowerCase().replace(/[^a-z]/g, "")];
    if (!type) {
      errors.push(`Row ${rowNo}: unknown type "${get("type")}".`);
      return;
    }
    const marks = get("marks") ? Number(get("marks")) : 1;
    const difficultyRaw = get("difficulty").toLowerCase();
    const difficulty: QuestionDifficulty = difficultyRaw.startsWith("e") ? "Easy" : difficultyRaw.startsWith("h") ? "Hard" : "Medium";
    let options: QuestionContent["options"] = null;
    const correct = split(get("correct")).map((c) => c.toLowerCase());

    if (type === "TrueFalse") {
      const isTrue = correct[0]?.startsWith("t") ?? false;
      if (!correct[0]) {
        errors.push(`Row ${rowNo}: say whether the statement is True or False in "correct".`);
        return;
      }
      options = [{ text: "True", isCorrect: isTrue }, { text: "False", isCorrect: !isTrue }];
    } else if (type === "SingleChoice" || type === "MultipleSelect") {
      const texts = split(get("options"));
      options = texts.map((t, idx) => {
        const letter = String.fromCharCode(97 + idx);
        return { text: t, isCorrect: correct.includes(letter) || correct.includes(t.toLowerCase()) || correct.includes(String(idx + 1)) };
      });
    }

    questions.push({
      row: rowNo,
      content: {
        type,
        text: get("question"),
        marks: Number.isFinite(marks) ? marks : NaN,
        explanation: get("explanation") || null,
        modelAnswer: get("model_answer") || null,
        acceptedAnswers: type === "FillInBlank" ? split(get("answers")) : null,
        caseSensitive: false,
        options,
      },
      difficulty,
      topic: get("topic") || null,
      tags: get("tags").split(/[|,]/).map((t) => t.trim()).filter(Boolean),
    });
  });
  return { questions, errors };
}
