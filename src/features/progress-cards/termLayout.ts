import type { CardData, CardSubject, LayoutSection, SubjectPart } from "./types";

/**
 * Rules for the term-wise sections (Term 1 and Term 2 side by side). A column reads the weighted exam whose name contains the
 * column's exam text. Mirrors AcademicService TermLayout.cs; keep the two in step.
 */

export interface TermColumn { label: string; exam: string; max: number }
export interface TermDef { title: string; totalMax: number; columns: TermColumn[] }

const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});
const text = (v: unknown): string => (typeof v === "string" ? v : "");
const num = (v: unknown, fallback = 0): number => (typeof v === "number" ? v : fallback);

export function termsOf(props: Record<string, unknown>): TermDef[] {
  const arr = Array.isArray(props.terms) ? props.terms : [];
  return arr.map((t) => {
    const o = obj(t);
    return { title: text(o.title), totalMax: num(o.totalMax, 100), columns: (Array.isArray(o.columns) ? o.columns : []).map((c) => { const x = obj(c); return { label: text(x.label), exam: text(x.exam), max: num(x.max) }; }) };
  });
}

/** Term columns of a co-scholastic section: a label and the exam the grades were recorded against. */
export function coColumns(props: Record<string, unknown>): { label: string; exam: string }[] {
  return (Array.isArray(props.terms) ? props.terms : []).map((t) => ({ label: text(obj(t).label), exam: text(obj(t).exam) }));
}

export function firstTerms(sections: LayoutSection[]): TermDef[] {
  const s = sections.find((x) => x.type === "termMarks");
  return s ? termsOf(s.props) : [];
}

const matches = (p: SubjectPart, exam: string) => exam.length > 0 && p.examName.toLowerCase().includes(exam.toLowerCase());
const matched = (s: CardSubject, t: TermDef) => t.columns.map((c) => ({ c, part: (s.parts ?? []).find((p) => matches(p, c.exam)) }));

export function gradeOf(pct: number, bands: CardData["bands"]): string {
  if (!bands || bands.length === 0) return "";
  const sorted = [...bands].sort((a, b) => b.min - a.min);
  return (sorted.find((b) => pct + 1e-9 >= b.min) ?? sorted[sorted.length - 1]).grade;
}

export function termRow(s: CardSubject, t: TermDef, bands: CardData["bands"]): { cells: string[]; total: string; grade: string } {
  const m = matched(s, t);
  const cells = m.map((x) => (!x.part ? "-" : x.part.absent ? "AB" : String(x.part.obtained)));
  const found = m.flatMap((x) => (x.part ? [x.part] : []));
  if (found.length === 0) return { cells, total: "-", grade: "-" };
  const sum = found.reduce((a, p) => a + (p.absent ? 0 : p.obtained), 0);
  const max = found.reduce((a, p) => a + p.max, 0);
  const grade = found.every((p) => p.absent) ? "AB" : gradeOf(max > 0 ? (sum / max) * 100 : 0, bands);
  return { cells, total: String(sum), grade: grade || "-" };
}

export function termOverall(d: CardData, t: TermDef): { sum: string; max: string; grade: string } {
  let sum = 0, max = 0;
  for (const s of d.subjects.filter((x) => !x.additional))
    for (const { part } of matched(s, t)) if (part) { max += part.max; sum += part.absent ? 0 : part.obtained; }
  if (max <= 0) return { sum: "-", max: "-", grade: "-" };
  return { sum: String(Math.round(sum * 100) / 100), max: String(max), grade: gradeOf((sum / max) * 100, d.bands) || "-" };
}

/** Student, class average and class top as percentages. The top adds each exam's highest mark, so it can exceed any real total. */
export function termCompare(s: CardSubject, t: TermDef): { avg: number | null; top: number | null; student: number | null } {
  const found = matched(s, t).flatMap((x) => (x.part ? [x.part] : []));
  const max = found.reduce((a, p) => a + p.max, 0);
  if (max <= 0) return { avg: null, top: null, student: null };
  const of = (pick: (p: SubjectPart) => number | null | undefined) =>
    found.every((p) => pick(p) != null) ? Math.round((found.reduce((a, p) => a + (pick(p)! / 100) * p.max, 0) / max) * 1000) / 10 : null;
  return { avg: of((p) => p.classAvg), top: of((p) => p.classTop), student: Math.round((found.reduce((a, p) => a + (p.absent ? 0 : p.obtained), 0) / max) * 1000) / 10 };
}

export function coGrade(d: CardData, area: string, exam: string): string {
  return d.coScholastic?.find((c) => c.area.toLowerCase() === area.toLowerCase() && exam.length > 0 && (c.examName ?? "").toLowerCase().includes(exam.toLowerCase()))?.grade ?? "";
}

export function gradeKeyText(bands: CardData["bands"]): string {
  if (!bands || bands.length === 0) return "";
  const sorted = [...bands].sort((a, b) => b.min - a.min);
  return sorted.map((b, i) => `${b.grade} : ${b.min}-${i === 0 ? 100 : sorted[i - 1].min - 1}`).join(", ");
}

export const promotionText = (d: CardData, qualified: string, not: string) => (d.result === "Pass" ? qualified : not);

export const withTokens = (s: string, d: CardData) => s.replaceAll("{class}", d.className).replaceAll("{year}", d.academicYear ?? "").replaceAll("{exam}", d.examName).replaceAll("{student}", d.studentName);

/** Short axis label for a subject: its code, else the first letters. */
export const shortName = (s: CardSubject) => (s.code || s.name).slice(0, 4).toUpperCase();
