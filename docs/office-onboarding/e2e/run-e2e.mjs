// End-to-end run of the Office bulk-onboarding flow against REAL services and a REAL SQL Server.
//
//   node docs/office-onboarding/e2e/run-e2e.mjs
//
// It creates two throw-away databases (AuthServiceE2E, AcademicServiceE2E) on the local SQL Server, starts AuthService (:5118) and
// AcademicService (:5136) from their built output, drives the whole flow over HTTP exactly as the Office UI and the school apps do,
// checks every step, then stops the services and drops the databases. Nothing touches the developer databases.
// Needs: dotnet, sqlcmd, a local SQL Server (default localhost\MSSQLSERVER_2022, Windows auth) and both services built (Debug).
import { spawn, execFileSync } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import assert from "node:assert/strict";

const SQL = process.env.E2E_SQL_SERVER ?? "localhost\\MSSQLSERVER_2022";
const AUTH = "http://localhost:5118";
const ACADEMIC = "http://localhost:5136";
const SERVICE_KEY = "e2e-service-key-0123456789abcdef0123456789abcdef";
const JWT_SECRET = "e2e-jwt-secret-0123456789abcdef0123456789abcdef0123456789";
const OFFICE_EMAIL = "e2e-office@school-sphere.test";
const OFFICE_PASSWORD = "Sunrise-Harbor-Maple-2026!";
const OFFICE_NEW_PASSWORD = "Granite-Lantern-Orchard-2027!";
const AUTH_DIR = "E:/Personal/AuthService/src/AuthService.API";
const ACADEMIC_DIR = "E:/Personal/AcademicService/src/AcademicService.API";
const conn = (db) => `Server=${SQL};Database=${db};Trusted_Connection=True;TrustServerCertificate=True;`;

const sql = (query, db = "master") => {
  try {
    return execFileSync("sqlcmd", ["-S", SQL, "-d", db, "-E", "-C", "-b", "-I", "-h", "-1", "-W", "-Q", `SET NOCOUNT ON; ${query}`], { encoding: "utf8" }).trim();
  } catch (e) {
    throw new Error(`SQL failed: ${query}
${e.stdout ?? ""}${e.stderr ?? ""}`);
  }
};

const logs = { auth: "", academic: "" };
const children = [];

