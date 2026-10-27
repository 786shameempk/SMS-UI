// Runs every report against the live Academic service: first page, sort by each sortable column, and CSV export.
const auth = await (await fetch("http://localhost:5118/api/auth/login", {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "admin@educore.dev", password: "Admin@12345" }),
})).json();
const H = { Authorization: `Bearer ${auth.accessToken}`, "Content-Type": "application/json" };
const B = "http://localhost:5136/api/reports";

const list = await (await fetch(B, { headers: H })).json();
const FILTERS = {
  "students.birthdays": { month: "10" },
  "attendance.student-percentage": { dateFrom: "2026-09-01", dateTo: "2026-10-26" },
  "attendance.daily-absentees": { date: "2026-10-01" },
  "attendance.summary-by-class": { dateFrom: "2026-09-01", dateTo: "2026-10-26" },
  "attendance.staff-summary": { dateFrom: "2026-09-01", dateTo: "2026-10-26" },
};
let failures = 0;
for (const r of list) {
  const filters = FILTERS[r.key] ?? {};
  const run = async (body, label) => {
    const res = await fetch(`${B}/${r.key}/query`, { method: "POST", headers: H, body: JSON.stringify(body) });
    const text = await res.text();
    if (!res.ok) { failures++; console.log(`FAIL ${r.key} ${label}: ${res.status} ${text.slice(0, 160)}`); return null; }
    return JSON.parse(text);
  };
  const first = await run({ filters, pageSize: 10 }, "page1");
  if (first) console.log(`ok   ${r.key}: total=${first.total} pages=${first.totalPages} rows=${first.rows.length} summary=${first.summary.map((s) => `${s.label}=${s.value}`).join("; ").slice(0, 110)}`);
  for (const c of r.columns.filter((c) => c.sortable)) {
    await run({ filters, pageSize: 10, sortBy: c.key, sortDirection: "desc" }, `sort ${c.key}`);
  }
  await run({ filters, pageSize: 10, search: "a" }, "search");
  const ex = await fetch(`${B}/${r.key}/export`, { method: "POST", headers: H, body: JSON.stringify({ filters }) });
  const csv = await ex.text();
  if (!ex.ok) { failures++; console.log(`FAIL ${r.key} export: ${ex.status} ${csv.slice(0, 160)}`); }
  else if (first) {
    const lines = csv.replace(/^﻿/, "").split("\r\n").filter(Boolean).length - 1;
    if (lines !== first.total) { failures++; console.log(`FAIL ${r.key} export rows ${lines} != total ${first.total}`); }
  }
}
console.log(failures ? `${failures} failures` : "ALL OK");
