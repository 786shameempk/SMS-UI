import { listAcademicYears, listClasses, listSubjects, listTerms } from "@/features/academics/api";
import { createStudent, getStudent, listStudents } from "@/features/students/api";
import { mockDelay } from "@/utils/mockDelay";
import {
  DEFAULT_TENANT_ID,
  defaultBranchIdForTenant,
  getCurrentBranchId,
  getCurrentTenantId,
  migrateLegacyRecordsToDefaultBranch,
  migrateLegacyRecordsToDefaultTenant,
  scopedToCurrentTenantAndBranch,
} from "@/utils/tenant";
import { computeGrade, gradeBandForPercentage, gradePointForGrade } from "./constants";
import { EXAM_ROSTER_SEEDS, SEED_ABSENT_RESULT, SEED_EXAMS, SEED_EXAM_SCHEDULES } from "./mock";
import type {
  Exam,
  ExamFormValues,
  ExamResult,
  ExamResultEntryRow,
  ExamSchedule,
  ExamScheduleFormValues,
  StudentExamSummary,
  SubjectResultRow,
  Transcript,
  TranscriptRow,
} from "./types";

const EXAMS_KEY = "sms-mock-exams";
const SCHEDULES_KEY = "sms-mock-exam-schedules";
const RESULTS_KEY = "sms-mock-exam-results";
const REMARKS_KEY = "sms-mock-exam-remarks";
const SEEDED_KEY = "sms-mock-examinations-seeded";

interface ExamRemark {
  id: string;
  tenantId: string;
  branchId: string;
  examId: string;
  studentId: string;
  remarks: string;
}

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

let exams = migrateLegacyRecordsToDefaultBranch(
  migrateLegacyRecordsToDefaultTenant(
    loadJson<Exam[]>(EXAMS_KEY, SEED_EXAMS.map((e) => ({ ...e, tenantId: DEFAULT_TENANT_ID, branchId: defaultBranchIdForTenant(DEFAULT_TENANT_ID) }))),
  ),
);
let examSchedules = migrateLegacyRecordsToDefaultBranch(
  migrateLegacyRecordsToDefaultTenant(
    loadJson<ExamSchedule[]>(
      SCHEDULES_KEY,
      SEED_EXAM_SCHEDULES.map((s) => ({ ...s, tenantId: DEFAULT_TENANT_ID, branchId: defaultBranchIdForTenant(DEFAULT_TENANT_ID) })),
    ),
  ),
);
let examResults = migrateLegacyRecordsToDefaultBranch(migrateLegacyRecordsToDefaultTenant(loadJson<ExamResult[]>(RESULTS_KEY, [])));
let examRemarks = migrateLegacyRecordsToDefaultBranch(migrateLegacyRecordsToDefaultTenant(loadJson<ExamRemark[]>(REMARKS_KEY, [])));

const persistExams = () => saveJson(EXAMS_KEY, exams);
const persistSchedules = () => saveJson(SCHEDULES_KEY, examSchedules);
const persistResults = () => saveJson(RESULTS_KEY, examResults);
const persistRemarks = () => saveJson(REMARKS_KEY, examRemarks);

function requireEntity<T extends { id: string; tenantId: string; branchId: string }>(list: T[], id: string, label: string): T {
  const found = list.find((item) => item.id === id && item.tenantId === getCurrentTenantId() && item.branchId === getCurrentBranchId());
  if (!found) throw new Error(`${label} not found`);
  return found;
}

function seededPercentage(studentId: string, subjectId: string): number {
  const seed = `${studentId}:${subjectId}`.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return 40 + (seed % 55);
}

/**
 * One-time seed that layers exam-roster students on top of the generic students module
 * (via its own createStudent API, never editing students/mock.ts directly — the same
 * approach the teachers module uses for extra staff) and then generates deterministic
 * marks so Results/Ranking, Report Cards, and Transcript are populated on first load.
 */
