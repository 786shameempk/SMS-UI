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
  /** Optional internal / continuous-evaluation (CE) part of maxMarks; the rest is the actual (external) mark. */
  internalMaxMarks?: number;
  /** Assessment components copied from a structure when the subject was scheduled (PT, NBS, Half Yearly ...). Empty = no split. */
  components?: AssessmentComponent[];
  structureId?: string;
  passMarks: number;
  room?: string;
  /** Open while marks are being entered; Submitted once handed in. */
  marksStatus?: "Open" | "Submitted";
}

export interface ExamScheduleFormValues {
  subjectId: string;
  date: string;
  startTime: string;
  endTime: string;
  maxMarks: number;
  /** Optional: how many of maxMarks are internal (CE) marks. Null/undefined = no internal component. */
  internalMaxMarks?: number | null;
  /** Components to schedule with (they set the max marks), or a structure to copy them from. */
  components?: AssessmentComponentInput[];
  structureId?: string | null;
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
  /** Total: internal + actual. */
  marksObtained: number;
  maxMarks: number;
  internalMarks?: number;
  internalMaxMarks?: number;
  /** The mark per component key when the subject has assessment components. */
  componentMarks?: Record<string, number>;
  /** Exempt or NotApplicable: the student does not sit this subject. */
  exemption?: Exemption;
  grade: string;
  isAbsent?: boolean;
}

/** One row of a bulk marks-entry save for a single exam + subject schedule. */
export interface ExamResultEntryRow {
  studentId: string;
  /** Total marks - used when the subject has no internal component. */
  marksObtained: number;
  /** With an internal component: the CE mark and the actual mark; the server adds them up. */
  internalMarks?: number;
  externalMarks?: number;
  /** With assessment components: the mark per component key; the server totals them. */
  components?: Record<string, number>;
  exemption?: Exemption;
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
  /** Total: internal + actual. */
  marksObtained: number;
  maxMarks: number;
  /** Present only when the subject has an internal (CE) component. */
  internalMarks?: number;
  internalMaxMarks?: number;
  /** The actual (external) part: the total minus the internal marks. */
  externalMarks: number;
  externalMaxMarks: number;
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

// ── Assessment structures ───────────────────────────────────────────────

/** One part of a subject's marks. Counts = adds to the total; optional = may be left blank; showOnCard = a progress card may print it. */
export interface AssessmentComponent {
  key: string;
  label: string;
  max: number;
  optional: boolean;
  counts: boolean;
  showOnCard: boolean;
}

/** What the builder sends: the key is kept for a component that already exists so entered marks stay attached to it. */
export type AssessmentComponentInput = Omit<AssessmentComponent, "key"> & { key?: string };

export interface AssessmentStructure {
  id: string;
  name: string;
  board?: string;
  description?: string;
  version: number;
  status: string;
  components: AssessmentComponent[];
  totalMax: number;
  updatedAt?: string;
}

export interface AssessmentStructureForm {
  name: string;
  board?: string;
  description?: string;
  components: AssessmentComponentInput[];
}

export interface AssessmentAssignment {
  id: string;
  structureId: string;
  structureName: string;
  classId?: string;
  className?: string;
  subjectId?: string;
  subjectName?: string;
  academicYearId?: string;
  academicYearName?: string;
}

export type Exemption = "Exempt" | "NotApplicable";

/** How far mark entry has got for one subject of an exam. */
export interface MarksProgress {
  scheduleId: string;
  subjectId: string;
  status: "Open" | "Submitted";
  entered: number;
  expected: number;
  submittedAt?: string;
  submittedBy?: string;
}
