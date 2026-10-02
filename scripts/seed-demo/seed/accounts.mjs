// Phase 3a: login accounts. Per school: a school admin; per branch: staff by designation, a sample of students and
// the guardians of those students. Each account is linked to its student / guardian / staff record, and its
// temporary password is replaced by one shared dev password, so the accounts can sign in for phase 3b and load
// tests. Accounts and the password are written to seed-users.json (gitignored) - never printed.
//
// Creating an account emails its temporary password, so this refuses to run against the local docker stack while
// AuthService has SMTP configured (see assertEmailOff).
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { ApiError, serviceUrls } from "../lib.mjs";

export const USERS_FILE = new URL("../seed-users.json", import.meta.url);

/** Refuses to continue when the local AuthService container could send real email. */
export function assertEmailOff(target) {
  if (target !== "local") {
    throw new Error("Creating login accounts on a deployed site would email every account. Turn SMTP off there first, then pass --emails-off.");
  }
  let env = "";
  try {
    env = execFileSync("docker", ["inspect", "smsui-authservice-1", "--format", "{{range .Config.Env}}{{println .}}{{end}}"], { encoding: "utf8" });
  } catch {
    throw new Error("Could not inspect the smsui-authservice-1 container to confirm email is off.");
  }
  if (/^Smtp__Password=.+$/m.test(env)) {
    throw new Error(
      "AuthService has SMTP configured, so every new account would be emailed. Recreate it without the key first:\n" +
        '    SMTP_PASSWORD= docker compose --env-file .env.docker up -d --no-deps authservice   (from the "SMS UI" folder)',
    );
  }
}

export function loadUsersFile() {
  if (!existsSync(USERS_FILE)) {
    // Meets the Identity policy: 8+ chars, upper, lower, digit, symbol.
    return { password: `Seed-${randomBytes(6).toString("hex")}#A1`, users: [] };
  }
  return JSON.parse(readFileSync(USERS_FILE, "utf8"));
}

export function saveUsersFile(data) {
  writeFileSync(USERS_FILE, `${JSON.stringify(data, null, 2)}\n`);
}

const ROLE_BY_DESIGNATION = { Principal: "principal", VicePrincipal: "principal", Teacher: "teacher", Accountant: "accountant", Librarian: "librarian", Receptionist: "receptionist" };
const slug = (x) => x.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "");

/** Signs in with the temporary password and sets the shared one. */
async function setPassword(target, email, temporary, password) {
  const urls = serviceUrls(target);
  const res = await fetch(`${urls.identity}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: temporary }) });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, "POST", "/api/auth/login", body);
  const change = await fetch(`${urls.identity}/api/auth/change-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${body.accessToken}` },
    body: JSON.stringify({ currentPassword: temporary, newPassword: password }),
  });
  if (!change.ok) throw new ApiError(change.status, "POST", "/api/auth/change-password", await change.text());
}

/**
 * Creates the accounts for one school. `branches` are { id, code, name, ctx } with ctx from loadBranchContext.
 * Existing accounts (same email) are kept; the users file records everything this seeder created.
 */
export async function seedAccounts({ s, t, target, branches, S, bulk, data, studentsPerBranch = 15, parentsPerBranch = 15 }) {
  const roles = (await s.get("identity", "/api/school-roles")) ?? [];
  const roleId = (key) => roles.find((x) => x.key === key)?.id;
  const known = new Map(data.users.map((u) => [u.email, u]));

  const make = async (spec) => {
    if (known.has(spec.email)) return known.get(spec.email);
    const created = await s.post("identity", "/api/school-users", { branchId: spec.branchId, name: spec.name, email: spec.email, phone: spec.phone ?? null, roleId: roleId(spec.role), department: spec.department ?? null });
    await setPassword(target, spec.email, created.temporaryPassword, data.password);
    const user = { email: spec.email, role: spec.role, name: spec.name, tenant: t.subdomain, tenantId: s.tenant, branchId: spec.branchId, personType: spec.personType ?? null, personId: spec.personId ?? null, userId: created.user.id };
    if (spec.personType) {
      await s.put("academic", `/api/people/${spec.personType}/${spec.personId}/user`, { userId: created.user.id }, { branch: spec.branchId ?? s.branch });
    }
    data.users.push(user);
    known.set(user.email, user);
    return user;
  };

  await S(null, "school admin account", async () => {
    const u = await make({ email: `admin@${t.subdomain}.example`, name: `${t.school} Admin`, role: "admin", branchId: null });
    saveUsersFile(data);
    return u.email;
  });

  for (const b of branches) {
    const { staff, students } = b.ctx;
    const prev = s.branch;
    s.branch = b.id;
    await S(null, `accounts - ${b.name}`, async () => {
      const specs = [];
      for (const m of staff) {
        const role = ROLE_BY_DESIGNATION[m.designation];
        if (!role || m.userId) continue;
        specs.push({ email: m.email ?? `${slug(`${m.firstName}.${m.lastName}.${b.code}`)}@${t.subdomain}.example`, name: `${m.firstName} ${m.lastName}`, role, branchId: b.id, phone: m.phone, department: m.department, personType: "Staff", personId: m.id });
      }
      const sample = students.filter((st) => !st.userId).slice(0, studentsPerBranch);
      for (const st of sample) {
        specs.push({ email: `${slug(`${st.firstName}.${st.lastName}.${st.admissionNumber}`)}@students.${t.subdomain}.example`, name: `${st.firstName} ${st.lastName}`, role: "student", branchId: b.id, personType: "Student", personId: st.id });
      }
      for (const st of students.slice(0, parentsPerBranch)) {
        const g = st.guardians?.[0];
        if (!g || g.userId) continue;
        specs.push({ email: `${slug(`${g.name}.${st.admissionNumber}`)}@parents.${t.subdomain}.example`, name: g.name, role: "parent", branchId: b.id, phone: g.phone, personType: "Guardian", personId: g.id });
      }
      const res = await bulk(specs, make, 3);
      saveUsersFile(data);
      const by = (role) => specs.filter((x) => x.role === role).length;
      return `${res.ok}/${specs.length} accounts (${by("teacher")} teachers, ${by("student")} students, ${by("parent")} parents, ${specs.length - by("teacher") - by("student") - by("parent")} other staff)`;
    });
    s.branch = prev;
  }
}

/** loadtest/users.json shape ({ role: [{ email, password }] }) from the seeded accounts, for the k6 tests. */
export function toLoadtestUsers(data, perRole = 20) {
  const out = {};
  for (const role of ["admin", "teacher", "parent", "student"]) {
    out[role] = data.users.filter((u) => u.role === role).slice(0, perRole).map((u) => ({ email: u.email, password: data.password }));
  }
  return out;
}
