// Phase 3b: what people do once they can sign in, done as the accounts from seed-users.json - notifications read,
// survey answers, parent-teacher messages, an online exam taken by students and marked by a teacher, talent
// showcase posts with reviews/reactions/views/reports, and school study materials uploaded by teachers.
// Each step skips what is already there.
import { deflateSync } from "node:zlib";
import { Session, addDays, iso } from "../lib.mjs";

/** A small solid-colour PNG, so talent media goes through the real upload/blob path. */
function png(width, height, [r, g, b]) {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf) => {
    let c = 0xffffffff;
    for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const sum = Buffer.alloc(4);
    sum.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, sum]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  const row = Buffer.concat([Buffer.from([0]), Buffer.from(Array.from({ length: width }, () => [r, g, b]).flat())]);
  const raw = Buffer.concat(Array.from({ length: height }, () => row));
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

/** Signs a seeded account in, scoped to its school and branch. Sessions are reused across steps. */
function sessions(target, password) {
  const cache = new Map();
  return async (u) => {
    if (!cache.has(u.email)) {
      const us = new Session(target, u.email, password);
      await us.login();
      us.tenant = u.tenantId;
      us.branch = u.branchId;
      cache.set(u.email, us);
    }
    return cache.get(u.email);
  };
}

/**
 * Per branch. `admin` is the SuperAdmin session (tenant + branch set), `ctx` from loadBranchContext, `accounts`
 * the seeded users of this branch.
 */