function start(name, dir, env, port) {
  const child = spawn("dotnet", ["run", "--no-build", "--no-launch-profile"], {
    cwd: dir,
    env: { ...process.env, ASPNETCORE_ENVIRONMENT: "Development", ASPNETCORE_URLS: `http://localhost:${port}`, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (d) => (logs[name] += d.toString()));
  child.stderr.on("data", (d) => (logs[name] += d.toString()));
  children.push(child);
  return child;
}

async function waitUp(url, label) {
  for (let i = 0; i < 90; i++) {
    try {
      await fetch(url);
      return;
    } catch {
      await sleep(1000);
    }
  }
  throw new Error(`${label} did not start.\n${logs.auth.slice(-1500)}\n${logs.academic.slice(-1500)}`);
}

async function call(base, method, path, { token, body, headers, raw } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: { ...(body && !(body instanceof FormData) ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (raw) return { status: res.status, text };
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: res.status, data };
}
const office = (token) => ({
  get: (p) => call(AUTH, "GET", `/api/office/${p}`, { token }),
  post: (p, body) => call(AUTH, "POST", `/api/office/${p}`, { token, body }),
  put: (p, body) => call(AUTH, "PUT", `/api/office/${p}`, { token, body }),
  upload: async (p, csv, name) => {
    const form = new FormData();
    form.append("file", new Blob([csv], { type: "text/csv" }), name);
    return call(AUTH, "POST", `/api/office/${p}`, { token, body: form });
  },
});
const ok = (r, what) => { assert.ok(r.status >= 200 && r.status < 300, `${what}: HTTP ${r.status} ${JSON.stringify(r.data)}`); return r.data; };
const step = (msg) => console.log(`\n== ${msg}`);
const pass = (msg) => console.log(`   ok  ${msg}`);

/** The set-password link of the most recent invitation email to this address, read from the AuthService log. */
function inviteLink(email) {
  const re = new RegExp(`Would have sent to ${email.replace(/[.+]/g, "\\$&")} - Set up your[^]*?reset-password\\?email=([^&"]+)&token=([^"\\s<]+)`, "g");
  let last = null;
  for (const m of logs.auth.matchAll(re)) last = m;
  assert.ok(last, `no invitation email logged for ${email}`);
  return { email: decodeURIComponent(last[1]), token: decodeURIComponent(last[2]) };
}
const invitesTo = (email) => (logs.auth.match(new RegExp(`Would have sent to ${email.replace(/[.+]/g, "\\$&")} - Set up your`, "g")) ?? []).length;

const years = "name,start_date,end_date,is_current\r\n2026-27,2026-06-01,2027-03-31,yes\r\n";
const classes = "academic_year,class_name\r\n2026-27,Grade 1\r\n2026-27,Grade 2\r\n";
const sections = "academic_year,class_name,section_name,capacity\r\n2026-27,Grade 1,A,40\r\n2026-27,Grade 1,B,40\r\n2026-27,Grade 2,A,40\r\n";
const staffHeader = "employee_id,first_name,last_name,email,mobile,role,department,date_of_birth,gender\r\n";
const staff = staffHeader + "T1,Asha,Nair,asha.nair@e2e.test,+91 98765 43210,Teacher,Science,1990-04-12,Female\r\nT2,Vikram,Rao,vikram.rao@e2e.test,9876501234,Accountant,Accounts,1985-01-20,Male\r\n";
const studentHeader = "admission_number,first_name,last_name,academic_year,class_name,section_name,date_of_birth,gender,guardian_name,guardian_relation,guardian_mobile,parent_email,student_email\r\n";
const students = studentHeader
  + "A1,Ravi,Kumar,2026-27,Grade 1,A,2018-05-02,Male,Sita Kumar,Mother,9876543210,sita.kumar@e2e.test,\r\n"
  + "A2,Meera,Kumar,2026-27,Grade 1,B,2016-03-09,Female,Sita Kumar,Mother,9876543210,sita.kumar@e2e.test,meera.kumar@e2e.test\r\n"
  + "A3,Omar,Hassan,2026-27,Grade 2,A,2015-11-30,Male,Lina Hassan,Mother,9000000003,,\r\n"
  + "A4,Bad,Row,2030-01-01,Grade 9,Z,2018-01-01,Male,X,Mother,9000000004,,\r\n";
const guardians = "admission_number,guardian_name,guardian_relation,guardian_mobile,guardian_email\r\nA1,Mohan Kumar,Father,9000000001,mohan.kumar@e2e.test\r\n";

async function main() {
  step("Fresh databases and services");
  for (const db of ["AuthServiceE2E", "AcademicServiceE2E"]) sql(`IF DB_ID('${db}') IS NOT NULL BEGIN ALTER DATABASE [${db}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${db}]; END`);
  const common = { Jwt__Secret: JWT_SECRET, ServiceAuth__Secret: SERVICE_KEY };
  start("academic", ACADEMIC_DIR, { ...common, ConnectionStrings__DefaultConnection: conn("AcademicServiceE2E") }, 5136);
  start("auth", AUTH_DIR, {
    ...common, ConnectionStrings__DefaultConnection: conn("AuthServiceE2E"), Services__AcademicServiceUrl: `${ACADEMIC}/`,
    Office__Bootstrap__Email: OFFICE_EMAIL, Office__Bootstrap__Password: OFFICE_PASSWORD, Office__Jwt__SigningKey: "e2e-office-signing-key-0123456789abcdef0123456789abcdef",
    Smtp__Host: "", Smtp__Password: "", RateLimiting__Enabled: "false",
  }, 5118);
  await waitUp(`${ACADEMIC}/internal/onboarding/counts`, "AcademicService");
  await waitUp(`${AUTH}/api/office/auth/login`, "AuthService");
  await sleep(4000);
  pass("both services are up on fresh databases");

  step("Office signs in and creates a school record");
  const login = ok(await call(AUTH, "POST", "/api/office/auth/login", { body: { email: OFFICE_EMAIL, password: OFFICE_PASSWORD } }), "office login");
  // The bootstrap account must choose its own password first, exactly as a person would.
  const signedIn = login.status === "passwordChangeRequired"
    ? ok(await call(AUTH, "POST", "/api/office/auth/password/change-required", { body: { challengeToken: login.challengeToken, newPassword: OFFICE_NEW_PASSWORD } }), "office first password")
    : login;
  const token = signedIn.accessToken;
  assert.ok(token, "no office access token: " + JSON.stringify(signedIn).slice(0, 300));
  const o = office(token);
  const school = ok(await o.post("schools", {
    schoolName: "E2E Public School", code: "E2E1", subdomain: "e2e-public", schoolType: null, board: null, country: "India", state: null, city: "Kochi", address: null, contactName: "Head", contactEmail: "head@e2e.test",
    contactPhone: null, billingContactName: null, billingContactEmail: null, taxId: null, expectedStudents: 200, branches: 1, internalNotes: null,
  }), "create school");
  const schoolId = school.id;
  pass(`school ${schoolId}`);

  step("Before the school has an account nothing can be imported");
  const early = await o.upload(`onboarding/schools/${schoolId}/imports/academic-years`, years, "years.csv");
  assert.equal(early.status, 400);
  pass("upload refused: " + JSON.stringify(early.data.errors));

  // The school's tenant is the seeded demo tenant (a provisioned school has one; provisioning itself is exercised by the office suite).
  const tenant = sql("SELECT TOP 1 Id FROM Tenants ORDER BY CreatedAt", "AuthServiceE2E");
  assert.ok(tenant, "no seeded tenant");
  sql(`UPDATE OfficeSchools SET TenantId='${tenant}', Stage=10 WHERE Id='${schoolId}'`, "AuthServiceE2E");
  const subdomain = sql(`SELECT Subdomain FROM Tenants WHERE Id='${tenant}'`, "AuthServiceE2E");
  pass(`school linked to tenant ${tenant} (${subdomain})`);

  step("Templates and permission checks");
  const templates = ok(await o.get("onboarding/templates"), "templates");
  assert.deepEqual(templates.map((t) => t.type), ["academic-years", "classes", "sections", "staff", "students", "guardians"]);
  const forbidden = await o.upload(`onboarding/schools/${schoolId}/imports/staff`, staffHeader.trim() + ",password\r\n", "bad.csv");
  assert.equal(forbidden.status, 400);
  assert.match(JSON.stringify(forbidden.data.errors), /password/);
  const unauth = await call(AUTH, "GET", `/api/office/onboarding/schools/${schoolId}/imports`);
  assert.equal(unauth.status, 401);
  pass("templates listed; a password column is refused; no token, no access");

  async function importFile(type, csv, expect) {
    const up = ok(await o.upload(`onboarding/schools/${schoolId}/imports/${type}`, csv, `${type}.csv`), `upload ${type}`);
    assert.equal(up.batch.status, "Validated", `${type} checked, not applied`);
    const done = ok(await o.post(`onboarding/imports/${up.batch.id}/confirm`, { acknowledgeErrors: true }), `confirm ${type}`);
    const b = done.batch;
    assert.equal(b.status, "Completed");
    assert.deepEqual({ created: b.createdCount, reused: b.reusedCount, rejected: b.rejectedCount }, expect, `${type} outcome`);
    pass(`${type}: ${b.createdCount} created, ${b.reusedCount} reused, ${b.rejectedCount} rejected`);
    return { up, done };
  }

  step("Structure: academic years, classes, sections");
  await importFile("academic-years", years, { created: 1, reused: 0, rejected: 0 });
  await importFile("classes", classes, { created: 2, reused: 0, rejected: 0 });
  await importFile("sections", sections, { created: 3, reused: 0, rejected: 0 });
  const status = ok(await o.get(`onboarding/schools/${schoolId}`), "status");
  assert.deepEqual(status.existing, { academicYears: 1, classes: 2, sections: 3, staff: 0, students: 0 });

  step("Students before staff data is fine, but a student row with a bad section is rejected with a reason");
  const studentRun = await importFile("students", students, { created: 3, reused: 0, rejected: 1 });
  const bad = studentRun.done.rows.items.find((r) => r.line === 5);
  assert.equal(bad.outcome, "Rejected");
  assert.match(bad.messages.join(" "), /does not exist/);
  const errorCsv = await call(AUTH, "GET", `/api/office/onboarding/imports/${studentRun.up.batch.id}/errors.csv`, { token, raw: true });
  assert.equal(errorCsv.status, 200);
  assert.match(errorCsv.text, /A4/);
  pass("error report downloads and names the rejected row");

  step("Staff and extra guardians; invitations go out once per person");
  await importFile("staff", staff, { created: 2, reused: 0, rejected: 0 });
  await importFile("guardians", guardians, { created: 1, reused: 0, rejected: 0 });
  await sleep(500);
  assert.equal(invitesTo("sita.kumar@e2e.test"), 1, "one parent login, one email, for two children");
  assert.equal(invitesTo("asha.nair@e2e.test"), 1);
  assert.equal(invitesTo("meera.kumar@e2e.test"), 1);
  assert.equal(invitesTo("mohan.kumar@e2e.test"), 1);
  assert.ok(!/Temp-|TemporaryPassword|temporary password/i.test(logs.auth), "no temporary password is ever logged or mailed");
  const users = ok(await o.get(`onboarding/schools/${schoolId}/users`), "users");
  assert.equal(users.page.totalCount, 5, "teacher, accountant, two parents, one student login");
  assert.equal(users.totals.InvitationSent, 5);
  pass("5 logins, 5 emails, no passwords");

  step("Re-uploading the same people changes nothing");
  await importFile("staff", staff, { created: 0, reused: 2, rejected: 0 });
  const again = await importFile("students", students, { created: 0, reused: 3, rejected: 1 });
  assert.equal(invitesTo("asha.nair@e2e.test"), 1);
  assert.equal(invitesTo("sita.kumar@e2e.test"), 1);
  assert.equal(sql("SELECT COUNT(*) FROM OfficeUserInvitations", "AuthServiceE2E"), "5");
  assert.equal(sql("SELECT COUNT(*) FROM Students", "AcademicServiceE2E"), "3");
  pass("no duplicate people, logins or emails; " + again.done.batch.reusedCount + " students recognised");

  step("People activate their own accounts from the emailed link");
  const accounts = {};
  for (const [key, email, password] of [["teacher", "asha.nair@e2e.test", "Teacher#E2e-2026"], ["parent", "sita.kumar@e2e.test", "Parent#E2e-2026"]]) {
    const link = inviteLink(email);
    ok(await call(AUTH, "POST", "/api/auth/reset-password", { body: { email: link.email, token: link.token, newPassword: password } }), `set password ${key}`);
    const session = ok(await call(AUTH, "POST", "/api/auth/login", { body: { email, password, subdomain } }), `login ${key}`);
    accounts[key] = session.accessToken ?? session.data?.accessToken;
    assert.ok(accounts[key], `no token for ${key}: ${JSON.stringify(session).slice(0, 200)}`);
    const reuse = await call(AUTH, "POST", "/api/auth/reset-password", { body: { email: link.email, token: link.token, newPassword: "Another#E2e-2026" } });
    assert.ok(reuse.status >= 400, "an invitation link works once");
  }
  pass("teacher and parent set passwords, signed in; the link cannot be used twice");

  step("Profile completion (school apps API)");
  const mine = async (who) => ok(await call(ACADEMIC, "GET", "/api/my-profile", { token: accounts[who] }), `profiles ${who}`);
  const teacherProfiles = await mine("teacher");
  assert.equal(teacherProfiles.length, 1);
  assert.equal(teacherProfiles[0].status, "Incomplete");
  assert.deepEqual(teacherProfiles[0].missingFields, ["address"]);
  const parentProfiles = await mine("parent");
  assert.equal(parentProfiles.length, 2, "the parent sees both children");
  assert.ok(parentProfiles.every((p) => p.relation === "child"));
  const early2 = await call(ACADEMIC, "POST", `/api/my-profile/staff/${teacherProfiles[0].personId}/submit`, { token: accounts.teacher });
  assert.equal(early2.status, 400);
  const cross = await call(ACADEMIC, "PUT", `/api/my-profile/staff/${teacherProfiles[0].personId}`, { token: accounts.parent, body: { values: { address: "hack" } } });
  assert.equal(cross.status, 404, "a parent cannot touch a teacher's profile");
  const roleEdit = await call(ACADEMIC, "PUT", `/api/my-profile/staff/${teacherProfiles[0].personId}`, { token: accounts.teacher, body: { values: { role: "Principal" } } });
  assert.equal(roleEdit.status, 400, "role is not editable");
  ok(await call(ACADEMIC, "PUT", `/api/my-profile/staff/${teacherProfiles[0].personId}`, { token: accounts.teacher, body: { values: { address: "12 Lake Road, Kochi" } } }), "teacher saves");
  const submitted = ok(await call(ACADEMIC, "POST", `/api/my-profile/staff/${teacherProfiles[0].personId}/submit`, { token: accounts.teacher }), "teacher submits");
  assert.equal(submitted.status, "PendingApproval");
  for (const child of parentProfiles) {
    ok(await call(ACADEMIC, "PUT", `/api/my-profile/student/${child.personId}`, { token: accounts.parent, body: { values: { address: "5 Palm Street, Kochi", blood_group: "O+" } } }), "parent saves");
    ok(await call(ACADEMIC, "POST", `/api/my-profile/student/${child.personId}/submit`, { token: accounts.parent }), "parent submits");
  }
  pass("teacher and both children submitted; cross-access and read-only fields refused");

  step("Office reviews: diff, request changes, approve, bulk approve");
  const queue = ok(await o.get(`onboarding/schools/${schoolId}/profiles`), "queue");
  assert.equal(queue.total, 3);
  const teacherItem = queue.items.find((i) => i.personType === "staff");
  const review = ok(await o.get(`onboarding/schools/${schoolId}/profiles/${teacherItem.profileId}`), "review");
  assert.ok(review.changes.some((c) => c.key === "address" && c.current === "12 Lake Road, Kochi" && c.imported === null));
  const kids = queue.items.filter((i) => i.personType === "student");
  const sendBack = ok(await o.post(`onboarding/schools/${schoolId}/profiles/${kids[0].profileId}/request-changes`, { reason: "Add the pin code to the address.", version: kids[0].version }), "request changes");
  assert.equal(sendBack.outcome, "ChangesRequested");
  const noReason = await o.post(`onboarding/schools/${schoolId}/profiles/${kids[1].profileId}/request-changes`, { reason: " ", version: kids[1].version });
  assert.equal(noReason.status, 400);
  const stale = await o.post(`onboarding/schools/${schoolId}/profiles/${teacherItem.profileId}/approve`, { version: 99 });
  assert.equal(stale.status, 409);
  const bulk = ok(await o.post(`onboarding/schools/${schoolId}/profiles/bulk-approve`, { profileIds: [teacherItem.profileId, kids[0].profileId, kids[1].profileId] }), "bulk approve");
  assert.deepEqual(bulk.map((r) => r.outcome), ["Approved", "Skipped", "Approved"]);
  const afterBack = (await mine("parent")).find((p) => p.personId === kids[0].personId);
  assert.equal(afterBack.status, "ChangesRequested");
  assert.equal(afterBack.feedback.reason, "Add the pin code to the address.");
  ok(await call(ACADEMIC, "PUT", `/api/my-profile/student/${kids[0].personId}`, { token: accounts.parent, body: { values: { address: "5 Palm Street, Kochi 682001" } } }), "parent fixes");
  ok(await call(ACADEMIC, "POST", `/api/my-profile/student/${kids[0].personId}/submit`, { token: accounts.parent }), "parent resubmits");
  const second = ok(await o.get(`onboarding/schools/${schoolId}/profiles?status=PendingApproval`), "queue 2");
  ok(await o.post(`onboarding/schools/${schoolId}/profiles/${second.items[0].profileId}/approve`, { version: second.items[0].version }), "approve resubmission");
  const protectedEdit = ok(await call(ACADEMIC, "PUT", `/api/my-profile/student/${kids[1].personId}`, { token: accounts.parent, body: { values: { last_name: "Menon" } } }), "protected edit");
  assert.equal(protectedEdit.status, "Incomplete", "a name change reopens an approved profile");
  pass("diff shown, reason required, stale version refused, bulk skipped the one sent back, resubmission approved, name change reopens");
  const audit = ok(await o.get("audit?pageSize=100"), "audit");
  const actions = new Set((audit.items ?? audit).map((a) => a.action));
  for (const a of ["onboarding.import.uploaded", "onboarding.import.confirmed", "onboarding.profile.approved", "onboarding.profile.changes-requested", "onboarding.profiles.bulk-approved"]) assert.ok(actions.has(a), `audit has ${a}`);
  pass("audit log has the uploads, confirmations and every decision");

  step("Readiness and go-live");
  let report = ok(await o.get(`onboarding/schools/${schoolId}/readiness`), "readiness");
  assert.equal(report.ready, false);
  assert.ok(report.blockers.some((b) => b.startsWith("Student profiles approved")), "student profiles outstanding");
  assert.ok(report.blockers.includes("A subscription is ready to activate"));
  const refusedMark = await o.post(`onboarding/schools/${schoolId}/mark-ready`);
  assert.equal(refusedMark.status, 409);
  pass("blocked: " + report.blockers.join("; "));

  // Finish the remaining profile, relax what the school agreed to, give it a subscription.
  const reopened = (await mine("parent")).find((p) => p.personId === kids[1].personId);
  ok(await call(ACADEMIC, "PUT", `/api/my-profile/student/${reopened.personId}`, { token: accounts.parent, body: { values: { last_name: "Kumar" } } }), "undo name change");
  ok(await call(ACADEMIC, "POST", `/api/my-profile/student/${reopened.personId}/submit`, { token: accounts.parent }), "resubmit");
  const last = ok(await o.get(`onboarding/schools/${schoolId}/profiles?status=PendingApproval`), "queue 3");
  for (const item of last.items) ok(await o.post(`onboarding/schools/${schoolId}/profiles/${item.profileId}/approve`, { version: item.version }), "approve");
  const policy = ok(await o.get(`onboarding/schools/${schoolId}/policy`), "policy");
  ok(await o.put(`onboarding/schools/${schoolId}/policy`, { ...policy, minStaffProfilesApprovedPercent: 50, minStudentProfilesApprovedPercent: 60, minAccountsActivatedPercent: 30 }), "relax policy");
  const cols = sql("SELECT COLUMN_NAME + '|' + DATA_TYPE + '|' + IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='OfficeSubscriptions' ORDER BY ORDINAL_POSITION", "AuthServiceE2E").split(/\r?\n/);
  const plan = ok(await o.post("plans", { code: "E2E", name: "E2E Standard", description: null, version: { billingCycle: "Annual", cycleMonths: null, currencyCode: "INR", basePrice: 100000, taxRatePercent: 18, includedStudents: 500, extraStudentPrice: 100, maxBranches: 1, extraBranchPrice: 20000, maxUsers: 50, storageGb: 100, modules: ["Students", "Attendance"], aiFeatures: [], mobileApps: ["teacher"], features: [], trialDays: 14, graceDays: 7, autoRenew: true, renewalRules: null, upgradePolicy: null, downgradePolicy: null, changeNotes: null } }), "create plan");
  ok(await o.post(`plans/${plan.id}/versions/${plan.versions[0].id}/publish`), "publish plan");
  const values = { Id: "NEWID()", SchoolId: `'${schoolId}'`, TenantId: `'${tenant}'`, Status: "0", PlanId: `'${plan.id}'`, PlanVersionId: `'${plan.versions[0].id}'` };
  for (const json of ["Modules", "AiFeatures", "MobileApps", "Features"]) values[json] = "'[]'";
  const names = [], vals = [];
  for (const c of cols) {
    const [name, type, nullable] = c.trim().split("|");
    if (type === "timestamp" || type === "rowversion") continue;
    if (name in values) { names.push(name); vals.push(values[name]); continue; }
    if (nullable === "YES") continue;
    names.push(name);
    vals.push(/uniqueidentifier/.test(type) ? "NEWID()" : /date/.test(type) ? "SYSUTCDATETIME()" : /bit|int|decimal|numeric|money|float/.test(type) ? "0" : "''");
  }
  sql(`INSERT INTO OfficeSubscriptions (${names.map((n) => `[${n}]`).join(",")}) VALUES (${vals.join(",")})`, "AuthServiceE2E");
  const activated = sql(`SELECT COUNT(*) FROM Users WHERE TenantId='${tenant}' AND MustChangePassword=0 AND Email LIKE '%@e2e.test'`, "AuthServiceE2E");
  report = ok(await o.get(`onboarding/schools/${schoolId}/readiness`), "readiness 2");
  const failing = report.checks.filter((c) => c.required && !c.passed).map((c) => `${c.label}: ${c.detail}`);
  assert.deepEqual(failing, [], `still failing: ${failing.join(" | ")} (activated accounts: ${activated})`);
  pass("every required check passes");

  const subId = sql(`SELECT TOP 1 Id FROM OfficeSubscriptions WHERE SchoolId='${schoolId}'`, "AuthServiceE2E");
  const gated = await o.post(`subscriptions/${subId}/activate`);
  assert.equal(gated.status, 409);
  assert.match(JSON.stringify(gated.data), /mark it ready/, "activation waits for the mark");
  const marked = ok(await o.post(`onboarding/schools/${schoolId}/mark-ready`), "mark ready");
  assert.equal(marked.goLive.markedReadyBy, OFFICE_EMAIL);
  assert.equal(sql(`SELECT Stage FROM OfficeSchools WHERE Id='${schoolId}'`, "AuthServiceE2E"), "11", "stage moved to Data imported");
  const afterMark = await o.post(`subscriptions/${subId}/activate`);
  assert.equal(afterMark.status, 409);
  assert.doesNotMatch(JSON.stringify(afterMark.data), /mark it ready/, "the gate is open; the normal purchase/payment rules still apply");
  pass("activation refused until marked ready; after the mark the usual payment rules still decide (" + JSON.stringify(afterMark.data).slice(0, 90) + ")");
  ok(await o.put(`onboarding/schools/${schoolId}/policy`, { ...policy, minStudentProfilesApprovedPercent: 100 }), "tighten policy");
  assert.equal(ok(await o.get(`onboarding/schools/${schoolId}/readiness`), "readiness 3").goLive.markedReadyAt, null);
  pass("changing the rules cleared the mark");

  step("Tenant isolation at the service door");
  const wrongKey = await call(ACADEMIC, "GET", `/internal/onboarding/counts?tenantId=${tenant}&branchId=${tenant}-main`, { headers: { "X-Service-Key": "nope" } });
  assert.equal(wrongKey.status, 401);
  const otherSchool = await call(ACADEMIC, "GET", "/internal/onboarding/counts?tenantId=some-other-school&branchId=some-other-school-main", { headers: { "X-Service-Key": SERVICE_KEY } });
  assert.deepEqual(otherSchool.data, { academicYears: 0, classes: 0, sections: 0, staff: 0, students: 0 });
  pass("wrong key refused; another school sees none of this data");

  console.log("\nALL END-TO-END CHECKS PASSED");
}

let failed = false;
try {
  await main();
} catch (e) {
  failed = true;
  console.error("\nFAILED:", e.message);
  console.error("--- AuthService log (office / warnings / errors) ---\n" + logs.auth.split("\n").filter((l) => /office|bootstrap|\[WRN\]|\[ERR\]|Exception:/i.test(l)).slice(-12).join("\n"));
  console.error("--- AcademicService log tail ---\n" + logs.academic.slice(-1500));
} finally {
  for (const c of children) { try { execFileSync("taskkill", ["/pid", String(c.pid), "/T", "/F"], { stdio: "ignore" }); } catch { /* already gone */ } }
  await sleep(1500);
  for (const db of ["AuthServiceE2E", "AcademicServiceE2E"]) { try { sql(`IF DB_ID('${db}') IS NOT NULL BEGIN ALTER DATABASE [${db}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${db}]; END`); } catch { /* best effort */ } }
}
process.exit(failed ? 1 : 0);
