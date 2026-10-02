// Phase 2: tables the per-module seeders don't reach and that need no login accounts - custom school roles and
// their permission matrix, feature toggles, templates, talent/meeting settings, staff experience/reviews/
// promotions/salary payments/documents, student documents, timetable substitutions, learning discussions, quiz
// attempts and resource views, hostel mess menu and visitor log, gate watchlist, in-app broadcasts, recurring
// meetings with notes and materials. Everything is read back from the API (not from the run that created the
// school), so this also fills schools seeded earlier; each step skips what is already there.
import { ADULT_FEMALE, ADULT_MALE, SURNAMES, addDays, iso } from "../lib.mjs";

/** A one-page PDF as a data URL, so document uploads exercise the real blob-storage path. */
function pdfDataUrl(title) {
  const text = title.replace(/[()\\]/g, "");
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    null,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  const stream = `BT /F1 18 Tf 72 760 Td (${text}) Tj ET`;
  objs[3] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  let pdf = "%PDF-1.4\n";
  const offsets = objs.map((body, i) => {
    const at = pdf.length;
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
    return at;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return `data:application/pdf;base64,${Buffer.from(pdf).toString("base64")}`;
}

const permId = (module, category) => `perm-${module.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${category}`;

/** Platform-wide content (SuperAdmin, no tenant): an announcement and a few global study materials. */
export async function seedPlatformExtras({ s, step }) {
  const saved = { tenant: s.tenant, branch: s.branch };
  s.tenant = s.branch = null;
  await step("platform", "platform announcement", async () => {
    const title = "Term 2 planning tools now live";
    const existing = (await s.get("identity", "/api/platform/announcements")) ?? [];
    if (existing.some((a) => a.title === title)) return "already there";
    await s.post("identity", "/api/platform/announcements", { title, body: "Schools can now copy their Term 1 timetable and fee structures into Term 2 in one step from Academic Setup.", expiresAt: null });
    return "1 announcement";
  });
  await step("platform", "global study materials", async () => {
    const existing = (await s.get("academic", "/api/study-materials").catch(() => [])) ?? [];
    const list = Array.isArray(existing) ? existing : existing.items ?? [];
    const defs = [
      ["NCERT Science textbook (Class 8)", "Textbook", "Grade 8", "Science", "https://ncert.nic.in/textbook.php?hesc1=0-13"],
      ["Mathematics formula sheet", "Notes", "Grade 10", "Mathematics", "https://ncert.nic.in/textbook.php?jemh1=0-15"],
      ["Previous year board paper - Science", "PreviousYearPaper", "Grade 10", "Science", "https://cbseacademic.nic.in/SQP_CLASSX_2023-24.html"],
    ];
    let n = 0;
    for (const [title, category, gradeLabel, subjectLabel, linkUrl] of defs) {
      if (list.some((m) => m.title === title)) continue;
      const form = new FormData();
      for (const [k, v] of Object.entries({ title, description: "Shared with every school on the platform.", category, gradeLabel, subjectLabel, audience: "AllStudents", linkUrl, publish: "true" })) form.append(k, v);
      await s.form("academic", "/api/study-materials", form);
      n++;
    }
    return `${n} added`;
  });
  Object.assign(s, saved);
}

/** Per tenant: custom roles + permission matrix, feature toggles, a customised template, talent/meeting settings. */
export async function seedTenantExtras(tctx) {
  const { s, t, S, r } = tctx;

  await S(null, "custom roles & permission matrix", async () => {
    const roles = (await s.get("identity", "/api/school-roles")) ?? [];
    const defs = [
      { name: "Exam Coordinator", description: "Schedules exams and publishes results.", modules: ["Examinations", "Online Exams", "Homework", "Students"] },
      { name: "Front Office", description: "Visitors, admissions enquiries and the help desk.", modules: ["Visitor Management", "Complaint / Help Desk", "Students", "Calendar"] },
      { name: "Transport In-charge", description: "Buses, routes and riders.", modules: ["Transport Management", "Students"] },
    ];
    let created = 0, grants = 0;
    for (const d of defs) {
      let role = roles.find((x) => x.name === d.name);
      if (role) continue;
      role = await s.post("identity", "/api/school-roles", { name: d.name, description: d.description, grantsAllBranchAccess: false });
      created++;
      for (const module of d.modules) {
        for (const category of ["menu", "screen", "api"]) {
          // A module outside the school's plan can't be granted; that is expected, not a failure.
          await s.put("identity", `/api/school-roles/${role.id}/matrix/${permId(module, category)}`, { granted: true }).then(() => grants++, () => {});
        }
      }
    }
    return created ? `${created} roles, ${grants} grants` : "already there";
  });

  await S(null, "feature toggles", async () => {
    const toggles = (await s.get("identity", "/api/school-roles/feature-toggles")) ?? [];
    // Each school turns on a different couple of optional features.
    const on = r.shuffle(toggles).slice(0, 2);
    for (const tg of on) if (!tg.enabled) await s.put("identity", `/api/school-roles/feature-toggles/${tg.id}`, { enabled: true });
    return `enabled ${on.map((x) => x.key).join(", ")}`;
  });

  await S(null, "notification templates", async () => {
    const templates = (await s.get("identity", "/api/settings/templates")) ?? [];
    const tpl = templates.find((x) => x.key === "admission_confirmation") ?? templates[0];
    if (!tpl) return "none to customise";
    const body = `${t.school}: Admission confirmed for {{applicantName}} into {{appliedClass}}. Please visit the office within 7 days with the original documents.`;
    if (tpl.body === body) return "already customised";
    await s.put("identity", `/api/settings/templates/${tpl.id}`, { subject: tpl.subject, body });
    return `customised "${tpl.name}"`;
  });

  await S("Talent Showcase", "talent showcase settings", async () => {
    await s.put("engagement", "/api/talents/settings", { displayName: `${t.school} Talent Wall`, tagline: "Celebrating our students' art, music, sport and science", studentReviewScope: "TeachersAndAdmins", allowStudentPublic: true, allowTeacherPublic: true, autoHideReportThreshold: 3 });
    return "saved";
  });

  await S("Online Classes", "meeting settings", async () => {
    await s.put("meetings", "/api/meeting-settings", { defaultProvider: "ExternalLink", defaultReminderOffsetsMinutes: [60, 15], lateAfterMinutes: 10, presentMinPercent: 60, parentsCanViewRecordings: true, studentsCanChat: true, recordingRetentionDays: 180, timeZoneId: "Asia/Kolkata" });
    return "saved";
  });
}

/** Per branch: everything else that an admin can create without a student/parent/teacher login. */
export async function seedBranchExtras(ctx) {
  const { s, t, b, bi, r, S, bulk, today } = ctx;
  const phone = () => `9${r.int(100000000, 999999999)}`;

  const staff = (await s.get("academic", "/api/staff")) ?? [];
  const students = (await s.get("academic", "/api/students")) ?? [];
  const teachers = staff.filter((x) => x.designation === "Teacher");
  if (!staff.length || !students.length) return;
  const sections = (await s.get("academic", "/api/sections")) ?? [];
  const classOf = (st) => sections.find((sec) => sec.id === st.sectionId)?.classId;

  await S("Staff Management", "staff work experience", async () => {
    // The staff API doesn't return saved experience yet (MappingProfile has no ExperienceEntries → Experience map),
    // so "already has experience" can't be read. Performance reviews are added in the same run and are returned,
    // so they mark teachers already done. Once experience is returned, duplicates from earlier runs are removed.
    let removed = 0;
    for (const m of teachers.filter((x) => (x.experience?.length ?? 0) > 1)) {
      const seen = new Set();
      for (const e of m.experience) {
        const key = `${e.organization}|${e.role}|${e.fromYear}|${e.toYear}`;
        if (seen.has(key)) await s.call("academic", "DELETE", `/api/staff/${m.id}/experience/${e.id}`).then(() => removed++, () => {});
        seen.add(key);
      }
    }
    const todo = teachers.filter((x) => !x.experience?.length && !x.performanceReviews?.length);
    const res = await bulk(todo, (m) =>
      s.post("academic", `/api/staff/${m.id}/experience`, { organization: r.pick(["Kendriya Vidyalaya", "Delhi Public School", "St. Joseph's High School", "National Public School", "Bharatiya Vidya Bhavan"]), role: r.pick(["Teacher", "Assistant Teacher", "Subject Teacher"]), fromYear: r.int(2008, 2016), toYear: r.int(2017, 2022), description: null }),
    );
    return `${res.ok} added${removed ? `, ${removed} duplicates removed` : ""}`;
  });

  await S("Staff Management", "performance reviews", async () => {
    const reviewer = staff.find((x) => x.designation === "Principal" || x.designation === "VicePrincipal");
    const todo = teachers.filter((x) => !x.performanceReviews?.length);
    const res = await bulk(todo, (m) =>
      s.post("academic", `/api/staff/${m.id}/performance-reviews`, { reviewerName: reviewer ? `${reviewer.firstName} ${reviewer.lastName}` : "Principal", rating: r.pick([3, 4, 4, 4, 5, 5]), comments: r.pick(["Engaging lessons and well-prepared material.", "Strong classroom management; could share more feedback with parents.", "Consistently good results in the mid-terms.", "Takes initiative in co-curricular activities."]) }),
    );
    return `${res.ok} reviews`;
  });

  await S("Payroll", "salary payment history", async () => {
    const months = [1, 2].map((k) => {
      const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - k, 1));
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    });
    const todo = staff.filter((x) => x.salary && !x.salaryHistory?.length);
    let n = 0;
    await bulk(todo, async (m) => {
      for (const month of months) {
        await s.post("academic", `/api/staff/${m.id}/salary/payments`, { month });
        n++;
      }
    });
    return `${n} payments for ${todo.length} staff`;
  });

  await S("Staff Management", "promotions", async () => {
    if (staff.some((x) => x.promotions?.length)) return "already there";
    // Main campus gets a vice principal promoted from the teachers; other campuses promote a receptionist to HR.
    const [who, to] = bi === 0 && !staff.some((x) => x.designation === "VicePrincipal") ? [teachers[0], "VicePrincipal"] : [staff.find((x) => x.designation === "Receptionist"), "HR"];
    if (!who) return "nobody to promote";
    await s.post("academic", `/api/staff/${who.id}/promote`, { toDesignation: to, effectiveDate: iso(addDays(today, -r.int(10, 60))), remarks: "Promoted after annual review." });
    return `${who.firstName} ${who.lastName} → ${to}`;
  });

  await S("Staff Management", "staff documents", async () => {
    // Up to 8 staff per branch have documents; later runs don't add more.
    const todo = staff.filter((x) => !x.documents?.length).slice(0, Math.max(0, 8 - staff.filter((x) => x.documents?.length).length));
    const res = await bulk(todo, (m, i) =>
      s.post("academic", `/api/staff/${m.id}/documents`, { name: i % 2 ? "Resume.pdf" : "ID proof.pdf", category: i % 2 ? "Resume" : "IdProof", fileDataUrl: pdfDataUrl(`${m.firstName} ${m.lastName} - ${i % 2 ? "Resume" : "ID proof"}`) }),
    );
    return `${res.ok} uploaded`;
  });

  await S("Students", "student documents", async () => {
    // Up to 12 students per branch have documents; later runs don't add more.
    const todo = students.filter((x) => !x.documents?.length).slice(0, Math.max(0, 12 - students.filter((x) => x.documents?.length).length));
    const res = await bulk(todo, (st, i) =>
      s.post("academic", `/api/students/${st.id}/documents`, { name: i % 3 ? "Birth certificate.pdf" : "Transfer certificate.pdf", category: i % 3 ? "BirthCertificate" : "TransferCertificate", fileDataUrl: pdfDataUrl(`${st.firstName} ${st.lastName} - ${i % 3 ? "Birth certificate" : "Transfer certificate"}`) }),
    );
    return `${res.ok} uploaded`;
  });

  await S("Timetable", "timetable substitutions", async () => {
    const existing = (await s.get("academic", "/api/timetable/substitutions")) ?? [];
    if (existing.length) return "already there";
    const slots = ((await s.get("academic", "/api/timetable/slots")) ?? []).filter((x) => x.staffId);
    let n = 0;
    for (let k = 1; k <= 6 && slots.length; k++) {
      const date = addDays(today, k);
      if (date.getUTCDay() === 0) continue;
      const day = date.getUTCDay(); // slot.dayOfWeek uses the same 0=Sunday numbering
      const slot = r.pick(slots.filter((x) => x.dayOfWeek === day).length ? slots.filter((x) => x.dayOfWeek === day) : slots);
      const sub = r.pick(teachers.filter((x) => x.id !== slot.staffId));
      if (!sub) continue;
      await s.post("academic", "/api/timetable/substitutions", { date: iso(date), sectionId: slot.sectionId, periodNumber: slot.periodNumber, substituteStaffId: sub.id, reason: r.pick(["Teacher on leave", "Training workshop", "Exam duty"]) }).then(() => n++, () => {});
    }
    return `${n} substitutions`;
  });

  await S("Homework", "learning discussions, quiz attempts & resource views", async () => {
    const resources = (await s.get("academic", "/api/learning/resources")) ?? [];
    const quizzes = (await s.get("academic", "/api/learning/quizzes")) ?? [];
    const attempts = (await s.get("academic", "/api/learning/quizzes/attempts").catch(() => [])) ?? [];
    let comments = 0, tries = 0, views = 0;
    for (const res of resources.slice(0, 6)) {
      const existing = (await s.get("academic", `/api/learning/resources/${res.id}/comments`)) ?? [];
      if (existing.length) continue;
      const st = r.pick(students);
      await s.post("academic", `/api/learning/resources/${res.id}/comments`, { authorName: `${st.firstName} ${st.lastName}`, authorRole: "Student", text: r.pick(["Can you explain the second example again?", "This video helped a lot, thank you!", "Is this part of the mid-term syllabus?"]) });
      const tch = r.pick(teachers);
      await s.post("academic", `/api/learning/resources/${res.id}/comments`, { authorName: `${tch.firstName} ${tch.lastName}`, authorRole: "Teacher", text: "Good question - we will go over it in class tomorrow." });
      comments += 2;
    }
    if (!attempts.length) {
      for (const q of quizzes) {
        const cls = students.filter((x) => q.classId && classOf(x) === q.classId);
        for (const st of r.shuffle(cls).slice(0, 6)) {
          const answers = (q.questions ?? []).map((qq) => (r.chance(0.7) ? qq.correctIndex ?? 0 : r.int(0, Math.max(0, (qq.options?.length ?? 4) - 1))));
          await s.post("academic", `/api/learning/quizzes/${q.id}/attempts`, { studentId: st.id, answers }).then(() => tries++, () => {});
        }
      }
    }
    for (const st of r.shuffle(students).slice(0, 25)) {
      const res = r.pick(resources);
      if (res) await s.post("academic", "/api/learning/views", { studentId: st.id, resourceId: res.id }).then(() => views++, () => {});
    }
    return `${comments} comments, ${tries} quiz attempts, ${views} views`;
  });

  await S("Library Management", "book reservations", async () => {
    if ((((await s.get("campus", "/api/bookreservations")) ?? []).length)) return "already there";
    // A title can only be reserved once every copy is on loan, so lend out the scarcest title fully first.
    const books = ((await s.get("campus", "/api/books")) ?? []).sort((x, y) => x.availableCopies - y.availableCopies);
    const members = (await s.get("campus", "/api/librarymembers")) ?? [];
    const loans = (await s.get("campus", "/api/bookloans")) ?? [];
    const book = books[0];
    if (!book || members.length < 3) return "no library";
    const borrowing = new Set(loans.filter((l) => !l.returnedAt && l.status !== "Returned").map((l) => l.memberId));
    const free = members.filter((m) => !borrowing.has(m.id));
    let issued = 0;
    for (const m of free.slice(0, book.availableCopies)) {
      await s.post("campus", "/api/bookloans/issue", { bookId: book.id, memberId: m.id, dueDate: iso(addDays(today, r.int(5, 14))) }).then(() => issued++);
    }
    let reserved = 0;
    for (const m of free.slice(book.availableCopies, book.availableCopies + 3)) {
      await s.post("campus", "/api/bookreservations", { bookId: book.id, memberId: m.id }).then(() => reserved++);
    }
    return `"${book.title}": ${issued} more loans, ${reserved} reservations`;
  });

  await S("Hostel Management", "mess menu & hostel visitors", async () => {
    const hostels = (await s.get("campus", "/api/hostels")) ?? [];
    const hostel = hostels.find((h) => !h.branchId || h.branchId === b.id) ?? hostels[0];
    if (!hostel) return "no hostel";
    const menu = (await s.get("campus", `/api/messmenu?hostelId=${hostel.id}`)) ?? [];
    const dishes = {
      Breakfast: ["Idli, sambar, chutney", "Poha, banana", "Dosa, chutney", "Upma, kesari", "Aloo paratha, curd", "Puri, potato masala", "Bread, omelette, fruit"],
      Lunch: ["Rice, dal, beans poriyal, curd", "Chapati, paneer butter masala, rice", "Lemon rice, rasam, papad", "Rice, sambar, cabbage thoran", "Veg pulao, raita", "Rice, rajma, salad", "Bisi bele bath, curd rice"],
      Snacks: ["Tea, biscuits", "Milk, banana", "Sundal", "Tea, vada", "Fruit salad", "Milk, cake", "Tea, bajji"],
      Dinner: ["Chapati, mixed veg curry", "Rice, dal tadka, aloo fry", "Chapati, chana masala", "Fried rice, gobi manchurian", "Rice, sambar, beetroot poriyal", "Chapati, egg curry / paneer", "Rice, rasam, payasam"],
    };
    let n = 0;
    for (const [i, entry] of menu.filter((m) => !m.items).entries()) {
      const list = dishes[entry.meal] ?? dishes.Lunch;
      await s.call("campus", "PUT", `/api/messmenu/${entry.id}`, { items: list[i % list.length] });
      n++;
    }
    const logs = (await s.get("campus", "/api/visitorlogs")) ?? [];
    let v = 0;
    if (!logs.length) {
      const boarders = ((await s.get("campus", "/api/hostelallocations")) ?? []).slice(0, 5);
      for (const [i, al] of boarders.entries()) {
        const log = await s.post("campus", "/api/visitorlogs", { hostelId: al.hostelId ?? hostel.id, studentId: al.studentId, visitorName: `${r.pick(i % 2 ? ADULT_FEMALE : ADULT_MALE)} ${r.pick(SURNAMES)}`, relation: i % 2 ? "Mother" : "Father", phone: phone(), purpose: r.pick(["Weekend visit", "Dropping supplies", "Parent meeting"]) });
        if (i < 3) await s.post("campus", `/api/visitorlogs/${log.id}/check-out`);
        v++;
      }
    }
    return `${n} menu slots filled, ${v} visitors`;
  });

  await S("Visitor Management", "gate watchlist", async () => {
    const existing = (await s.get("campus", "/api/watchlist")) ?? [];
    if (existing.length) return "already there";
    const defs = [
      [`${r.pick(ADULT_MALE)} ${r.pick(SURNAMES)}`, "Court order - not allowed to pick up the student"],
      [`${r.pick(ADULT_MALE)} ${r.pick(SURNAMES)}`, "Repeated unauthorised entry attempts"],
    ];
    for (const [name, reason] of defs) await s.post("campus", "/api/watchlist", { name, phone: phone(), reason });
    return `${defs.length} entries`;
  });

  await S("Communication Center", "in-app broadcasts", async () => {
    // Broadcasts are school-wide records; this branch's are the ones aimed at its students or staff.
    const mine = new Set([...students.map((x) => x.id), ...staff.map((x) => x.id)]);
    const existing = (await s.get("engagement", "/api/broadcastmessages")) ?? [];
    if (existing.some((m) => [...(m.studentIds ?? []), ...(m.staffIds ?? [])].some((id) => mine.has(id)))) return "already there";
    const groups = (await s.get("engagement", "/api/contactgroups")) ?? [];
    // InApp only: no email, SMS or WhatsApp leaves the system.
    await s.post("engagement", "/api/broadcastmessages", { subject: "Parent-teacher meeting this Saturday", body: "Dear parents, the parent-teacher meeting for Term 1 is on Saturday from 9:30 am. Please check the meeting link in the app.", channels: ["InApp"], groupIds: [], studentIds: r.shuffle(students).slice(0, 30).map((x) => x.id), staffIds: [], scheduledAt: null });
    if (groups[0]) await s.post("engagement", "/api/broadcastmessages", { subject: "Revision timetable", body: "The revision timetable for the final examinations is now available.", channels: ["InApp"], groupIds: [groups[0].id], studentIds: [], staffIds: [], scheduledAt: null });
    await s.post("engagement", "/api/broadcastmessages", { subject: "Diwali holidays", body: "School remains closed for the Diwali break. Classes resume on the following Monday.", channels: ["InApp"], groupIds: [], studentIds: [], staffIds: teachers.map((x) => x.id), scheduledAt: addDays(today, 7).toISOString() });
    return "2 sent, 1 scheduled";
  });

  await S("Online Classes", "recurring class, meeting notes & materials", async () => {
    const meetings = (await s.get("meetings", "/api/meetings")) ?? [];
    const list = Array.isArray(meetings) ? meetings : meetings.items ?? [];
    const subjects = (await s.get("academic", "/api/subjects")) ?? [];
    const sec = sections[0];
    const title = `Maths doubt-clearing class - ${b.name}`;
    let series = "already there";
    if (!list.some((m) => m.title === title)) {
      const maths = subjects.find((x) => x.name === "Mathematics") ?? subjects[0];
      const start = addDays(today, 1);
      // Recurring classes must use the built-in video room (a pasted link can't repeat); nothing starts until a
      // teacher opens it.
      series = await s.post("meetings", "/api/meetings", {
        title,
        description: "Weekly online class for questions from the week's lessons.",
        meetingType: "OnlineClass",
        subjectId: maths?.id ?? null,
        sectionId: sec?.id ?? null,
        hostUserId: null,
        startUtc: new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate(), 11, 30)).toISOString(),
        durationMinutes: 40,
        audience: sec ? [{ type: "Section", targetId: sec.id }] : [{ type: "AllStaff", targetId: null }],
        recurrence: { frequency: "Weekly", interval: 1, daysOfWeek: ["Wednesday", "Saturday"], startDate: iso(start), endDate: iso(addDays(today, 70)), count: null, localStartTime: "17:00:00", timeZoneId: "Asia/Kolkata" },
        reminderOffsetsMinutes: [15],
        provider: "LiveKit",
        externalJoinUrl: null,
        recordingEnabled: false,
      }).then(() => "weekly series created", (err) => `series failed: ${err.message.slice(0, 120)}`);
    }
    // Chat is only open while a meeting is running (409 otherwise), so meeting chat - like attendance and
    // recordings - only exists once real meetings happen.
    const done = { notes: 0, materials: 0 };
    const errors = [];
    const tryIt = (kind, p) => p.then(() => done[kind]++, (err) => errors.push(`${kind}: ${err.message.slice(0, 160)}`));
    for (const m of list.filter((x) => x.title !== title).slice(0, 2)) {
      const notes = await s.get("meetings", `/api/meetings/${m.id}/notes`).catch(() => null);
      if (!notes?.summary) await tryIt("notes", s.call("meetings", "PUT", `/api/meetings/${m.id}/notes`, { summary: "Agenda shared in advance.", topicsDiscussed: "Mid-term results, attendance, upcoming events.", actionItems: "Class teachers to share individual reports.", homework: null, additionalNotes: null, isVisibleToStudents: true }));
      const materials = (await s.get("meetings", `/api/meetings/${m.id}/materials`).catch(() => [])) ?? [];
      if (!materials.length) await tryIt("materials", s.post("meetings", `/api/meetings/${m.id}/materials/link`, { kind: "Link", title: "Mid-term result summary", url: "https://example.com/results-summary", dueDate: null }));
    }
    if (errors.length) console.log(`    ! ${errors[0]}`);
    return `${series}; ${done.notes} notes, ${done.materials} materials`;
  });
}
