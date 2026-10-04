// AcademicService, per branch: academic setup, staff, students, timetable, attendance, calendar, homework, exams,
// lesson plans, learning, online exams, admissions and staff leave. Fills ctx.year/classes/sections/subjects/
// staff/teachers/students for the later modules.
import { ADULT_FEMALE, ADULT_MALE, BOY_NAMES, GIRL_NAMES, SURNAMES, addDays, iso, recentSchoolDays } from "../lib.mjs";

/** "Primary" / "Middle School" / "High School" for a grade. */
export const stageOf = (grade) => (grade <= 5 ? "Primary" : grade <= 8 ? "Middle School" : "High School");

/** Returns false when the branch has no students (later modules need them). */
export async function seedAcademic(ctx) {
  const { s, t, b, bi, r, S, bulk, today, y0, allStaff } = ctx;
  const phone = () => `9${r.int(100000000, 999999999)}`;
  const address = () => `${r.int(1, 400)}, ${r.pick(t.localities)}, ${t.city}`;

  await S("Academic Setup", "academic year & terms", async () => {
    ctx.year = await s.post("academic", "/api/academicyears", { name: ctx.yearCfg.name, startDate: ctx.yearCfg.start, endDate: ctx.yearCfg.end, isCurrent: true, status: "Active" });
    ctx.term1 = await s.post("academic", "/api/terms", { name: "Term 1", academicYearId: ctx.year.id, startDate: ctx.yearCfg.start, endDate: `${y0}-10-15`, status: "Ongoing" });
    ctx.term2 = await s.post("academic", "/api/terms", { name: "Term 2", academicYearId: ctx.year.id, startDate: `${y0}-10-26`, endDate: ctx.yearCfg.end, status: "Upcoming" });
    return `${ctx.yearCfg.name}, Term 1 + Term 2`;
  });
  if (!ctx.year) return false;

  await S("Academic Setup", "departments", async () => {
    const stages = [...new Set(t.grades.map(stageOf))];
    const span = (st) => {
      const g = t.grades.filter((x) => stageOf(x) === st);
      return `Grades ${g[0]}-${g[g.length - 1]}`;
    };
    const names = [
      ...stages.map((st) => [st, span(st)]),
      ["Science", "Physics, chemistry and biology"],
      ["Languages", "English, Hindi and the regional language"],
      ["Mathematics", "Mathematics and statistics"],
      ["Administration", "Office, accounts and support"],
    ];
    ctx.depts = {};
    for (const [name, description] of names) ctx.depts[name] = await s.post("academic", "/api/departments", { name, description });
    return `${names.length} departments`;
  });

  await S("Academic Setup", "classes", async () => {
    ctx.classes = [];
    for (const g of t.grades) {
      const dept = ctx.depts?.[stageOf(g)];
      ctx.classes.push({ grade: g, ...(await s.post("academic", "/api/classes", { name: `Grade ${g}`, departmentId: dept?.id ?? null, academicYearId: ctx.year.id })) });
    }
    return `Grades ${t.grades[0]}-${t.grades[t.grades.length - 1]}`;
  });

  await S("Academic Setup", "subjects", async () => {
    const ids = ctx.classes.map((c) => c.id);
    const firstStage = stageOf(t.grades[0]);
    const defs = [
      ["English", "ENG", "Core", "Languages"],
      ["Mathematics", "MAT", "Core", "Mathematics"],
      ["Science", "SCI", "Core", "Science"],
      ["Social Studies", "SST", "Core", firstStage],
      ["Hindi", "HIN", "Core", "Languages"],
      [t.regionalLanguage ?? { Bengaluru: "Kannada", Kochi: "Malayalam", Chennai: "Tamil" }[t.city] ?? "Kannada", "REG", "Elective", "Languages"],
      ["Computer Science", "CSC", "Elective", "Science"],
    ];
    ctx.subjects = [];
    for (const [name, code, type, dept] of defs) ctx.subjects.push({ dept, ...(await s.post("academic", "/api/subjects", { name, code: `${code}-${b.code}`, type, classIds: ids })) });
    return `${defs.length} subjects for every class`;
  });

  await S("Timetable", "rooms", async () => {
    const n = Math.max(10, ctx.classes.length * 2);
    for (let i = 1; i <= n; i++) await s.post("academic", "/api/rooms", { name: `Room ${100 + i}`, capacity: 40 });
    await s.post("academic", "/api/rooms", { name: "Science Lab", capacity: 30 });
    await s.post("academic", "/api/rooms", { name: "Computer Lab", capacity: 30 });
    return `${n + 2} rooms`;
  });

  // ── Staff ──
  await S("Teachers", "staff", async () => {
    const teacherSubjects = ctx.subjects.flatMap((sub) => [sub, sub]).slice(0, ctx.teachersPerBranch);
    while (teacherSubjects.length < ctx.teachersPerBranch) teacherSubjects.push(r.pick(ctx.subjects));
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
        phone: phone(),
        email: `${first}.${last}.${b.code}@${t.subdomain}.example`.toLowerCase(),
        address: address(),
      });
      return { ...d, ...staff, first, last };
    });
    ctx.staff = res.out.filter(Boolean);
    ctx.teachers = ctx.staff.filter((x) => x.designation === "Teacher");
    allStaff.push(...ctx.staff);
    return `${res.ok} staff (${ctx.teachers.length} teachers)`;
  });
  ctx.staff ??= [];
  ctx.teachers ??= [];
  ctx.byRole = (role) => ctx.staff.filter((x) => x.designation === role);

  await S("Payroll", "staff salaries & qualifications", async () => {
    const salary = { Teacher: 42000, Principal: 95000, VicePrincipal: 78000, Accountant: 38000, Librarian: 30000, Nurse: 32000, Warden: 28000, Driver: 22000, Receptionist: 24000 };
    await bulk(ctx.staff, async (m) => {
      const basic = (salary[m.designation] ?? 30000) + r.int(0, 8) * 1000;
      m.basic = basic;
      m.allowances = Math.round(basic * 0.25);
      m.deductions = Math.round(basic * 0.12);
      await s.put("academic", `/api/staff/${m.id}/salary`, { basic, allowances: m.allowances, deductions: m.deductions, bankName: r.pick(["SBI", "HDFC Bank", "Canara Bank", "ICICI Bank", "Federal Bank"]), bankAccountNumber: String(r.int(10000000000, 99999999999)), effectiveFrom: ctx.yearCfg.start });
      if (m.designation === "Teacher") {
        await s.post("academic", `/api/staff/${m.id}/qualifications`, { degree: r.pick(["B.Ed", "M.Sc, B.Ed", "M.A, B.Ed", "M.Com, B.Ed"]), institution: r.pick(["Bangalore University", "Christ University", "University of Kerala", "University of Madras", "Mount Carmel College"]), yearCompleted: r.int(1998, 2020) });
      }
    });
    return "salary for everyone, degrees for teachers";
  });

  await S("Academic Setup", "sections (with class teachers)", async () => {
    ctx.sections = [];
    let i = 0;
    for (const c of ctx.classes) {
      for (const name of ["A", "B"]) {
        const ct = ctx.teachers[i++ % Math.max(1, ctx.teachers.length)];
        const sec = await s.post("academic", "/api/sections", { name, classId: c.id, classTeacherName: ct ? `${ct.first} ${ct.last}` : null, classTeacherStaffId: ct?.id ?? null, capacity: 40, currentStrength: 0 });
        ctx.sections.push({ ...sec, classId: c.id, grade: c.grade, label: `Grade ${c.grade}-${name}` });
      }
    }
    return `${ctx.sections.length} sections`;
  });
  if (!ctx.sections?.length) return false;

  await S("Teachers", "teacher assignments", async () => {
    const pairs = [];
    for (const tch of ctx.teachers) for (const c of ctx.classes) if (r.chance(0.6) || c.grade % 2 === ctx.teachers.indexOf(tch) % 2) pairs.push({ staffId: tch.id, subjectId: tch.subject.id, classId: c.id });
    // Every subject in every class needs someone.
    for (const sub of ctx.subjects) for (const c of ctx.classes) if (!pairs.some((p) => p.subjectId === sub.id && p.classId === c.id)) {
      const tch = ctx.teachers.find((x) => x.subject.id === sub.id) ?? r.pick(ctx.teachers);
      pairs.push({ staffId: tch.id, subjectId: sub.id, classId: c.id });
    }
    const res = await bulk(pairs, (p) => s.post("academic", "/api/teacher-assignments", p));
    return `${res.ok} assignments`;
  });

  // ── Students ──
  await S("Students", "students", async () => {
    const used = new Set();
    const items = Array.from({ length: ctx.studentsPerBranch }, (_, i) => i);
    const res = await bulk(items, async (i) => {
      const sec = ctx.sections[i % ctx.sections.length];
      const girl = r.chance(0.5);
      let first, last, tries = 0;
      do {
        first = r.pick(girl ? GIRL_NAMES : BOY_NAMES);
        last = r.pick(SURNAMES);
      } while (used.has(first + last) && ++tries < 50);
      used.add(first + last);
      const father = r.chance(0.7);
      const age = 5 + sec.grade;
      const st = await s.post("academic", "/api/students", {
        branchId: b.id,
        firstName: first,
        lastName: last,
        dateOfBirth: `${y0 - age}-${String(r.int(1, 12)).padStart(2, "0")}-${String(r.int(1, 28)).padStart(2, "0")}`,
        gender: girl ? "Female" : "Male",
        sectionId: sec.id,
        rollNumber: String(Math.floor(i / ctx.sections.length) + 1),
        address: address(),
        guardianName: `${r.pick(father ? ADULT_MALE : ADULT_FEMALE)} ${last}`,
        guardianRelation: father ? "Father" : "Mother",
        guardianPhone: phone(),
      });
      return { ...st, first, last, sectionId: sec.id, classId: sec.classId, grade: sec.grade };
    });
    ctx.students = res.out.filter(Boolean);
    return `${res.ok} students across ${ctx.sections.length} sections`;
  });
  if (!ctx.students?.length) return false;
  ctx.studentsIn = (classId) => ctx.students.filter((x) => x.classId === classId);

  await S("Students", "student medical records", async () => {
    const res = await bulk(ctx.students.filter(() => r.chance(0.5)), (st) =>
      s.put("academic", `/api/students/${st.id}/medical`, {
        bloodGroup: r.pick(["A+", "B+", "O+", "AB+", "O-", "A-"]),
        allergies: r.chance(0.2) ? r.pick(["Peanuts", "Dust", "Pollen", "Lactose"]) : null,
        conditions: r.chance(0.1) ? "Mild asthma" : null,
        medications: null,
        doctorName: `Dr. ${r.pick(ADULT_MALE)} ${r.pick(SURNAMES)}`,
        doctorPhone: phone(),
      }),
    );
    return `${res.ok} records`;
  });

  // ── Timetable ──
  await S("Timetable", "timetables (auto-generated)", async () => {
    const res = await bulk(ctx.sections, (sec) => s.post("academic", `/api/timetable/sections/${sec.id}/auto-generate`));
    return `${res.ok} sections`;
  });

  // ── Attendance ──
  await S("Attendance", "student attendance (last 10 school days)", async () => {
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

  await S("Attendance", "staff attendance (last 10 school days)", async () => {
    const days = recentSchoolDays(10, today);
    for (const date of days) {
      await s.post("academic", "/api/attendance/staff", { date, entries: ctx.staff.map((m) => ({ staffId: m.id, status: r.next() < 0.93 ? "Present" : r.chance(0.5) ? "Late" : "Absent" })) });
    }
    return `${days.length} days`;
  });

  // ── Calendar ──
  await S("Calendar", "calendar events", async () => {
    const y1 = y0 + 1;
    const events = [
      ["Term 1 begins", "TermStart", ctx.yearCfg.start, null],
      ["Independence Day", "Holiday", `${y0}-08-15`, null],
      ["Ganesh Chaturthi", "Holiday", `${y0}-09-14`, null],
      ["Mid-term examinations", "Exam", `${y0}-09-21`, `${y0}-09-26`],
      ["Gandhi Jayanti", "Holiday", `${y0}-10-02`, null],
      ["Annual Sports Day", "Other", `${y0}-10-09`, null],
      ["Term 1 ends", "TermEnd", `${y0}-10-15`, null],
      ["Diwali break", "Holiday", `${y0}-10-19`, `${y0}-10-24`],
      ["Children's Day celebration", "Other", `${y0}-11-14`, null],
      ["Final examinations", "Exam", `${y1}-03-01`, `${y1}-03-15`],
    ];
    for (const [title, type, startDate, endDate] of events) await s.post("academic", "/api/calendarevents", { title, type, startDate, endDate, academicYearId: ctx.year.id, description: null });
    return `${events.length} events`;
  });

  // ── Homework ──
  await S("Homework", "homework, submissions & grading", async () => {
    let hw = 0, subs = 0;
    for (const sec of ctx.sections) {
      for (const sub of r.shuffle(ctx.subjects).slice(0, 2)) {
        const teacher = ctx.teachers.find((x) => x.subject.id === sub.id) ?? ctx.teachers[0];
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
        const submitters = ctx.students.filter((x) => x.sectionId === sec.id && r.chance(0.7));
        // One at a time: a submit backfills pending rows for the whole class, so parallel submits collide (README "Known issues").
        const res = await bulk(submitters, (st) => s.post("academic", `/api/homework/${h.id}/submit`, { studentId: st.id, content: "Completed all questions. Attached my working in the notebook." }), 1);
        subs += res.ok;
        const submissions = await s.get("academic", `/api/homework/${h.id}/submissions`);
        await bulk((submissions ?? []).filter((x) => x.id && r.chance(0.6)), (sb) =>
          s.post("academic", `/api/homework/submissions/${sb.id}/grade`, { grade: r.pick(["A+", "A", "B+", "B", "C"]), feedback: r.pick(["Well done!", "Good effort, check question 3.", "Neat work.", null]) }),
        ).catch(() => {});
      }
    }
    return `${hw} assignments, ${subs} submissions`;
  });

  // ── Exams & results ──
  // Two unit tests and the mid-term, so the dashboard's results trend has several months to plot. Later exams
  // score a little higher on average, so the trend reads as steady progress.
  await S("Examinations", "unit tests & mid-term exams, schedules & results", async () => {
    const plan = [
      { name: "Unit Test 1", type: "Internal", start: `${y0}-07-14`, days: 1, boost: -3 },
      { name: "Unit Test 2", type: "Internal", start: `${y0}-08-18`, days: 1, boost: 0 },
      { name: "Mid-term Examination", type: "Midterm", start: `${y0}-09-21`, days: 6, boost: 3 },
    ];
    const core = ctx.subjects.filter((x) => x.type === "Core");
    let exams = 0;
    let results = 0;
    for (const c of ctx.classes) {
      for (const p of plan) {
        const end = iso(addDays(new Date(p.start), p.days - 1));
        const exam = await s.post("academic", "/api/exams", { name: `${p.name} - Grade ${c.grade}`, examType: p.type, termId: ctx.term1.id, classId: c.id, startDate: p.start, endDate: end, status: "Completed" });
        exams++;
        for (const [i, sub] of core.entries()) {
          await s.post("academic", `/api/exams/${exam.id}/schedules`, { subjectId: sub.id, date: iso(addDays(new Date(p.start), Math.min(i, p.days - 1))), startTime: "09:30", endTime: "12:00", maxMarks: 100, passMarks: 35, room: `Room ${101 + (c.grade % 5)}` });
          const students = ctx.studentsIn(c.id);
          await s.post("academic", `/api/exams/${exam.id}/results`, {
            subjectId: sub.id,
            maxMarks: 100,
            entries: students.map((st) => {
              const absent = r.chance(0.03);
              const base = 45 + ((st.first.charCodeAt(0) * 7 + st.last.charCodeAt(0)) % 40);
              return { studentId: st.id, marksObtained: absent ? 0 : Math.max(18, Math.min(100, base + p.boost + r.int(-12, 15))), isAbsent: absent };
            }),
          });
          results += students.length;
        }
        if (p.type !== "Midterm") continue;
        for (const st of ctx.studentsIn(c.id).slice(0, 3)) {
          await s.post("academic", `/api/exams/${exam.id}/remarks/${st.id}`, { remarks: r.pick(["Consistent performer. Keep it up!", "Needs to focus on mathematics.", "Excellent improvement since the last test."]) });
        }
      }
    }
    return `${exams} exams, ${results} marks entered`;
  });

  // ── Lesson plans & learning ──
  await S("Teachers", "lesson plans", async () => {
    const res = await bulk(ctx.teachers, (tch) =>
      s.post("academic", "/api/lesson-plans", {
        staffId: tch.id,
        subjectId: tch.subject.id,
        classId: r.pick(ctx.classes).id,
        title: `${tch.subject.name} - week plan`,
        description: "Objectives, activities, assessment and homework for the week.",
        weekOf: iso(addDays(today, -((today.getUTCDay() + 6) % 7))),
        attachmentNote: null,
        status: "Published",
      }),
    );
    return `${res.ok} plans`;
  });

  await S("Homework", "learning resources & quizzes", async () => {
    let n = 0;
    const maths = ctx.subjects.find((x) => x.name === "Mathematics");
    for (const c of ctx.classes) {
      for (const sub of ctx.subjects.slice(0, 3)) {
        const tch = ctx.teachers.find((x) => x.subject.id === sub.id) ?? ctx.teachers[0];
        await s.post("academic", "/api/learning/resources", { subjectId: sub.id, classId: c.id, title: `${sub.name} revision - Grade ${c.grade}`, type: r.pick(["Video", "Notes", "Pdf"]), url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", description: "Revision material for the term.", createdByStaffId: tch.id });
        n++;
      }
      await s.post("academic", "/api/learning/quizzes", {
        subjectId: maths.id,
        classId: c.id,
        title: `Quick maths check - Grade ${c.grade}`,
        questions:
          c.grade <= 5
            ? [
                { text: "What is 7 + 8?", options: ["14", "15", "16", "13"], correctIndex: 1 },
                { text: "Which number is the largest?", options: ["49", "94", "84", "48"], correctIndex: 1 },
                { text: "How many sides does a triangle have?", options: ["2", "3", "4", "5"], correctIndex: 1 },
              ]
            : [
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
  await S("Online Exams", "question bank & online exam", async () => {
    const sci = ctx.subjects.find((x) => x.name === "Science");
    const target = ctx.classes.find((c) => c.grade === 8) ?? ctx.classes[Math.floor(ctx.classes.length / 2)];
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
    for (const q of qs) bank.push(await s.post("academic", "/api/question-bank", { content: toContent(q), subjectId: sci.id, classId: target.id, topic: q.topic, difficulty: r.pick(["Easy", "Medium", "Hard"]), tags: ["term1"] }));
    const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 2, 4, 30));
    const exam = await s.post("academic", "/api/online-exams", {
      name: `Science unit test - Grade ${target.grade}`,
      description: "Answer all questions. Short answers are marked by your teacher.",
      academicYearId: ctx.year.id,
      examType: "UnitTest",
      subjectId: sci.id,
      classId: target.id,
      sectionId: null,
      teacherStaffId: ctx.teachers.find((x) => x.subject.id === sci.id)?.id ?? null,
      startUtc: start.toISOString(),
      endUtc: new Date(start.getTime() + 3 * 3600_000).toISOString(),
      durationMinutes: 30,
      timeZoneId: "Asia/Kolkata",
      settings: { passingMarks: 4, maxAttempts: 1, shuffleQuestions: true, shuffleOptions: true, showQuestionNumbers: true, allowBackNavigation: true, autoSubmitOnTimeout: true, showResultImmediately: false, allowReviewBeforeSubmit: true, showAnswersInResult: true, negativeMarkPerWrong: 0 },
      questions: bank.map((q, i) => ({ sourceQuestionId: q.id, content: toContent(qs[i]) })),
      assignments: [{ kind: "Class", targetId: target.id }],
    });
    await s.post("academic", `/api/online-exams/${exam.id}/schedule`, { startNow: false });
    return `${bank.length} questions, 1 exam scheduled for Grade ${target.grade}`;
  });

  // ── Admissions ──
  await S("Students", "admissions pipeline", async () => {
    const res = await bulk(Array.from({ length: 6 }, (_, i) => i), async (i) => {
      const girl = r.chance(0.5);
      const last = r.pick(SURNAMES);
      const grade = t.grades[i % Math.min(3, t.grades.length)];
      return s.post("academic", "/api/admissions", {
        branchId: b.id,
        applicantFirstName: r.pick(girl ? GIRL_NAMES : BOY_NAMES),
        applicantLastName: last,
        dateOfBirth: `${y0 - 5 - grade}-${String(r.int(1, 12)).padStart(2, "0")}-${String(r.int(1, 28)).padStart(2, "0")}`,
        gender: girl ? "Female" : "Male",
        guardianName: `${r.pick(ADULT_MALE)} ${last}`,
        guardianPhone: phone(),
        guardianEmail: null,
        appliedClass: `Grade ${grade}`,
        notes: r.pick(["Transferring from another city", "Sibling already studies here", null]),
      });
    });
    return `${res.ok} applications`;
  });

  // ── Leave ──
  await S("Teachers", "staff leave requests", async () => {
    const picks = r.shuffle(ctx.teachers).slice(0, 4);
    for (const [i, tch] of picks.entries()) {
      const from = addDays(today, r.int(-10, 12));
      const lr = await s.post("academic", "/api/leaverequests", { staffId: tch.id, leaveType: r.pick(["Sick", "Casual", "Earned"]), fromDate: iso(from), toDate: iso(addDays(from, r.int(0, 2))), reason: r.pick(["Family function", "Medical appointment", "Fever", "Personal work"]) });
      if (i < 2) await s.put("academic", `/api/leaverequests/${lr.id}/status`, { status: i === 0 ? "Approved" : "Rejected" });
    }
    return `${picks.length} requests (1 approved, 1 rejected)`;
  });

  return true;
}
