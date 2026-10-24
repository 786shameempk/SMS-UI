import { listCalendarEvents, listClasses, listSubjects } from "@/features/academics/api";
import { listExams, listExamSchedules } from "@/features/examinations/api";
import { listHomework } from "@/features/homework/api";
import { listLeaveRequests, listStaff } from "@/features/staff/api";
import { listStudents } from "@/features/students/api";
import { listCalendarEvents as listMeetingEvents } from "@/features/meetings/api";
import i18n from "@/i18n";
import type { AggregatedCalendarEvent } from "./types";

/** Event titles built here are shown as-is on the calendar, so the wording around the record's own data is translated. */
const tc = (key: string, values?: Record<string, unknown>) => i18n.t(key, { ns: "calendar", ...values });

/**
 * Read-only aggregator — pulls from every module that already owns date-bearing records and
 * maps them into one flat shape for the unified calendar. Nothing is persisted here.
 *
 * Deliberately NOT included: student/parent leave requests. Those live in parent-portal's
 * `leaveByStudent` store, which is lazily seeded per student only the first time that
 * student's parent-portal page is opened — there is no "list every student's leave requests"
 * API, and building one would mean generating random demo data for every student in the
 * directory just to render a calendar. Staff leave requests (a real full list) are included.
 */
export async function listAggregatedCalendarEvents(): Promise<AggregatedCalendarEvent[]> {
  const [academicEvents, exams, examSchedules, subjects, classes, homework, leaveRequests, staff, students] = await Promise.all([
    listCalendarEvents(),
    listExams(),
    listExamSchedules(),
    listSubjects(),
    listClasses(),
    listHomework(),
    listLeaveRequests(),
    listStaff(),
    listStudents(),
  ]);

  const subjectById = new Map(subjects.map((s) => [s.id, s] as const));
  const classById = new Map(classes.map((c) => [c.id, c] as const));
  const examById = new Map(exams.map((e) => [e.id, e] as const));
  const staffById = new Map(staff.map((s) => [s.id, s] as const));

  const events: AggregatedCalendarEvent[] = [];

  for (const ev of academicEvents) {
    events.push({
      id: `academic-${ev.id}`,
      date: ev.startDate,
      endDate: ev.endDate,
      title: ev.title,
      category: ev.type === "holiday" ? "holiday" : ev.type === "exam" ? "exam" : ev.type === "other" ? "event" : "academic",
      description: ev.description,
    });
  }

  for (const schedule of examSchedules) {
    const exam = examById.get(schedule.examId);
    const subject = subjectById.get(schedule.subjectId);
    const schoolClass = exam ? classById.get(exam.classId) : undefined;
    events.push({
      id: `examschedule-${schedule.id}`,
      date: schedule.date,
      title: schoolClass
        ? tc("{{exam}} — {{subject}} ({{class}})", { exam: exam?.name ?? tc("Exam"), subject: subject?.name ?? tc("Subject"), class: schoolClass.name })
        : tc("{{exam}} — {{subject}}", { exam: exam?.name ?? tc("Exam"), subject: subject?.name ?? tc("Subject") }),
      category: "exam",
      description: schedule.room
        ? tc("Room {{room}}, {{start}}–{{end}}", { room: schedule.room, start: schedule.startTime, end: schedule.endTime })
        : `${schedule.startTime}–${schedule.endTime}`,
    });
  }

  for (const hw of homework) {
    const subject = subjectById.get(hw.subjectId);
    const schoolClass = classById.get(hw.classId);
    events.push({
      id: `homework-${hw.id}`,
      date: hw.dueDate,
      title: subject ? tc("{{title}} due ({{subject}})", { title: hw.title, subject: subject.name }) : tc("{{title}} due", { title: hw.title }),
      category: "homework",
      description: schoolClass ? `${schoolClass.name} · ${hw.description}` : hw.description,
    });
  }

  for (const leave of leaveRequests) {
    if (leave.status === "rejected") continue;
    const member = staffById.get(leave.staffId);
    events.push({
      id: `leave-${leave.id}`,
      date: leave.fromDate,
      endDate: leave.toDate,
      title: tc("{{name}} on leave ({{type}})", { name: member ? `${member.firstName} ${member.lastName}` : tc("Staff"), type: leave.leaveType }),
      category: "leave",
      description: leave.status === "pending" ? tc("Pending approval — {{reason}}", { reason: leave.reason }) : leave.reason,
    });
  }

  const currentYear = new Date().getFullYear();
  const addBirthday = (id: string, name: string, dateOfBirth: string) => {
    const dob = new Date(dateOfBirth);
    if (Number.isNaN(dob.getTime())) return;
    events.push({
      id,
      date: `${currentYear}-${String(dob.getMonth() + 1).padStart(2, "0")}-${String(dob.getDate()).padStart(2, "0")}`,
      title: tc("{{name}}'s birthday", { name }),
      category: "birthday",
    });
  };
  students.forEach((s) => addBirthday(`birthday-stu-${s.id}`, `${s.firstName} ${s.lastName}`, s.dateOfBirth));
  staff.forEach((s) => addBirthday(`birthday-stf-${s.id}`, `${s.firstName} ${s.lastName}`, s.dateOfBirth));

  // Online classes and meetings the viewer can see (MeetingService), a couple of months either side of today.
  // Optional: the calendar still renders everything else when MeetingService is unavailable.
  const from = new Date(Date.now() - 31 * 86_400_000).toISOString();
  const to = new Date(Date.now() + 62 * 86_400_000).toISOString();
  const meetings = await listMeetingEvents(from, to).catch(() => []);
  for (const m of meetings) {
    if (m.status === "Draft") continue;
    const time = new Date(m.startUtc).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    const title = `${time} ${m.title}${m.classLabel ? ` · ${m.classLabel}` : ""}`;
    events.push({
      id: `online-${m.id}`,
      date: m.startUtc,
      title: m.status === "Cancelled" ? tc("{{title}} (cancelled)", { title }) : title,
      category: "online",
      description: tc("Online · {{host}}", { host: m.hostName }),
    });
  }

  return events;
}
