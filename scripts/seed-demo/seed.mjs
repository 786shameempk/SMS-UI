#!/usr/bin/env node
// Seeds demo schools into a School Sphere deployment through its public APIs, as the platform SuperAdmin.
// The schools come from seed-config.json (several tenants, each with several branches, on different plans):
//   1. each tenant (school) on its plan, activated, with its profile filled in;
//   2. its branches ("Main Campus" is created with the tenant; the rest are added);
//   3. for EACH branch, one module at a time (seed/academic, finance, campus, engagement) - only modules the
//      school's plan includes, as in real use;
//   4. payroll once per school (one run covers every branch).
// No login accounts are created, so no emails are sent. Every step is independent: a failure is reported and the
// rest carry on. See README.md for usage.
import { readFileSync } from "node:fs";
import { Session, askPassword, iso, rng } from "./lib.mjs";
import { createRunner } from "./seed/runner.mjs";
import { seedAcademic } from "./seed/academic.mjs";
import { seedFinance, seedPayroll } from "./seed/finance.mjs";
import { seedCampus } from "./seed/campus.mjs";
import { seedEngagement, seedSurveys } from "./seed/engagement.mjs";
import { loadBranchContext } from "./seed/context.mjs";
import { assertEmailOff, loadUsersFile, seedAccounts } from "./seed/accounts.mjs";
import { seedActivity } from "./seed/activity.mjs";
import { seedBranchExtras, seedPlatformExtras, seedTenantExtras } from "./seed/extras.mjs";

// ── options ──────────────────────────────────────────────────────────────────────────────────
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, "").split("=");
    return [k, v.length ? v.join("=") : "true"];
  }),
);
const TARGET = args.target ?? "local"; // "local" or a site URL, e.g. https://schoolsphrere.com
const EMAIL = args.email ?? "superadmin@educore.dev";
const CONCURRENCY = Number(args.concurrency ?? 4);
const config = JSON.parse(readFileSync(new URL(args.config ?? "./seed-config.json", import.meta.url), "utf8"));
// --tenant=greenvalley,riverside seeds just those; --students/--teachers/--branches override every school's sizes.
const only = args.tenant ? args.tenant.split(",") : null;
const tenants = config.tenants
  .map((t, ti) => ({ ...t, ti }))
  .filter((t) => !only || only.includes(t.subdomain))
  .map((t) => ({
    ...t,
    studentsPerBranch: Number(args.students ?? t.studentsPerBranch ?? 60),
    teachersPerBranch: Number(args.teachers ?? t.teachersPerBranch ?? 12),
    branches: t.branches.slice(0, Number(args.branches ?? t.branches.length)),
  }));

if (TARGET !== "local" && args["allow-prod"] !== "true") {
  console.error(`Refusing to seed ${TARGET} without --allow-prod (it creates schools and thousands of records).`);
  process.exit(1);
}
if (!tenants.length) {
  console.error(`No tenants to seed (check --tenant against ${config.tenants.map((t) => t.subdomain).join(", ")}).`);
  process.exit(1);
}

const today = new Date();
const yearCfg = config.academicYear;
const y0 = Number(yearCfg.start.slice(0, 4));
const { report, step, bulk, scoped } = createRunner({ concurrency: CONCURRENCY });

/** Stable seed per school + branch, so re-seeding produces the same people and numbers. */
const seedOf = (text) => [...text].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7);

// ── main ─────────────────────────────────────────────────────────────────────────────────────
const s = new Session(TARGET, EMAIL, await askPassword(`Password for ${EMAIL} on ${TARGET}: `));
await s.login();
if (!JSON.stringify(s.user ?? {}).toLowerCase().includes("superadmin")) {
  console.error("This must run as the platform SuperAdmin (it creates tenants).");
  process.exit(1);
}
console.log(`Signed in as ${EMAIL}. Seeding ${tenants.map((t) => t.subdomain).join(", ")} on ${TARGET}`);

