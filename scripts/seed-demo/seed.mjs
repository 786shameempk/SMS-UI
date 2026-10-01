#!/usr/bin/env node
// Seeds a complete demo school into a School Sphere deployment through its public APIs, as the platform SuperAdmin:
//   1. a new tenant (school) on the Professional plan, activated, with its profile filled in;
//   2. its branches ("Main Campus" is created with the tenant; more are added);
//   3. for EACH branch, one module at a time: academics, staff, students, timetable, attendance, homework, exams,
//      online exams, admissions, fees, payroll, accounting, library, transport, hostel, inventory, health,
//      visitors, help desk, certificates, announcements, surveys, messaging, leave, meetings.
// No login accounts are created, so no emails are sent. Every step is independent: a failure is reported and the
// rest carry on. See README.md for usage.
import { ApiError, BOY_NAMES, CITIES, GIRL_NAMES, SURNAMES, ADULT_FEMALE, ADULT_MALE, Session, addDays, askPassword, iso, pool, recentSchoolDays, rng } from "./lib.mjs";

// ── options ──────────────────────────────────────────────────────────────────────────────────
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? "true"];
  }),
);
const TARGET = args.target ?? "local"; // "local" or a site URL, e.g. https://schoolsphrere.com
const EMAIL = args.email ?? "superadmin@educore.dev";
const SUBDOMAIN = (args.subdomain ?? "greenvalley").toLowerCase();
const SCHOOL = args.school ?? "Green Valley International School";
const STUDENTS_PER_BRANCH = Number(args.students ?? 60);
const TEACHERS_PER_BRANCH = Number(args.teachers ?? 12);
const BRANCHES = [
  { name: "Main Campus", code: "MAIN", area: "Jayanagar, Bengaluru", phone: "080 4123 4500", existing: true },
  { name: "Whitefield Campus", code: "WFD", area: "Whitefield, Bengaluru", phone: "080 4123 4600" },
].slice(0, Number(args.branches ?? 2));
const CONCURRENCY = Number(args.concurrency ?? 4);

const today = new Date();
const TODAY = iso(today);
const YEAR_START = "2026-06-01";
const YEAR_END = "2027-03-31";

