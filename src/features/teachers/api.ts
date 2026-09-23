import { listSections, listClasses, listSubjects, updateSection } from "@/features/academics/api";
import type { Section } from "@/features/academics/types";
import { listExams, getExamResults } from "@/features/examinations/api";
import { academicHttpClient, extractApiErrorMessage } from "@/lib/httpClient";
import { listStaff } from "@/features/staff/api";
import type { StaffMember } from "@/features/staff/types";
import { listStudents } from "@/features/students/api";
import type {
  LessonPlan,
  LessonPlanFormValues,
  LessonPlanStatus,
  StudentPerformanceRow,
  SubjectClassPerformance,
  TeacherSubjectAssignment,
  TeacherSubjectAssignmentFormValues,
} from "./types";

// ── Teacher subject assignments (AcademicService) ───────────────────────

interface ApiTeacherSubjectAssignment {
  id: string;
  tenantId: string;
  branchId: string;
  staffId: string;
  subjectId: string;
  classId: string;
}

const mapAssignment = (dto: ApiTeacherSubjectAssignment): TeacherSubjectAssignment => ({
  id: dto.id,
  tenantId: dto.tenantId,
  branchId: dto.branchId,
  staffId: dto.staffId,
  subjectId: dto.subjectId,
  classId: dto.classId,
});

async function unwrap<T>(request: Promise<{ data: T }>): Promise<T> {
  try {
    return (await request).data;
  } catch (err) {
    throw new Error(extractApiErrorMessage(err));
  }
}

// ── Teacher directory ────────────────────────────────────────────────────

export async function listTeachers(): Promise<StaffMember[]> {
  const all = await listStaff();
  return all.filter((s) => s.designation === "Teacher");
}

// ── Subject / class assignments ─────────────────────────────────────────

export async function listSubjectAssignments(staffId?: string): Promise<TeacherSubjectAssignment[]> {
  const assignments = await unwrap(
    academicHttpClient.get<ApiTeacherSubjectAssignment[]>("/api/teacher-assignments", { params: { staffId } }),
  );
  return assignments.map(mapAssignment);
}

export async function assignSubject(values: TeacherSubjectAssignmentFormValues): Promise<TeacherSubjectAssignment> {
  const assignment = await unwrap(academicHttpClient.post<ApiTeacherSubjectAssignment>("/api/teacher-assignments", values));
  return mapAssignment(assignment);
}

export async function removeSubjectAssignment(id: string): Promise<void> {
  await unwrap(academicHttpClient.delete<void>(`/api/teacher-assignments/${id}`));
}

// ── Class teacher assignment (persisted onto academics' Section) ───────

export async function assignClassTeacher(sectionId: string, staffId: string): Promise<Section> {
  const [sections, teachers] = await Promise.all([listSections(), listTeachers()]);
  const section = sections.find((s) => s.id === sectionId);
  const teacher = teachers.find((t) => t.id === staffId);
  if (!section || !teacher) {
    throw new Error("Section or teacher not found");
  }
  return updateSection(sectionId, {
    name: section.name,
    classId: section.classId,
    capacity: section.capacity,
    currentStrength: section.currentStrength,
    classTeacherName: `${teacher.firstName} ${teacher.lastName}`,
    classTeacherStaffId: teacher.id,
  });
}

export async function unassignClassTeacher(sectionId: string): Promise<Section> {
  const sections = await listSections();
  const section = sections.find((s) => s.id === sectionId);
  if (!section) {
    throw new Error("Section not found");
  }
  return updateSection(sectionId, {
    name: section.name,
    classId: section.classId,
    capacity: section.capacity,
    currentStrength: section.currentStrength,
    classTeacherName: undefined,
    classTeacherStaffId: undefined,
  });
}

// ── Lesson plans (AcademicService) ──────────────────────────────────────

interface ApiLessonPlan {
  id: string;
  tenantId: string;
  branchId: string;
  staffId: string;
  subjectId: string;
  classId: string;
  title: string;
  description: string;
  weekOf: string;
  attachmentNote: string | null;
  status: "Draft" | "Published";
  createdAt: string;
  updatedAt: string | null;
}

const LESSON_PLAN_STATUS_TO_API: Record<LessonPlanStatus, ApiLessonPlan["status"]> = { draft: "Draft", published: "Published" };
const LESSON_PLAN_STATUS_FROM_API: Record<ApiLessonPlan["status"], LessonPlanStatus> = { Draft: "draft", Published: "published" };