async function performSeed(): Promise<void> {
  if (loadJson(SEEDED_KEY, false)) return;

  const existingStudents = await listStudents();
  const hasStudent = (firstName: string, lastName: string, className: string) =>
    existingStudents.some((s) => s.firstName === firstName && s.lastName === lastName && s.className === className);

  const toCreate = EXAM_ROSTER_SEEDS.filter((s) => !hasStudent(s.firstName, s.lastName, s.className));
  await Promise.all(toCreate.map((values) => createStudent(values)));

  const allStudents = await listStudents();
  const classes = await listClasses();

  const gradedExamIds = new Set(SEED_EXAMS.filter((e) => e.status === "completed").map((e) => e.id));
  const newResults: ExamResult[] = [];
  for (const exam of SEED_EXAMS) {
    if (!gradedExamIds.has(exam.id)) continue;
    const schoolClass = classes.find((c) => c.id === exam.classId);
    if (!schoolClass) continue;
    const roster = allStudents.filter((s) => s.className === schoolClass.name);
    const schedules = SEED_EXAM_SCHEDULES.filter((s) => s.examId === exam.id);
    for (const schedule of schedules) {
      for (const student of roster) {
        const isAbsent = SEED_ABSENT_RESULT.examId === exam.id && SEED_ABSENT_RESULT.subjectId === schedule.subjectId && student === roster[0];
        const marksObtained = isAbsent ? 0 : Math.round((seededPercentage(student.id, schedule.subjectId) / 100) * schedule.maxMarks);
        newResults.push({
          id: genId("exres"),
          tenantId: DEFAULT_TENANT_ID,
          branchId: defaultBranchIdForTenant(DEFAULT_TENANT_ID),
          examId: exam.id,
          subjectId: schedule.subjectId,
          studentId: student.id,
          marksObtained,
          maxMarks: schedule.maxMarks,
          grade: computeGrade(marksObtained, schedule.maxMarks, isAbsent),
          isAbsent,
        });
      }
    }
  }
  if (newResults.length) {
    examResults = [...examResults, ...newResults];
    persistResults();
  }

  saveJson(SEEDED_KEY, true);
}

const seedPromise: Promise<void> = performSeed().catch((err) => {
  console.error("Failed to seed examinations mock data", err);
});

// ── Exams ────────────────────────────────────────────────────────────────

export async function listExams(): Promise<Exam[]> {
  await seedPromise;
  return mockDelay(scopedToCurrentTenantAndBranch(exams), 350);
}

export async function createExam(values: ExamFormValues): Promise<Exam> {
  await seedPromise;
  const exam: Exam = { id: genId("exam"), tenantId: getCurrentTenantId(), branchId: getCurrentBranchId(), ...values };
  exams = [exam, ...exams];
  persistExams();
  return mockDelay(exam, 400);
}

export async function updateExam(id: string, values: ExamFormValues): Promise<Exam> {
  await seedPromise;
  requireEntity(exams, id, "Exam");
  exams = exams.map((e) => (e.id === id ? { ...e, ...values } : e));
  persistExams();
  return mockDelay(requireEntity(exams, id, "Exam"), 400);
}

export async function deleteExam(id: string): Promise<void> {
  await seedPromise;
  const tenantId = getCurrentTenantId();
  const branchId = getCurrentBranchId();
  requireEntity(exams, id, "Exam");
  exams = exams.filter((e) => !(e.id === id && e.tenantId === tenantId && e.branchId === branchId));
  examSchedules = examSchedules.filter((s) => !(s.examId === id && s.tenantId === tenantId && s.branchId === branchId));
  examResults = examResults.filter((r) => !(r.examId === id && r.tenantId === tenantId && r.branchId === branchId));
  examRemarks = examRemarks.filter((r) => !(r.examId === id && r.tenantId === tenantId && r.branchId === branchId));
  persistExams();
  persistSchedules();
  persistResults();
  persistRemarks();
  return mockDelay(undefined, 350);
}

// ── Exam schedules ───────────────────────────────────────────────────────

export async function listExamSchedules(examId?: string): Promise<ExamSchedule[]> {
  await seedPromise;
  const scoped = scopedToCurrentTenantAndBranch(examSchedules);
  const result = examId ? scoped.filter((s) => s.examId === examId) : scoped;
  return mockDelay(result, 300);
}

export async function createExamSchedule(examId: string, values: ExamScheduleFormValues): Promise<ExamSchedule> {
  await seedPromise;
  requireEntity(exams, examId, "Exam");
  const schedule: ExamSchedule = { id: genId("exsch"), tenantId: getCurrentTenantId(), branchId: getCurrentBranchId(), examId, ...values };
  examSchedules = [schedule, ...examSchedules];
  persistSchedules();
  return mockDelay(schedule, 400);
}

export async function updateExamSchedule(id: string, values: ExamScheduleFormValues): Promise<ExamSchedule> {
  await seedPromise;
  requireEntity(examSchedules, id, "Exam schedule");
  examSchedules = examSchedules.map((s) => (s.id === id ? { ...s, ...values } : s));
  persistSchedules();
  return mockDelay(requireEntity(examSchedules, id, "Exam schedule"), 400);
}

