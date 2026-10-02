import * as teachers from "./api";
import { academicHttpClient } from "@/lib/httpClient";
import { checkCrud } from "@/test/crud";
import { stubClient } from "@/test/utils";
import { updateSection } from "@/features/academics/api";

vi.mock("@/features/staff/api", () => ({
  listStaff: vi.fn(async () => [
    { id: "t1", firstName: "Meera", lastName: "Rao", designation: "Teacher" },
    { id: "a1", firstName: "Office", lastName: "Staff", designation: "Accountant" },
  ]),
}));
vi.mock("@/features/academics/api", () => ({
  listSections: vi.fn(async () => [{ id: "s1", name: "A", classId: "c5", capacity: 40, currentStrength: 30 }]),
  listClasses: vi.fn(async () => [{ id: "c5", name: "Class 5" }]),
  listSubjects: vi.fn(async () => [{ id: "math", name: "Maths" }]),
  updateSection: vi.fn(async (id: string, values: object) => ({ id, ...values })),
}));
vi.mock("@/features/students/api", () => ({
  listStudents: vi.fn(async () => [
    { id: "st1", firstName: "Asha" },
    { id: "st2", firstName: "Ravi" },
    { id: "st3", firstName: "Kiran" },
  ]),
}));
vi.mock("@/features/examinations/api", () => ({
  listExams: vi.fn(async () => [{ id: "e1", classId: "c5" }, { id: "e2", classId: "c5" }, { id: "e3", classId: "c9" }]),
  getExamResults: vi.fn(async (examId: string) =>
    examId === "e1"
      ? [
          { studentId: "st1", marksObtained: 45, maxMarks: 50, isAbsent: false },
          { studentId: "st2", marksObtained: 20, maxMarks: 50, isAbsent: false },
          { studentId: "st3", marksObtained: 0, maxMarks: 50, isAbsent: true },
          { studentId: "ghost", marksObtained: 50, maxMarks: 50, isAbsent: false },
        ]
      : [{ studentId: "st1", marksObtained: 47, maxMarks: 50, isAbsent: false }, { studentId: "st2", marksObtained: 5, maxMarks: 0, isAbsent: false }],
  ),
}));

describe("teachers api", () => {
  it("lists only staff with the Teacher designation", async () => {
    expect((await teachers.listTeachers()).map((t) => t.id)).toEqual(["t1"]);
  });

  it("subject assignments filter by teacher", async () => {
    const dto = { id: "as1", tenantId: "t", branchId: "b", staffId: "t1", subjectId: "math", classId: "c5" };
    const calls = stubClient(academicHttpClient, {
      "GET /api/teacher-assignments": [dto],
      "POST /api/teacher-assignments": dto,
      "DELETE /api/teacher-assignments/as1": null,
    });

    expect(await teachers.listSubjectAssignments("t1")).toEqual([dto]);
    await teachers.assignSubject({ staffId: "t1", subjectId: "math", classId: "c5" });
    await teachers.removeSubjectAssignment("as1");

    expect((calls[0].config as { params: unknown }).params).toEqual({ staffId: "t1" });
  });

  it("assigns and clears a section's class teacher", async () => {
    const assigned = await teachers.assignClassTeacher("s1", "t1");
    await teachers.unassignClassTeacher("s1");

    expect(assigned).toMatchObject({ classTeacherName: "Meera Rao", classTeacherStaffId: "t1", capacity: 40 });
    expect(vi.mocked(updateSection).mock.calls[1][1]).toMatchObject({ classTeacherName: undefined, classTeacherStaffId: undefined });
    await expect(teachers.assignClassTeacher("s1", "a1")).rejects.toThrow("Section or teacher not found");
    await expect(teachers.unassignClassTeacher("missing")).rejects.toThrow("Section not found");
  });

  it("lesson plans", () =>
    checkCrud({
      client: academicHttpClient,
      base: "/api/lesson-plans",
      dto: { id: "lp1", tenantId: "t", branchId: "b", staffId: "t1", subjectId: "math", classId: "c5", title: "Fractions", description: "", weekOf: "2026-10-05", attachmentNote: null, status: "Published", createdAt: "2026-10-01", updatedAt: null },
      values: { staffId: "t1", subjectId: "math", classId: "c5", title: "Fractions", description: "", weekOf: "2026-10-05", attachmentNote: "", status: "draft" } as never,
      list: () => teachers.listLessonPlans("t1"),
      create: teachers.createLessonPlan,
      update: teachers.updateLessonPlan,
      remove: teachers.deleteLessonPlan,
      sent: { staffId: "t1", subjectId: "math", classId: "c5", title: "Fractions", description: "", weekOf: "2026-10-05", attachmentNote: null, status: "Draft" },
      mapped: { status: "published", attachmentNote: undefined, updatedAt: "2026-10-01" },
    }));

  it("averages each student's marks across the class's exams, skipping absences and unknown students", async () => {
    stubClient(academicHttpClient, {
      "GET /api/teacher-assignments": [
        { id: "as1", tenantId: "t", branchId: "b", staffId: "t1", subjectId: "math", classId: "c5" },
        { id: "as2", tenantId: "t", branchId: "b", staffId: "t1", subjectId: "art", classId: "c5" },
      ],
    });

    const [maths, ...rest] = await teachers.getTeacherPerformanceOverview("t1");

    expect(rest).toEqual([]);
    expect(maths.students.map((r) => [r.student.id, r.averageScore, r.grade])).toEqual([
      ["st1", 92, "A+"],
      ["st2", 40, "F"],
    ]);
    expect(maths.classAverage).toBe(66);
  });
});
