import { listSections, listClasses, listSubjects, updateSection } from "@/features/academics/api";
import type { Section } from "@/features/academics/types";
import { createStaff, getStaffMember, listStaff } from "@/features/staff/api";
import type { StaffMember } from "@/features/staff/types";
import { listStudents } from "@/features/students/api";
import { mockDelay } from "@/utils/mockDelay";
import {
  DEFAULT_TENANT_ID,
  defaultBranchIdForTenant,
  getCurrentTenantId,
  migrateLegacyRecordsToDefaultBranch,
  migrateLegacyRecordsToDefaultTenant,
  scopedToCurrentTenantAndBranch,
} from "@/utils/tenant";
import { CLASS_TEACHER_PLAN, EXTRA_TEACHER_SEEDS, LESSON_PLAN_PLAN, SUBJECT_ASSIGNMENT_PLAN } from "./mock";
import type {
  LessonPlan,
  LessonPlanFormValues,
  StudentPerformanceRow,
  SubjectClassPerformance,
  TeacherSubjectAssignment,
  TeacherSubjectAssignmentFormValues,
} from "./types";

const SUBJECT_ASSIGNMENTS_KEY = "sms-mock-teacher-subject-assignments";
const LESSON_PLANS_KEY = "sms-mock-lesson-plans";
const SEEDED_KEY = "sms-mock-teachers-seeded";

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {
    // fall through to fallback
  }
  return fallback;
}

function saveJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // best-effort only
  }
}

function genId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

let subjectAssignments = migrateLegacyRecordsToDefaultBranch(
  migrateLegacyRecordsToDefaultTenant(loadJson<TeacherSubjectAssignment[]>(SUBJECT_ASSIGNMENTS_KEY, [])),
);
let lessonPlans = migrateLegacyRecordsToDefaultBranch(migrateLegacyRecordsToDefaultTenant(loadJson<LessonPlan[]>(LESSON_PLANS_KEY, [])));

const persistSubjectAssignments = () => saveJson(SUBJECT_ASSIGNMENTS_KEY, subjectAssignments);
const persistLessonPlans = () => saveJson(LESSON_PLANS_KEY, lessonPlans);

/**
 * One-time seed that layers teacher-specific demo data on top of the generic staff
 * and academics modules, using only their public APIs (createStaff / updateSection)
 * so those feature folders never need a direct edit for mock data purposes.
 */