export async function deleteExamSchedule(id: string): Promise<void> {
  await seedPromise;
  const tenantId = getCurrentTenantId();
  const branchId = getCurrentBranchId();
  const schedule = requireEntity(examSchedules, id, "Exam schedule");
  examSchedules = examSchedules.filter((s) => s.id !== id);
  examResults = examResults.filter(
    (r) => !(r.tenantId === tenantId && r.branchId === branchId && r.examId === schedule.examId && r.subjectId === schedule.subjectId),
  );
  persistSchedules();
  persistResults();
  return mockDelay(undefined, 350);
}

// ── Marks entry ──────────────────────────────────────────────────────────

export async function getExamRoster(examId: string) {
  await seedPromise;
  const exam = requireEntity(exams, examId, "Exam");
  const [classes, students] = await Promise.all([listClasses(), listStudents()]);
  const schoolClass = classes.find((c) => c.id === exam.classId);
  const roster = schoolClass ? students.filter((s) => s.className === schoolClass.name) : [];
  return mockDelay(roster, 350);
}

export async function getExamResults(examId: string, subjectId?: string): Promise<ExamResult[]> {
  await seedPromise;
  const tenantId = getCurrentTenantId();
  const branchId = getCurrentBranchId();
  const result = examResults.filter(
    (r) => r.tenantId === tenantId && r.branchId === branchId && r.examId === examId && (!subjectId || r.subjectId === subjectId),
  );
  return mockDelay(result, 300);
}

export async function saveExamResults(
  examId: string,
  subjectId: string,
  maxMarks: number,
  rows: ExamResultEntryRow[],
): Promise<ExamResult[]> {
  await seedPromise;
  const tenantId = getCurrentTenantId();
  const branchId = getCurrentBranchId();
  requireEntity(exams, examId, "Exam");
  for (const row of rows) {
    const clamped = Math.max(0, Math.min(row.marksObtained, maxMarks));
    const grade = computeGrade(clamped, maxMarks, row.isAbsent);
    const existing = examResults.find(
      (r) => r.tenantId === tenantId && r.branchId === branchId && r.examId === examId && r.subjectId === subjectId && r.studentId === row.studentId,
    );
    if (existing) {
      examResults = examResults.map((r) =>
        r.id === existing.id ? { ...r, marksObtained: row.isAbsent ? 0 : clamped, maxMarks, grade, isAbsent: row.isAbsent } : r,
      );
    } else {
      examResults = [
        ...examResults,
        {
          id: genId("exres"),
          tenantId,
          branchId,
          examId,
          subjectId,
          studentId: row.studentId,
          marksObtained: row.isAbsent ? 0 : clamped,
          maxMarks,
          grade,
          isAbsent: row.isAbsent,
        },
      ];
    }
  }
  persistResults();
  return mockDelay(
    examResults.filter((r) => r.tenantId === tenantId && r.branchId === branchId && r.examId === examId && r.subjectId === subjectId),
    450,
  );
}

// ── Results, ranking & report cards ─────────────────────────────────────

export async function getExamClassResults(examId: string): Promise<StudentExamSummary[]> {
  await seedPromise;
  const tenantId = getCurrentTenantId();
  const branchId = getCurrentBranchId();
  const exam = requireEntity(exams, examId, "Exam");
  const results = examResults.filter((r) => r.tenantId === tenantId && r.branchId === branchId && r.examId === examId);
  if (results.length === 0) return mockDelay([], 350);

  const [classes, subjects, students, schedules] = await Promise.all([
    listClasses(),
    listSubjects(),
    listStudents(),
    listExamSchedules(examId),
  ]);
  const schoolClass = classes.find((c) => c.id === exam.classId);
  const roster = schoolClass ? students.filter((s) => s.className === schoolClass.name) : [];

  const summaries: StudentExamSummary[] = roster.map((student) => {
    const subjectRows: SubjectResultRow[] = schedules.map((schedule) => {
      const subject = subjects.find((su) => su.id === schedule.subjectId);
      const result = results.find((r) => r.subjectId === schedule.subjectId && r.studentId === student.id);
      return {
        subjectId: schedule.subjectId,
        subjectName: subject?.name ?? "Unknown subject",
        subjectCode: subject?.code ?? "",
        marksObtained: result?.marksObtained ?? 0,
        maxMarks: schedule.maxMarks,
        grade: result?.grade ?? computeGrade(0, schedule.maxMarks),
        isAbsent: result?.isAbsent ?? false,
      };
    });
    const totalObtained = subjectRows.reduce((sum, r) => sum + r.marksObtained, 0);
    const totalMax = subjectRows.reduce((sum, r) => sum + r.maxMarks, 0);
    const percentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
    const gpa = subjectRows.length
      ? subjectRows.reduce((sum, r) => sum + gradePointForGrade(r.grade), 0) / subjectRows.length
      : 0;
    return {
      studentId: student.id,
      studentName: `${student.firstName} ${student.lastName}`,
      admissionNumber: student.admissionNumber,
      className: student.className,
      section: student.section,
      subjects: subjectRows,
      totalObtained,
      totalMax,
      percentage: Math.round(percentage * 10) / 10,
      grade: gradeBandForPercentage(percentage).grade,
      gpa: Math.round(gpa * 100) / 100,
      rank: 0,
    };
  });

  summaries.sort((a, b) => b.totalObtained - a.totalObtained || a.studentName.localeCompare(b.studentName));
  summaries.forEach((s, idx) => (s.rank = idx + 1));

  return mockDelay(summaries, 400);
}

