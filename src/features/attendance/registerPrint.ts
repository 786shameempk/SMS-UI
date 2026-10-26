import { LETTERHEAD_CSS, letterheadHtml } from "@/features/tenant/printLetterhead";
import type { TenantBranding } from "@/features/tenant/branding";
import type { AttendanceRecord, AttendanceStatus, StudentRosterEntry } from "./types";

/** A paper register: one student per row, one column per school day, a mark in each box. */

export interface RegisterInput {
  /** "Student attendance register" style heading. */
  title: string;
  /** e.g. "October 2026" or "01 Oct 2026 – 31 Oct 2026". */
  period: string;
  /** e.g. "Grade 5 / A". */
  classLabel: string;
  /** Every calendar date (YYYY-MM-DD) shown as a column, in order. */
  dates: string[];
  roster: StudentRosterEntry[];
  records: AttendanceRecord[];
  branding?: TenantBranding;
  /** Date shown as "Generated on"; defaults to now. */
  generatedAt?: Date;
}

const MARK: Record<AttendanceStatus, { symbol: string; className: string }> = {
  present: { symbol: "✓", className: "p" },
  late: { symbol: "✓", className: "lt" },
  "half-day": { symbol: "½", className: "hd" },
  absent: { symbol: "✗", className: "a" },
  leave: { symbol: "L", className: "l" },
};

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

/** Every date from `from` to `to` inclusive (YYYY-MM-DD strings, no time-zone shifting). */
export function dateRange(from: string, to: string): string[] {
  const out: string[] = [];
  const [y, m, d] = from.split("-").map(Number);
  const cursor = new Date(Date.UTC(y, m - 1, d));
  const end = to;
  while (cursor.toISOString().slice(0, 10) <= end && out.length < 400) {
    out.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}

export interface RegisterRow {
  student: StudentRosterEntry;
  byDate: Map<string, AttendanceStatus>;
  /** Present, late and half-day: the student was there. */
  attended: number;
  absent: number;
  leave: number;
  marked: number;
  percent: number;
}

export function buildRegisterRows(roster: StudentRosterEntry[], records: AttendanceRecord[]): RegisterRow[] {
  const byStudent = new Map<string, Map<string, AttendanceStatus>>();
  for (const r of records) {
    const days = byStudent.get(r.studentId) ?? new Map<string, AttendanceStatus>();
    days.set(r.date, r.status);
    byStudent.set(r.studentId, days);
  }
  return [...roster]
    .sort((a, b) => a.rollNumber.localeCompare(b.rollNumber, undefined, { numeric: true }) || a.firstName.localeCompare(b.firstName))
    .map((student) => {
      const byDate = byStudent.get(student.id) ?? new Map<string, AttendanceStatus>();
      let attended = 0;
      let absent = 0;
      let leave = 0;
      for (const status of byDate.values()) {
        if (status === "absent") absent++;
        else if (status === "leave") leave++;
        else attended++;
      }
      const marked = byDate.size;
      return { student, byDate, attended, absent, leave, marked, percent: marked ? Math.round((attended / marked) * 1000) / 10 : 0 };
    });
}

function isSunday(date: string): boolean {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).getDay() === 0;
}

