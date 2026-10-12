/** Parses CSV text (quoted cells, escaped quotes, CRLF, UTF-8 BOM) into rows of cells. Fully blank lines are dropped. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  const endCell = () => {
    row.push(cell);
    cell = "";
  };
  const endRow = () => {
    endCell();
    if (row.some((c) => c.trim() !== "")) rows.push(row);
    row = [];
  };

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else inQuotes = false;
      } else cell += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") endCell();
    else if (ch === "\n") endRow();
    else if (ch !== "\r") cell += ch;
  }
  if (cell !== "" || row.length > 0) endRow();
  return rows;
}

const normalizeHeader = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * Turns parsed rows into records keyed by the wanted column keys. Headers match a column's key or label
 * ignoring case, spaces and punctuation. Returns the columns that were not found in the header row.
 */
export function rowsToRecords(
  rows: string[][],
  columns: { key: string; label: string }[],
): { records: Record<string, string>[]; missing: string[] } {
  if (rows.length === 0) return { records: [], missing: columns.map((c) => c.label) };
  const header = rows[0].map(normalizeHeader);
  const indexOf = new Map<string, number>();
  const missing: string[] = [];
  for (const c of columns) {
    const idx = header.findIndex((h) => h === normalizeHeader(c.key) || h === normalizeHeader(c.label));
    if (idx >= 0) indexOf.set(c.key, idx);
    else missing.push(c.label);
  }
  const records = rows.slice(1).map((cells) => {
    const rec: Record<string, string> = {};
    for (const c of columns) {
      const idx = indexOf.get(c.key);
      rec[c.key] = idx === undefined ? "" : (cells[idx] ?? "").trim();
    }
    return rec;
  });
  return { records, missing };
}

/** Accepts yyyy-mm-dd or dd/mm/yyyy (or dd-mm-yyyy) and returns yyyy-mm-dd, or null when it is not a real date. */
export function normalizeDate(value: string): string | null {
  const v = value.trim();
  let y: number, m: number, d: number;
  let match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(v);
  if (match) [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  else if ((match = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(v))) [d, m, y] = [Number(match[1]), Number(match[2]), Number(match[3])];
  else return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