// ── reporting ────────────────────────────────────────────────────────────────────────────────
const report = [];
async function step(scope, name, fn) {
  const t0 = Date.now();
  try {
    const detail = await fn();
    report.push({ scope, name, ok: true, detail });
    console.log(`  ✓ ${name}${detail ? ` - ${detail}` : ""} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  } catch (err) {
    report.push({ scope, name, ok: false, detail: err.message });
    console.log(`  ✗ ${name}: ${err instanceof ApiError ? err.message : err.stack}`);
  }
}
/** Runs a bulk create and reports how many succeeded; the first few errors are shown. */
async function bulk(items, fn) {
  let ok = 0;
  const errors = [];
  const out = await pool(items, CONCURRENCY, async (item, i) => {
    try {
      const r = await fn(item, i);
      ok++;
      return r;
    } catch (err) {
      if (errors.length < 3) errors.push(err.message);
      return null;
    }
  });
  if (ok === 0 && items.length) throw new Error(`all ${items.length} failed: ${errors.join(" | ")}`);
  if (errors.length) console.log(`    ! ${items.length - ok} of ${items.length} failed, e.g. ${errors[0]}`);
  return { out, ok, total: items.length };
}

// ── main ─────────────────────────────────────────────────────────────────────────────────────
const s = new Session(TARGET, EMAIL, await askPassword(`Password for ${EMAIL} on ${TARGET}: `));
await s.login();
if (s.user?.role?.toLowerCase?.() !== "superadmin" && !JSON.stringify(s.user ?? {}).toLowerCase().includes("superadmin")) {
  console.error("This must run as the platform SuperAdmin (it creates a tenant).");
  process.exit(1);
}
console.log(`Signed in as ${EMAIL}. Seeding "${SCHOOL}" (${SUBDOMAIN}) on ${TARGET}\n`);

// 1. Tenant ──────────────────────────────────────────────────────────────────────────────────
console.log("Tenant");
const plans = await s.get("identity", "/api/platform/plans");
const professional = plans.find((p) => p.tier === "Growth") ?? plans[plans.length - 1];
const tenants = await s.get("identity", "/api/platform/tenants");
let tenant = tenants.find((t) => t.subdomain === SUBDOMAIN);
if (tenant && args["reuse-tenant"] !== "true") {
  console.error(`A tenant with subdomain "${SUBDOMAIN}" already exists (${tenant.id}). Use --subdomain=<new> or --reuse-tenant.`);
  process.exit(1);
}
await step("tenant", "create tenant", async () => {
  if (!tenant) {
    tenant = await s.post("identity", "/api/platform/tenants", {
      schoolName: SCHOOL,
      subdomain: SUBDOMAIN,
      planId: professional.id,
      billingContactName: "Anita Raghavan",
      billingContactEmail: `accounts@${SUBDOMAIN}.example`,
    });
  }
  return `${tenant.id} on ${professional.name}`;
});
if (!tenant) process.exit(1);
s.tenant = tenant.id;
await step("tenant", "activate subscription", async () => {
  await s.put("identity", `/api/platform/tenants/${tenant.id}/status`, { status: "Active" });
});
await step("tenant", "school profile", async () => {
  await s.put("identity", "/api/settings/profile", {
    name: SCHOOL,
    tagline: "Learning today, leading tomorrow",
    address: "14th Cross, 4th Block, Jayanagar, Bengaluru 560011",
    phone: "080 4123 4500",
    email: `office@${SUBDOMAIN}.example`,
    principalName: "Dr. Meera Krishnan",
    establishedYear: 1998,
  });
});

// 2. Branches ─────────────────────────────────────────────────────────────────────────────────
console.log("\nBranches");
let branchRows = await s.get("identity", "/api/branches");
for (const b of BRANCHES) {
  await step("tenant", `branch ${b.name}`, async () => {
    let row = branchRows.find((r) => r.code?.toUpperCase() === b.code);
    const body = { name: b.name, code: b.code, address: b.area, phone: b.phone, status: "Active" };
    row = row ? await s.put("identity", `/api/branches/${row.id}`, body) : await s.post("identity", "/api/branches", body);
    b.id = row.id;
    return b.id;
  });
}
branchRows = await s.get("identity", "/api/branches");
for (const b of BRANCHES) b.id ??= branchRows.find((r) => r.code?.toUpperCase() === b.code)?.id;

const allStaff = [];

// 3. Per-branch data ──────────────────────────────────────────────────────────────────────────
for (const [bi, b] of BRANCHES.entries()) {
  if (!b.id) continue;
  s.branch = b.id;
  const r = rng(1000 + bi * 7919);
  const ctx = { b, r };
  const scope = b.name;
  const S = (name, fn) => step(scope, name, fn);
  console.log(`\n${b.name} (${b.id})`);

  // ── Academic setup ──
  await S("academic year & terms", async () => {
    ctx.year = await s.post("academic", "/api/academicyears", { name: "2026-27", startDate: YEAR_START, endDate: YEAR_END, isCurrent: true, status: "Active" });
    ctx.term1 = await s.post("academic", "/api/terms", { name: "Term 1", academicYearId: ctx.year.id, startDate: YEAR_START, endDate: "2026-10-15", status: "Ongoing" });
    ctx.term2 = await s.post("academic", "/api/terms", { name: "Term 2", academicYearId: ctx.year.id, startDate: "2026-10-26", endDate: YEAR_END, status: "Upcoming" });
    return "2026-27, Term 1 + Term 2";
  });
  if (!ctx.year) continue;

  await S("departments", async () => {
    const names = [
      ["Middle School", "Grades 6-8"],
      ["High School", "Grades 9-10"],
      ["Science", "Physics, chemistry and biology"],
      ["Languages", "English, Hindi and Kannada"],
      ["Mathematics", "Mathematics and statistics"],
      ["Administration", "Office, accounts and support"],
    ];
    ctx.depts = {};
    for (const [name, description] of names) ctx.depts[name] = await s.post("academic", "/api/departments", { name, description });
    return `${names.length} departments`;
  });

  await S("classes", async () => {
    ctx.classes = [];
    for (const g of [6, 7, 8, 9, 10]) {
      const dept = ctx.depts?.[g <= 8 ? "Middle School" : "High School"];
      ctx.classes.push({ grade: g, ...(await s.post("academic", "/api/classes", { name: `Grade ${g}`, departmentId: dept?.id ?? null, academicYearId: ctx.year.id })) });
    }
    return "Grades 6-10";
  });

  await S("subjects", async () => {
    const ids = ctx.classes.map((c) => c.id);
    const defs = [
      ["English", "ENG", "Core", "Languages"],
      ["Mathematics", "MAT", "Core", "Mathematics"],
      ["Science", "SCI", "Core", "Science"],
      ["Social Studies", "SST", "Core", "Middle School"],
      ["Hindi", "HIN", "Core", "Languages"],
      ["Kannada", "KAN", "Elective", "Languages"],
      ["Computer Science", "CSC", "Elective", "Science"],
    ];
    ctx.subjects = [];
    for (const [name, code, type, dept] of defs) ctx.subjects.push({ dept, ...(await s.post("academic", "/api/subjects", { name, code: `${code}-${b.code}`, type, classIds: ids })) });
    return `${defs.length} subjects for every class`;
  });

  await S("rooms", async () => {
    for (let i = 1; i <= 10; i++) await s.post("academic", "/api/rooms", { name: `Room ${100 + i}`, capacity: 40 });
    await s.post("academic", "/api/rooms", { name: "Science Lab", capacity: 30 });
    await s.post("academic", "/api/rooms", { name: "Computer Lab", capacity: 30 });
    return "12 rooms";
  });

  // ── Staff ──
  await S("staff", async () => {
    const teacherSubjects = ctx.subjects.flatMap((sub) => [sub, sub]).slice(0, TEACHERS_PER_BRANCH);
    while (teacherSubjects.length < TEACHERS_PER_BRANCH) teacherSubjects.push(r.pick(ctx.subjects));
    const defs = [
      ...teacherSubjects.map((sub) => ({ designation: "Teacher", department: sub.dept, subject: sub })),
      { designation: bi === 0 ? "Principal" : "VicePrincipal", department: "Administration" },
      { designation: "Accountant", department: "Administration" },
      { designation: "Librarian", department: "Administration" },
      { designation: "Nurse", department: "Administration" },
      { designation: "Warden", department: "Administration" },
      { designation: "Driver", department: "Administration" },
      { designation: "Driver", department: "Administration" },
      { designation: "Receptionist", department: "Administration" },
    ];
    const used = new Set();
    const res = await bulk(defs, async (d) => {
      const female = r.chance(0.55);
      let first, last;
      do {
        first = r.pick(female ? ADULT_FEMALE : ADULT_MALE);
        last = r.pick(SURNAMES);
      } while (used.has(first + last));
      used.add(first + last);
      const staff = await s.post("academic", "/api/staff", {
        branchId: b.id,
        firstName: first,
        lastName: last,
        dateOfBirth: `${r.int(1972, 1996)}-${String(r.int(1, 12)).padStart(2, "0")}-${String(r.int(1, 28)).padStart(2, "0")}`,
        gender: female ? "Female" : "Male",
        designation: d.designation,
        department: d.department,
        phone: `9${r.int(100000000, 999999999)}`,
        email: `${first}.${last}.${b.code}@${SUBDOMAIN}.example`.toLowerCase(),
        address: `${r.int(1, 240)}, ${r.pick(CITIES)}, Bengaluru`,
      });
      return { ...d, ...staff, first, last };
    });
    ctx.staff = res.out.filter(Boolean);
    ctx.teachers = ctx.staff.filter((x) => x.designation === "Teacher");
    ctx.byRole = (role) => ctx.staff.filter((x) => x.designation === role);
    allStaff.push(...ctx.staff);
    return `${res.ok} staff (${ctx.teachers.length} teachers)`;
  });

  await S("staff salaries & qualifications", async () => {
    const salary = { Teacher: 42000, Principal: 95000, VicePrincipal: 78000, Accountant: 38000, Librarian: 30000, Nurse: 32000, Warden: 28000, Driver: 22000, Receptionist: 24000 };
    await bulk(ctx.staff, async (m) => {
      const basic = (salary[m.designation] ?? 30000) + r.int(0, 8) * 1000;
      m.basic = basic;
      m.allowances = Math.round(basic * 0.25);
      m.deductions = Math.round(basic * 0.12);
      await s.put("academic", `/api/staff/${m.id}/salary`, { basic, allowances: m.allowances, deductions: m.deductions, bankName: r.pick(["SBI", "HDFC Bank", "Canara Bank", "ICICI Bank"]), bankAccountNumber: String(r.int(10000000000, 99999999999)), effectiveFrom: YEAR_START });
      if (m.designation === "Teacher") {
        await s.post("academic", `/api/staff/${m.id}/qualifications`, { degree: r.pick(["B.Ed", "M.Sc, B.Ed", "M.A, B.Ed", "M.Com, B.Ed"]), institution: r.pick(["Bangalore University", "Christ University", "Mysore University", "Mount Carmel College"]), yearCompleted: r.int(1998, 2020) });
      }
    });
    return "salary for everyone, degrees for teachers";
  });

  await S("sections (with class teachers)", async () => {
    ctx.sections = [];
    let t = 0;
    for (const c of ctx.classes) {
      for (const name of ["A", "B"]) {
        const ct = ctx.teachers[t++ % ctx.teachers.length];
        const sec = await s.post("academic", "/api/sections", { name, classId: c.id, classTeacherName: ct ? `${ct.first} ${ct.last}` : null, classTeacherStaffId: ct?.id ?? null, capacity: 40, currentStrength: 0 });
        ctx.sections.push({ ...sec, classId: c.id, grade: c.grade, label: `Grade ${c.grade}-${name}` });
      }
    }
    return `${ctx.sections.length} sections`;
  });

  await S("teacher assignments", async () => {
    const pairs = [];
    for (const t of ctx.teachers) for (const c of ctx.classes) if (r.chance(0.6) || c.grade % 2 === ctx.teachers.indexOf(t) % 2) pairs.push({ staffId: t.id, subjectId: t.subject.id, classId: c.id });
    // Every subject in every class needs someone.
    for (const sub of ctx.subjects) for (const c of ctx.classes) if (!pairs.some((p) => p.subjectId === sub.id && p.classId === c.id)) {
      const t = ctx.teachers.find((x) => x.subject.id === sub.id) ?? r.pick(ctx.teachers);
      pairs.push({ staffId: t.id, subjectId: sub.id, classId: c.id });
    }
    const res = await bulk(pairs, (p) => s.post("academic", "/api/teacher-assignments", p));
    return `${res.ok} assignments`;
  });

  // ── Students ──
  await S("students", async () => {
    const used = new Set();
    const items = Array.from({ length: STUDENTS_PER_BRANCH }, (_, i) => i);
    const res = await bulk(items, async (i) => {
      const sec = ctx.sections[i % ctx.sections.length];
      const girl = r.chance(0.5);
      let first, last;
      do {
        first = r.pick(girl ? GIRL_NAMES : BOY_NAMES);
        last = r.pick(SURNAMES);
      } while (used.has(first + last));
      used.add(first + last);
      const father = r.chance(0.7);
      const age = 11 + (sec.grade - 6);
      const st = await s.post("academic", "/api/students", {
        branchId: b.id,
        firstName: first,
        lastName: last,
        dateOfBirth: `${2026 - age}-${String(r.int(1, 12)).padStart(2, "0")}-${String(r.int(1, 28)).padStart(2, "0")}`,
        gender: girl ? "Female" : "Male",
        sectionId: sec.id,
        rollNumber: String(Math.floor(i / ctx.sections.length) + 1),
        address: `${r.int(1, 400)}, ${r.pick(CITIES)}, Bengaluru`,
        guardianName: `${r.pick(father ? ADULT_MALE : ADULT_FEMALE)} ${last}`,
        guardianRelation: father ? "Father" : "Mother",
        guardianPhone: `9${r.int(100000000, 999999999)}`,
      });
      return { ...st, first, last, sectionId: sec.id, classId: sec.classId, grade: sec.grade };
    });
    ctx.students = res.out.filter(Boolean);
    ctx.studentsIn = (classId) => ctx.students.filter((x) => x.classId === classId);
    return `${res.ok} students across ${ctx.sections.length} sections`;
  });
  if (!ctx.students?.length) continue;

  await S("student medical records", async () => {
    const res = await bulk(ctx.students.filter(() => r.chance(0.5)), (st) =>
      s.put("academic", `/api/students/${st.id}/medical`, {
        bloodGroup: r.pick(["A+", "B+", "O+", "AB+", "O-", "A-"]),
        allergies: r.chance(0.2) ? r.pick(["Peanuts", "Dust", "Pollen", "Lactose"]) : null,
        conditions: r.chance(0.1) ? "Mild asthma" : null,
        medications: null,
        doctorName: `Dr. ${r.pick(ADULT_MALE)} ${r.pick(SURNAMES)}`,
        doctorPhone: `9${r.int(100000000, 999999999)}`,
      }),
    );
    return `${res.ok} records`;
  });

  // ── Timetable ──
  await S("timetables (auto-generated)", async () => {
    const res = await bulk(ctx.sections, (sec) => s.post("academic", `/api/timetable/sections/${sec.id}/auto-generate`));
    return `${res.ok} sections`;
  });

  // ── Attendance ──
  await S("student attendance (last 10 school days)", async () => {
    const days = recentSchoolDays(10, today);
    const jobs = ctx.sections.flatMap((sec) => days.map((date) => ({ sec, date })));
    const res = await bulk(jobs, ({ sec, date }) =>
      s.post("academic", "/api/attendance", {
        sectionId: sec.id,
        date,
        captureMode: "Manual",
        entries: ctx.students.filter((st) => st.sectionId === sec.id).map((st) => {
          const x = r.next();
          return { studentId: st.id, status: x < 0.88 ? "Present" : x < 0.93 ? "Late" : x < 0.98 ? "Absent" : "Leave", remarks: null };
        }),
      }),
    );
    return `${res.ok} registers`;
  });

  await S("staff attendance (last 10 school days)", async () => {
    const days = recentSchoolDays(10, today);
    for (const date of days) {
      await s.post("academic", "/api/attendance/staff", { date, entries: ctx.staff.map((m) => ({ staffId: m.id, status: r.next() < 0.93 ? "Present" : r.chance(0.5) ? "Late" : "Absent" })) });
    }
    return `${days.length} days`;
  });

  // ── Calendar ──
  await S("calendar events", async () => {
    const events = [
      ["Term 1 begins", "TermStart", YEAR_START, null],
      ["Independence Day", "Holiday", "2026-08-15", null],
      ["Ganesh Chaturthi", "Holiday", "2026-09-14", null],
      ["Mid-term examinations", "Exam", "2026-09-21", "2026-09-26"],
      ["Gandhi Jayanti", "Holiday", "2026-10-02", null],
      ["Annual Sports Day", "Other", "2026-10-09", null],
      ["Term 1 ends", "TermEnd", "2026-10-15", null],
      ["Diwali break", "Holiday", "2026-10-19", "2026-10-24"],
      ["Children's Day celebration", "Other", "2026-11-14", null],
      ["Final examinations", "Exam", "2027-03-01", "2027-03-15"],
    ];
    for (const [title, type, startDate, endDate] of events) await s.post("academic", "/api/calendarevents", { title, type, startDate, endDate, academicYearId: ctx.year.id, description: null });
    return `${events.length} events`;
  });

  // ── Homework ──
  await S("homework, submissions & grading", async () => {
    let hw = 0, subs = 0;
    for (const sec of ctx.sections) {
      for (const sub of r.shuffle(ctx.subjects).slice(0, 2)) {
        const teacher = ctx.teachers.find((t) => t.subject.id === sub.id) ?? ctx.teachers[0];
        const assigned = addDays(today, -r.int(3, 9));
        const h = await s.post("academic", "/api/homework", {
          title: `${sub.name}: ${r.pick(["Chapter exercises", "Worksheet", "Reading & summary", "Practice problems", "Project notes"])}`,
          description: `Complete the ${sub.name.toLowerCase()} work discussed in class and submit before the due date.`,
          subjectId: sub.id,
          classId: sec.classId,
          sectionId: sec.id,
          staffId: teacher.id,
          assignedDate: iso(assigned),
          dueDate: iso(addDays(assigned, 5)),
          attachmentNote: null,
          status: "Published",
        });
        hw++;
        for (const st of ctx.students.filter((x) => x.sectionId === sec.id && r.chance(0.7))) {
          await s.post("academic", `/api/homework/${h.id}/submit`, { studentId: st.id, content: "Completed all questions. Attached my working in the notebook." });
          subs++;
        }
        const submissions = await s.get("academic", `/api/homework/${h.id}/submissions`);
        for (const sb of (submissions ?? []).filter((x) => x.id && r.chance(0.6))) {
          await s.post("academic", `/api/homework/submissions/${sb.id}/grade`, { grade: r.pick(["A+", "A", "B+", "B", "C"]), feedback: r.pick(["Well done!", "Good effort, check question 3.", "Neat work.", null]) });
        }
      }
    }
    return `${hw} assignments, ${subs} submissions`;
  });

  // ── Exams & results ──
  await S("mid-term exams, schedules & results", async () => {
    let results = 0;
    for (const c of ctx.classes) {
      const exam = await s.post("academic", "/api/exams", { name: `Mid-term Examination - Grade ${c.grade}`, examType: "Midterm", termId: ctx.term1.id, classId: c.id, startDate: "2026-09-21", endDate: "2026-09-26", status: "Completed" });
      const core = ctx.subjects.filter((x) => x.type === "Core");
      for (const [i, sub] of core.entries()) {
        await s.post("academic", `/api/exams/${exam.id}/schedules`, { subjectId: sub.id, date: iso(addDays(new Date("2026-09-21"), i)), startTime: "09:30", endTime: "12:00", maxMarks: 100, passMarks: 35, room: `Room ${101 + (c.grade % 5)}` });
        const students = ctx.studentsIn(c.id);
        await s.post("academic", `/api/exams/${exam.id}/results`, {
          subjectId: sub.id,
          maxMarks: 100,
          entries: students.map((st) => {
            const absent = r.chance(0.03);
            const base = 45 + ((st.first.charCodeAt(0) * 7 + st.last.charCodeAt(0)) % 40);
            return { studentId: st.id, marksObtained: absent ? 0 : Math.max(18, Math.min(100, base + r.int(-12, 15))), isAbsent: absent };
          }),
        });
        results += students.length;
      }
      for (const st of ctx.studentsIn(c.id).slice(0, 3)) {
        await s.post("academic", `/api/exams/${exam.id}/remarks/${st.id}`, { remarks: r.pick(["Consistent performer. Keep it up!", "Needs to focus on mathematics.", "Excellent improvement since the last test."]) });
      }
    }
    return `${ctx.classes.length} exams, ${results} marks entered`;
  });

  // ── Lesson plans & learning ──
  await S("lesson plans", async () => {
    const res = await bulk(ctx.teachers, (t) =>
      s.post("academic", "/api/lesson-plans", {
        staffId: t.id,
        subjectId: t.subject.id,
        classId: r.pick(ctx.classes).id,
        title: `${t.subject.name} - week plan`,
        description: "Objectives, activities, assessment and homework for the week.",
        weekOf: iso(addDays(today, -((today.getUTCDay() + 6) % 7))),
        attachmentNote: null,
        status: "Published",
      }),
    );
    return `${res.ok} plans`;
  });

  await S("learning resources & quizzes", async () => {
    let n = 0;
    for (const c of ctx.classes) {
      for (const sub of ctx.subjects.slice(0, 3)) {
        const t = ctx.teachers.find((x) => x.subject.id === sub.id) ?? ctx.teachers[0];
        await s.post("academic", "/api/learning/resources", { subjectId: sub.id, classId: c.id, title: `${sub.name} revision - Grade ${c.grade}`, type: r.pick(["Video", "Notes", "Pdf"]), url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", description: "Revision material for the term.", createdByStaffId: t.id });
        n++;
      }
      const maths = ctx.subjects.find((x) => x.name === "Mathematics");
      await s.post("academic", "/api/learning/quizzes", {
        subjectId: maths.id,
        classId: c.id,
        title: `Quick maths check - Grade ${c.grade}`,
        questions: [
          { text: "What is 15% of 200?", options: ["20", "30", "35", "15"], correctIndex: 1 },
          { text: "Which is a prime number?", options: ["21", "27", "29", "33"], correctIndex: 2 },
          { text: "The sum of angles in a triangle is", options: ["90°", "180°", "270°", "360°"], correctIndex: 1 },
        ],
        createdByStaffId: ctx.teachers.find((x) => x.subject.id === maths.id)?.id ?? ctx.teachers[0].id,
      });
    }
    return `${n} resources, ${ctx.classes.length} quizzes`;
  });

  // ── Online exams (question bank + a scheduled exam) ──
  await S("question bank & online exam", async () => {
    const sci = ctx.subjects.find((x) => x.name === "Science");
    const g8 = ctx.classes.find((c) => c.grade === 8);
    const qs = [
      { type: "SingleChoice", text: "Which gas do plants absorb during photosynthesis?", marks: 1, options: [["Oxygen", false], ["Carbon dioxide", true], ["Nitrogen", false], ["Hydrogen", false]], topic: "Plants" },
      { type: "SingleChoice", text: "The unit of force is", marks: 1, options: [["Joule", false], ["Newton", true], ["Watt", false], ["Pascal", false]], topic: "Force" },
      { type: "MultipleSelect", text: "Which of these are metals?", marks: 2, options: [["Iron", true], ["Sulphur", false], ["Copper", true], ["Carbon", false]], topic: "Materials" },
      { type: "TrueFalse", text: "Sound travels faster in water than in air.", marks: 1, options: [["True", true], ["False", false]], topic: "Sound" },
      { type: "FillInBlank", text: "The chemical symbol of sodium is ____.", marks: 1, accepted: ["Na"], topic: "Elements" },
      { type: "ShortAnswer", text: "Why do we see lightning before we hear thunder?", marks: 3, model: "Light travels much faster than sound.", topic: "Sound" },
      { type: "SingleChoice", text: "Which organ pumps blood through the body?", marks: 1, options: [["Lungs", false], ["Liver", false], ["Heart", true], ["Kidney", false]], topic: "Human body" },
      { type: "TrueFalse", text: "Friction always opposes motion.", marks: 1, options: [["True", true], ["False", false]], topic: "Force" },
    ];
    const toContent = (q) => ({
      type: q.type,
      text: q.text,
      marks: q.marks,
      explanation: null,
      modelAnswer: q.model ?? null,
      acceptedAnswers: q.accepted ?? null,
      caseSensitive: false,
      options: q.options ? q.options.map(([text, isCorrect]) => ({ text, isCorrect })) : null,
    });
    const bank = [];
    for (const q of qs) bank.push(await s.post("academic", "/api/question-bank", { content: toContent(q), subjectId: sci.id, classId: g8.id, topic: q.topic, difficulty: r.pick(["Easy", "Medium", "Hard"]), tags: ["term1"] }));
    const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 2, 4, 30));
    const exam = await s.post("academic", "/api/online-exams", {
      name: "Science unit test - Grade 8",
      description: "Answer all questions. Short answers are marked by your teacher.",
      academicYearId: ctx.year.id,
      examType: "UnitTest",
      subjectId: sci.id,
      classId: g8.id,
      sectionId: null,
      teacherStaffId: ctx.teachers.find((t) => t.subject.id === sci.id)?.id ?? null,
      startUtc: start.toISOString(),
      endUtc: new Date(start.getTime() + 3 * 3600_000).toISOString(),
      durationMinutes: 30,
      timeZoneId: "Asia/Kolkata",
      settings: { passingMarks: 4, maxAttempts: 1, shuffleQuestions: true, shuffleOptions: true, showQuestionNumbers: true, allowBackNavigation: true, autoSubmitOnTimeout: true, showResultImmediately: false, allowReviewBeforeSubmit: true, showAnswersInResult: true, negativeMarkPerWrong: 0 },
      questions: bank.map((q, i) => ({ sourceQuestionId: q.id, content: toContent(qs[i]) })),
      assignments: [{ kind: "Class", targetId: g8.id }],
    });
    await s.post("academic", `/api/online-exams/${exam.id}/schedule`, { startNow: false });
    return `${bank.length} questions, 1 exam scheduled`;
  });

  // ── Admissions ──
  await S("admissions pipeline", async () => {
    const res = await bulk(Array.from({ length: 6 }, (_, i) => i), async (i) => {
      const girl = r.chance(0.5);
      const last = r.pick(SURNAMES);
      return s.post("academic", "/api/admissions", {
        branchId: b.id,
        applicantFirstName: r.pick(girl ? GIRL_NAMES : BOY_NAMES),
        applicantLastName: last,
        dateOfBirth: `${2015 - (i % 3)}-${String(r.int(1, 12)).padStart(2, "0")}-${String(r.int(1, 28)).padStart(2, "0")}`,
        gender: girl ? "Female" : "Male",
        guardianName: `${r.pick(ADULT_MALE)} ${last}`,
        guardianPhone: `9${r.int(100000000, 999999999)}`,
        guardianEmail: null,
        appliedClass: `Grade ${6 + (i % 3)}`,
        notes: r.pick(["Transferring from another city", "Sibling already studies here", null]),
      });
    });
    return `${res.ok} applications`;
  });

  // ── Leave ──
  await S("staff leave requests", async () => {
    const picks = r.shuffle(ctx.teachers).slice(0, 4);
    for (const [i, t] of picks.entries()) {
      const from = addDays(today, r.int(-10, 12));
      const lr = await s.post("academic", "/api/leaverequests", { staffId: t.id, leaveType: r.pick(["Sick", "Casual", "Earned"]), fromDate: iso(from), toDate: iso(addDays(from, r.int(0, 2))), reason: r.pick(["Family function", "Medical appointment", "Fever", "Personal work"]) });
      if (i < 2) await s.put("academic", `/api/leaverequests/${lr.id}/status`, { status: i === 0 ? "Approved" : "Rejected" });
    }
    return `${picks.length} requests (1 approved, 1 rejected)`;
  });

  // ── Finance ──
  await S("fee structures", async () => {
    ctx.fees = [];
    for (const c of ctx.classes) {
      ctx.fees.push({ classId: c.id, ...(await s.post("finance", "/api/feestructures", { name: `Tuition - Grade ${c.grade}`, academicYearId: ctx.year.id, classId: c.id, feeType: "Tuition", amount: 18000 + (c.grade - 6) * 1500, frequency: "TermWise", lateFineFlat: 200, lateFinePerDay: 10 })) });
    }
    ctx.busFee = await s.post("finance", "/api/feestructures", { name: "Bus fee", academicYearId: ctx.year.id, classId: null, feeType: "Bus", amount: 3500, frequency: "TermWise", lateFineFlat: null, lateFinePerDay: null });
    await s.post("finance", "/api/feestructures", { name: "Examination fee", academicYearId: ctx.year.id, classId: null, feeType: "Exam", amount: 800, frequency: "Annual", lateFineFlat: null, lateFinePerDay: null });
    return `${ctx.fees.length + 2} structures`;
  });

  await S("fee invoices, payments & discounts", async () => {
    for (const f of ctx.fees ?? []) {
      await s.post("finance", "/api/feeinvoices/generate", { feeStructureId: f.id, term: "Term 1", dueDate: "2026-07-15", eligibleStudentIds: ctx.studentsIn(f.classId).map((x) => x.id) });
    }
    const invoices = (await s.get("finance", "/api/feeinvoices")) ?? [];
    let paid = 0, partial = 0;
    // One at a time: FinanceService numbers receipts as count+1, so parallel payments collide (see README "Known issues").
    await pool(invoices, 1, async (inv) => {
      const amount = Number(inv.netAmount ?? inv.amount ?? 0);
      const x = r.next();
      if (!amount) return;
      if (x < 0.6) {
        await s.post("finance", `/api/feeinvoices/${inv.id}/payments`, { amount, mode: r.pick(["Online", "Cash", "Card", "Cheque", "Online"]) });
        paid++;
      } else if (x < 0.75) {
        await s.post("finance", `/api/feeinvoices/${inv.id}/payments`, { amount: Math.round(amount / 2), mode: "Cash" });
        partial++;
      } else if (x < 0.8) {
        await s.post("finance", `/api/feeinvoices/${inv.id}/installments`, { count: 3 });
      }
    });
    const siblings = r.shuffle(ctx.students).slice(0, 5).map((x) => x.id);
    await s.post("finance", "/api/feediscounts", { name: "Sibling discount", type: "Percentage", value: 10, appliesTo: "Specific", studentIds: siblings, description: "10% off tuition for siblings" });
    await s.post("finance", "/api/feediscounts", { name: "Staff ward concession", type: "Flat", value: 2500, appliesTo: "Specific", studentIds: r.shuffle(ctx.students).slice(0, 2).map((x) => x.id), description: null });
    const paidInvoice = invoices[0];
    if (paidInvoice && paid) await s.post("finance", "/api/refunds", { feeInvoiceId: paidInvoice.id, amount: 500, reason: "Excess amount paid" }).catch(() => {});
    return `${invoices.length} invoices, ${paid} paid, ${partial} part-paid`;
  });

  await S("accounting journal", async () => {
    let accounts = (await s.get("finance", "/api/accounts")) ?? [];
    const need = [
      ["1000", "Cash in hand", "Asset"],
      ["1100", "Bank - SBI current", "Asset"],
      ["4000", "Tuition fee income", "Income"],
      ["5000", "Electricity & utilities", "Expense"],
      ["5100", "Stationery & supplies", "Expense"],
    ];
    for (const [code, name, type] of need) if (!accounts.some((a) => a.code === code)) accounts.push(await s.post("finance", "/api/accounts", { code, name, type, description: null }));
    const acc = (code) => accounts.find((a) => a.code === code).id;
    const entries = [
      ["Electricity bill - September", "5000", "1100", 18450],
      ["Stationery purchase", "5100", "1000", 6200],
      ["Fee deposit to bank", "1100", "1000", 95000],
    ];
    for (const [narration, dr, cr, amt] of entries) {
      const je = await s.post("finance", "/api/journalentries", { date: iso(addDays(today, -r.int(1, 20))), reference: `JV-${r.int(1000, 9999)}`, narration, gstApplicable: false, gstAmount: null, lines: [{ accountId: acc(dr), debit: amt, credit: 0, description: null }, { accountId: acc(cr), debit: 0, credit: amt, description: null }] });
      await s.post("finance", `/api/journalentries/${je.id}/post`);
    }
    return `${entries.length} posted entries`;
  });

  // ── Library ──
  await S("library catalogue, members & loans", async () => {
    const cats = {};
    for (const name of ["Fiction", "Science", "History", "Reference", "Children"]) cats[name] = await s.post("campus", "/api/bookcategories", { name });
    const pubs = [];
    for (const name of ["Penguin India", "NCERT", "Rupa Publications", "HarperCollins India"]) pubs.push(await s.post("campus", "/api/publishers", { name, address: "New Delhi" }));
    const books = [
      ["The Guide", "R. K. Narayan", "Fiction"], ["Malgudi Days", "R. K. Narayan", "Children"], ["Wings of Fire", "A. P. J. Abdul Kalam", "Science"],
      ["The Discovery of India", "Jawaharlal Nehru", "History"], ["Panchatantra Stories", "Vishnu Sharma", "Children"], ["The God of Small Things", "Arundhati Roy", "Fiction"],
      ["Science Class 8", "NCERT", "Reference"], ["Mathematics Class 9", "NCERT", "Reference"], ["Ignited Minds", "A. P. J. Abdul Kalam", "Science"],
      ["The Room on the Roof", "Ruskin Bond", "Fiction"], ["Oxford School Atlas", "Oxford", "Reference"], ["India After Gandhi", "Ramachandra Guha", "History"],
    ];
    const authors = {};
    const created = [];
    for (const [i, [title, author, cat]] of books.entries()) {
      authors[author] ??= await s.post("campus", "/api/authors", { name: author, bio: null });
      created.push(await s.post("campus", "/api/books", { title, isbn: `978${String(8100000000 + i * 7919 + bi).slice(0, 10)}`, authorId: authors[author].id, publisherId: r.pick(pubs).id, categoryId: cats[cat].id, totalCopies: r.int(2, 6), shelfLocation: `${cat[0]}-${r.int(1, 9)}`, coverNote: null }));
    }
    const memberPeople = [...r.shuffle(ctx.students).slice(0, 20).map((x) => ["Student", x.id]), ...ctx.teachers.slice(0, 5).map((x) => ["Staff", x.id])];
    const members = (await bulk(memberPeople, ([personType, personId]) => s.post("campus", "/api/librarymembers", { personType, personId, status: "Active" }))).out.filter(Boolean);
    let loans = 0;
    for (const m of members.slice(0, 12)) {
      const loan = await s.post("campus", "/api/bookloans/issue", { bookId: r.pick(created).id, memberId: m.id, dueDate: iso(addDays(today, r.int(-5, 14))) }).catch(() => null);
      if (loan) {
        loans++;
        if (r.chance(0.3)) await s.post("campus", `/api/bookloans/${loan.id}/return`).catch(() => {});
      }
    }
    for (const m of members.slice(12, 15)) await s.post("campus", "/api/bookreservations", { bookId: r.pick(created).id, memberId: m.id }).catch(() => {});
    return `${created.length} titles, ${members.length} members, ${loans} loans`;
  });

  // ── Transport ──
  await S("transport: buses, drivers, routes & students", async () => {
    const drivers = ctx.byRole("Driver");
    const buses = [];
    for (let i = 0; i < 2; i++) buses.push(await s.post("campus", "/api/buses", { regNumber: `KA-0${1 + bi}-F-${r.int(1000, 9999)}`, model: r.pick(["Tata Starbus", "Ashok Leyland Lynx", "Eicher Skyline"]), capacity: 40, manufactureYear: r.int(2018, 2024), gpsDeviceId: `GPS-${b.code}-${i + 1}`, status: "Active" }));
    const profiles = [];
    for (const d of drivers) profiles.push(await s.post("campus", "/api/driverprofiles", { staffId: d.id, licenseNumber: `KA${r.int(10, 99)} ${r.int(2005, 2020)}${r.int(1000000, 9999999)}`, licenseExpiryDate: "2030-06-30", experienceYears: r.int(4, 20), status: "Active" }));
    const routeDefs = [
      ["Route 1 - North loop", ["School gate", "Hebbal flyover", "Mekhri Circle", "Sadashivanagar"]],
      ["Route 2 - South loop", ["School gate", "BTM Layout", "Silk Board", "HSR Layout"]],
    ];
    let assigned = 0;
    const riders = r.shuffle(ctx.students).slice(0, 16);
    for (const [i, [name, stops]] of routeDefs.entries()) {
      const route = await s.post("campus", "/api/transportroutes", { name, busId: buses[i]?.id ?? null, driverId: profiles[i]?.id ?? null, startTime: "07:00", endTime: "08:15", status: "Active" });
      const stopRows = [];
      for (const [k, stop] of stops.entries()) stopRows.push(await s.post("campus", "/api/routestops", { routeId: route.id, name: stop, arrivalTime: `07:${String(10 + k * 15).padStart(2, "0")}`, landmark: null }));
      for (const st of riders.slice(i * 8, i * 8 + 8)) {
        await s.post("campus", "/api/studenttransportassignments", { studentId: st.id, routeId: route.id, stopId: r.pick(stopRows.slice(1)).id, monthlyFee: 1200 });
        assigned++;
      }
    }
    return `${buses.length} buses, ${profiles.length} drivers, ${routeDefs.length} routes, ${assigned} riders`;
  });

  // ── Hostel ──
  await S("hostel: rooms, allocations & attendance", async () => {
    const warden = ctx.byRole("Warden")[0];
    const hostel = await s.post("campus", "/api/hostels", { name: `${b.code === "MAIN" ? "Cauvery" : "Kabini"} Hostel`, type: "CoEd", wardenStaffId: warden?.id ?? null, address: "Inside campus, Block C", status: "Active" });
    const rooms = [];
    for (let i = 1; i <= 6; i++) rooms.push(await s.post("campus", "/api/rooms", { hostelId: hostel.id, roomNumber: `${i <= 3 ? "G" : "F"}${i}`, floor: i <= 3 ? "Ground" : "First", capacity: 4, roomType: "Dormitory", status: "Active" }));
    const boarders = r.shuffle(ctx.students.filter((x) => x.grade >= 8)).slice(0, 12);
    for (const [i, st] of boarders.entries()) await s.post("campus", "/api/hostelallocations", { studentId: st.id, hostelId: hostel.id, roomId: rooms[i % rooms.length].id, monthlyFee: 6500 });
    await s.call("campus", "PUT", "/api/hostelattendance", { date: TODAY, entries: boarders.map((st) => ({ studentId: st.id, status: r.next() < 0.9 ? "Present" : "OnLeave" })) });
    await s.post("campus", "/api/hostelfeepayments/generate", { month: TODAY.slice(0, 7) });
    return `${rooms.length} rooms, ${boarders.length} boarders`;
  });

  // ── Inventory ──
  await S("inventory: stock, vendors, purchases & issues", async () => {
    const cats = {};
    for (const [name, description] of [["Stationery", "Paper, pens, registers"], ["Lab equipment", "Science lab supplies"], ["Sports", "Sports gear"], ["Cleaning", "Housekeeping supplies"]]) cats[name] = await s.post("campus", "/api/itemcategories", { name, description });
    const vendors = [];
    for (const name of ["Sri Lakshmi Stationers", "Bangalore Scientific Co.", "Sportz Hub"]) vendors.push(await s.post("campus", "/api/vendors", { name, contactPerson: `${r.pick(ADULT_MALE)} ${r.pick(SURNAMES)}`, phone: `9${r.int(100000000, 999999999)}`, email: null, address: "Bengaluru" }));
    const items = [
      ["A4 paper (500 sheets)", "Stationery", "Ream", 260, 20], ["Whiteboard markers", "Stationery", "Box", 180, 10], ["Attendance registers", "Stationery", "Piece", 90, 15],
      ["Beakers 250 ml", "Lab equipment", "Piece", 120, 12], ["Litmus paper", "Lab equipment", "Packet", 45, 10], ["Footballs", "Sports", "Piece", 650, 4],
      ["Cricket kit", "Sports", "Set", 3200, 1], ["Floor cleaner", "Cleaning", "Litre", 110, 20],
    ];
    let n = 0;
    for (const [i, [name, cat, unit, cost, reorder]] of items.entries()) {
      const item = await s.post("campus", "/api/inventoryitems", { code: `${b.code}-${String(i + 1).padStart(3, "0")}`, name, categoryId: cats[cat].id, unit, unitCost: cost, reorderLevel: reorder, location: "Store room" });
      await s.post("campus", "/api/stocktransactions/purchase", { itemId: item.id, quantity: reorder * r.int(2, 5), unitCost: cost, vendorId: r.pick(vendors).id, date: iso(addDays(today, -r.int(10, 40))), reference: `PO-${r.int(100, 999)}` });
      if (r.chance(0.7)) await s.post("campus", "/api/stocktransactions/issue", { itemId: item.id, quantity: r.int(1, reorder), issuedTo: r.pick(["Grade 6-A", "Science Lab", "Sports room", "Office"]), reason: null, date: iso(addDays(today, -r.int(1, 9))) });
      n++;
    }
    return `${n} items, ${vendors.length} vendors`;
  });

  // ── Health ──
  await S("health: check-ups, vaccinations & infirmary", async () => {
    const nurse = ctx.byRole("Nurse")[0];
    const kids = r.shuffle(ctx.students);
    await bulk(kids.slice(0, 25), (st) => s.post("campus", "/api/healthcheckups", { studentId: st.id, checkupDate: iso(addDays(today, -r.int(5, 40))), heightCm: 135 + (st.grade - 6) * 5 + r.int(-6, 6), weightKg: 32 + (st.grade - 6) * 4 + r.int(-5, 6), visionLeft: r.pick(["6/6", "6/6", "6/9"]), visionRight: r.pick(["6/6", "6/6", "6/9"]), dentalRemarks: r.chance(0.2) ? "Minor cavity - advised dentist visit" : null, generalRemarks: "Healthy", examinedByStaffId: nurse?.id ?? null }));
    await bulk(kids.slice(25, 37), (st, i) => s.post("campus", "/api/vaccinationrecords", { studentId: st.id, vaccineName: r.pick(["Tdap booster", "HPV", "Typhoid"]), doseNumber: 1, dueDate: iso(addDays(today, r.int(-20, 30))), notes: null }));
    await bulk(kids.slice(37, 43), (st) => s.post("campus", "/api/infirmaryvisits", { studentId: st.id, visitedAt: addDays(today, -r.int(0, 10)).toISOString(), symptoms: r.pick(["Headache", "Stomach ache", "Minor cut on knee", "Mild fever"]), temperatureC: r.pick([36.8, 37.2, 38.1]), treatmentGiven: r.pick(["Rest", "First aid", "Paracetamol given"]), medicineGiven: null, outcome: r.pick(["ReturnedToClass", "ReturnedToClass", "SentHome"]), parentNotified: r.chance(0.5), attendedByStaffId: nurse?.id ?? null }));
    return "25 check-ups, 12 vaccinations, 6 infirmary visits";
  });

  // ── Visitors ──
  await S("visitors & gate log", async () => {
    const host = r.pick(ctx.teachers);
    for (let i = 0; i < 2; i++) await s.post("campus", "/api/preapprovedvisits", { visitorName: `${r.pick(ADULT_MALE)} ${r.pick(SURNAMES)}`, phone: `9${r.int(100000000, 999999999)}`, purpose: r.pick(["Meeting", "Interview"]), purposeNotes: null, hostType: "Staff", hostStudentId: null, hostStaffId: host.id, hostOtherLabel: null, scheduledAt: addDays(today, i + 1).toISOString() });
    const entries = [];
    for (let i = 0; i < 5; i++) {
      const st = r.pick(ctx.students);
      entries.push(await s.post("campus", "/api/visitorentries", { visitorName: `${r.pick(ADULT_FEMALE)} ${st.last}`, phone: `9${r.int(100000000, 999999999)}`, idProofType: "Aadhaar", idProofNumber: `XXXX-XXXX-${r.int(1000, 9999)}`, purpose: r.pick(["Pickup", "Meeting", "Delivery"]), purposeNotes: null, hostType: "Student", hostStudentId: st.id, hostStaffId: null, hostOtherLabel: null, preApprovalId: null }));
    }
    for (const e of entries.slice(0, 3)) await s.post("campus", `/api/visitorentries/${e.id}/check-out`);
    return "2 pre-approved, 5 check-ins (3 checked out)";
  });

  // ── Help desk ──
  await S("help desk tickets", async () => {
    const defs = [
      ["Facilities", "High", "Projector not working in Room 104", "The projector does not turn on since Monday."],
      ["Transport", "Medium", "Bus arrives late at HSR stop", "Route 2 bus has been 15 minutes late this week."],
      ["ItSupport", "Low", "Wi-Fi slow in the library", "Students cannot open the e-library portal."],
      ["FeesBilling", "Medium", "Fee receipt not received", "Paid online but did not get the receipt."],
      ["Academic", "Low", "Request for extra maths class", "Parents request remedial classes before exams."],
    ];
    const staffer = ctx.byRole("Receptionist")[0] ?? ctx.teachers[0];
    let n = 0;
    for (const [i, [category, priority, subject, description]] of defs.entries()) {
      const st = r.pick(ctx.students);
      const t = await s.post("campus", "/api/tickets", { category, priority, subject, description, raisedByType: i % 2 ? "Parent" : "Staff", raisedByStudentId: i % 2 ? st.id : null, raisedByStaffId: i % 2 ? null : staffer.id, raisedByName: i % 2 ? `Parent of ${st.first} ${st.last}` : `${staffer.first} ${staffer.last}`, raisedByContact: null });
      if (i < 3) await s.post("campus", `/api/tickets/${t.id}/assign`, { staffId: staffer.id });
      if (i < 2) await s.post("campus", `/api/tickets/${t.id}/resolve`, { resolutionNotes: "Fixed and verified with the requester." });
      n++;
    }
    return `${n} tickets`;
  });

  // ── Certificates ──
  await S("certificates", async () => {
    for (const st of r.shuffle(ctx.students).slice(0, 3)) {
      await s.post("campus", "/api/issuedcertificates", { type: "Bonafide", recipientType: "Student", recipientId: st.id, recipientName: `${st.first} ${st.last}`, recipientSubtitle: `Grade ${st.grade}`, bodyLines: [`This is to certify that ${st.first} ${st.last} is a bonafide student of ${SCHOOL}, ${b.name}, studying in Grade ${st.grade} during the academic year 2026-27.`], meta: [], certificateNumberOverride: null });
    }
    return "3 bonafide certificates";
  });

  // ── Engagement ──
  await S("announcements", async () => {
    const posts = [
      ["Annual Sports Day on 9 October", "All students must report in house colours by 8:00 am. Parents are welcome from 9:30 am.", "Event", "everyone"],
      ["Mid-term results published", "Mid-term marks are now available in the parent portal. Parent-teacher meetings follow next week.", "Academic", "parent"],
      ["Term 1 fee reminder", "Term 1 fees were due on 15 July. Please clear pending dues to avoid late fines.", "Finance", "parent"],
      ["Staff meeting on Friday", "All teaching staff: meeting in the conference hall at 3:30 pm to plan the term 2 calendar.", "Announcement", "teacher"],
    ];
    for (const [title, body, category, audience] of posts) await s.post("engagement", "/api/notifications", { title, body, category, audience, actionUrl: null });
    return `${posts.length} posts`;
  });

  await S("surveys", async () => {
    const survey = await s.post("engagement", "/api/surveys", {
      title: "Parent satisfaction survey - Term 1",
      description: "Help us improve. It takes two minutes.",
      audience: "Parents",
      anonymousAllowed: true,
      opensAt: TODAY,
      closesAt: iso(addDays(today, 21)),
      createdByStaffId: ctx.byRole(bi === 0 ? "Principal" : "VicePrincipal")[0]?.id ?? null,
      questions: [
        { text: "How satisfied are you with teaching quality?", type: "Rating", options: null, required: true },
        { text: "Is the school transport punctual?", type: "YesNo", options: null, required: false },
        { text: "Which area should we improve first?", type: "MultipleChoice", options: ["Sports", "Library", "Canteen", "Communication"], required: true },
        { text: "Any other suggestions?", type: "Text", options: null, required: false },
      ],
    });
    await s.post("engagement", `/api/surveys/${survey.id}/publish`);
    await s.post("engagement", "/api/surveys", { title: "Staff wellbeing check-in", description: null, audience: "Staff", anonymousAllowed: true, opensAt: TODAY, closesAt: null, createdByStaffId: null, questions: [{ text: "How manageable is your workload?", type: "Rating", options: null, required: true }] });
    return "1 published, 1 draft";
  });

  await S("contact groups & message templates", async () => {
    await s.post("engagement", "/api/contactgroups", { name: "Grade 10 students", description: "Board exam batch", audienceType: "Students", memberIds: ctx.students.filter((x) => x.grade === 10).map((x) => x.id) });
    await s.post("engagement", "/api/contactgroups", { name: "Class teachers", description: null, audienceType: "Staff", memberIds: ctx.teachers.slice(0, 10).map((x) => x.id) });
    await s.post("engagement", "/api/messagetemplates", { name: "Fee reminder", category: "Finance", subject: "Fee reminder", body: "Dear parent, the fee for {{term}} is due on {{dueDate}}. Please pay through the parent portal.", channels: ["InApp"] });
    await s.post("engagement", "/api/messagetemplates", { name: "Absence alert", category: "Attendance", subject: "Absent today", body: "Dear parent, {{studentName}} was marked absent today.", channels: ["InApp"] });
    return "2 groups, 2 templates";
  });

  await S("student leave requests", async () => {
    const kids = r.shuffle(ctx.students).slice(0, 4);
    for (const [i, st] of kids.entries()) {
      const from = addDays(today, r.int(1, 10));
      const lr = await s.post("engagement", "/api/studentleaverequests", { studentId: st.id, fromDate: iso(from), toDate: iso(addDays(from, r.int(0, 2))), reason: r.pick(["Family wedding", "Medical check-up", "Travelling to native place", "Fever"]) });
      if (i === 0) await s.post("engagement", `/api/studentleaverequests/${lr.id}/approve`);
      if (i === 1) await s.post("engagement", `/api/studentleaverequests/${lr.id}/reject`);
    }
    return `${kids.length} requests`;
  });

  // ── Meetings ──
  await S("meetings (parent-teacher & staff)", async () => {
    const sec = ctx.sections[0];
    const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 5, 9, 30));
    await s.post("meetings", "/api/meetings", { title: `Parent-teacher meeting - ${sec.label}`, description: "Discussion of mid-term results.", meetingType: "ParentTeacherMeeting", subjectId: null, sectionId: sec.id, hostUserId: null, startUtc: start.toISOString(), durationMinutes: 45, audience: [{ type: "SectionGuardians", targetId: sec.id }], recurrence: null, reminderOffsetsMinutes: [60], provider: "ExternalLink", externalJoinUrl: "https://meet.google.com/abc-defg-hij", recordingEnabled: false });
    await s.post("meetings", "/api/meetings", { title: "Term 2 planning - all staff", description: null, meetingType: "StaffMeeting", subjectId: null, sectionId: null, hostUserId: null, startUtc: new Date(start.getTime() + 86400_000).toISOString(), durationMinutes: 60, audience: [{ type: "AllStaff", targetId: null }], recurrence: null, reminderOffsetsMinutes: [30], provider: "ExternalLink", externalJoinUrl: "https://meet.google.com/xyz-abcd-efg", recordingEnabled: false });
    return "2 meetings";
  });
}

// 4. Payroll: one run per month for the whole school (every branch) ─────────────────────────
console.log("\nPayroll (whole school)");
await step("tenant", "payroll for last month", async () => {
  const last = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1));
  const month = `${last.getUTCFullYear()}-${String(last.getUTCMonth() + 1).padStart(2, "0")}`;
  s.branch = BRANCHES[0].id;
  const result = await s.post("finance", "/api/payrollruns/generate", { month, eligibleStaff: allStaff.filter((m) => m.basic).map((m) => ({ staffId: m.id, basic: m.basic, allowances: m.allowances, deductions: m.deductions })) });
  const runId = result.run?.id ?? result.id;
  await s.post("finance", `/api/payrollruns/${runId}/finalize`);
  const slips = (await s.get("finance", `/api/payslips?runId=${runId}`)) ?? [];
  await bulk(slips.slice(0, Math.ceil(slips.length * 0.7)), (p) => s.post("finance", `/api/payslips/${p.id}/mark-paid`));
  return `${month}: ${slips.length} payslips, ${Math.ceil(slips.length * 0.7)} paid`;
});

// ── summary ──────────────────────────────────────────────────────────────────────────────────
const failed = report.filter((x) => !x.ok);
console.log(`\nDone: ${report.length - failed.length}/${report.length} steps succeeded, ${s.calls} API calls.`);
if (failed.length) {
  console.log("Failed steps:");
  for (const f of failed) console.log(`  - [${f.scope}] ${f.name}: ${f.detail.slice(0, 300)}`);
}
console.log(`\nOpen the site as SuperAdmin and pick "${SCHOOL}" in the tenant switcher to see the data.`);
process.exit(failed.length ? 2 : 0);
