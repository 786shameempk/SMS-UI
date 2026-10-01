// EngagementService and MeetingService, per branch: announcements, surveys, contact groups, message templates,
// student leave requests and meetings. In-app channel only - nothing here sends SMS, WhatsApp or email.
import { addDays, iso } from "../lib.mjs";
import { hasRows } from "./context.mjs";

export async function seedEngagement(ctx) {
  const { s, r, S, today } = ctx;

  await S("Notifications", "announcements", async () => {
    const posts = [
      ["Annual Sports Day on 9 October", "All students must report in house colours by 8:00 am. Parents are welcome from 9:30 am.", "Event", "everyone"],
      ["Mid-term results published", "Mid-term marks are now available in the parent portal. Parent-teacher meetings follow next week.", "Academic", "parent"],
      ["Term 1 fee reminder", "Term 1 fees were due on 15 July. Please clear pending dues to avoid late fines.", "Finance", "parent"],
      ["Staff meeting on Friday", "All teaching staff: meeting in the conference hall at 3:30 pm to plan the term 2 calendar.", "Announcement", "teacher"],
    ];
    for (const [title, body, category, audience] of posts) await s.post("engagement", "/api/notifications", { title, body, category, audience, actionUrl: null });
    return `${posts.length} posts`;
  });

  await seedSurveys(ctx);
  await seedCommunication(ctx);
}

/** Surveys on their own, so a school that moves to a plan with surveys can get them (--only=fill). */
export async function seedSurveys(ctx) {
  const { s, bi, S, today, TODAY } = ctx;
  await S("Surveys & Feedback", "surveys", async () => {
    if (await hasRows(s, "engagement", "/api/surveys")) return "already there";
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
}

async function seedCommunication(ctx) {
  const { s, bi, r, S, today } = ctx;
  await S("Communication Center", "contact groups & message templates", async () => {
    const seniors = ctx.classes[ctx.classes.length - 1];
    await s.post("engagement", "/api/contactgroups", { name: `Grade ${seniors.grade} students`, description: "Senior batch", audienceType: "Students", memberIds: ctx.studentsIn(seniors.id).map((x) => x.id) });
    await s.post("engagement", "/api/contactgroups", { name: "Class teachers", description: null, audienceType: "Staff", memberIds: ctx.teachers.slice(0, 10).map((x) => x.id) });
    await s.post("engagement", "/api/messagetemplates", { name: "Fee reminder", category: "Finance", subject: "Fee reminder", body: "Dear parent, the fee for {{term}} is due on {{dueDate}}. Please pay through the parent portal.", channels: ["InApp"] });
    await s.post("engagement", "/api/messagetemplates", { name: "Absence alert", category: "Attendance", subject: "Absent today", body: "Dear parent, {{studentName}} was marked absent today.", channels: ["InApp"] });
    return "2 groups, 2 templates";
  });

  await S("Parent Portal", "student leave requests", async () => {
    const kids = r.shuffle(ctx.students).slice(0, 4);
    for (const [i, st] of kids.entries()) {
      const from = addDays(today, r.int(1, 10));
      const lr = await s.post("engagement", "/api/studentleaverequests", { studentId: st.id, fromDate: iso(from), toDate: iso(addDays(from, r.int(0, 2))), reason: r.pick(["Family wedding", "Medical check-up", "Travelling to native place", "Fever"]) });
      if (i === 0) await s.post("engagement", `/api/studentleaverequests/${lr.id}/approve`);
      if (i === 1) await s.post("engagement", `/api/studentleaverequests/${lr.id}/reject`);
    }
    return `${kids.length} requests`;
  });

  await S("Online Classes", "meetings (parent-teacher & staff)", async () => {
    const sec = ctx.sections[0];
    const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 5, 9, 30));
    await s.post("meetings", "/api/meetings", { title: `Parent-teacher meeting - ${sec.label}`, description: "Discussion of mid-term results.", meetingType: "ParentTeacherMeeting", subjectId: null, sectionId: sec.id, hostUserId: null, startUtc: start.toISOString(), durationMinutes: 45, audience: [{ type: "SectionGuardians", targetId: sec.id }], recurrence: null, reminderOffsetsMinutes: [60], provider: "ExternalLink", externalJoinUrl: "https://meet.google.com/abc-defg-hij", recordingEnabled: false });
    await s.post("meetings", "/api/meetings", { title: "Term 2 planning - all staff", description: null, meetingType: "StaffMeeting", subjectId: null, sectionId: null, hostUserId: null, startUtc: new Date(start.getTime() + 86400_000).toISOString(), durationMinutes: 60, audience: [{ type: "AllStaff", targetId: null }], recurrence: null, reminderOffsetsMinutes: [30], provider: "ExternalLink", externalJoinUrl: "https://meet.google.com/xyz-abcd-efg", recordingEnabled: false });
    return "2 meetings";
  });
}