const mapLessonPlan = (dto: ApiLessonPlan): LessonPlan => ({
  id: dto.id,
  tenantId: dto.tenantId,
  branchId: dto.branchId,
  staffId: dto.staffId,
  subjectId: dto.subjectId,
  classId: dto.classId,
  title: dto.title,
  description: dto.description,
  weekOf: dto.weekOf,
  attachmentNote: dto.attachmentNote ?? undefined,
  status: LESSON_PLAN_STATUS_FROM_API[dto.status],
  createdAt: dto.createdAt,
  updatedAt: dto.updatedAt ?? dto.createdAt,
});

const toLessonPlanRequest = (values: LessonPlanFormValues) => ({
  staffId: values.staffId,
  subjectId: values.subjectId,
  classId: values.classId,
  title: values.title,
  description: values.description,
  weekOf: values.weekOf,
  attachmentNote: values.attachmentNote || null,
  status: LESSON_PLAN_STATUS_TO_API[values.status],
});

export async function listLessonPlans(staffId?: string): Promise<LessonPlan[]> {
  const plans = await unwrap(academicHttpClient.get<ApiLessonPlan[]>("/api/lesson-plans", { params: { staffId } }));
  return plans.map(mapLessonPlan);
}

export async function createLessonPlan(values: LessonPlanFormValues): Promise<LessonPlan> {
  return mapLessonPlan(await unwrap(academicHttpClient.post<ApiLessonPlan>("/api/lesson-plans", toLessonPlanRequest(values))));
}

export async function updateLessonPlan(id: string, values: LessonPlanFormValues): Promise<LessonPlan> {
  return mapLessonPlan(await unwrap(academicHttpClient.put<ApiLessonPlan>(`/api/lesson-plans/${id}`, toLessonPlanRequest(values))));
}

export async function deleteLessonPlan(id: string): Promise<void> {
  await unwrap(academicHttpClient.delete<void>(`/api/lesson-plans/${id}`));
}

// ── Student performance (from real exam results) ────────────────────────

function gradeFor(percent: number): string {
  if (percent >= 90) return "A+";
  if (percent >= 80) return "A";
  if (percent >= 70) return "B";
  if (percent >= 60) return "C";
  if (percent >= 50) return "D";
  return "F";
}

/**
 * For each of the teacher's subject/class assignments, averages every student's marks in that
 * subject across all of that class's exams (absences excluded). Students with no recorded marks
 * in the subject yet are left out rather than shown with an invented score.
 */
export async function getTeacherPerformanceOverview(staffId: string): Promise<SubjectClassPerformance[]> {
  const [assignments, subjects, classes, students, exams] = await Promise.all([
    listSubjectAssignments(staffId),
    listSubjects(),
    listClasses(),
    listStudents(),
    listExams(),
  ]);
  const studentById = new Map(students.map((s) => [s.id, s] as const));

  const rows: SubjectClassPerformance[] = [];
  for (const assignment of assignments) {
    const subject = subjects.find((s) => s.id === assignment.subjectId);
    const schoolClass = classes.find((c) => c.id === assignment.classId);
    if (!subject || !schoolClass) continue;

    const classExams = exams.filter((e) => e.classId === schoolClass.id);
    const results = (await Promise.all(classExams.map((e) => getExamResults(e.id, subject.id)))).flat();

    const totals = new Map<string, { obtained: number; max: number }>();
    for (const r of results) {
      if (r.isAbsent || r.maxMarks <= 0) continue;
      const t = totals.get(r.studentId) ?? { obtained: 0, max: 0 };
      t.obtained += r.marksObtained;
      t.max += r.maxMarks;
      totals.set(r.studentId, t);
    }

    const studentRows: StudentPerformanceRow[] = [];
    for (const [studentId, t] of totals) {
      const student = studentById.get(studentId);
      if (!student) continue;
      const averageScore = Math.round((t.obtained / t.max) * 100);
      studentRows.push({ student, averageScore, grade: gradeFor(averageScore) });
    }
    studentRows.sort((x, y) => y.averageScore - x.averageScore);

    const classAverage = studentRows.length
      ? Math.round(studentRows.reduce((sum, r) => sum + r.averageScore, 0) / studentRows.length)
      : 0;
    rows.push({ assignmentId: assignment.id, subject, schoolClass, students: studentRows, classAverage });
  }
  return rows;
}
