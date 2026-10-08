import { formatExamTime, formatMarks, formatPercent, RESULT_STATUS_LABEL } from "./constants";
import { LETTERHEAD_CSS, letterheadHtml } from "@/features/tenant/printLetterhead";
import type { TenantBranding } from "@/features/tenant/branding";
import type { ExamResults } from "./types";

const csvCell = (v: string | number | null | undefined) => {
  const s = v == null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const fileSafe = (name: string) => name.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-") || "exam";

function rows(r: ExamResults) {
  return r.rows.map((row) => [
    row.rollNumber ?? "",
    row.studentName,
    row.classLabel ?? "",
    row.score == null ? "" : formatMarks(row.score),
    row.percentage == null ? "" : formatPercent(row.percentage),
    row.grade ?? "",
    RESULT_STATUS_LABEL[row.status],
    row.submittedAt ? formatExamTime(row.submittedAt, r.exam.timeZoneId) : "",
  ]);
}

const HEADERS = ["Roll no.", "Student", "Class", "Score", "Percentage", "Grade", "Status", "Submitted"];

/** Download the results table as CSV (opens in Excel). */
export function downloadResultsCsv(r: ExamResults) {
  const lines = [HEADERS, ...rows(r)].map((line) => line.map(csvCell).join(","));
  // BOM so Excel reads UTF-8 names correctly.
  const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${fileSafe(r.exam.name)}-results.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** Open a clean, printable results sheet in a new window (the app shell isn't printed). */
export function printResults(r: ExamResults, branding?: TenantBranding) {
  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) return false;
  const s = r.summary;
  const summary: [string, string][] = [
    ["Students", String(s.totalStudents)],
    ["Appeared", String(s.appeared)],
    ["Absent", String(s.absent)],
    ["Passed", String(s.passed)],
    ["Failed", String(s.failed)],
    ["Average", formatMarks(s.averageScore)],
    ["Highest", formatMarks(s.highestScore)],
    ["Lowest", formatMarks(s.lowestScore)],
  ];
  const body = rows(r)
    .map((cells) => `<tr>${cells.map((c) => `<td>${esc(String(c))}</td>`).join("")}</tr>`)
    .join("");
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(r.exam.name)} - results</title>
<style>
  body{font:13px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif;color:#0f172a;margin:32px}
  h1{font-size:20px;margin:0 0 2px} .muted{color:#64748b;margin:0 0 16px}
  .sum{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:18px}
  .sum div{border:1px solid #e2e8f0;border-radius:8px;padding:8px 10px} .sum b{display:block;font-size:16px}
  table{width:100%;border-collapse:collapse} th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #e2e8f0}
  th{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#475569;background:#f8fafc}
  ${LETTERHEAD_CSS}
  @media print{body{margin:12mm}}
</style></head><body>
${branding ? letterheadHtml(branding) : ""}
<h1>${esc(r.exam.name)}</h1>
<p class="muted">${esc([r.exam.subjectName, r.exam.className, `Total ${formatMarks(r.exam.totalMarks)} · Pass ${formatMarks(r.exam.passingMarks)}`].filter(Boolean).join(" · "))}</p>
<div class="sum">${summary.map(([k, v]) => `<div>${esc(k)}<b>${esc(v)}</b></div>`).join("")}</div>
<table><thead><tr>${HEADERS.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${body}</tbody></table>
<script>window.onload=function(){window.print()}</script>
</body></html>`);
  w.document.close();
  return true;
}