export async function seedActivity({ admin, target, data, accounts, ctx, t, b, r, S, bulk, today }) {
  const as = sessions(target, data.password);
  const byRole = (role) => accounts.filter((u) => u.role === role);
  const parents = byRole("parent");
  const students = byRole("student");
  const teachers = byRole("teacher");
  const studentById = new Map(ctx.students.map((st) => [st.id, st]));
  const childOf = (parentUser) => ctx.students.find((st) => st.guardians?.some((g) => g.id === parentUser.personId));

  await S("Notifications", "notifications read", async () => {
    let read = 0;
    await bulk([...parents, ...students, ...teachers], async (u) => {
      const us = await as(u);
      const mine = (await us.get("engagement", "/api/notifications/mine")) ?? [];
      const list = Array.isArray(mine) ? mine : mine.items ?? [];
      // About 60% read, fixed per user + notification (not re-rolled each run), so re-runs add nothing.
      const reads = (n) => [...`${u.email}/${n.id}`].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7) % 10 < 6;
      for (const n of list.filter((x) => !x.read && reads(x))) {
        await us.post("engagement", `/api/notifications/${n.id}/read`).then(() => read++, () => {});
      }
    }, 3);
    return `${read} marked read`;
  });

  await S("Surveys & Feedback", "survey responses", async () => {
    // Surveys are school-wide (no branch), so this branch's parents answer every open parent survey of the school -
    // each parent once per survey (tracked by their child), about 80% of them.
    const surveys = (await admin.get("engagement", "/api/surveys")) ?? [];
    const open = surveys.filter((x) => x.status === "Published" && x.audience === "Parents");
    if (!open.length) return "no published parent survey";
    const answer = (q) => {
      if (q.type === "Rating") return String(r.pick([3, 4, 4, 5, 5]));
      if (q.type === "YesNo") return r.chance(0.8) ? "yes" : "no";
      if (q.type === "MultipleChoice") return r.pick(q.options ?? ["Other"]);
      return r.pick(["Keep up the good work.", "More sports periods please.", "Communication about homework could be better.", "Very happy with the teachers."]);
    };
    let total = 0;
    for (const survey of open) {
      const existing = (await admin.get("engagement", `/api/surveys/${survey.id}/responses`).catch(() => [])) ?? [];
      const answered = new Set(existing.map((x) => x.respondentStudentId).filter(Boolean));
      const detail = await admin.get("engagement", `/api/surveys/${survey.id}`);
      // Whether a parent answers is fixed per parent + survey (not re-rolled each run), so re-runs add nothing.
      const willAnswer = (u) => [...`${u.email}/${survey.id}`].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7) % 10 < 8;
      const todo = parents.filter((u) => {
        const child = childOf(u);
        return child && !answered.has(child.id) && willAnswer(u);
      });
      const res = await bulk(todo, async (u) => {
        const us = await as(u);
        return us.post("engagement", "/api/surveyresponses", {
          surveyId: survey.id,
          respondentType: "Parent",
          respondentStudentId: childOf(u).id,
          respondentStaffId: null,
          respondentName: u.name,
          answers: (detail.questions ?? []).filter((q) => q.required || r.chance(0.7)).map((q) => ({ questionId: q.id, value: answer(q) })),
        });
      }, 3).catch(() => ({ ok: 0 }));
      total += res.ok;
    }
    return `${total} responses to ${open.length} school survey(s)`;
  });

  await S("Parent Portal", "parent-teacher messages", async () => {
    let threads = 0, replies = 0;
    for (const u of parents.slice(0, 6)) {
      const us = await as(u);
      const child = childOf(u);
      if (!child) continue;
      const mine = (await us.get("engagement", `/api/parentmessagethreads?studentId=${child.id}`)) ?? [];
      if ((Array.isArray(mine) ? mine : mine.items ?? []).length) continue;
      const section = ctx.sections.find((x) => x.id === child?.sectionId);
      const teacherAccount = teachers.find((x) => x.personId === section?.classTeacherStaffId) ?? teachers[0];
      if (!child || !teacherAccount) continue;
      const thread = await us.post("engagement", "/api/parentmessagethreads", {
        studentId: child.id,
        teacherName: teacherAccount.name,
        subject: r.pick(["Homework load this week", "Absence on Friday", "Mid-term marks", "Extra help in maths"]),
        teacherUserId: teacherAccount.userId,
        firstMessage: r.pick([`Hello, could you tell me how ${child.firstName} is doing in class?`, `${child.firstName} was unwell and missed Friday. What did they miss?`, `Is there any way ${child.firstName} can get extra practice in maths?`]),
      });
      threads++;
      const ts = await as(teacherAccount);
      await ts.post("engagement", `/api/parentmessagethreads/${thread.id}/messages`, { sender: "Teacher", body: `Thank you for writing. ${child.firstName} is doing well; I will share the worksheet from Friday tomorrow.` }).then(() => replies++, () => {});
      await us.post("engagement", `/api/parentmessagethreads/${thread.id}/messages`, { sender: "Parent", body: "Thank you!" }).catch(() => {});
    }
    return `${threads} threads, ${replies} teacher replies`;
  });

  await S("Online Exams", "online exam taken by students", async () => {
    // The class with the most student accounts sits a short practice test that is open right now.
    const counts = new Map();
    for (const u of students) {
      const cls = studentById.get(u.personId)?.classId;
      if (cls) counts.set(cls, (counts.get(cls) ?? 0) + 1);
    }
    const [classId] = [...counts.entries()].sort((a, b2) => b2[1] - a[1])[0] ?? [];
    if (!classId) return "no student accounts";
    const cls = ctx.classes.find((c) => c.id === classId);
    const name = `Practice test - Grade ${cls.grade}`;
    const existing = (await admin.get("academic", "/api/online-exams")) ?? [];
    let exam = (Array.isArray(existing) ? existing : existing.items ?? []).find((x) => x.name === name);
    let submitted = 0;
    const takers = students.filter((u) => studentById.get(u.personId)?.classId === classId);
    if (!exam) {
    const maths = ctx.subjects.find((x) => x.name === "Mathematics") ?? ctx.subjects[0];
    const q = (type, text, marks, options, extra = {}) => ({ sourceQuestionId: null, content: { type, text, marks, explanation: null, modelAnswer: extra.model ?? null, acceptedAnswers: extra.accepted ?? null, caseSensitive: false, options: options ? options.map(([o, ok]) => ({ text: o, isCorrect: ok })) : null } });
    const start = new Date(Date.now() - 5 * 60_000);
    exam = await admin.post("academic", "/api/online-exams", {
      name,
      description: "A short practice test before the unit test.",
      academicYearId: ctx.year.id,
      examType: "UnitTest",
      subjectId: maths.id,
      classId,
      sectionId: null,
      teacherStaffId: teachers[0]?.personId ?? null,
      startUtc: start.toISOString(),
      endUtc: new Date(start.getTime() + 6 * 3600_000).toISOString(),
      durationMinutes: 20,
      timeZoneId: "Asia/Kolkata",
      settings: { passingMarks: 3, maxAttempts: 1, shuffleQuestions: false, shuffleOptions: false, showQuestionNumbers: true, allowBackNavigation: true, autoSubmitOnTimeout: true, showResultImmediately: false, allowReviewBeforeSubmit: true, showAnswersInResult: true, negativeMarkPerWrong: 0 },
      questions: [
        q("SingleChoice", "What is 12 × 12?", 1, [["124", false], ["144", true], ["132", false], ["154", false]]),
        q("SingleChoice", "Which of these is an even number?", 1, [["17", false], ["23", false], ["38", true], ["41", false]]),
        q("TrueFalse", "A square has four equal sides.", 1, [["True", true], ["False", false]]),
        q("ShortAnswer", "Explain in one line how you would find the area of a rectangle.", 2, null, { model: "Multiply its length by its breadth." }),
      ],
      assignments: [{ kind: "Class", targetId: classId }],
    });
    await admin.post("academic", `/api/online-exams/${exam.id}/schedule`, { startNow: true });
    for (const u of takers) {
      const us = await as(u);
      const session = await us.post("academic", `/api/online-exams/${exam.id}/start`).catch(() => null);
      if (!session) continue;
      const answers = session.questions.map((qq) => {
        if (qq.type === "ShortAnswer") return { questionId: qq.id, selectedOptionIds: null, textAnswer: r.pick(["Length times breadth.", "Multiply length and width.", "Add all the sides."]), markedForReview: false };
        const correctish = r.chance(0.75) ? qq.options.find((o) => ["144", "38", "True"].includes(o.text)) : r.pick(qq.options);
        return { questionId: qq.id, selectedOptionIds: [(correctish ?? qq.options[0]).id], textAnswer: null, markedForReview: false };
      });
      await us.post("academic", `/api/online-exams/${exam.id}/submit`, { answers }).then(() => submitted++, () => {});
    }
    }
    // A teacher marks the short answers (following the queue's pending-attempt chain), then results are published.
    const queue = (await admin.get("academic", "/api/online-exams/evaluations").catch(() => [])) ?? [];
    let attemptId = (Array.isArray(queue) ? queue : queue.items ?? []).find((x) => x.examId === exam.id)?.firstPendingAttemptId;
    let marked = 0;
    for (let guard = 0; attemptId && guard < 200; guard++) {
      const review = await admin.get("academic", `/api/online-exams/${exam.id}/attempts/${attemptId}`);
      const evaluations = (review.questions ?? [])
        .filter((qq) => qq.type === "ShortAnswer")
        .map((qq) => ({ questionId: qq.questionId, awardedMarks: /breadth|width/i.test(qq.textAnswer ?? "") ? 2 : 0, comment: /breadth|width/i.test(qq.textAnswer ?? "") ? null : "Area = length × breadth." }));
      const saved = await admin.call("academic", "PUT", `/api/online-exams/${exam.id}/attempts/${attemptId}/evaluations`, evaluations);
      marked++;
      attemptId = saved?.nextPendingAttemptId ?? review.nextPendingAttemptId;
      if (attemptId === review.attemptId) break;
    }
    await admin.post("academic", `/api/online-exams/${exam.id}/publish-results`).catch(() => {});
    return `${submitted ? `${submitted}/${takers.length} students submitted, ` : ""}${marked} attempts marked, results published`;
  });

  await S("Talent Showcase", "talent showcase posts", async () => {
    let posted = 0, reactions = 0, views = 0;
    const colours = [[230, 120, 60], [70, 140, 210], [90, 170, 100], [200, 80, 150]];
    const reviewer = teachers[0] ? await as(teachers[0]) : admin;
    for (const [i, u] of students.slice(0, 4).entries()) {
      const us = await as(u);
      const mine = (await us.get("engagement", "/api/talents/mine")) ?? [];
      if ((Array.isArray(mine) ? mine : mine.items ?? []).length) continue;
      const child = studentById.get(u.personId);
      const [category, title] = r.pick([["Art", "Watercolour sunset"], ["Photography", "Monsoon in the school garden"], ["Sports", "Inter-school relay win"], ["Music", "Carnatic violin recital"], ["Writing", "Poem: My grandmother's kitchen"]]);
      const talent = await us.post("engagement", "/api/talents", { title, description: "Made for the school talent wall.", category, tags: [category.toLowerCase(), "term1"], visibility: "SchoolOnly", creatorName: u.name, creatorAvatarUrl: null, creatorSubtitle: child ? `Grade ${child.grade}` : null, sectionId: child?.sectionId ?? null, schoolName: t.school });
      const form = new FormData();
      form.append("files", new Blob([png(320, 240, colours[i % colours.length])], { type: "image/png" }), `${category.toLowerCase()}.png`);
      await us.form("engagement", `/api/talents/${talent.id}/media`, form).catch(() => {});
      await us.post("engagement", `/api/talents/${talent.id}/submit`, { actorName: u.name }).catch(() => {});
      await reviewer.post("engagement", `/api/talents/${talent.id}/review`, { decision: i === 3 ? "RequestChanges" : "Approve", comment: i === 3 ? "Please add a short description of how you made this." : "Lovely work!", visibility: "SchoolOnly", actorName: teachers[0]?.name ?? "Admin" }).catch(() => {});
      posted++;
      for (const p of parents.slice(0, 8)) {
        const ps = await as(p);
        await ps.post("engagement", `/api/talents/${talent.id}/views`).then(() => views++, () => {});
        if (r.chance(0.6)) await ps.call("engagement", "PUT", `/api/talents/${talent.id}/reaction`, { type: r.pick(["Like", "Love", "Appreciate", "Amazing", "Congrats"]) }).then(() => reactions++, () => {});
      }
      if (i === 0 && parents[0]) await (await as(parents[0])).post("engagement", `/api/talents/${talent.id}/reports`, { reason: "Other", details: "Photo shows another student's face - please check consent." }).catch(() => {});
    }
    return `${posted} posts, ${views} views, ${reactions} reactions`;
  });

  await S("Study Materials", "teacher study materials", async () => {
    let n = 0;
    for (const [i, u] of teachers.slice(0, 3).entries()) {
      const us = await as(u);
      const counts = await us.get("academic", "/api/study-materials/mine/counts").catch(() => null);
      if (counts && Object.values(counts).some((v) => typeof v === "number" && v > 0)) continue;
      const cls = ctx.classes[i % ctx.classes.length];
      const subject = ctx.subjects[i % ctx.subjects.length];
      const form = new FormData();
      const fields = { title: `${subject.name} notes - Grade ${cls.grade}`, description: "Chapter summary and practice questions.", category: r.pick(["Notes", "Worksheet", "QuestionPaper"]), academicYearId: ctx.year.id, classId: cls.id, subjectId: subject.id, audience: "Class", linkUrl: "https://ncert.nic.in/textbook.php", publish: "true", availableFrom: iso(today), availableUntil: iso(addDays(today, 90)) };
      for (const [k, v] of Object.entries(fields)) form.append(k, v);
      await us.form("academic", "/api/study-materials", form).then(() => n++);
    }
    return `${n} materials`;
  });
}
