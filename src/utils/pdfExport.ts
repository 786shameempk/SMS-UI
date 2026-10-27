import { LETTERHEAD_CSS, letterheadHtml } from "@/features/tenant/printLetterhead";
import type { TenantBranding } from "@/features/tenant/branding";

export interface PdfTable {
  title: string;
  /** One line under the title, e.g. "Filtered: 25 records" or the period. */
  subtitle?: string;
  headers: string[];
  rows: unknown[][];
  /** Columns holding numbers are right-aligned; by default a column is numeric when every non-empty cell looks like a number. */
  orientation?: "portrait" | "landscape";
  branding?: TenantBranding;
  generatedBy?: string;
  locale?: string;
}

const esc = (value: unknown) =>
  String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

const looksNumeric = (value: unknown) => typeof value === "number" || (typeof value === "string" && /^-?[\d,]+(\.\d+)?%?$/.test(value.trim()));

const CSS = `
*{box-sizing:border-box}
body{font:11px/1.4 Arial,"Segoe UI","Noto Sans","Noto Sans Malayalam","Noto Naskh Arabic",sans-serif;color:#111;margin:0}
h1{font-size:15px;margin:0 0 4px;text-align:center}
.sub,.meta{text-align:center;color:#475569;margin:0 0 8px;font-size:10.5px}
table{width:100%;border-collapse:collapse}
thead{display:table-header-group}
tr{page-break-inside:avoid;break-inside:avoid}
th,td{border:1px solid #94a3b8;padding:3px 5px;vertical-align:top;overflow-wrap:anywhere}
th{background:#e2e8f0;font-size:10px;text-align:left}
tbody tr:nth-child(even){background:#f8fafc}
.num{text-align:right;font-variant-numeric:tabular-nums}
.empty{text-align:center;color:#64748b;padding:18px}
.foot{margin-top:10px;font-size:9px;color:#64748b;display:flex;justify-content:space-between;gap:12px}
${LETTERHEAD_CSS}
`;

/**
 * A complete, self-contained printable table. The browser's own print engine lays it out, so every script (Malayalam, Arabic, Hindi...) is shaped
 * correctly, the header row repeats on each page and the page number is printed. Pure, so it can be tested.
 */
export function buildPdfHtml(input: PdfTable): string {
  const generated = new Date().toLocaleString(input.locale, { dateStyle: "medium", timeStyle: "short" });
  const school = input.branding?.name ?? "";
  const numeric = input.headers.map((_, c) => input.rows.length > 0 && input.rows.every((r) => r[c] == null || r[c] === "" || looksNumeric(r[c])) && input.rows.some((r) => r[c] != null && r[c] !== ""));
  const body = input.rows.length
    ? input.rows.map((r) => `<tr>${input.headers.map((_, c) => `<td class="${numeric[c] ? "num" : ""}">${esc(r[c])}</td>`).join("")}</tr>`).join("")
    : `<tr><td class="empty" colspan="${Math.max(1, input.headers.length)}">No records to show.</td></tr>`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(input.title)}</title><style>@page{size:A4 ${input.orientation ?? (input.headers.length > 7 ? "landscape" : "portrait")};margin:12mm 10mm 14mm}
@page{@bottom-left{content:"${school.replace(/["\\]/g, "")}";font:8px Arial;color:#64748b}@bottom-right{content:"Page " counter(page) " of " counter(pages);font:8px Arial;color:#64748b}}${CSS}</style></head><body>
${input.branding ? letterheadHtml(input.branding) : ""}
<h1>${esc(input.title)}</h1>
${input.subtitle ? `<p class="sub">${esc(input.subtitle)}</p>` : ""}
<p class="meta">${input.rows.length.toLocaleString()} record${input.rows.length === 1 ? "" : "s"} · Generated ${esc(generated)}${input.generatedBy ? ` by ${esc(input.generatedBy)}` : ""}</p>
<table><thead><tr>${input.headers.map((h, c) => `<th class="${numeric[c] ? "num" : ""}">${esc(h)}</th>`).join("")}</tr></thead><tbody>${body}</tbody></table>
<div class="foot"><span>${esc(school)}</span><span>Generated ${esc(generated)}</span></div>
<script>window.onload=function(){window.focus();window.print()}</script>
</body></html>`;
}

/**
 * Opens the table as a print-ready document and the browser's print dialog, where "Save as PDF" downloads it (the destination is one click).
 * Returns false when the browser blocked the pop-up, so the caller can say so.
 */
export function exportPdf(input: PdfTable): boolean {
  const w = window.open("", "_blank", "width=1100,height=800");
  if (!w) return false;
  w.document.write(buildPdfHtml(input));
  w.document.close();
  return true;
}
