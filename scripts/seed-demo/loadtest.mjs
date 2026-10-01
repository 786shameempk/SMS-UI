#!/usr/bin/env node
// Read-only load test: N virtual users repeatedly open the screens people use most (dashboards, lists, reports)
// for the seeded school, then prints throughput, latency percentiles and errors per endpoint.
// It never writes data. See README.md for usage.
import { Session, askPassword, pool, sleep } from "./lib.mjs";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? "true"];
  }),
);
const TARGET = args.target ?? "local";
const EMAIL = args.email ?? "superadmin@educore.dev";
const SUBDOMAIN = (args.subdomain ?? "greenvalley").toLowerCase();
const USERS = Math.min(Number(args.users ?? 20), 100); // capped so a typo can't flood a live site
const DURATION_S = Math.min(Number(args.duration ?? 60), 600);
const RAMP_S = Math.min(Number(args.ramp ?? 10), DURATION_S);
const THINK_MS = Number(args.think ?? 500); // pause between a user's requests, like a person clicking around

const s = new Session(TARGET, EMAIL, await askPassword(`Password for ${EMAIL} on ${TARGET}: `));
await s.login();
const tenant = (await s.get("identity", "/api/platform/tenants")).find((t) => t.subdomain === SUBDOMAIN);
if (!tenant) {
  console.error(`No tenant with subdomain "${SUBDOMAIN}". Run seed.mjs first.`);
  process.exit(1);
}
const branches = await s.get("identity", "/api/branches", { tenant: tenant.id });
const sample = {};
for (const b of branches) {
  const opts = { tenant: tenant.id, branch: b.id };
  const [sections, students, exams, invoices] = await Promise.all([
    s.get("academic", "/api/sections", opts),
    s.get("academic", "/api/students", opts),
    s.get("academic", "/api/exams", opts),
    s.get("finance", "/api/feeinvoices", opts),
  ]);
  sample[b.id] = { sections, students, exams, invoices };
}
const today = new Date().toISOString().slice(0, 10);
const month = today.slice(0, 7).split("-");

/** The weighted mix of screens: [name, service, path builder, weight]. */
const ENDPOINTS = [
  ["dashboard: settings", "identity", () => "/api/settings", 3],
  ["dashboard: notifications", "engagement", () => "/api/notifications/mine", 4],
  ["dashboard: unread count", "engagement", () => "/api/notifications/mine/unread-count", 6],
  ["students list", "academic", () => "/api/students", 6],
  ["student profile", "academic", (d) => `/api/students/${pick(d.students).id}`, 5],
  ["staff list", "academic", () => "/api/staff", 3],
  ["classes", "academic", () => "/api/classes", 2],
  ["sections", "academic", () => "/api/sections", 2],
  ["attendance: today", "academic", (d) => `/api/attendance/sections/${pick(d.sections).id}/date/${today}`, 5],
  ["attendance: daily report", "academic", () => `/api/attendance/reports/daily/${today}`, 2],
  ["attendance: monthly report", "academic", (d) => `/api/attendance/reports/monthly/${pick(d.sections).id}/${month[0]}/${Number(month[1])}`, 2],
  ["timetable", "academic", (d) => `/api/timetable/slots?sectionId=${pick(d.sections).id}`, 4],
  ["homework", "academic", () => "/api/homework", 3],
  ["exams", "academic", () => "/api/exams", 2],
  ["exam class results", "academic", (d) => `/api/exams/${pick(d.exams).id}/class-results`, 2],
  ["online exams dashboard", "academic", () => "/api/online-exams/dashboard", 2],
  ["calendar", "academic", () => "/api/calendarevents", 2],
  ["fee invoices", "finance", () => "/api/feeinvoices", 4],
  ["fee structures", "finance", () => "/api/feestructures", 1],
  ["receipts", "finance", () => "/api/receipts", 2],
  ["profit & loss", "finance", () => "/api/journalentries/reports/profit-and-loss", 1],
  ["library books", "campus", () => "/api/books", 2],
  ["library loans", "campus", () => "/api/bookloans", 1],
  ["transport routes", "campus", () => "/api/transportroutes", 1],
  ["hostel allocations", "campus", () => "/api/hostelallocations", 1],
  ["inventory items", "campus", () => "/api/inventoryitems", 1],
  ["tickets", "campus", () => "/api/tickets", 1],
  ["surveys", "engagement", () => "/api/surveys", 1],
  ["meetings upcoming", "meetings", () => "/api/meetings/upcoming", 2],
];
const totalWeight = ENDPOINTS.reduce((n, e) => n + e[3], 0);
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function chooseEndpoint() {
  let x = Math.random() * totalWeight;
  for (const e of ENDPOINTS) if ((x -= e[3]) <= 0) return e;
  return ENDPOINTS[0];
}

