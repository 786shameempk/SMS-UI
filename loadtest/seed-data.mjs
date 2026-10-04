// Seeds a realistic school into the local services so load tests run against real data volumes:
// classes + sections, students, fee structures, invoices (some paid -> receipts), daily attendance, and exams
// with marks (terms + core subjects created if missing).
//
//   node loadtest/seed-data.mjs                       # 300 students, 30 school days of attendance
//   node loadtest/seed-data.mjs --students 600 --days 60
//   node loadtest/seed-data.mjs --only exams          # just the exams (dashboard results trend, top performers)
//
// Goes through the public APIs as the admin from loadtest/users.json, so validation and tenant scoping apply.
// Safe to re-run: it tops up to the target counts, invoice generation skips existing ones, attendance for a
// section/date is replaced, only unpaid (Due/Overdue) invoices get paid, and an exam that already exists is skipped.
import { readFileSync } from "node:fs";

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : (process.env[name.toUpperCase()] ?? fallback);
};

const TARGET_STUDENTS = Number(arg("students", 300));
const ATTENDANCE_DAYS = Number(arg("days", 30));
const GRADES = Number(arg("grades", 10)); // Grade 1..N
const SECTIONS = ["A", "B"];
const CONCURRENCY = 6;

const URLS = {
  auth: process.env.AUTH_URL || "http://localhost:5118",
  academic: process.env.ACADEMIC_URL || "http://localhost:5136",
  finance: process.env.FINANCE_URL || "http://localhost:5137",
};
const TENANT_ID = process.env.TENANT_ID || "tenant-educore";
const BRANCH_ID = process.env.BRANCH_ID || `${TENANT_ID}-main`;

// ── helpers ──────────────────────────────────────────────────────────────────

let token;