export async function getReportCard(examId: string, studentId: string): Promise<StudentExamSummary | null> {
  const summaries = await getExamClassResults(examId);
  return summaries.find((s) => s.studentId === studentId) ?? null;
}

export async function getRemark(examId: string, studentId: string): Promise<string> {
  await seedPromise;
  const tenantId = getCurrentTenantId();
  const branchId = getCurrentBranchId();
  const remark = examRemarks.find((r) => r.tenantId === tenantId && r.branchId === branchId && r.examId === examId && r.studentId === studentId);
  return mockDelay(remark?.remarks ?? "", 250);
}

export async function saveRemark(examId: string, studentId: string, remarks: string): Promise<void> {
  await seedPromise;
  const tenantId = getCurrentTenantId();
  const branchId = getCurrentBranchId();
  const existing = examRemarks.find((r) => r.tenantId === tenantId && r.branchId === branchId && r.examId === examId && r.studentId === studentId);
  if (existing) {
    examRemarks = examRemarks.map((r) => (r.id === existing.id ? { ...r, remarks } : r));
  } else {
    examRemarks = [...examRemarks, { id: genId("exrmk"), tenantId, branchId, examId, studentId, remarks }];
  }
  persistRemarks();
  return mockDelay(undefined, 300);
}

// ── Transcript ───────────────────────────────────────────────────────────

export async function getTranscript(studentId: string): Promise<Transcript> {
  await seedPromise;
  const tenantId = getCurrentTenantId();
  const branchId = getCurrentBranchId();
  const student = await getStudent(studentId);
  const [terms, academicYears] = await Promise.all([listTerms(), listAcademicYears()]);

  const examIds = [
    ...new Set(examResults.filter((r) => r.tenantId === tenantId && r.branchId === branchId && r.studentId === studentId).map((r) => r.examId)),
  ];
  const rows: TranscriptRow[] = [];
  let currentYearGpaSum = 0;
  let currentYearGpaCount = 0;

  for (const examId of examIds) {
    const exam = exams.find((e) => e.id === examId && e.tenantId === tenantId && e.branchId === branchId);
    if (!exam) continue;
    const resultsForExam = examResults.filter(
      (r) => r.tenantId === tenantId && r.branchId === branchId && r.examId === examId && r.studentId === studentId,
    );
    const totalObtained = resultsForExam.reduce((sum, r) => sum + r.marksObtained, 0);
    const totalMax = resultsForExam.reduce((sum, r) => sum + r.maxMarks, 0);
    const percentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
    const gpa = resultsForExam.length
      ? resultsForExam.reduce((sum, r) => sum + gradePointForGrade(r.grade), 0) / resultsForExam.length
      : 0;
    const term = terms.find((t) => t.id === exam.termId);
    const academicYear = academicYears.find((y) => y.id === term?.academicYearId);

    if (exam.status === "completed" && academicYear?.isCurrent) {
      currentYearGpaSum += gpa;
      currentYearGpaCount += 1;
    }

    rows.push({
      examId: exam.id,
      examName: exam.name,
      examType: exam.examType,
      termName: term?.name ?? "—",
      academicYearName: academicYear?.name ?? "—",
      totalObtained,
      totalMax,
      percentage: Math.round(percentage * 10) / 10,
      grade: gradeBandForPercentage(percentage).grade,
      gpa: Math.round(gpa * 100) / 100,
    });
  }

  rows.sort((a, b) =>
    (exams.find((e) => e.id === a.examId && e.tenantId === tenantId && e.branchId === branchId)?.startDate ?? "").localeCompare(
      exams.find((e) => e.id === b.examId && e.tenantId === tenantId && e.branchId === branchId)?.startDate ?? "",
    ),
  );

  const cgpa = currentYearGpaCount > 0 ? Math.round((currentYearGpaSum / currentYearGpaCount) * 100) / 100 : 0;

  return mockDelay(
    {
      studentId,
      studentName: `${student.firstName} ${student.lastName}`,
      admissionNumber: student.admissionNumber,
      rows,
      cgpa,
    },
    400,
  );
}