const stats = new Map(); // name -> { lat: number[], errors: number, codes: {} }
const record = (name, ms, status) => {
  const st = stats.get(name) ?? { lat: [], errors: 0, codes: {} };
  st.lat.push(ms);
  if (status >= 400 || status === 0) {
    st.errors++;
    st.codes[status] = (st.codes[status] ?? 0) + 1;
  }
  stats.set(name, st);
};

console.log(`Load test: ${USERS} users, ${DURATION_S}s (ramp ${RAMP_S}s), think ${THINK_MS}ms, tenant ${tenant.id}, ${branches.length} branches, target ${TARGET}\n`);
const started = Date.now();
const endAt = started + DURATION_S * 1000;

async function virtualUser(i) {
  await sleep((RAMP_S * 1000 * i) / USERS);
  const branch = branches[i % branches.length];
  const data = sample[branch.id];
  while (Date.now() < endAt) {
    const [name, service, build] = chooseEndpoint();
    let path;
    try {
      path = build(data);
    } catch {
      continue; // e.g. no exams in this branch
    }
    const t0 = performance.now();
    try {
      await s.get(service, path, { tenant: tenant.id, branch: branch.id, retries: 0 });
      record(name, performance.now() - t0, 200);
    } catch (err) {
      record(name, performance.now() - t0, err.status ?? 0);
    }
    await sleep(THINK_MS * (0.5 + Math.random()));
  }
}

const progress = setInterval(() => {
  const n = [...stats.values()].reduce((a, x) => a + x.lat.length, 0);
  const e = [...stats.values()].reduce((a, x) => a + x.errors, 0);
  process.stdout.write(`  ${Math.round((Date.now() - started) / 1000)}s  ${n} requests  ${e} errors\r`);
}, 2000);
await pool(Array.from({ length: USERS }, (_, i) => i), USERS, virtualUser);
clearInterval(progress);

// ── report ──
const pct = (arr, p) => {
  if (!arr.length) return 0;
  const a = [...arr].sort((x, y) => x - y);
  return a[Math.min(a.length - 1, Math.floor((p / 100) * a.length))];
};
const all = [...stats.values()].flatMap((x) => x.lat);
const errors = [...stats.values()].reduce((a, x) => a + x.errors, 0);
const secs = (Date.now() - started) / 1000;
console.log(`\n\nOverall: ${all.length} requests in ${secs.toFixed(0)}s = ${(all.length / secs).toFixed(1)} req/s, errors ${errors} (${((errors / Math.max(all.length, 1)) * 100).toFixed(2)}%)`);
console.log(`Latency ms: p50 ${pct(all, 50).toFixed(0)}  p90 ${pct(all, 90).toFixed(0)}  p95 ${pct(all, 95).toFixed(0)}  p99 ${pct(all, 99).toFixed(0)}  max ${Math.max(...all).toFixed(0)}\n`);
const rows = [...stats.entries()].sort((a, b) => pct(b[1].lat, 95) - pct(a[1].lat, 95));
console.log("endpoint".padEnd(30) + "count".padStart(7) + "p50".padStart(7) + "p95".padStart(7) + "max".padStart(7) + "  errors");
for (const [name, st] of rows) {
  console.log(
    name.padEnd(30) +
      String(st.lat.length).padStart(7) +
      pct(st.lat, 50).toFixed(0).padStart(7) +
      pct(st.lat, 95).toFixed(0).padStart(7) +
      Math.max(...st.lat).toFixed(0).padStart(7) +
      "  " +
      (st.errors ? `${st.errors} ${JSON.stringify(st.codes)}` : "-"),
  );
}