async function call(service, method, path, body) {
  const res = await fetch(`${URLS[service]}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      "X-Tenant-Id": TENANT_ID,
      "X-Branch-Id": BRANCH_ID,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${service}${path} -> ${res.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

/** Runs `fn` over `items` with a few requests in flight at once. */
async function pool(items, fn, concurrency = CONCURRENCY) {
  let next = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) {
      const item = items[next++];
      await fn(item);
    }
  });
  await Promise.all(workers);
}

// Deterministic pseudo-random, so re-runs make the same choices (same students paid, same absences).
function hash(str) {
  let h = 2166136261;
  for (const ch of str) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return (h >>> 0) / 4294967296;
}
const pick = (list, seed) => list[Math.floor(hash(seed) * list.length)];

const FIRST = ["Aarav", "Vivaan", "Aditya", "Arjun", "Sai", "Reyansh", "Krishna", "Ishaan", "Rohan", "Kabir",
  "Ananya", "Diya", "Aadhya", "Saanvi", "Myra", "Anika", "Navya", "Kiara", "Meera", "Fatima", "Zara", "Aisha",
  "Rahul", "Nikhil", "Sneha", "Pooja", "Joseph", "Maria", "Thomas", "Anna", "Mohammed", "Ayaan", "Riya", "Neha"];
const LAST = ["Nair", "Menon", "Pillai", "Kumar", "Sharma", "Iyer", "Reddy", "Thomas", "Joseph", "Khan",
  "Varghese", "Das", "Patel", "Rao", "Krishnan", "George", "Mathew", "Hussain", "Gupta", "Shetty"];
const STREETS = ["MG Road", "Marine Drive", "Palarivattom", "Kakkanad", "Edappally", "Vyttila", "Kaloor", "Aluva"];

/** Last `n` weekdays up to today, oldest first. */
function schoolDays(n) {
  const days = [];
  const d = new Date();
  while (days.length < n) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) days.unshift(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() - 1);
  }
  return days;
}

// ── steps ────────────────────────────────────────────────────────────────────

const users = JSON.parse(readFileSync(new URL("./users.json", import.meta.url), "utf8"));

async function login() {
  const admin = users.admin?.[0];
  if (!admin) throw new Error("loadtest/users.json needs an admin account (copy users.example.json)");
  ({ accessToken: token } = await call("auth", "POST", "/api/auth/login", { email: admin.email, password: admin.password }));
}

/**
 * Links each parent test account to two children (by admission number order, so the first parent gets the
 * oldest admissions), unless it already has children. Without a link a parent login sees no students or fees,
 * and load tests of the parent journey would measure empty responses.
 */
async function linkParents(students) {
  const byAdmission = [...students].sort((a, b) => a.admissionNumber.localeCompare(b.admissionNumber));
  const adminToken = token;
  let linked = 0;
  for (const [i, parent] of (users.parent ?? []).entries()) {
    const session = await call("auth", "POST", "/api/auth/login", { email: parent.email, password: parent.password });
    token = session.accessToken;
    const me = await call("academic", "GET", "/api/people/me");
    token = adminToken;
    if (me.children.length > 0) continue;

    for (const child of byAdmission.slice(i * 2, i * 2 + 2)) {
      const guardian = child.guardians?.[0];
      if (!guardian) continue;
      await call("academic", "PUT", `/api/people/Guardian/${guardian.id}/user`, { userId: me.userId });
      linked++;
    }
  }
  console.log(`parent logins: ${linked} guardian links added`);
}

async function ensureClassesAndSections() {
  const years = await call("academic", "GET", "/api/academicyears");
  let year = years.find((y) => y.isCurrent) ?? years[0];
  if (!year) {
    // A fresh database: the Indian school year (June - March) that contains today.
    const now = new Date();
    const y0 = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1;
    year = await call("academic", "POST", "/api/academicyears", {
      name: `${y0}-${String(y0 + 1).slice(2)}`, startDate: `${y0}-06-01`, endDate: `${y0 + 1}-03-31`, isCurrent: true, status: "Active",
    });
    console.log(`academic year ${year.name} created`);
  }

  const classes = await call("academic", "GET", "/api/classes");
  for (let g = 1; g <= GRADES; g++) {
    const name = `Grade ${g}`;
    if (!classes.some((c) => c.name === name)) {
      classes.push(await call("academic", "POST", "/api/classes", { name, departmentId: null, academicYearId: year.id }));
    }
  }

  const sections = await call("academic", "GET", "/api/sections");
  for (let g = 1; g <= GRADES; g++) {
    const cls = classes.find((c) => c.name === `Grade ${g}`);
    for (const name of SECTIONS) {
      if (!sections.some((s) => s.classId === cls.id && s.name === name)) {
        sections.push(
          await call("academic", "POST", "/api/sections", {
            name, classId: cls.id, classTeacherName: null, classTeacherStaffId: null, capacity: 40, currentStrength: 0,
          }),
        );
      }
    }
  }

  const gradeClasses = classes.filter((c) => /^Grade [0-9]+$/.test(c.name) && Number(c.name.slice(6)) <= GRADES);
  const gradeSections = sections.filter((s) => gradeClasses.some((c) => c.id === s.classId) && SECTIONS.includes(s.name));
  console.log(`classes: ${gradeClasses.length}, sections: ${gradeSections.length} (academic year ${year.name})`);
  return { year, classes: gradeClasses, sections: gradeSections };
}

async function ensureStudents(sections, classes) {
  const existing = await call("academic", "GET", "/api/students");
  const perSection = Math.ceil(TARGET_STUDENTS / sections.length);
  const jobs = [];

  for (const section of sections) {
    const grade = Number(classes.find((c) => c.id === section.classId).name.slice(6));
    const have = existing.filter((s) => s.sectionId === section.id).length;
    for (let i = have + 1; i <= perSection; i++) {
      const seed = `${section.id}:${i}`;
      const first = pick(FIRST, seed + "f");
      const last = pick(LAST, seed + "l");
      const birthYear = new Date().getFullYear() - 5 - grade;
      jobs.push({
        branchId: BRANCH_ID,
        firstName: first,
        lastName: last,
        dateOfBirth: `${birthYear}-${String(1 + Math.floor(hash(seed + "m") * 12)).padStart(2, "0")}-${String(1 + Math.floor(hash(seed + "d") * 28)).padStart(2, "0")}`,
        gender: hash(seed + "g") < 0.5 ? "Male" : "Female",
        sectionId: section.id,
        rollNumber: String(i),
        address: `${1 + Math.floor(hash(seed + "a") * 200)} ${pick(STREETS, seed + "s")}, Kochi`,
        guardianName: `${pick(FIRST, seed + "p")} ${last}`,
        guardianRelation: pick(["Father", "Mother", "Guardian"], seed + "r"),
        guardianPhone: `+91 9${String(Math.floor(hash(seed + "ph") * 1e9)).padStart(9, "0")}`,
      });
    }
  }

  let done = 0;
  await pool(jobs, async (body) => {
    await call("academic", "POST", "/api/students", body);
    if (++done % 50 === 0) console.log(`  students created: ${done}/${jobs.length}`);
  });
  const all = await call("academic", "GET", "/api/students");
  console.log(`students: ${all.length} total (${jobs.length} new)`);
  return all.filter((s) => sections.some((sec) => sec.id === s.sectionId));
}

async function ensureFees(year, classes, sections, students) {
  const structures = await call("finance", "GET", "/api/feestructures");
  const ensure = async (body) =>
    structures.find((s) => s.name === body.name) ?? (await call("finance", "POST", "/api/feestructures", body));

  const classOf = (student) => sections.find((s) => s.id === student.sectionId)?.classId;
  const active = students.filter((s) => s.status === "Active");
  const year0 = Number(year.startDate.slice(0, 4));
  const terms = [
    { term: "Term 1", dueDate: `${year0}-07-15` },
    { term: "Term 2", dueDate: `${year0}-10-15` },
  ];

  let created = 0;
  for (const cls of classes) {
    const grade = Number(cls.name.slice(6));
    const tuition = await ensure({
      name: `Tuition - ${cls.name}`, academicYearId: year.id, classId: cls.id, feeType: "Tuition",
      amount: 12000 + grade * 1500, frequency: "TermWise", lateFineFlat: 200, lateFinePerDay: 10,
    });
    const ids = active.filter((s) => classOf(s) === cls.id).map((s) => s.id);
    for (const t of terms) {
      const r = await call("finance", "POST", "/api/feeinvoices/generate", { feeStructureId: tuition.id, ...t, eligibleStudentIds: ids });
      created += r.createdCount;
    }
  }

  const library = await ensure({
    name: "Library & Activity Fee", academicYearId: year.id, classId: null, feeType: "Library",
    amount: 1500, frequency: "Annual", lateFineFlat: null, lateFinePerDay: null,
  });
  const r = await call("finance", "POST", "/api/feeinvoices/generate", {
    feeStructureId: library.id, term: "Annual", dueDate: `${year0}-07-31`, eligibleStudentIds: active.map((s) => s.id),
  });
  created += r.createdCount;
  console.log(`invoices: ${created} new`);

  // Pay most Term 1 invoices and some others, so receipts, partial payments and overdue lists all have data.
  const invoices = await call("finance", "GET", "/api/feeinvoices");
  const toPay = invoices.filter((inv) => {
    if (inv.status !== "Due" && inv.status !== "Overdue") return false; // past due dates read back as Overdue
    const roll = hash(inv.id);
    return inv.term === "Term 1" ? roll < 0.8 : inv.term === "Annual" ? roll < 0.6 : roll < 0.25;
  });
  let paid = 0;
  await pool(toPay, async (inv) => {
    const remaining = inv.netAmount - (inv.paidAmount ?? 0);
    const partial = hash(inv.id + "partial") < 0.15;
    const amount = partial ? Math.round(remaining / 2) : remaining;
    if (amount <= 0) return;
    await call("finance", "POST", `/api/feeinvoices/${inv.id}/payments`, {
      amount, mode: pick(["Cash", "Card", "Online", "Online", "Cheque"], inv.id + "mode"),
    });
    paid++;
  }, 1); // one at a time: receipt numbers are count+1 server-side and collide when parallel
  console.log(`invoices: ${invoices.length} total, ${paid} payments recorded`);
}

async function seedAttendance(sections, students) {
  const days = schoolDays(ATTENDANCE_DAYS);
  const jobs = [];
  for (const section of sections) {
    const roster = students.filter((s) => s.sectionId === section.id && s.status === "Active");
    if (roster.length === 0) continue;
    for (const date of days) jobs.push({ section, roster, date });
  }

  let done = 0;
  await pool(jobs, async ({ section, roster, date }) => {
    await call("academic", "POST", "/api/attendance", {
      sectionId: section.id,
      date,
      captureMode: "Manual",
      entries: roster.map((s) => {
        // A few students are chronically absent, so attendance reports and risk flags have something to show.
        const chronic = hash(s.id + "chronic") < 0.05;
        const r = hash(`${s.id}:${date}`);
        const status = r < (chronic ? 0.25 : 0.03) ? "Absent" : r < (chronic ? 0.32 : 0.06) ? "Late"
          : r < (chronic ? 0.36 : 0.08) ? "Leave" : r < (chronic ? 0.38 : 0.09) ? "HalfDay" : "Present";
        return { studentId: s.id, status, remarks: null };
      }),
    });
    if (++done % 100 === 0) console.log(`  attendance sheets: ${done}/${jobs.length}`);
  });
  const records = jobs.reduce((n, j) => n + j.roster.length, 0);
  console.log(`attendance: ${jobs.length} section-days, ${records} records (${days[0]} .. ${days.at(-1)})`);
}

/** Days from today as yyyy-mm-dd (negative = past). */
function dayOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const CORE_SUBJECTS = [
  ["English", "ENG"],
  ["Mathematics", "MATH"],
  ["Science", "SCI"],
  ["Social Studies", "SST"],
];

/**
 * Three completed exams per class spread over the last ~5 months (unit test, mid-term, unit test), each with a
 * paper per core subject and marks for every active student, so the dashboard's results trend and top performers
 * have data inside the default "last 6 months" range. Dates are relative to today and the month is part of each
 * exam's name, so re-running later adds newer exams instead of duplicating these.
 *
 * Marks are deterministic: each student has a steady ability, subjects shift it a little, later exams are a few
 * points better (so the trend rises), about 3% of papers are absences and a handful of students fall below the
 * pass mark of 35.
 */
async function ensureExams(year, classes, sections, students) {
  // Exams belong to a term; the load-test school may not have any yet.
  let terms = (await call("academic", "GET", "/api/terms")).filter((t) => t.academicYearId === year.id);
  if (terms.length === 0) {
    const y0 = Number(year.startDate.slice(0, 4));
    terms = [
      await call("academic", "POST", "/api/terms", { name: "Term 1", academicYearId: year.id, startDate: year.startDate, endDate: `${y0}-10-15`, status: "Ongoing" }),
      await call("academic", "POST", "/api/terms", { name: "Term 2", academicYearId: year.id, startDate: `${y0}-10-26`, endDate: year.endDate, status: "Upcoming" }),
    ];
  }
  const termFor = (date) => terms.find((t) => t.startDate <= date && date <= t.endDate) ?? terms[0];

  const subjects = await call("academic", "GET", "/api/subjects");
  const core = [];
  for (const [name, code] of CORE_SUBJECTS) {
    core.push(
      subjects.find((s) => s.name === name) ??
        (await call("academic", "POST", "/api/subjects", { name, code, type: "Core", classIds: classes.map((c) => c.id) })),
    );
  }

  const label = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
  const plan = [
    { kind: "Unit Test 1", type: "Internal", start: dayOffset(-140), days: 1, boost: 0 },
    { kind: "Mid-term Examination", type: "Midterm", start: dayOffset(-84), days: 4, boost: 3 },
    { kind: "Unit Test 2", type: "Internal", start: dayOffset(-28), days: 1, boost: 6 },
  ];

  const existing = await call("academic", "GET", "/api/exams");
  const jobs = [];
  for (const cls of classes) {
    const roster = students.filter((s) => s.status === "Active" && sections.some((sec) => sec.id === s.sectionId && sec.classId === cls.id));
    if (roster.length === 0) continue;
    for (const p of plan) jobs.push({ cls, roster, p, name: `${p.kind} (${label(p.start)}) - ${cls.name}` });
  }

  let created = 0;
  let marks = 0;
  await pool(jobs, async ({ cls, roster, p, name }) => {
    if (existing.some((e) => e.classId === cls.id && e.name === name)) return;
    const endDate = dayOffset(Math.round((new Date(`${p.start}T12:00:00`) - new Date()) / 86_400_000) + p.days - 1);
    const exam = await call("academic", "POST", "/api/exams", {
      name, examType: p.type, termId: termFor(p.start).id, classId: cls.id, startDate: p.start, endDate, status: "Completed",
    });
    for (const [i, subject] of core.entries()) {
      const date = new Date(`${p.start}T12:00:00`);
      date.setDate(date.getDate() + Math.min(i, p.days - 1));
      await call("academic", "POST", `/api/exams/${exam.id}/schedules`, {
        subjectId: subject.id, date: date.toISOString().slice(0, 10), startTime: "09:30", endTime: "11:30", maxMarks: 100, passMarks: 35, room: null,
      });
      await call("academic", "POST", `/api/exams/${exam.id}/results`, {
        subjectId: subject.id,
        maxMarks: 100,
        entries: roster.map((s) => {
          const absent = hash(`${s.id}:${name}:${subject.id}:absent`) < 0.03;
          const weak = hash(`${s.id}:weak`) < 0.06; // a few students who struggle across the board
          const ability = weak ? 22 + hash(`${s.id}:ability`) * 14 : 48 + hash(`${s.id}:ability`) * 42;
          const subjectShift = (hash(`${s.id}:${subject.id}`) - 0.5) * 16;
          const noise = (hash(`${s.id}:${name}:${subject.id}`) - 0.5) * 14;
          const mark = Math.round(Math.max(8, Math.min(100, ability + subjectShift + noise + p.boost)));
          return { studentId: s.id, marksObtained: absent ? 0 : mark, isAbsent: absent };
        }),
      });
      marks += roster.length;
    }
    created++;
  });
  console.log(`exams: ${created} new (${jobs.length} planned, ${core.length} subjects each), ${marks} marks entered`);
}

// ── main ─────────────────────────────────────────────────────────────────────

// --only exams,attendance runs just those steps (classes, sections and students are always loaded).
const ONLY = arg("only", "").split(",").map((s) => s.trim()).filter(Boolean);
const runs = (step) => ONLY.length === 0 || ONLY.includes(step);

const started = Date.now();
await login();
const { year, classes, sections } = await ensureClassesAndSections();
const students = await ensureStudents(sections, classes);
if (runs("parents")) await linkParents(students);
if (runs("fees")) await ensureFees(year, classes, sections, students);
if (runs("attendance")) await seedAttendance(sections, students);
if (runs("exams")) await ensureExams(year, classes, sections, students);
console.log(`done in ${((Date.now() - started) / 1000).toFixed(1)}s`);
