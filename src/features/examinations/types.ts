export type ExamType = "internal" | "midterm" | "final" | "practical" | "viva";
export type ExamStatus = "scheduled" | "ongoing" | "completed";

export interface Exam {
  id: string;
  tenantId: string;
  branchId: string;
  name: string;
  examType: ExamType;
  termId: string;
  classId: string;
  startDate: string;
  endDate: string;
  status: ExamStatus;
}

export interface ExamFormValues {
  name: string;
  examType: ExamType;
  termId: string;
  classId: string;
  startDate: string;
  endDate: string;
  status: ExamStatus;
}

export interface ExamSchedule {
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
  room?: string;
}

export interface ExamScheduleFormValues {
  subjectId: string;
  date: string;
  startTime: string;
  endTime: string;
  maxMarks: number;
  passMarks: number;
  room?: string;
}

export interface ExamResult {
  id: string;
  tenantId: string;
  branchId: string;
  examId: string;
  subjectId: string;
  studentId: string;
  marksObtained: number;
  maxMarks: number;
  grade: string;
  isAbsent?: boolean;
}

/** One row of a bulk marks-entry save for a single exam + subject schedule. */
export interface ExamResultEntryRow {
  studentId: string;
  marksObtained: number;
  isAbsent: boolean;
}

export interface GradeBand {
  grade: string;
  minPercentage: number;
  gradePoint: number;
}

export interface SubjectResultRow {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  marksObtained: number;
  maxMarks: number;
  grade: string;
  isAbsent: boolean;
}

export interface StudentExamSummary {
  studentId: string;
  studentName: string;
  admissionNumber: string;
  className: string;
  section: string;
  subjects: SubjectResultRow[];
  totalObtained: number;
  totalMax: number;
  percentage: number;
  grade: string;
  gpa: number;
  rank: number;
}

export interface TranscriptRow {
  examId: string;
  examName: string;
  examType: ExamType;
  termName: string;
  academicYearName: string;
  totalObtained: number;
  totalMax: number;
  percentage: number;
  grade: string;
  gpa: number;
}

export interface Transcript {
  studentId: string;
  studentName: string;
  admissionNumber: string;
  rows: TranscriptRow[];
  cgpa: number;
}
