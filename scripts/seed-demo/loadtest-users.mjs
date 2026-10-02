#!/usr/bin/env node
// Turns the seeded accounts (seed-users.json) into a k6 users file (loadtest/users.seeded.json, gitignored), with
// each account's school and branch so the k6 journeys send the right X-Tenant-Id / X-Branch-Id:
//   node scripts/seed-demo/loadtest-users.mjs
//   k6 run -e USERS_FILE=../users.seeded.json -e PROFILE=load loadtest/scenarios/mixed.js
import { readFileSync, writeFileSync } from "node:fs";
import { loadUsersFile } from "./seed/accounts.mjs";

const data = loadUsersFile();
if (!data.users.length) {
  console.error("No seeded accounts - run seed.mjs --only=logins first.");
  process.exit(1);
}
// The admin journey opens fee and campus screens, so only schools whose plan has them get admin users.
const config = JSON.parse(readFileSync(new URL("./seed-config.json", import.meta.url), "utf8"));
const adminSchools = new Set(config.tenants.filter((t) => t.plan !== "Starter").map((t) => t.subdomain));

const out = {};
for (const role of ["admin", "teacher", "parent", "student"]) {
  out[role] = data.users
    .filter((u) => u.role === role && (role !== "admin" || adminSchools.has(u.tenant)))
    // School admins see every branch; the journeys use the main campus.
    .map((u) => ({ email: u.email, password: data.password, tenantId: u.tenantId, branchId: u.branchId ?? `${u.tenantId}-main` }));
}
const file = new URL("../../loadtest/users.seeded.json", import.meta.url);
writeFileSync(file, `${JSON.stringify(out, null, 2)}\n`);
console.log(`Wrote ${Object.entries(out).map(([k, v]) => `${v.length} ${k}`).join(", ")} to loadtest/users.seeded.json`);
