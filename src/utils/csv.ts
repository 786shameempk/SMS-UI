export const csvCell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const fileSafe = (name: string, fallback = "export") => name.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-") || fallback;

/** Downloads rows as a CSV that Excel opens with UTF-8 names intact. */
export function downloadCsv(fileName: string, headers: string[], rows: unknown[][]) {
  const lines = [headers, ...rows].map((line) => line.map(csvCell).join(","));
  const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName.endsWith(".csv") ? fileName : `${fileName}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
