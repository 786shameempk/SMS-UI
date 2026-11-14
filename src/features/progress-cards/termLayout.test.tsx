import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CardRenderer } from "./CardRenderer";
import { SAMPLE_TWO_TERM_CARD } from "./sample";
import { gradeKeyText, termCompare, termOverall, termRow, termsOf } from "./termLayout";
import type { TemplateConfig } from "./types";

const terms = [
  { title: "Term-1", totalMax: 100, columns: [{ label: "PT", exam: "PT-1", max: 10 }, { label: "NBS", exam: "NBS-1", max: 5 }, { label: "SEA", exam: "SEA-1", max: 5 }, { label: "Half Yearly", exam: "Half Yearly", max: 80 }] },
  { title: "Term-2", totalMax: 100, columns: [{ label: "PT", exam: "PT-2", max: 10 }, { label: "NBS", exam: "NBS-2", max: 5 }, { label: "SEA", exam: "SEA-2", max: 5 }, { label: "Annual", exam: "Annual", max: 80 }] },
];
const coTerms = [{ label: "Term 1", exam: "Half Yearly" }, { label: "Term 2", exam: "Annual" }];

const config: TemplateConfig = {
  page: { size: "A4", orientation: "portrait", margin: 12 },
  style: { font: "Arial", fontSize: 11, primary: "#111827", border: "#94a3b8", headerBg: "#f1f5f9" },
  sections: [
    { id: "h", type: "header", title: "", visible: true, props: { schoolName: "Hill Top Public School", title: "Report Card for Class {class}", subtitle: "Final Report Card - Session {year}" } },
    { id: "s", type: "student", title: "Student Profile", visible: true, props: { fields: ["name", "fatherName", "motherName"] } },
    { id: "t", type: "termMarks", title: "Part 1 - Scholastic", visible: true, props: { terms } },
    { id: "c", type: "coscholastic", title: "Part 2 - Co-Scholastic", visible: true, props: { items: ["Work Education"], terms: coTerms } },
    { id: "ch", type: "termChart", title: "Charts", visible: true, props: {} },
    { id: "g", type: "gradeKey", title: "Grade description", visible: true, props: { coScholastic: "A : 3, B : 2, C : 1" } },
    { id: "r", type: "summary", title: "Result", visible: true, props: { fields: ["promotion"] } },
  ],
};

describe("term-wise layout", () => {
  const eng = SAMPLE_TWO_TERM_CARD.subjects[0];

  it("reads each column from the exam whose name matches and grades the term total", () => {
    const row = termRow(eng, termsOf({ terms })[0], SAMPLE_TWO_TERM_CARD.bands);
    expect(row.cells).toEqual(["3", "5", "5", "37"]);
    expect(row.total).toBe("50");
    expect(row.grade).toBe("C2");
  });

  it("shows dashes when no exam matches", () => {
    const row = termRow(eng, { title: "T", totalMax: 100, columns: [{ label: "X", exam: "Nothing", max: 10 }] }, SAMPLE_TWO_TERM_CARD.bands);
    expect(row).toEqual({ cells: ["-"], total: "-", grade: "-" });
  });

  it("totals a term across subjects and compares with the class", () => {
    const o = termOverall(SAMPLE_TWO_TERM_CARD, termsOf({ terms })[0]);
    expect(o.max).toBe("600");
    expect(termCompare(eng, termsOf({ terms })[0]).avg).toBe(56.1);
  });

  it("prints the grade key from the scheme bands", () => {
    expect(gradeKeyText(SAMPLE_TWO_TERM_CARD.bands)).toBe("A1 : 91-100, A2 : 81-90, B1 : 71-80, B2 : 61-70, C1 : 51-60, C2 : 41-50, D : 33-40, E : 0-32");
  });

  it("renders every part of the two-term card", () => {
    const html = renderToStaticMarkup(<CardRenderer config={config} data={SAMPLE_TWO_TERM_CARD} />);
    expect(html).toContain("Report Card for Class IV");
    expect(html).toContain("Final Report Card - Session 2025-2026");
    expect(html).toContain("Sample Father");
    expect(html).toContain("Term-2");
    expect(html).toContain("Total Marks");
    expect(html).toContain("<svg");
    expect(html).toContain("Co-Scholastic");
    expect(html).toContain("Qualified for Promotion to Higher Class");
  });
});

describe("customisable terms", () => {
  const three = { ...config, sections: config.sections.map((s) => (s.type === "termMarks" ? { ...s, props: { terms: [...terms, { title: "Term-3", totalMax: 100, columns: [{ label: "Term Exam", exam: "Term 3 Exam", max: 100 }] }], showGrade: false, showTotalRow: false } } : s.type === "termChart" ? { ...s, props: { terms: ["Term-3"], series: ["student"] } } : s)) };

  it("renders a third term and honours the grade, total-row and chart options", () => {
    const html = renderToStaticMarkup(<CardRenderer config={three} data={SAMPLE_TWO_TERM_CARD} />);
    expect(html).toContain("Term-3");
    expect(html).not.toContain("Total Marks");
    expect(html).not.toContain(">Gr.<");
    expect(html).toContain("Student %");
    expect(html).not.toContain("Class Top %");
    expect(html.match(/<svg/g)).toHaveLength(1);
  });

  it("drops a removed term entirely", () => {
    const one = { ...config, sections: config.sections.map((s) => (s.type === "termMarks" ? { ...s, props: { terms: [terms[1]] } } : s)) };
    const html = renderToStaticMarkup(<CardRenderer config={one} data={SAMPLE_TWO_TERM_CARD} />);
    expect(html).not.toContain("Term-1");
    expect(html).toContain("Term-2");
  });
});
