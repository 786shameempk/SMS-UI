import { academicHttpClient, extractApiErrorMessage } from "@/lib/httpClient";
import { listStudents } from "@/features/students/api";
import type {
  Exam,
  ExamFormValues,
  ExamResult,
  ExamResultEntryRow,
  ExamSchedule,
  ExamScheduleFormValues,
  ExamStatus,
  ExamType,
  StudentExamSummary,
  SubjectResultRow,
  Transcript,
  TranscriptRow,
} from "./types";

// ── Enum translation ────────────────────────────────────────────────────────
// AcademicService's enums serialize as PascalCase; SMS UI's types use lowercase unions.

const EXAM_TYPE_TO_API: Record<ExamType, string> = {
  internal: "Internal",
  midterm: "Midterm",
  final: "Final",
  practical: "Practical",
  viva: "Viva",
};
const EXAM_TYPE_FROM_API: Record<string, ExamType> = {
  Internal: "internal",
  Midterm: "midterm",
  Final: "final",
  Practical: "practical",
  Viva: "viva",
};

const EXAM_STATUS_TO_API: Record<ExamStatus, string> = {
  scheduled: "Scheduled",
  ongoing: "Ongoing",
  completed: "Completed",
};
const EXAM_STATUS_FROM_API: Record<string, ExamStatus> = {
  Scheduled: "scheduled",
  Ongoing: "ongoing",
  Completed: "completed",
};

// ── API response shapes (AcademicService DTOs) ──────────────────────────────

interface ApiExam {
  id: string;
  tenantId: string;
  branchId: string;
  name: string;
  examType: string;
  termId: string;
  classId: string;
  startDate: string;
  endDate: string;
  status: string;
}

interface ApiExamSchedule {
  id: string;
  tenantId: string;
  branchId: string;
  examId: string;
  subjectId: string;
  date: string;
  startTime: string;
  endTime: string;
  maxMarks: number;
  passMarks: number;
  room: string | null;
}

interface ApiExamResult {
  id: string;
  tenantId: string;
  branchId: string;
  examId: string;
  subjectId: string;
  studentId: string;
  marksObtained: number;
  maxMarks: number;
  grade: string;
  isAbsent: boolean;
}

interface ApiSubjectResultRow {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  marksObtained: number;
  maxMarks: number;
  grade: string;
  isAbsent: boolean;
}

interface ApiStudentExamSummary {
  studentId: string;
  studentName: string;
  admissionNumber: string;
  className: string;
  section: string;
  subjects: ApiSubjectResultRow[];
  totalObtained: number;
  totalMax: number;
  percentage: number;
  grade: string;
  gpa: number;
  rank: number;
}

interface ApiTranscriptRow {
  examId: string;
  examName: string;
  examType: string;
  termName: string;
  academicYearName: string;
  totalObtained: number;
  totalMax: number;
  percentage: number;
  grade: string;
  gpa: number;
}

interface ApiTranscript {
  studentId: string;
  studentName: string;
  admissionNumber: string;
  rows: ApiTranscriptRow[];
  cgpa: number;
}

interface ApiRosterEntry {
  id: string;
}

// ── Mappers ──────────────────────────────────────────────────────────────────

const mapExam = (dto: ApiExam): Exam => ({
  id: dto.id,
  tenantId: dto.tenantId,
  branchId: dto.branchId,
  name: dto.name,
  examType: EXAM_TYPE_FROM_API[dto.examType] ?? "internal",
  termId: dto.termId,
  classId: dto.classId,
  startDate: dto.startDate,
  endDate: dto.endDate,
  status: EXAM_STATUS_FROM_API[dto.status] ?? "scheduled",
});

const mapSchedule = (dto: ApiExamSchedule): ExamSchedule => ({
  id: dto.id,
  tenantId: dto.tenantId,
  branchId: dto.branchId,
  examId: dto.examId,
  subjectId: dto.subjectId,
  date: dto.date,
  startTime: dto.startTime,
  endTime: dto.endTime,
  maxMarks: dto.maxMarks,
  passMarks: dto.passMarks,
  room: dto.room ?? undefined,
});

const mapResult = (dto: ApiExamResult): ExamResult => ({
  id: dto.id,
  tenantId: dto.tenantId,
  branchId: dto.branchId,
  examId: dto.examId,
  subjectId: dto.subjectId,
  studentId: dto.studentId,
  marksObtained: dto.marksObtained,
  maxMarks: dto.maxMarks,
  grade: dto.grade,
  isAbsent: dto.isAbsent,
});

const mapSubjectRow = (dto: ApiSubjectResultRow): SubjectResultRow => ({
  subjectId: dto.subjectId,
  subjectName: dto.subjectName,
  subjectCode: dto.subjectCode,
  marksObtained: dto.marksObtained,
  maxMarks: dto.maxMarks,
  grade: dto.grade,
  isAbsent: dto.isAbsent,
});

const mapSummary = (dto: ApiStudentExamSummary): StudentExamSummary => ({
  studentId: dto.studentId,
  studentName: dto.studentName,
  admissionNumber: dto.admissionNumber,
  className: dto.className,
  section: dto.section,
  subjects: dto.subjects.map(mapSubjectRow),
  totalObtained: dto.totalObtained,
  totalMax: dto.totalMax,
  percentage: dto.percentage,
  grade: dto.grade,
  gpa: dto.gpa,
  rank: dto.rank,
});

const mapTranscriptRow = (dto: ApiTranscriptRow): TranscriptRow => ({
  examId: dto.examId,
  examName: dto.examName,
  examType: EXAM_TYPE_FROM_API[dto.examType] ?? "internal",
  termName: dto.termName,
  academicYearName: dto.academicYearName,
  totalObtained: dto.totalObtained,
  totalMax: dto.totalMax,
  percentage: dto.percentage,
  grade: dto.grade,
  gpa: dto.gpa,
});