async function performSeed(): Promise<void> {
  if (loadJson(SEEDED_KEY, false)) return;

  const [existingStaff, sections] = await Promise.all([listStaff(), listSections()]);
  const idByEmail = new Map(existingStaff.map((s) => [s.email.toLowerCase(), s.id] as const));

  const toCreate = EXTRA_TEACHER_SEEDS.filter((t) => !idByEmail.has(t.email.toLowerCase()));
  const createdTeachers = await Promise.all(toCreate.map((values) => createStaff(values)));
  for (const member of createdTeachers) idByEmail.set(member.email.toLowerCase(), member.id);
  const staffById = new Map([...existingStaff, ...createdTeachers].map((s) => [s.id, s] as const));

  const newAssignments: TeacherSubjectAssignment[] = [];
  for (const plan of SUBJECT_ASSIGNMENT_PLAN) {
    const staffId = idByEmail.get(plan.teacherEmail.toLowerCase());
    if (!staffId) continue;
    if (subjectAssignments.some((a) => a.staffId === staffId && a.subjectId === plan.subjectId && a.classId === plan.classId)) continue;
    newAssignments.push({
      id: genId("tsa"),
      tenantId: DEFAULT_TENANT_ID,
      branchId: staffById.get(staffId)?.branchId ?? defaultBranchIdForTenant(DEFAULT_TENANT_ID),
      staffId,
      subjectId: plan.subjectId,
      classId: plan.classId,
    });
  }
  if (newAssignments.length) {
    subjectAssignments = [...subjectAssignments, ...newAssignments];
    persistSubjectAssignments();
  }

  const newLessonPlans: LessonPlan[] = [];
  for (const plan of LESSON_PLAN_PLAN) {
    const staffId = idByEmail.get(plan.teacherEmail.toLowerCase());
    if (!staffId) continue;
    if (lessonPlans.some((p) => p.staffId === staffId && p.title === plan.title)) continue;
    const now = new Date().toISOString();
    newLessonPlans.push({
      id: genId("lp"),
      tenantId: DEFAULT_TENANT_ID,
      branchId: staffById.get(staffId)?.branchId ?? defaultBranchIdForTenant(DEFAULT_TENANT_ID),
      staffId,
      subjectId: plan.subjectId,
      classId: plan.classId,
      title: plan.title,
      description: plan.description,
      weekOf: plan.weekOf,
      attachmentNote: plan.attachmentNote,
      status: plan.status,
      createdAt: now,
      updatedAt: now,
    });
  }
  if (newLessonPlans.length) {
    lessonPlans = [...lessonPlans, ...newLessonPlans];
    persistLessonPlans();
  }

  await Promise.all(
    CLASS_TEACHER_PLAN.map(async (plan) => {
      const staffId = idByEmail.get(plan.teacherEmail.toLowerCase());
      const section = sections.find((s) => s.id === plan.sectionId);
      const teacher = staffId ? staffById.get(staffId) : undefined;
      if (!section || !teacher) return;
      await updateSection(section.id, {
        name: section.name,
        classId: section.classId,
        capacity: section.capacity,
        currentStrength: section.currentStrength,
        classTeacherName: `${teacher.firstName} ${teacher.lastName}`,
        classTeacherStaffId: teacher.id,
      });
    }),
  );

  saveJson(SEEDED_KEY, true);
}

const seedPromise: Promise<void> = performSeed().catch((err) => {
  console.error("Failed to seed teacher mock data", err);
});

// ── Teacher directory ────────────────────────────────────────────────────

export async function listTeachers(): Promise<StaffMember[]> {
  await seedPromise;
  const all = await listStaff();
  return all.filter((s) => s.designation === "Teacher");
}

// ── Subject / class assignments ─────────────────────────────────────────

export async function listSubjectAssignments(staffId?: string): Promise<TeacherSubjectAssignment[]> {
  await seedPromise;
  const scoped = scopedToCurrentTenantAndBranch(subjectAssignments);
  const result = staffId ? scoped.filter((a) => a.staffId === staffId) : scoped;
  return mockDelay(result, 300);
}

export async function assignSubject(values: TeacherSubjectAssignmentFormValues): Promise<TeacherSubjectAssignment> {
  await seedPromise;
  const tenantId = getCurrentTenantId();
  const teacher = await getStaffMember(values.staffId);
  const exists = subjectAssignments.some(
    (a) =>
      a.tenantId === tenantId &&
      a.branchId === teacher.branchId &&
      a.staffId === values.staffId &&
      a.subjectId === values.subjectId &&
      a.classId === values.classId,
  );
  if (exists) {
    await mockDelay(null, 300);
    throw new Error("This subject is already assigned to that class for this teacher.");
  }
  const assignment: TeacherSubjectAssignment = { id: genId("tsa"), tenantId, branchId: teacher.branchId, ...values };
  subjectAssignments = [assignment, ...subjectAssignments];
  persistSubjectAssignments();
  return mockDelay(assignment, 400);
}

export async function removeSubjectAssignment(id: string): Promise<void> {
  await seedPromise;
  const tenantId = getCurrentTenantId();
  subjectAssignments = subjectAssignments.filter((a) => !(a.id === id && a.tenantId === tenantId));
  persistSubjectAssignments();
  return mockDelay(undefined, 300);
}

// ── Class teacher assignment (persisted onto academics' Section) ───────

