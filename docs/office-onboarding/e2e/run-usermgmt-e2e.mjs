// End-to-end check of "people created in a school appear in Administration -> User Management" against REAL services and SQL Server.
//
//   node docs/office-onboarding/e2e/run-usermgmt-e2e.mjs
//
// Same harness idea as run-e2e.mjs: throw-away databases, AuthService (:5118) + AcademicService (:5136) from their Debug builds,
// everything over HTTP, databases dropped at the end. It signs in as the seeded school admin and creates students, teachers and
// staff the way the school's web app does (single create; the CSV importer calls the same endpoints row by row).
import { spawn, execFileSync } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import assert from "node:assert/strict";

const SQL = process.env.E2E_SQL_SERVER ?? "localhost\\MSSQLSERVER_2022";
const AUTH = "http://localhost:5118";
const ACADEMIC = "http://localhost:5136";
const KEY = "e2e-service-key-0123456789abcdef0123456789abcdef";
const JWT = "e2e-jwt-secret-0123456789abcdef0123456789abcdef0123456789";
const conn = (db) => `Server=${SQL};Database=${db};Trusted_Connection=True;TrustServerCertificate=True;`;
const sql = (query, db = "master") => {
  try {
    return execFileSync("sqlcmd", ["-S", SQL, "-d", db, "-E", "-C", "-b", "-I", "-h", "-1", "-W", "-Q", `SET NOCOUNT ON; ${query}`], { encoding: "utf8" }).trim();
  } catch (e) {
    throw new Error(`SQL failed: ${query}\n${e.stdout ?? ""}${e.stderr ?? ""}`);
  }
};
const GATEWAY = "http://localhost:5138";
const logs = { auth: "", academic: "", gateway: "" };
const children = [];
const start = (name, dir, env, port) => {
  const c = spawn("dotnet", ["run", "--no-build", "--no-launch-profile"], { cwd: dir, env: { ...process.env, ASPNETCORE_ENVIRONMENT: "Development", ASPNETCORE_URLS: `http://localhost:${port}`, ...env }, stdio: ["ignore", "pipe", "pipe"] });
  c.stdout.on("data", (d) => (logs[name] += d));
  c.stderr.on("data", (d) => (logs[name] += d));
  children.push(c);
};
const up = async (url) => { for (let i = 0; i < 90; i++) { try { await fetch(url); return; } catch { await sleep(1000); } } throw new Error("service did not start"); };
const call = async (base, method, path, { token, body, headers } = {}) => {
  const res = await fetch(base + path, { method, headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: res.status, data };
};
const ok = (r, what) => { assert.ok(r.status >= 200 && r.status < 300, `${what}: HTTP ${r.status} ${JSON.stringify(r.data)?.slice(0, 400)}`); return r.data; };
const step = (m) => console.log(`\n== ${m}`);
const pass = (m) => console.log(`   ok  ${m}`);
const internal = (path, body) => call(ACADEMIC, "POST", `/internal/onboarding/${path}`, { body, headers: { "X-Service-Key": KEY } });

async function main() {
  step("Fresh databases and services");
  for (const db of ["AuthServiceUM", "AcademicServiceUM"]) sql(`IF DB_ID('${db}') IS NOT NULL BEGIN ALTER DATABASE [${db}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${db}]; END`);
  const common = { Jwt__Secret: JWT, ServiceAuth__Secret: KEY };
  start("academic", "E:/Personal/AcademicService/src/AcademicService.API", { ...common, ConnectionStrings__DefaultConnection: conn("AcademicServiceUM"), Services__AuthServiceUrl: `${AUTH}/` }, 5136);
  start("auth", "E:/Personal/AuthService/src/AuthService.API", { ...common, ConnectionStrings__DefaultConnection: conn("AuthServiceUM"), Services__AcademicServiceUrl: `${ACADEMIC}/`, Smtp__Host: "", Smtp__Password: "", RateLimiting__Enabled: "false" }, 5118);
  start("gateway", "E:/Personal/ApiGateway/src/ApiGateway.API", { Jwt__Secret: JWT }, 5138);
  await up(`${ACADEMIC}/internal/onboarding/counts`);
  await up(`${GATEWAY}/services/identity/api/auth/login`);
  await up(`${AUTH}/api/office/auth/login`);
  await sleep(4000);
  const tenant = sql("SELECT TOP 1 Id FROM Tenants ORDER BY CreatedAt", "AuthServiceUM");
  const subdomain = sql(`SELECT Subdomain FROM Tenants WHERE Id='${tenant}'`, "AuthServiceUM");
  const branch = `${tenant}-main`;
  pass(`tenant ${tenant} / ${branch}`);

  // Structure through the trusted channel (the school's own screens for this are not what is under test).
  const row = (line, values) => ({ line, values });
  await internal("commit", { tenantId: tenant, branchId: branch, batchId: crypto.randomUUID(), type: "academic-years", rows: [row(2, { name: "2026-27", start_date: "2026-06-01", end_date: "2027-03-31", is_current: "yes" })] });
  await internal("commit", { tenantId: tenant, branchId: branch, batchId: crypto.randomUUID(), type: "classes", rows: [row(2, { academic_year: "2026-27", class_name: "Grade 1" })] });
  await internal("commit", { tenantId: tenant, branchId: branch, batchId: crypto.randomUUID(), type: "sections", rows: [row(2, { academic_year: "2026-27", class_name: "Grade 1", section_name: "A", capacity: "40" })] });

  step("School admin signs in");
  const login = ok(await call(AUTH, "POST", "/api/auth/login", { body: { email: "admin@educore.dev", password: "Admin@12345", subdomain } }), "admin login");
  const token = login.accessToken;
  assert.ok(token, JSON.stringify(login).slice(0, 300));
  const section = ok(await call(ACADEMIC, "GET", "/api/sections", { token }), "sections").find?.((s) => s.name === "A") ?? ok(await call(ACADEMIC, "GET", "/api/sections", { token }), "sections").items?.find((s) => s.name === "A");
  assert.ok(section, "section A exists");
  const before = ok(await call(AUTH, "GET", "/api/school-users", { token }), "users before");
  pass(`admin sees ${before.length} users before creating anyone`);

  const student = (n, extra) => ({ branchId: branch, firstName: `Kid${n}`, lastName: "Family", dateOfBirth: "2018-05-02", gender: "Male", sectionId: section.id, rollNumber: String(n), address: "1 Road", guardianName: "Sita Family", guardianRelation: "Mother", guardianPhone: "9876543210", ...extra });
  const staff = (email, designation) => ({ branchId: branch, firstName: "Asha", lastName: designation, dateOfBirth: "1990-04-12", gender: "Female", designation, department: "Science", phone: "9876543210", email, address: "2 Road" });

  step("Create people the way the web app does");
  const s1 = ok(await call(ACADEMIC, "POST", "/api/students", { token, body: student(1, { studentEmail: "kid1@um.test", parentEmail: "sita@um.test" }) }), "student 1");
  const s2 = ok(await call(ACADEMIC, "POST", "/api/students", { token, body: student(2, { parentEmail: "sita@um.test" }) }), "student 2 (same parent)");
  const s3 = ok(await call(ACADEMIC, "POST", "/api/students", { token, body: student(3, {}) }), "student 3 (no emails)");
  const t1 = ok(await call(ACADEMIC, "POST", "/api/staff", { token, body: staff("teacher1@um.test", "Teacher") }), "teacher");
  const a1 = ok(await call(ACADEMIC, "POST", "/api/staff", { token, body: staff("accountant1@um.test", "Accountant") }), "accountant");
  const d1 = ok(await call(ACADEMIC, "POST", "/api/staff", { token, body: staff("driver1@um.test", "Driver") }), "driver (no login role)");
  pass("records created");

  step("User Management shows them");
  const users = ok(await call(AUTH, "GET", "/api/school-users", { token }), "users after");
  const created = users.filter((u) => u.email.endsWith("@um.test"));
  const byEmail = Object.fromEntries(created.map((u) => [u.email, u]));
  console.log("   users:", created.map((u) => `${u.email}=${u.roleKey}/${u.status}`).join(", "));
  const missing = ["kid1@um.test", "sita@um.test", "teacher1@um.test", "accountant1@um.test"].filter((e) => !byEmail[e]);
  assert.deepEqual(missing, [], `not in User Management: ${missing.join(", ")}`);
  assert.equal(byEmail["kid1@um.test"].roleKey, "student");
  assert.equal(byEmail["sita@um.test"].roleKey, "parent");
  assert.equal(byEmail["teacher1@um.test"].roleKey, "teacher");
  assert.equal(created.filter((u) => u.email === "sita@um.test").length, 1, "one parent login for two children");
  pass("student, parent, teacher and accountant are listed with the right roles; the parent once");

  step("Accounts start with a set-password link, never a password");
  const mailTo = (email) => {
    const i = logs.auth.lastIndexOf(`Would have sent to ${email} - `);
    assert.ok(i >= 0, `no email logged for ${email}`);
    return logs.auth.slice(i, i + 1500);
  };
  const kidMail = mailTo("kid1@um.test");
  assert.match(kidMail, /reset-password\?email=kid1%40um\.test&token=/);
  assert.ok(!/[Tt]emporary password|Temp[-_]?[Pp]ass/.test(logs.auth), "no temporary password is mailed or logged");
  const linkOf = (email) => {
    const m = mailTo(email).match(/reset-password\?email=([^&"]+)&token=([^"\s<]+)/);
    return { email: decodeURIComponent(m[1]), token: decodeURIComponent(m[2].replace(/&amp;/g, "&")) };
  };
  assert.equal(sql("SELECT CAST(MustChangePassword AS varchar) FROM Users WHERE Email='kid1@um.test'", "AuthServiceUM"), "1");
  pass("welcome emails carry a one-time link; no password anywhere");

  step("The student and the parent set their own passwords and use the Student app's calls");
  const tokens = {};
  for (const [key, email, password] of [["student", "kid1@um.test", "Student#Um-2026x"], ["parent", "sita@um.test", "Parent#Um-2026x"]]) {
    const l = linkOf(email);
    ok(await call(AUTH, "POST", "/api/auth/reset-password", { body: { email: l.email, token: l.token, newPassword: password } }), `set password ${key}`);
    const session = ok(await call(AUTH, "POST", "/api/auth/login", { body: { email, password } }), `login ${key}`); // no subdomain, as the mobile app does
    tokens[key] = session.accessToken;
    assert.ok(!Buffer.from(tokens[key].split(".")[1], "base64url").toString().includes("must_change_password"), "no pending password change after choosing one");
  }
  const meStudent = ok(await call(ACADEMIC, "GET", "/api/people/me", { token: tokens.student }), "student people/me");
  assert.equal(meStudent.student.studentId, s1.id);
  ok(await call(ACADEMIC, "GET", `/api/students/${s1.id}`, { token: tokens.student }), "student record");
  ok(await call(AUTH, "GET", "/api/notifications", { token: tokens.student }).then((r) => (r.status === 404 ? { status: 200 } : r)), "AuthService reachable with the student token");
  const meParent = ok(await call(ACADEMIC, "GET", "/api/people/me", { token: tokens.parent }), "parent people/me");
  assert.deepEqual(meParent.children.map((c) => c.studentId).sort(), [s1.id, s2.id].sort(), "the parent sees both children");
  pass("student and parent sign in with no subdomain, are linked to their records, and the parent sees both children");

  step("Through the API gateway, exactly as the Student app calls it");
  // The mobile http layer: base <gateway>/services/<name>/, the bearer token, then X-Tenant-Id / X-Branch-Id from the signed-in user.
  const viaGateway = async (service, method, path, { token: tk, body, scope } = {}) =>
    call(GATEWAY, method, `/services/${service}/${path}`, { token: tk, body, headers: scope ? { "X-Tenant-Id": scope.tenantId, ...(scope.branchId ? { "X-Branch-Id": scope.branchId } : {}) } : {} });
  for (const [who, email, password] of [["student", "kid1@um.test", "Student#Um-2026x"], ["parent", "sita@um.test", "Parent#Um-2026x"]]) {
    const login = ok(await viaGateway("identity", "POST", "api/auth/login", { body: { email, password } }), `gateway login ${who}`);
    const u = login.user;
    assert.deepEqual(u.roles.map((r) => r.toLowerCase()), [who], `${who} has exactly the ${who} role`);
    assert.equal(u.userType, who === "student" ? "Student" : "Parent");
    assert.equal(u.tenantId, tenant);
    const scope = { tenantId: u.tenantId, branchId: u.branchId };
    const me = ok(await viaGateway("academic", "GET", "api/people/me", { token: login.accessToken, scope }), `gateway people/me ${who}`);
    const ids = [...new Set([...(me.student ? [me.student.studentId] : []), ...me.children.map((c) => c.studentId)])];
    assert.ok(ids.length >= 1, `${who} is linked to a student`);
    for (const id of ids) ok(await viaGateway("academic", "GET", `api/students/${id}`, { token: login.accessToken, scope }), `gateway student ${id}`);
    const refreshed = ok(await viaGateway("identity", "POST", "api/auth/refresh-token", { body: { accessToken: login.accessToken, refreshToken: login.refreshToken } }), `gateway refresh ${who}`);
    assert.ok(refreshed.accessToken, "the session can be refreshed");
  }
  pass("student and parent: login -> people/me -> student record -> refresh, all through the gateway");

  step("Links back to the records");
  const link = (table, id) => sql(`SELECT ISNULL(CAST(UserId AS varchar(40)),'NULL') FROM ${table} WHERE Id='${id}'`, "AcademicServiceUM");
  assert.notEqual(link("Students", s1.id), "NULL", "student 1 linked");
  assert.notEqual(link("StaffMembers", t1.id), "NULL", "teacher linked");
  assert.equal(sql(`SELECT COUNT(DISTINCT UserId) FROM Guardians WHERE StudentId IN ('${s1.id}','${s2.id}') AND UserId IS NOT NULL`, "AcademicServiceUM"), "1", "both children's guardian rows share the one parent login");
  assert.equal(link("Students", s3.id), "NULL");
  assert.equal(link("StaffMembers", d1.id), "NULL", "a driver has no sign-in role");
  pass("UserId links present; siblings share one parent login; no-email student and the driver have none");

  step("Records that have no login are repaired, safely and repeatably");
  // Simulate records created before accounts existed: one teacher whose login was never made, one whose login exists but was never linked, and a parent.
  const legacy = ok(await call(ACADEMIC, "POST", "/api/staff", { token, body: staff("legacy@um.test", "Teacher") }), "legacy teacher");
  const unlinked = ok(await call(ACADEMIC, "POST", "/api/staff", { token, body: staff("unlinked@um.test", "Librarian") }), "unlinked librarian");
  const gone = sql("SELECT Id FROM Users WHERE Email='legacy@um.test'", "AuthServiceUM");
  sql(`DELETE FROM UserRoles WHERE UserId='${gone}'; DELETE FROM Users WHERE Id='${gone}'`, "AuthServiceUM");
  const unlinkedUser = sql("SELECT Id FROM Users WHERE Email='unlinked@um.test'", "AuthServiceUM");
  const passwordBefore = sql(`SELECT PasswordHash FROM Users WHERE Id='${unlinkedUser}'`, "AuthServiceUM");
  sql(`UPDATE StaffMembers SET UserId=NULL WHERE Id IN ('${legacy.id}','${unlinked.id}')`, "AcademicServiceUM");
  const s4 = ok(await call(ACADEMIC, "POST", "/api/students", { token, body: student(4, {}) }), "student 4");
  sql(`INSERT INTO Guardians (Id, StudentId, Name, Relation, Phone, Email) VALUES (NEWID(), '${s4.id}', 'Late Parent', 1, '9000000009', 'lateparent@um.test')`, "AcademicServiceUM");

  const dry = ok(await call(ACADEMIC, "POST", "/api/people/reconcile-logins?dryRun=true", { token }), "dry run");
  assert.equal(dry.items.filter((i) => i.outcome === "WouldCreateOrLink").length, 3);
  assert.equal(link("StaffMembers", legacy.id), "NULL", "a dry run changes nothing");
  const run1 = ok(await call(ACADEMIC, "POST", "/api/people/reconcile-logins", { token }), "reconcile");
  assert.deepEqual({ created: run1.created, linked: run1.linked, failed: run1.failed }, { created: 2, linked: 1, failed: 0 }, JSON.stringify(run1.items));
  assert.notEqual(link("StaffMembers", legacy.id), "NULL");
  assert.equal(link("StaffMembers", unlinked.id).toLowerCase(), unlinkedUser.toLowerCase(), "linked to the existing account, not a new one");
  assert.equal(sql(`SELECT PasswordHash FROM Users WHERE Id='${unlinkedUser}'`, "AuthServiceUM"), passwordBefore, "an existing account's credentials are untouched");
  assert.equal(sql("SELECT COUNT(*) FROM Users WHERE Email='unlinked@um.test'", "AuthServiceUM"), "1", "no duplicate account");
  const run2 = ok(await call(ACADEMIC, "POST", "/api/people/reconcile-logins", { token }), "reconcile again");
  assert.deepEqual({ created: run2.created, linked: run2.linked, items: run2.items.length }, { created: 0, linked: 0, items: 0 });
  assert.equal(sql("SELECT COUNT(*) FROM Users WHERE Email LIKE '%@um.test'", "AuthServiceUM"), "7", "running it twice created nothing more");
  const unauth = await call(ACADEMIC, "POST", "/api/people/reconcile-logins", { token: tokens.parent });
  assert.ok([401, 403].includes(unauth.status), "a parent cannot run it");
  pass("2 created, 1 linked without touching its password, a second run does nothing, a parent is refused");

  step("User Management: search, filter, sort and page on the server");
  const all = ok(await call(AUTH, "GET", "/api/school-users", { token }), "all users");
  const page1 = ok(await call(AUTH, "GET", "/api/school-users/page?pageSize=5&sort=email", { token }), "page 1");
  assert.equal(page1.totalCount, all.length);
  assert.equal(page1.items.length, 5);
  const seen = new Set();
  for (let p = 1; p <= page1.totalPages; p++) for (const u of ok(await call(AUTH, "GET", `/api/school-users/page?pageSize=5&sort=email&page=${p}`, { token }), "page").items) seen.add(u.id);
  assert.equal(seen.size, all.length, "every user is on exactly one page");
  const parents = ok(await call(AUTH, "GET", "/api/school-users/page?search=um.test", { token }), "search");
  assert.ok(parents.items.every((u) => u.email.includes("um.test")) && parents.totalCount === 7);
  const parentRole = all.find((u) => u.email === "sita@um.test").roleId;
  const onlyParents = ok(await call(AUTH, "GET", `/api/school-users/page?roleId=${parentRole}&search=um.test`, { token }), "role filter");
  assert.deepEqual(onlyParents.items.map((u) => u.email).sort(), ["lateparent@um.test", "sita@um.test"]);
  assert.equal((await call(AUTH, "GET", "/api/school-users/page", { token: tokens.parent })).status, 403, "a parent cannot list users");
  pass("totals match, no user is skipped or repeated, search and role filter work, parents are refused");

  console.log("\nUSER MANAGEMENT CHECKS PASSED");
}

let failed = false;
try { await main(); } catch (e) {
  failed = true;
  console.error("\nFAILED:", e.message);
  console.error("--- AuthService log (warnings / errors) ---\n" + logs.auth.split("\n").filter((l) => /\[WRN\]|\[ERR\]|Exception/i.test(l)).slice(-14).join("\n").slice(0, 3500));
  console.error("--- AcademicService log (warnings / errors) ---\n" + logs.academic.split("\n").filter((l) => /\[WRN\]|\[ERR\]|Couldn/i.test(l)).slice(-10).join("\n").slice(0, 2500));
} finally {
  for (const c of children) { try { execFileSync("taskkill", ["/pid", String(c.pid), "/T", "/F"], { stdio: "ignore" }); } catch { /* gone */ } }
  await sleep(1500);
  for (const db of ["AuthServiceUM", "AcademicServiceUM"]) { try { sql(`IF DB_ID('${db}') IS NOT NULL BEGIN ALTER DATABASE [${db}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${db}]; END`); } catch { /* best effort */ } }
}
process.exit(failed ? 1 : 0);
