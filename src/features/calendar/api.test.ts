import { listAggregatedCalendarEvents } from "./api";
import { listCalendarEvents as listMeetingEvents } from "@/features/meetings/api";

vi.mock("@/features/academics/api", () => ({
  listCalendarEvents: vi.fn(async () => [
    { id: "e1", startDate: "2026-10-02", endDate: "2026-10-03", title: "Gandhi Jayanti", type: "holiday", description: "Closed" },
    { id: "e2", startDate: "2026-10-10", title: "Midterms", type: "exam" },
    { id: "e3", startDate: "2026-10-12", title: "Sports day", type: "other" },
    { id: "e4", startDate: "2026-10-15", title: "PTM", type: "academic" },
  ]),
  listSubjects: vi.fn(async () => [{ id: "math", name: "Maths" }]),
  listClasses: vi.fn(async () => [{ id: "c5", name: "Class 5" }]),
}));
vi.mock("@/features/examinations/api", () => ({
  listExams: vi.fn(async () => [{ id: "x1", name: "Term 1", classId: "c5" }]),
  listExamSchedules: vi.fn(async () => [
    { id: "s1", examId: "x1", subjectId: "math", date: "2026-10-20", startTime: "09:00", endTime: "11:00", room: "12" },
    { id: "s2", examId: "gone", subjectId: "gone", date: "2026-10-21", startTime: "09:00", endTime: "10:00", room: null },
  ]),
}));
vi.mock("@/features/homework/api", () => ({
  listHomework: vi.fn(async () => [
    { id: "h1", title: "Worksheet", subjectId: "math", classId: "c5", dueDate: "2026-10-05", description: "Page 4" },
    { id: "h2", title: "Essay", subjectId: "gone", classId: "gone", dueDate: "2026-10-06", description: "300 words" },
  ]),
}));
vi.mock("@/features/staff/api", () => ({
  listStaff: vi.fn(async () => [{ id: "sf1", firstName: "Meera", lastName: "Rao", dateOfBirth: "1990-03-07" }]),
  listLeaveRequests: vi.fn(async () => [
    { id: "l1", staffId: "sf1", fromDate: "2026-10-07", toDate: "2026-10-08", leaveType: "casual", status: "approved", reason: "Wedding" },
    { id: "l2", staffId: "gone", fromDate: "2026-10-09", toDate: "2026-10-09", leaveType: "sick", status: "pending", reason: "Fever" },
    { id: "l3", staffId: "sf1", fromDate: "2026-10-11", toDate: "2026-10-11", leaveType: "casual", status: "rejected", reason: "No" },
  ]),
}));
vi.mock("@/features/students/api", () => ({
  listStudents: vi.fn(async () => [
    { id: "st1", firstName: "Asha", lastName: "N", dateOfBirth: "2015-12-25" },
    { id: "st2", firstName: "No", lastName: "Dob", dateOfBirth: "not a date" },
  ]),
}));
vi.mock("@/features/meetings/api", () => ({ listCalendarEvents: vi.fn() }));

const meeting = (overrides: Record<string, unknown> = {}) => ({
  id: "m1", title: "Physics", startUtc: "2026-10-04T04:30:00Z", status: "Scheduled", classLabel: "Class 5 - A", hostName: "Meera Rao", ...overrides,
});

describe("aggregated calendar", () => {
  beforeEach(() => {
    vi.mocked(listMeetingEvents).mockResolvedValue([
      meeting(), meeting({ id: "m2", status: "Draft" }), meeting({ id: "m3", status: "Cancelled", classLabel: null }),
    ] as never);
  });

  it("merges every source into categorised events", async () => {
    const events = await listAggregatedCalendarEvents();
    const byId = Object.fromEntries(events.map((e) => [e.id, e]));

    expect(["academic-e1", "academic-e2", "academic-e3", "academic-e4"].map((id) => byId[id].category)).toEqual(["holiday", "exam", "event", "academic"]);
    expect(byId["academic-e1"]).toMatchObject({ date: "2026-10-02", endDate: "2026-10-03", description: "Closed" });
    expect(byId["examschedule-s1"]).toMatchObject({ title: "Term 1 — Maths (Class 5)", description: "Room 12, 09:00–11:00", category: "exam" });
    expect(byId["examschedule-s2"]).toMatchObject({ title: "Exam — Subject", description: "09:00–10:00" });
    expect(byId["homework-h1"]).toMatchObject({ title: "Worksheet due (Maths)", description: "Class 5 · Page 4", date: "2026-10-05" });
    expect(byId["homework-h2"]).toMatchObject({ title: "Essay due", description: "300 words" });
    expect(byId["leave-l1"]).toMatchObject({ title: "Meera Rao on leave (casual)", description: "Wedding", endDate: "2026-10-08" });
    expect(byId["leave-l2"]).toMatchObject({ title: "Staff on leave (sick)", description: "Pending approval — Fever" });
    expect(byId["leave-l3"]).toBeUndefined();
  });

  it("puts birthdays in the current year and skips invalid dates", async () => {
    const year = new Date().getFullYear();
    const events = await listAggregatedCalendarEvents();
    const birthdays = events.filter((e) => e.category === "birthday");

    expect(birthdays).toEqual([
      { id: "birthday-stu-st1", date: `${year}-12-25`, title: "Asha N's birthday", category: "birthday" },
      { id: "birthday-stf-sf1", date: `${year}-03-07`, title: "Meera Rao's birthday", category: "birthday" },
    ]);
  });

  it("adds online classes in a rolling window, hiding drafts and flagging cancellations", async () => {
    const events = await listAggregatedCalendarEvents();
    const online = events.filter((e) => e.category === "online");

    expect(online.map((e) => e.id)).toEqual(["online-m1", "online-m3"]);
    expect(online[0].title).toMatch(/ Physics · Class 5 - A$/);
    expect(online[1].title).toMatch(/ Physics \(cancelled\)$/);
    expect(online[0].description).toBe("Online · Meera Rao");
    const [from, to] = vi.mocked(listMeetingEvents).mock.calls[0] as unknown as [string, string];
    expect(new Date(to).getTime() - new Date(from).getTime()).toBe(93 * 86_400_000);
  });

  it("still renders the calendar when the meeting service is down", async () => {
    vi.mocked(listMeetingEvents).mockRejectedValue(new Error("offline"));

    const events = await listAggregatedCalendarEvents();

    expect(events.some((e) => e.category === "online")).toBe(false);
    expect(events.length).toBeGreaterThan(0);
  });
});