const mapTranscript = (dto: ApiTranscript): Transcript => ({
  studentId: dto.studentId,
  studentName: dto.studentName,
  admissionNumber: dto.admissionNumber,
  rows: dto.rows.map(mapTranscriptRow),
  cgpa: dto.cgpa,
});

async function unwrap<T>(request: Promise<{ data: T }>): Promise<T> {
  try {
    return (await request).data;
  } catch (err) {
    throw new Error(extractApiErrorMessage(err));
  }
}

// ── Exams ────────────────────────────────────────────────────────────────

export async function listExams(): Promise<Exam[]> {
  const exams = await unwrap(academicHttpClient.get<ApiExam[]>("/api/exams"));
  return exams.map(mapExam);
}

export async function createExam(values: ExamFormValues): Promise<Exam> {
  const exam = await unwrap(
    academicHttpClient.post<ApiExam>("/api/exams", { ...values, examType: EXAM_TYPE_TO_API[values.examType], status: EXAM_STATUS_TO_API[values.status] }),
  );
  return mapExam(exam);
}

export async function updateExam(id: string, values: ExamFormValues): Promise<Exam> {
  const exam = await unwrap(
    academicHttpClient.put<ApiExam>(`/api/exams/${id}`, {
      ...values,
      examType: EXAM_TYPE_TO_API[values.examType],
      status: EXAM_STATUS_TO_API[values.status],
    }),
  );
  return mapExam(exam);
}

export async function deleteExam(id: string): Promise<void> {
  await unwrap(academicHttpClient.delete<void>(`/api/exams/${id}`));
}

// ── Exam schedules ───────────────────────────────────────────────────────

export async function listExamSchedules(examId?: string): Promise<ExamSchedule[]> {
  const schedules = await unwrap(academicHttpClient.get<ApiExamSchedule[]>("/api/exams/schedules", { params: { examId } }));
  return schedules.map(mapSchedule);
}

export async function createExamSchedule(examId: string, values: ExamScheduleFormValues): Promise<ExamSchedule> {
  const schedule = await unwrap(academicHttpClient.post<ApiExamSchedule>(`/api/exams/${examId}/schedules`, values));
  return mapSchedule(schedule);
}

export async function updateExamSchedule(id: string, values: ExamScheduleFormValues): Promise<ExamSchedule> {
  const schedule = await unwrap(academicHttpClient.put<ApiExamSchedule>(`/api/exams/schedules/${id}`, values));
  return mapSchedule(schedule);
}

export async function deleteExamSchedule(id: string): Promise<void> {
  await unwrap(academicHttpClient.delete<void>(`/api/exams/schedules/${id}`));
}

// ── Marks entry ──────────────────────────────────────────────────────────

/**
 * The backend resolves the roster via the real Student.SectionId -> Section.ClassId FK chain
 * (a real improvement over the old className string match). This composes that id list with the
 * already-migrated, fully-mapped `listStudents()` so the UI keeps getting full `Student` objects
 * without duplicating students/api.ts's private section-name resolution here.
 */
export async function getExamRoster(examId: string) {
  const [rosterIds, allStudents] = await Promise.all([
    unwrap(academicHttpClient.get<ApiRosterEntry[]>(`/api/exams/${examId}/roster`)),
    listStudents(),
  ]);
  const ids = new Set(rosterIds.map((s) => s.id));
  return allStudents.filter((s) => ids.has(s.id));
}

export async function getExamResults(examId: string, subjectId?: string): Promise<ExamResult[]> {
  const results = await unwrap(
    academicHttpClient.get<ApiExamResult[]>(`/api/exams/${examId}/results`, { params: { subjectId } }),
  );
  return results.map(mapResult);
}

export async function saveExamResults(
  examId: string,
  subjectId: string,
  maxMarks: number,
  rows: ExamResultEntryRow[],
): Promise<ExamResult[]> {
  const results = await unwrap(
    academicHttpClient.post<ApiExamResult[]>(`/api/exams/${examId}/results`, {
      subjectId,
      maxMarks,
      entries: rows.map((r) => ({ studentId: r.studentId, marksObtained: r.marksObtained, isAbsent: r.isAbsent })),
    }),
  );
  return results.map(mapResult);
}

// ── Results, ranking & report cards ─────────────────────────────────────

export async function getExamClassResults(examId: string): Promise<StudentExamSummary[]> {
  const summaries = await unwrap(academicHttpClient.get<ApiStudentExamSummary[]>(`/api/exams/${examId}/class-results`));
  return summaries.map(mapSummary);
}

export async function getReportCard(examId: string, studentId: string): Promise<StudentExamSummary | null> {
  const summaries = await getExamClassResults(examId);
  return summaries.find((s) => s.studentId === studentId) ?? null;
}

export async function getRemark(examId: string, studentId: string): Promise<string> {
  const result = await unwrap(academicHttpClient.get<{ remarks: string }>(`/api/exams/${examId}/remarks/${studentId}`));
  return result.remarks;
}

export async function saveRemark(examId: string, studentId: string, remarks: string): Promise<void> {
  await unwrap(academicHttpClient.post<void>(`/api/exams/${examId}/remarks/${studentId}`, { remarks }));
}

// ── Transcript ───────────────────────────────────────────────────────────

export async function getTranscript(studentId: string): Promise<Transcript> {
  const transcript = await unwrap(academicHttpClient.get<ApiTranscript>(`/api/exams/transcript/${studentId}`));
  return mapTranscript(transcript);
}
