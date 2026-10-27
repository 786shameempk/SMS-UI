import { LETTERHEAD_CSS, letterheadHtml } from "@/features/tenant/printLetterhead";
import type { TenantBranding } from "@/features/tenant/branding";
import { formatCell, isNumericColumn } from "./format";
import type { ReportColumnDef, ReportDescriptor, ReportRow, ReportSummaryItem } from "./types";

export interface PrintableReport {
  descriptor: Pick<ReportDescriptor, "title" | "columns" | "orientation" | "sensitive">;
  rows: ReportRow[];
  /** Totals over the whole filtered dataset; printed once, after the table. */
  summary: ReportSummaryItem[];
  /** "Academic year: 2026-27", "Class: Grade 5", "Period: ..."; only the filters actually applied. */
  filterLines: { label: string; text: string }[];
  /** What the rows are: "Current page", "All filtered records (301)". */
  scopeLabel: string;
  branding?: TenantBranding;
  generatedBy?: string;
  generatedAt?: Date;
  locale?: string;
}

const esc = (value: unknown) =>
  String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

const CSS = `
*{box-sizing:border-box}
body{font:11px/1.4 Arial,"Segoe UI",sans-serif;color:#111;margin:0}
.lh{text-align:center;border-bottom:1px solid #cbd5e1;padding-bottom:8px;margin-bottom:10px}
.lh img{max-height:52px;max-width:160px;object-fit:contain;margin-bottom:4px}.lh b{display:block;font-size:16px}.lh span{display:block;color:#64748b;font-size:10px}
h1{font-size:15px;margin:0 0 6px;text-align:center;text-transform:uppercase;letter-spacing:.05em}
.meta{display:flex;flex-wrap:wrap;gap:4px 18px;justify-content:center;margin:0 0 10px;font-size:10.5px;color:#334155}
.meta b{color:#0f172a}
table.data{width:100%;border-collapse:collapse}
table.data thead{display:table-header-group}
table.data tfoot{display:table-footer-group}
table.data tr{page-break-inside:avoid;break-inside:avoid}
table.data th,table.data td{border:1px solid #94a3b8;padding:3px 5px;vertical-align:top;overflow-wrap:anywhere}
table.data th{background:#e2e8f0;font-size:10px;text-align:left}
table.data tbody tr:nth-child(even){background:#f8fafc}
.num{text-align:right;font-variant-numeric:tabular-nums}
.sum{display:flex;flex-wrap:wrap;gap:6px;margin:12px 0 0;page-break-inside:avoid}
.sum div{border:1px solid #cbd5e1;padding:4px 10px;min-width:110px}.sum b{display:block;font-size:13px}
.sign{display:flex;justify-content:space-between;gap:24px;margin-top:38px;page-break-inside:avoid}
.sign div{flex:1;max-width:30%;border-top:1px solid #111;padding-top:3px;text-align:center;font-size:10px}
.foot{margin-top:12px;font-size:9px;color:#64748b;display:flex;justify-content:space-between;gap:12px;page-break-inside:avoid}
.conf{margin-top:6px;font-size:9px;color:#b91c1c;font-weight:700;text-align:center}
.empty{text-align:center;color:#64748b;padding:18px}
${LETTERHEAD_CSS}
`;

function pageRule(orientation: string, schoolName: string) {
  // Chrome 131+ prints these margin boxes on every page; older browsers simply omit them (the in-page footer remains).
  return `@page{size:A4 ${orientation};margin:12mm 10mm 14mm}
@page{@bottom-left{content:"${schoolName.replace(/["\\]/g, "")}";font:8px Arial;color:#64748b}@bottom-right{content:"Page " counter(page) " of " counter(pages);font:8px Arial;color:#64748b}}`;
}

function headerCell(c: ReportColumnDef) {
  return `<th class="${isNumericColumn(c.type) ? "num" : ""}">${esc(c.label)}</th>`;
}

/** The complete, self-contained printable document. Pure, so it can be tested and reused for PDF output. */
export function buildReportPrintHtml(input: PrintableReport): string {
  const { descriptor, rows, summary, filterLines } = input;
  const generated = (input.generatedAt ?? new Date()).toLocaleString(input.locale, { dateStyle: "medium", timeStyle: "short" });
  const columns = descriptor.columns;
  const school = input.branding?.name ?? "";

  const body = rows.length
    ? rows
        .map((row) => `<tr>${columns.map((c) => `<td class="${isNumericColumn(c.type) ? "num" : ""}">${esc(formatCell(row[c.key], c.type, input.locale))}</td>`).join("")}</tr>`)
        .join("")
    : `<tr><td class="empty" colspan="${columns.length}">No records match the selected filters.</td></tr>`;

  const meta = [
    ...filterLines.map((f) => `<span>${esc(f.label)}: <b>${esc(f.text)}</b></span>`),
    `<span>Records: <b>${esc(input.scopeLabel)}</b></span>`,
    `<span>Generated: <b>${esc(generated)}</b>${input.generatedBy ? ` by <b>${esc(input.generatedBy)}</b>` : ""}</span>`,
  ].join("");

  const totals = summary.length
    ? `<div class="sum">${summary.map((s) => `<div>${esc(s.label)}<b>${esc(formatCell(s.value, s.type, input.locale))}</b></div>`).join("")}</div>`
    : "";

  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(descriptor.title)}</title><style>${pageRule(descriptor.orientation, school)}${CSS}</style></head><body>
${input.branding ? letterheadHtml(input.branding) : ""}
<h1>${esc(descriptor.title)}</h1>
<div class="meta">${meta}</div>
<table class="data"><thead><tr>${columns.map(headerCell).join("")}</tr></thead><tbody>${body}</tbody></table>
${totals}
<div class="sign"><div>Prepared by</div><div>Checked by</div><div>Principal</div></div>
${descriptor.sensitive ? `<p class="conf">CONFIDENTIAL: contains personal information. Share only with authorised staff.</p>` : ""}
<div class="foot"><span>${esc(school)}</span><span>Generated ${esc(generated)}</span></div>
<script>window.onload=function(){window.focus();window.print()}</script>
</body></html>`;
}

/** Opens the document in its own window and the browser print dialog ("Save as PDF" there downloads it). False if pop-ups are blocked. */
export function printReport(input: PrintableReport): boolean {
  const w = window.open("", "_blank", "width=1100,height=800");
  if (!w) return false;
  w.document.write(buildReportPrintHtml(input));
  w.document.close();
  return true;
}
