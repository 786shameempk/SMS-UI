import type { ExamPaper, GeneratedQuestion, Homework, LessonPlan, Worksheet } from "./types";

/** AI output is untrusted text: every value is escaped before it goes into printable HTML. */
export function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}

const li = (items: string[]) => `<ul>${items.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>`;

function questionHtml(q: GeneratedQuestion, n: number): string {
  const options = q.type === "MCQ" ? `<ol type="A">${q.options.map((o) => `<li>${escapeHtml(o)}</li>`).join("")}</ol>` : "";
  return `<div class="q"><p><b>${n}.</b> ${escapeHtml(q.question)} <span class="m">[${escapeHtml(q.marks)}]</span></p>${options}</div>`;
}

export function examToHtml(paper: ExamPaper, withKey: boolean): string {
  let n = 0;
  const sections = paper.sections
    .map((s) => `<h2>${escapeHtml(s.name)}</h2><p><i>${escapeHtml(s.instructions)}</i></p>${s.questions.map((q) => questionHtml(q, ++n)).join("")}`)
    .join("");
  const key = withKey
    ? `<h2>Answer key</h2><table>${paper.answerKey
        .map((k) => `<tr><td>${escapeHtml(k.section)} Q${k.number}</td><td>${escapeHtml(k.answer)}</td><td>${escapeHtml(k.explanation)}</td></tr>`)
        .join("")}</table>`
    : "";
  return `<h1>${escapeHtml(paper.title)}</h1><p>Time: ${escapeHtml(paper.durationMinutes)} minutes &nbsp; Maximum marks: ${escapeHtml(paper.totalMarks)}</p>${sections}${key}`;
}

export function worksheetToHtml(w: Worksheet, withKey: boolean): string {
  let n = 0;
  return `<h1>${escapeHtml(w.title)}</h1><p>Name: ____________________ &nbsp; Date: __________</p>${w.sections
    .map(
      (s) =>
        `<h2>${escapeHtml(s.kind)}</h2><p><i>${escapeHtml(s.instructions)}</i></p>${s.items
          .map((i) => {
            const options = i.options.length ? `<ol type="A">${i.options.map((o) => `<li>${escapeHtml(o)}</li>`).join("")}</ol>` : "";
            const answer = withKey ? `<p class="a">Answer: ${escapeHtml(i.answer)}</p>` : "";
            return `<div class="q"><p><b>${++n}.</b> ${escapeHtml(i.prompt)}</p>${options}${answer}</div>`;
          })
          .join("")}`,
    )
    .join("")}`;
}

export function lessonPlanToHtml(p: LessonPlan): string {
  const act = (a: { title: string; description: string; minutes: number }) => `<li><b>${escapeHtml(a.title)}</b> (${escapeHtml(a.minutes)} min): ${escapeHtml(a.description)}</li>`;
  return `<h1>${escapeHtml(p.title)}</h1><h2>Learning objectives</h2>${li(p.learningObjectives)}<h2>Introduction</h2><ul>${act(p.introduction)}</ul>
<h2>Teaching activities</h2><ul>${p.teachingActivities.map(act).join("")}</ul><h2>Examples</h2>${li(p.examples)}
<h2>Student activities</h2><ul>${p.studentActivities.map(act).join("")}</ul><h2>Assessment</h2><p>${escapeHtml(p.assessment)}</p>
<h2>Homework</h2><p>${escapeHtml(p.homework)}</p><h2>Materials required</h2>${li(p.materialsRequired)}<h2>Differentiation</h2>${li(p.differentiationSuggestions)}`;
}

export function homeworkToHtml(h: Homework): string {
  return `<h1>${escapeHtml(h.title)}</h1><p>${escapeHtml(h.instructions)}</p><ol>${h.tasks
    .map((t) => `<li>${escapeHtml(t.description)} <span class="m">(${escapeHtml(t.difficulty)}, about ${escapeHtml(t.estimatedMinutes)} min)</span></li>`)
    .join("")}</ol><h2>Extension</h2><p>${escapeHtml(h.extensionTask)}</p><h2>Support</h2><p>${escapeHtml(h.supportTask)}</p>`;
}

const PRINT_STYLES =
  "body{font-family:Arial,sans-serif;margin:24px;color:#111}h1{font-size:20px}h2{font-size:16px;margin-top:20px}.q{margin:10px 0}.m,.a{color:#555;font-size:12px}table{border-collapse:collapse}td{border:1px solid #bbb;padding:4px 8px;font-size:13px}";

/** Opens the browser's print dialog (Save as PDF) for a self-contained document. Returns false when the pop-up was blocked. */
export function printDocument(title: string, bodyHtml: string): boolean {
  const win = window.open("", "_blank");
  if (!win) return false;
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>${PRINT_STYLES}</style></head><body>${bodyHtml}</body></html>`);
  win.document.close();
  win.focus();
  win.print();
  return true;
}