function monthName(date: string): string {
  const [y, m] = date.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

const CSS = `
.cap{font-weight:700;margin:0 0 4px}
@page{size:A4 landscape;margin:10mm}
*{box-sizing:border-box}
body{font:11px/1.35 Arial,"Segoe UI",sans-serif;color:#111;margin:0}
h1{font-size:16px;letter-spacing:.06em;text-align:center;margin:0 0 6px;text-transform:uppercase}
.meta{display:flex;justify-content:space-between;gap:12px;margin:0 0 8px;font-size:11px}
.meta div{flex:1;border:1px solid #cbd5e1;padding:3px 6px}
.meta b{display:block;font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:.04em}
table{width:100%;border-collapse:collapse;table-layout:fixed;margin-bottom:10px}
thead{display:table-header-group}
tr{page-break-inside:avoid}
th,td{border:1px solid #475569;padding:2px 1px;text-align:center;overflow:hidden}
th{background:#e2e8f0;font-size:9px}
td.name{text-align:left;padding:2px 4px;white-space:nowrap;text-overflow:ellipsis}
th.name{text-align:left;padding-left:4px}
.roll{width:34px}.name{width:150px}.tot{width:26px}.pct{width:38px}
.sun{background:#f1f5f9}
.p{color:#047857;font-weight:700}.lt{color:#b45309;font-weight:700}.hd{color:#b45309;font-weight:700}
.a{color:#b91c1c;font-weight:700;font-size:12px}.l{color:#1d4ed8;font-weight:700}
.dim{color:#94a3b8}
.sum{display:flex;gap:10px;margin:6px 0 8px}
.sum div{flex:1;border:1px solid #cbd5e1;padding:4px 8px}.sum b{display:block;font-size:14px}
.legend{font-size:10px;color:#475569;margin:0 0 14px}
.sign{display:flex;justify-content:space-between;margin-top:34px}
.sign div{width:30%;border-top:1px solid #111;text-align:center;padding-top:3px;font-size:10px}
.foot{margin-top:10px;font-size:9px;color:#64748b;display:flex;justify-content:space-between}
.block{page-break-after:always}.block:last-of-type{page-break-after:auto}
${LETTERHEAD_CSS}
`;

/** One table block per calendar month, so a long range wraps month by month (at most 31 columns each). */
function byMonth(dates: string[]): string[][] {
  const out: string[][] = [];
  for (const d of dates) {
    const last = out[out.length - 1];
    if (last && last[0].slice(0, 7) === d.slice(0, 7)) last.push(d);
    else out.push([d]);
  }
  return out;
}

/** The complete printable page. Pure, so it can be tested and reused. */
export function buildRegisterHtml(input: RegisterInput): string {
  const rows = buildRegisterRows(input.roster, input.records);
  const dayBlocks = byMonth(input.dates);
  const generated = (input.generatedAt ?? new Date()).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });

  const totalMarks = rows.reduce((n, r) => n + r.marked, 0);
  const totalAttended = rows.reduce((n, r) => n + r.attended, 0);
  const totalAbsent = rows.reduce((n, r) => n + r.absent, 0);
  const workingDays = input.dates.filter((d) => input.records.some((r) => r.date === d)).length;

  const blocks = dayBlocks
    .map((dates, blockIndex) => {
      const last = blockIndex === dayBlocks.length - 1;
      const head = dates.map((d) => `<th class="${isSunday(d) ? "sun" : ""}">${Number(d.slice(8))}</th>`).join("");
      const body = rows
        .map((row) => {
          const cells = dates
            .map((d) => {
              const status = row.byDate.get(d);
              const mark = status ? MARK[status] : undefined;
              return `<td class="${mark?.className ?? "dim"}${isSunday(d) ? " sun" : ""}">${mark ? mark.symbol : ""}</td>`;
            })
            .join("");
          const totals = last
            ? `<td>${row.attended}</td><td>${row.absent}</td><td>${row.leave}</td><td>${row.marked ? `${row.percent}%` : "–"}</td>`
            : "";
          return `<tr><td>${esc(row.student.rollNumber || "")}</td><td class="name">${esc(`${row.student.firstName} ${row.student.lastName}`.trim())}</td>${cells}${totals}</tr>`;
        })
        .join("");
      const totalHead = last ? `<th class="tot">P</th><th class="tot">A</th><th class="tot">L</th><th class="pct">%</th>` : "";
      const caption = dayBlocks.length > 1 ? `<p class="cap">${esc(monthName(dates[0]))}</p>` : "";
      return `<div class="block">${caption}<table><thead><tr><th class="roll">Roll</th><th class="name">Student name</th>${head}${totalHead}</tr></thead><tbody>${body}</tbody></table></div>`;
    })
    .join("");

  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(input.title)} - ${esc(input.classLabel)} - ${esc(input.period)}</title><style>${CSS}</style></head><body>
${input.branding ? letterheadHtml(input.branding) : ""}
<h1>${esc(input.title)}</h1>
<div class="meta"><div><b>Class / Division</b>${esc(input.classLabel)}</div><div><b>Period</b>${esc(input.period)}</div><div><b>Students</b>${rows.length}</div></div>
${blocks || "<p>No students in this section.</p>"}
<div class="sum"><div>Total students<b>${rows.length}</b></div><div>Working days<b>${workingDays}</b></div><div>Present markings<b>${totalAttended}</b></div><div>Absent markings<b>${totalAbsent}</b></div><div>Overall attendance<b>${totalMarks ? Math.round((totalAttended / totalMarks) * 1000) / 10 : 0}%</b></div></div>
<p class="legend">✓ = Present · ✗ = Absent · ½ = Half day (counted present) · L = Leave · blank = not marked · shaded column = Sunday. P = days attended (present, late, half day) · A = absent · L = leave · % = attended ÷ days marked.</p>
<div class="sign"><div>Class teacher signature</div><div>Principal signature</div></div>
<div class="foot"><span>Generated on ${esc(generated)}</span><span>${esc(input.branding?.name ?? "")}</span></div>
<script>window.onload=function(){window.print()}</script>
</body></html>`;
}

/** Opens the register in its own window and the print dialog (choose "Save as PDF" to download). False if pop-ups are blocked. */
export function printRegister(input: RegisterInput): boolean {
  const w = window.open("", "_blank", "width=1100,height=800");
  if (!w) return false;
  w.document.write(buildRegisterHtml(input));
  w.document.close();
  return true;
}
