import type { ReportColumnDef, ReportRow, ReportSummaryItem } from "./types";

/** Display text for one cell, by column type. Missing values show as an empty cell, never "null". */
export function formatCell(value: ReportRow[string] | undefined, type: ReportColumnDef["type"] | ReportSummaryItem["type"], locale?: string): string {
  if (value === null || value === undefined || value === "") return "";
  switch (type) {
    case "date": {
      const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
      if (!m) return String(value);
      return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" });
    }
    case "percent":
      return typeof value === "number" ? `${value.toLocaleString(locale, { maximumFractionDigits: 1 })}%` : String(value);
    case "currency":
      return typeof value === "number" ? value.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : String(value);
    case "number":
      return typeof value === "number" ? value.toLocaleString(locale) : String(value);
    default:
      return String(value);
  }
}

export const isNumericColumn = (type: ReportColumnDef["type"]) => type === "number" || type === "percent" || type === "currency";

/**
 * One CSV cell. Text starting with = + - @ or a control character gets an apostrophe in front so a spreadsheet shows it
 * instead of running it as a formula; numbers are written as plain numbers.
 */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** CSV text (UTF-8 BOM first, so Excel reads Malayalam, Arabic and other scripts correctly) for rows already on screen. */
export function rowsToCsv(columns: ReportColumnDef[], rows: ReportRow[]): string {
  const lines = [columns.map((c) => csvCell(c.label)).join(","), ...rows.map((r) => columns.map((c) => csvCell(r[c.key])).join(","))];
  return `﻿${lines.join("\r\n")}\r\n`;
}