export async function assignClassTeacher(sectionId: string, staffId: string): Promise<Section> {
  await seedPromise;
  const [sections, teachers] = await Promise.all([listSections(), listTeachers()]);
  const section = sections.find((s) => s.id === sectionId);
  const teacher = teachers.find((t) => t.id === staffId);
  if (!section || !teacher) {
    await mockDelay(null, 300);
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
  await seedPromise;
  const sections = await listSections();
  const section = sections.find((s) => s.id === sectionId);
  if (!section) {
    await mockDelay(null, 300);
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

// ── Lesson plans ─────────────────────────────────────────────────────────

export async function listLessonPlans(staffId?: string): Promise<LessonPlan[]> {
  await seedPromise;
  const scoped = scopedToCurrentTenantAndBranch(lessonPlans);
  const result = staffId ? scoped.filter((p) => p.staffId === staffId) : scoped;
  return mockDelay(result, 350);
}

export async function createLessonPlan(values: LessonPlanFormValues): Promise<LessonPlan> {
  await seedPromise;
  const teacher = await getStaffMember(values.staffId);
  const now = new Date().toISOString();
  const plan: LessonPlan = { id: genId("lp"), tenantId: getCurrentTenantId(), branchId: teacher.branchId, ...values, createdAt: now, updatedAt: now };
  lessonPlans = [plan, ...lessonPlans];
  persistLessonPlans();
  return mockDelay(plan, 400);
}

export async function updateLessonPlan(id: string, values: LessonPlanFormValues): Promise<LessonPlan> {
  await seedPromise;
  const tenantId = getCurrentTenantId();
  const existing = lessonPlans.find((p) => p.id === id && p.tenantId === tenantId);
  if (!existing) {
    await mockDelay(null, 300);
    throw new Error("Lesson plan not found");
  }
  const teacher = await getStaffMember(values.staffId);
  const updated: LessonPlan = { ...existing, ...values, branchId: teacher.branchId, updatedAt: new Date().toISOString() };
  lessonPlans = lessonPlans.map((p) => (p.id === id ? updated : p));
  persistLessonPlans();
  return mockDelay(updated, 400);
}

export async function deleteLessonPlan(id: string): Promise<void> {
  await seedPromise;
  const tenantId = getCurrentTenantId();
  lessonPlans = lessonPlans.filter((p) => !(p.id === id && p.tenantId === tenantId));
  persistLessonPlans();
  return mockDelay(undefined, 300);
}

// ── Student performance (placeholder view until Examinations ships) ─────

function mockScoreFor(studentId: string, subjectId: string): { averageScore: number; grade: string } {
  const seed = `${studentId}:${subjectId}`.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const averageScore = 55 + (seed % 40);
  const grade = averageScore >= 90 ? "A+" : averageScore >= 80 ? "A" : averageScore >= 70 ? "B" : averageScore >= 60 ? "C" : "D";
  return { averageScore, grade };
}

export async function getTeacherPerformanceOverview(staffId: string): Promise<SubjectClassPerformance[]> {
  await seedPromise;
  const [assignments, subjects, classes, students] = await Promise.all([
    listSubjectAssignments(staffId),
    listSubjects(),
    listClasses(),
    listStudents(),
  ]);

  const rows: SubjectClassPerformance[] = [];
  for (const assignment of assignments) {
    const subject = subjects.find((s) => s.id === assignment.subjectId);
    const schoolClass = classes.find((c) => c.id === assignment.classId);
    if (!subject || !schoolClass) continue;
    const classStudents = students.filter((s) => s.className === schoolClass.name);
    const studentRows: StudentPerformanceRow[] = classStudents.map((student) => {
      const { averageScore, grade } = mockScoreFor(student.id, subject.id);
      return { student, averageScore, grade };
    });
    const classAverage = studentRows.length
      ? Math.round(studentRows.reduce((sum, r) => sum + r.averageScore, 0) / studentRows.length)
      : 0;
    rows.push({ assignmentId: assignment.id, subject, schoolClass, students: studentRows, classAverage });
  }
  return mockDelay(rows, 400);
}
