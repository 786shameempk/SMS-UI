import * as timetable from "./api";
import * as exams from "@/features/examinations/api";
import { academicHttpClient } from "@/lib/httpClient";
import { checkCrud } from "@/test/crud";
import { stubClient } from "@/test/utils";

vi.mock("@/features/students/api", () => ({
  listStudents: vi.fn(async () => [{ id: "st1" }, { id: "st2" }, { id: "st3" }]),
}));

const slot = (overrides: Record<string, unknown> = {}) => ({
  id: "sl1", tenantId: "t", branchId: "b", sectionId: "s5a", dayOfWeek: 1, periodNumber: 2, subjectId: null, staffId: "sf1", room: null, isBreak: false, ...overrides,
});

describe("timetable api", () => {
  it("rooms", () =>
    checkCrud({
      client: academicHttpClient,
      base: "/api/rooms",
      dto: { id: "r1", tenantId: "t", branchId: "b", name: "Lab 1", capacity: 30 },
      values: { name: "Lab 1", capacity: 30 } as never,
      list: timetable.listRooms,
      create: timetable.createRoom,
      update: timetable.updateRoom,
      remove: timetable.deleteRoom,
      sent: { name: "Lab 1", capacity: 30 },
      mapped: { name: "Lab 1" },
    }));

  it("slots: list by section/teacher, assign, clear and auto-generate", async () => {
    const calls = stubClient(academicHttpClient, {
      "GET /api/timetable/slots": [slot()],
      "POST /api/timetable/slots": slot({ subjectId: "math", room: "101" }),
      "DELETE /api/timetable/slots": null,
      "POST /api/timetable/sections/s5a/auto-generate": [slot(), slot({ id: "sl2", isBreak: true, staffId: null })],
    });

    expect((await timetable.listSlots({ staffId: "sf1" }))[0]).toMatchObject({ subjectId: undefined, room: undefined });
    expect((await timetable.assignSlot({ sectionId: "s5a", dayOfWeek: 1, periodNumber: 2 } as never)).room).toBe("101");
    await timetable.clearSlot("s5a", 1 as never, 2);
    expect(await timetable.autoGenerateSectionTimetable("s5a")).toHaveLength(2);

    expect((calls[0].config as { params: unknown }).params).toEqual({ sectionId: undefined, staffId: "sf1" });
    expect(calls[1].body).toEqual({ sectionId: "s5a", dayOfWeek: 1, periodNumber: 2, subjectId: null, staffId: null, room: null });
    expect((calls[2].config as { params: unknown }).params).toEqual({ sectionId: "s5a", dayOfWeek: 1, periodNumber: 2 });
  });

  it("flags a teacher double-booked in another section at the same period", () => {
    const all = [slot(), slot({ id: "sl2", sectionId: "s6a" }), slot({ id: "sl3", sectionId: "s7a", periodNumber: 3 })].map((s) => ({ ...s, subjectId: undefined, room: undefined }));

    expect(timetable.findTeacherConflict(all as never, "sf1", 1 as never, 2, "s5a")?.id).toBe("sl2");
    expect(timetable.findTeacherConflict(all as never, "sf1", 1 as never, 4, "s5a")).toBeNull();
  });

  it("substitutions", async () => {
    const dto = { id: "sub1", tenantId: "t", branchId: "b", date: "2026-10-01", sectionId: "s5a", dayOfWeek: 4, periodNumber: 1, originalStaffId: null, substituteStaffId: "sf2", reason: null };
    const calls = stubClient(academicHttpClient, {
      "GET /api/timetable/substitutions": [dto],
      "POST /api/timetable/substitutions": dto,
      "DELETE /api/timetable/substitutions/sub1": null,
    });

    expect((await timetable.listSubstitutions())[0]).toMatchObject({ originalStaffId: undefined, reason: undefined });
    await timetable.createSubstitution({ date: "2026-10-01", sectionId: "s5a", periodNumber: 1, substituteStaffId: "sf2" } as never);
    await timetable.deleteSubstitution("sub1");

    expect(calls[1].body).toEqual({ date: "2026-10-01", sectionId: "s5a", periodNumber: 1, substituteStaffId: "sf2", reason: null });
  });
});