let usersData = null;
if (args.only === "logins") {
  try {
    assertEmailOff(TARGET);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
  usersData = loadUsersFile();
}
if (args.only === "activity") {
  usersData = loadUsersFile();
  if (!usersData.users.length) {
    console.error("No seeded accounts yet - run with --only=logins first.");
    process.exit(1);
  }
}

const plans = await s.get("identity", "/api/platform/plans");
const existingTenants = await s.get("identity", "/api/platform/tenants");

for (const t of tenants) {
  console.log(`\n══ ${t.school} (${t.subdomain}) ══`);
  s.tenant = null;
  s.branch = null;

  let tenant = existingTenants.find((x) => x.subdomain === t.subdomain);
  // An existing school is only topped up: configured branches it doesn't have yet are created and filled; its
  // existing branches are left alone, so a re-run never doubles data. --reuse-tenant fills every branch again.
  const topUp = Boolean(tenant) && args["reuse-tenant"] !== "true";
  const plan = (topUp && plans.find((p) => p.id === tenant.planId)) || plans.find((p) => p.name === t.plan || p.tier === t.plan);
  if (!plan) {
    await step(t.subdomain, "plan", async () => {
      throw new Error(`no plan named "${t.plan}" (have ${plans.map((p) => p.name).join(", ")})`);
    });
    continue;
  }
  const planModules = plan.includedModules ?? null;

  // --only=logins: login accounts for existing schools (seed/accounts.mjs). Email must be off - see accounts.mjs.
  if (args.only === "logins") {
    if (!tenant) {
      console.log("  - not seeded yet; run without --only first.");
      continue;
    }
    s.tenant = tenant.id;
    s.branch = null;
    const rows = await s.get("identity", "/api/branches");
    const branches = [];
    for (const row of rows) {
      s.branch = row.id;
      branches.push({ ...row, ctx: await loadBranchContext(s) });
    }
    s.branch = rows[0]?.id ?? null;
    await seedAccounts({ s, t, target: TARGET, branches, S: scoped(t.subdomain, null), bulk, data: usersData, studentsPerBranch: Number(args["student-logins"] ?? 15), parentsPerBranch: Number(args["parent-logins"] ?? 15) });
    continue;
  }

  // --only=activity: what the seeded accounts do once they sign in (seed/activity.mjs), per branch.
  if (args.only === "activity") {
    const accounts = usersData.users.filter((u) => u.tenantId === tenant?.id);
    if (!tenant || !accounts.length) {
      console.log("  - no seeded accounts for this school; run --only=logins first.");
      continue;
    }
    s.tenant = tenant.id;
    s.branch = null;
    const rows = await s.get("identity", "/api/branches");
    for (const row of rows) {
      s.branch = row.id;
      console.log(`\n${t.school} · ${row.name} (${row.id}) - activity`);
      await seedActivity({
        admin: s, target: TARGET, data: usersData, accounts: accounts.filter((u) => u.branchId === row.id), ctx: await loadBranchContext(s),
        t, b: row, r: rng(seedOf(`${t.subdomain}/${row.code}/activity`)), S: scoped(`${t.subdomain}/${row.code}`, planModules), bulk, today,
      });
    }
    continue;
  }

  // --only=extras: fill the phase-2 tables (seed/extras.mjs) for every branch of existing schools, nothing else.
  // --only=fill: also the campus modules and surveys, for branches that don't have them yet - e.g. after a school
  // moves to a bigger plan. Both skip whatever is already there.
  if (args.only === "extras" || args.only === "fill") {
    if (!tenant) {
      console.log("  - not seeded yet; run without --only first.");
      continue;
    }
    s.tenant = tenant.id;
    s.branch = null;
    const rows = await s.get("identity", "/api/branches");
    s.branch = rows[0]?.id ?? null;
    await seedTenantExtras({ s, t, S: scoped(t.subdomain, planModules), r: rng(seedOf(`${t.subdomain}/extras`)) });
    for (const row of rows) {
      s.branch = row.id;
      const bi = row.code?.toUpperCase() === "MAIN" ? 0 : rows.indexOf(row) || 1;
      console.log(`\n${t.school} · ${row.name} (${row.id}) - ${args.only}`);
      const S = scoped(`${t.subdomain}/${row.code}`, planModules);
      if (args.only === "fill") {
        const ctx = { s, t, b: row, bi, ti: t.ti, r: rng(seedOf(`${t.subdomain}/${row.code}/fill`)), S, bulk, today, TODAY: iso(today), y0, yearCfg, ...(await loadBranchContext(s)) };
        if (ctx.students.length) {
          await seedCampus(ctx);
          await seedSurveys(ctx);
        }
      }
      await seedBranchExtras({ s, t, b: row, bi, r: rng(seedOf(`${t.subdomain}/${row.code}/extras`)), S, bulk, today });
    }
    continue;
  }

  // 1. Tenant ────────────────────────────────────────────────────────────────────────────────
  if (topUp) {
    console.log(`  - already exists (${tenant.id}, ${plan.name}); adding only branches it doesn't have yet.`);
  } else {
    await step(t.subdomain, "create tenant", async () => {
      tenant ??= await s.post("identity", "/api/platform/tenants", {
        schoolName: t.school,
        subdomain: t.subdomain,
        planId: plan.id,
        billingContactName: t.billingContactName ?? "Accounts Office",
        billingContactEmail: `accounts@${t.subdomain}.example`,
      });
      return `${tenant.id} on ${plan.name}`;
    });
  }
  if (!tenant) continue;
  s.tenant = tenant.id;
  if (!topUp) {
    await step(t.subdomain, "activate subscription", async () => {
      await s.put("identity", `/api/platform/tenants/${tenant.id}/status`, { status: "Active" });
    });
    await step(t.subdomain, "school profile", async () => {
      await s.put("identity", "/api/settings/profile", { name: t.school, ...t.profile, email: `office@${t.subdomain}.example` });
    });
  }

  // 2. Branches ──────────────────────────────────────────────────────────────────────────────
  let branchRows = await s.get("identity", "/api/branches");
  const hasBranch = (b) => branchRows.some((x) => x.code?.toUpperCase() === b.code);
  const toSeed = topUp ? t.branches.filter((b) => !hasBranch(b)) : t.branches;
  if (!toSeed.length) {
    console.log("  - every configured branch exists; nothing to add.");
    report.push({ scope: t.subdomain, name: "tenant", ok: true, skipped: true, detail: "already complete" });
    continue;
  }
  for (const b of toSeed) {
    await step(t.subdomain, `branch ${b.name}`, async () => {
      // The tenant's first branch already exists; match it by code, or take it over for the first configured branch.
      let row = branchRows.find((x) => x.code?.toUpperCase() === b.code) ?? (b === t.branches[0] ? branchRows[0] : undefined);
      const body = { name: b.name, code: b.code, address: b.area, phone: b.phone, status: "Active" };
      row = row ? await s.put("identity", `/api/branches/${row.id}`, body) : await s.post("identity", "/api/branches", body);
      b.id = row.id;
      return b.id;
    });
  }
  branchRows = await s.get("identity", "/api/branches");
  for (const b of t.branches) b.id ??= branchRows.find((x) => x.code?.toUpperCase() === b.code)?.id;

  // 3. Per-branch data ───────────────────────────────────────────────────────────────────────
  const allStaff = [];
  for (const b of toSeed) {
    const bi = t.branches.indexOf(b);
    if (!b.id) continue;
    s.branch = b.id;
    const scope = `${t.subdomain}/${b.code}`;
    console.log(`\n${t.school} · ${b.name} (${b.id})`);
    const ctx = {
      s, t, b, bi, ti: t.ti, r: rng(seedOf(`${t.subdomain}/${b.code}`)), S: scoped(scope, planModules), bulk,
      today, TODAY: iso(today), y0, yearCfg, allStaff,
      studentsPerBranch: t.studentsPerBranch, teachersPerBranch: t.teachersPerBranch,
    };
    if (!(await seedAcademic(ctx))) continue;
    await seedFinance(ctx);
    await seedCampus(ctx);
    await seedEngagement(ctx);
    await seedBranchExtras({ ...ctx, r: rng(seedOf(`${t.subdomain}/${b.code}/extras`)) });
  }
  s.branch = t.branches[0].id ?? toSeed[0].id;
  await seedTenantExtras({ s, t, S: scoped(t.subdomain, planModules), r: rng(seedOf(`${t.subdomain}/extras`)) });

  // 4. Payroll: one run per month for the whole school ──────────────────────────────────────
  console.log(`\n${t.school} · payroll (whole school)`);
  if (topUp) {
    report.push({ scope: t.subdomain, name: "payroll", ok: true, skipped: true, detail: "existing school - its payroll run already exists" });
    console.log("  - payroll: skipped (existing school; last month's run already exists)");
  } else {
    await seedPayroll({ s, S: scoped(t.subdomain, planModules), bulk, today, allStaff, firstBranchId: t.branches[0].id });
  }
}

// 5. Platform-wide content (announcement, global study materials) ────────────────────────────
console.log("\nPlatform");
await seedPlatformExtras({ s, step });

// ── summary ──────────────────────────────────────────────────────────────────────────────────
const failed = report.filter((x) => !x.ok);
const skipped = report.filter((x) => x.skipped);
console.log(`\nDone: ${report.length - failed.length}/${report.length} steps succeeded (${skipped.length} skipped), ${s.calls} API calls.`);
if (failed.length) {
  console.log("Failed steps:");
  for (const f of failed) console.log(`  - [${f.scope}] ${f.name}: ${f.detail.slice(0, 300)}`);
}
console.log("\nOpen the site as SuperAdmin and pick a school in the tenant switcher to see the data.");
process.exit(failed.length ? 2 : 0);