describe("examinations api", () => {
  const exam = { id: "e1", tenantId: "t", branchId: "b", name: "Midterm", examType: "Midterm", termId: "t1", classId: "c5", startDate: "a", endDate: "b", status: "Ongoing" };

  it("exams", () =>
    checkCrud({
      client: academicHttpClient,
      base: "/api/exams",
      dto: exam,
      values: { name: "Midterm", examType: "viva", termId: "t1", classId: "c5", startDate: "a", endDate: "b", status: "completed" } as never,
      list: exams.listExams,
      create: exams.createExam,
      update: exams.updateExam,
      remove: exams.deleteExam,
      sent: { name: "Midterm", examType: "Viva", termId: "t1", classId: "c5", startDate: "a", endDate: "b", status: "Completed" },
      mapped: { examType: "midterm", status: "ongoing" },
      fallback: { dto: { ...exam, id: "e2", examType: "?", status: "?" }, mapped: { examType: "internal", status: "scheduled" } },
    }));

  it("schedules", async () => {
    const dto = { id: "sc1", tenantId: "t", branchId: "b", examId: "e1", subjectId: "math", date: "a", startTime: "09:00", endTime: "12:00", maxMarks: 100, passMarks: 35, room: null };
    const calls = stubClient(academicHttpClient, {
      "GET /api/exams/schedules": [dto],
      "POST /api/exams/e1/schedules": dto,
      "PUT /api/exams/schedules/sc1": dto,
      "DELETE /api/exams/schedules/sc1": null,
    });

    expect((await exams.listExamSchedules("e1"))[0].room).toBeUndefined();
    await exams.createExamSchedule("e1", { subjectId: "math" } as never);
    await exams.updateExamSchedule("sc1", { subjectId: "math" } as never);
    await exams.deleteExamSchedule("sc1");

    expect((calls[0].config as { params: unknown }).params).toEqual({ examId: "e1" });
  });

  it("marks entry against the exam's roster", async () => {
    const result = { id: "r1", tenantId: "t", branchId: "b", examId: "e1", subjectId: "math", studentId: "st1", marksObtained: 80, maxMarks: 100, grade: "A", isAbsent: false };
    const calls = stubClient(academicHttpClient, {
      "GET /api/exams/e1/roster": [{ id: "st1" }, { id: "st3" }],
      "GET /api/exams/e1/results": [result],
      "POST /api/exams/e1/results": [result],
    });

    expect((await exams.getExamRoster("e1")).map((s) => s.id)).toEqual(["st1", "st3"]);
    expect(await exams.getExamResults("e1", "math")).toEqual([result]);
    await exams.saveExamResults("e1", "math", 100, [{ studentId: "st1", marksObtained: 80, isAbsent: false, name: "x" } as never]);

    expect(calls[2].body).toEqual({ subjectId: "math", maxMarks: 100, entries: [{ studentId: "st1", marksObtained: 80, isAbsent: false }] });
  });

  it("class results, report cards, remarks and transcripts", async () => {
    const summary = {
      studentId: "st1", studentName: "Asha", admissionNumber: "A1", className: "Class 5", section: "A",
      subjects: [{ subjectId: "math", subjectName: "Maths", subjectCode: "M", marksObtained: 80, maxMarks: 100, grade: "A", isAbsent: false }],
      totalObtained: 80, totalMax: 100, percentage: 80, grade: "A", gpa: 9, rank: 1,
    };
    const calls = stubClient(academicHttpClient, {
      "GET /api/exams/e1/class-results": [summary],
      "GET /api/exams/e1/remarks/st1": { remarks: "Keep it up" },
      "POST /api/exams/e1/remarks/st1": null,
      "GET /api/exams/transcript/st1": {
        studentId: "st1", studentName: "Asha", admissionNumber: "A1", cgpa: 8.7,
        rows: [{ examId: "e1", examName: "Midterm", examType: "Final", termName: "T1", academicYearName: "2026-27", totalObtained: 80, totalMax: 100, percentage: 80, grade: "A", gpa: 9 }, { examId: "e2", examType: "?" }],
      },
    });

    expect((await exams.getReportCard("e1", "st1"))?.rank).toBe(1);
    expect(await exams.getReportCard("e1", "nobody")).toBeNull();
    expect(await exams.getRemark("e1", "st1")).toBe("Keep it up");
    await exams.saveRemark("e1", "st1", "Excellent");
    const transcript = await exams.getTranscript("st1");

    expect(calls.find((c) => c.method === "POST")?.body).toEqual({ remarks: "Excellent" });
    expect(transcript.rows.map((r) => r.examType)).toEqual(["final", "internal"]);
    expect(transcript.cgpa).toBe(8.7);
  });
});
