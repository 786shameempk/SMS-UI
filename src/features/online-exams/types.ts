/** Online Exams - mirrors AcademicService's DTOs (enums arrive as their PascalCase names). */

export type QuestionType = "SingleChoice" | "MultipleSelect" | "TrueFalse" | "FillInBlank" | "ShortAnswer" | "LongAnswer";
export type QuestionDifficulty = "Easy" | "Medium" | "Hard";
export type OnlineExamType = "ClassTest" | "UnitTest" | "Quiz" | "MidTerm" | "Final" | "Practice";
export type OnlineExamStatus = "Draft" | "Scheduled" | "Active" | "Completed" | "Published" | "Cancelled";
export type AssignmentKind = "Class" | "Section" | "Student";
export type AttemptStatus = "InProgress" | "Submitted" | "TimedOut";
export type MyExamState = "NotStarted" | "InProgress" | "Submitted" | "Missed";

// ── Question bank ──

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
  sortOrder: number;
}

export interface QuestionBankItem {
  id: string;
  type: QuestionType;
  text: string;
  subjectId: string;
  subjectName: string | null;
  classId: string | null;
  className: string | null;
  topic: string | null;
  difficulty: QuestionDifficulty;
  marks: number;
  explanation: string | null;
  modelAnswer: string | null;
  acceptedAnswers: string[];
  caseSensitive: boolean;
  tags: string[];
  options: QuestionOption[];
  createdByName: string | null;
  createdAt: string;
  updatedAt: string | null;
  usedInExams: number;
  canEdit: boolean;
}

export interface QuestionOptionInput {
  text: string;
  isCorrect: boolean;
}

/** The part of a question shared by bank questions and questions written straight into an exam. */
export interface QuestionContent {
  type: QuestionType;
  text: string;
  marks: number;
  explanation: string | null;
  modelAnswer: string | null;
  acceptedAnswers: string[] | null;
  caseSensitive: boolean;
  options: QuestionOptionInput[] | null;
}

export interface QuestionBankInput {
  content: QuestionContent;
  subjectId: string;
  classId: string | null;
  topic: string | null;
  difficulty: QuestionDifficulty;
  tags: string[];
}

export interface QuestionFilters {
  subjectId?: string;
  classId?: string;
  topic?: string;
  difficulty?: QuestionDifficulty;
  type?: QuestionType;
  search?: string;
}

export interface QuestionImportResult {
  imported: number;
  errors: string[];
}

// ── Exams (staff) ──

export interface ExamSettings {
  passingMarks: number;
  maxAttempts: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showQuestionNumbers: boolean;
  allowBackNavigation: boolean;
  autoSubmitOnTimeout: boolean;
  showResultImmediately: boolean;
  allowReviewBeforeSubmit: boolean;
  showAnswersInResult: boolean;
  negativeMarkPerWrong: number;
}

export interface ExamQuestion {
  id: string;
  sourceQuestionId: string | null;
  sortOrder: number;
  marks: number;
  type: QuestionType;
  text: string;
  explanation: string | null;
  modelAnswer: string | null;
  acceptedAnswers: string[];
  caseSensitive: boolean;
  options: QuestionOption[];
}

export interface ExamAssignment {
  kind: AssignmentKind;
  targetId: string;
  label: string;
}

export interface OnlineExamListItem {
  id: string;
  name: string;
  examType: OnlineExamType;
  subjectId: string;
  subjectName: string | null;
  classId: string;
  className: string | null;
  sectionId: string | null;
  sectionName: string | null;
  startUtc: string;
  endUtc: string;
  durationMinutes: number;
  timeZoneId: string;
  totalMarks: number;
  passingMarks: number;
  status: OnlineExamStatus;
  questionCount: number;
  assignedCount: number;
  submittedCount: number;
  pendingEvaluationCount: number;
  ownerName: string | null;
  teacherName: string | null;
  createdAt: string;
  canManage: boolean;
}

export interface OnlineExamDetail extends OnlineExamListItem {
  description: string | null;
  academicYearId: string | null;
  teacherStaffId: string | null;
  settings: ExamSettings;
  questions: ExamQuestion[];
  assignments: ExamAssignment[];
  cancelReason: string | null;
  resultsPublishedAt: string | null;
  hasAttempts: boolean;
}

export interface ExamQuestionInput {
  sourceQuestionId: string | null;
  content: QuestionContent;
}

export interface OnlineExamInput {
  name: string;
  description: string | null;
  academicYearId: string | null;
  examType: OnlineExamType;
  subjectId: string;
  classId: string;
  sectionId: string | null;
  teacherStaffId: string | null;
  startUtc: string;
  endUtc: string;
  durationMinutes: number;
  timeZoneId: string | null;
  settings: ExamSettings;
  questions: ExamQuestionInput[];
  assignments: { kind: AssignmentKind; targetId: string }[];
}

export interface ExamFilters {
  status?: OnlineExamStatus;
  classId?: string;
  subjectId?: string;
  from?: string;
  to?: string;
  search?: string;
}

export interface AuthoringOptions {
  teachers: { id: string; name: string }[];
  academicYears: { id: string; name: string }[];
}

// ── Dashboard, results, reports ──

export interface LabelValue {
  label: string;
  value: number;
}

export interface OnlineExamDashboard {
  totalExams: number;
  upcomingExams: number;
  activeExams: number;
  completedExams: number;
  draftExams: number;
  studentsAppeared: number;
  averageScore: number | null;
  pendingEvaluations: number;
  performanceOverTime: { examId: string; examName: string; date: string; averagePercentage: number }[];
  subjectPerformance: LabelValue[];
  passed: number;
  failed: number;
  participation: { examId: string; examName: string; assigned: number; appeared: number }[];
  upcoming: OnlineExamListItem[];
}

export type ResultRowStatus = "Passed" | "Failed" | "Absent" | "PendingEvaluation" | "InProgress" | "NotStarted";

export interface ExamResultRow {
  studentId: string;
  studentName: string;
  rollNumber: string | null;
  classLabel: string | null;
  attemptId: string | null;
  score: number | null;
  percentage: number | null;
  grade: string | null;
  status: ResultRowStatus;
  submittedAt: string | null;
}

export interface ExamResults {
  exam: OnlineExamListItem;
  summary: {
    totalStudents: number;
    appeared: number;
    absent: number;
    passed: number;
    failed: number;
    pendingEvaluation: number;
    averageScore: number | null;
    highestScore: number | null;
    lowestScore: number | null;
    averagePercentage: number | null;
  };
  rows: ExamResultRow[];
}

export interface QuestionAnalysis {
  questionId: string;
  number: number;
  text: string;
  type: QuestionType;
  marks: number;
  answered: number;
  unanswered: number;
  correctPercentage: number;
  incorrectPercentage: number;
  unansweredPercentage: number;
  averageMarks: number;
}

export interface ExamAnalysis {
  exam: OnlineExamListItem;
  questions: QuestionAnalysis[];
  sectionAverages: { label: string; students: number; averagePercentage: number }[];
  scoreDistribution: LabelValue[];
  classAverage: number | null;
}

// ── Evaluation ──

export interface EvaluationQueueItem {
  examId: string;
  examName: string;
  subjectName: string | null;
  className: string | null;
  endUtc: string;
  attemptsPending: number;
  answersPending: number;
  firstPendingAttemptId: string | null;
}

export interface ReviewOption {
  id: string;
  text: string;
  isCorrect: boolean;
  selected: boolean;
}

export interface ReviewQuestion {
  questionId: string;
  number: number;
  type: QuestionType;
  text: string;
  marks: number;
  options: ReviewOption[];
  textAnswer: string | null;
  expectedAnswer: string | null;
  explanation: string | null;
  answered: boolean;
  isCorrect: boolean | null;
  autoMarks: number | null;
  awardedMarks: number | null;
  comment: string | null;
  needsEvaluation: boolean;
}

export interface AttemptReview {
  examId: string;
  examName: string;
  attemptId: string;
  studentId: string;
  studentName: string;
  rollNumber: string | null;
  classLabel: string | null;
  status: AttemptStatus;
  submittedAt: string | null;
  totalMarks: number;
  obtainedMarks: number;
  percentage: number;
  grade: string;
  passed: boolean;
  pendingEvaluationCount: number;
  questions: ReviewQuestion[];
  nextPendingAttemptId: string | null;
  canEvaluate: boolean;
}

export interface EvaluationInput {
  questionId: string;
  awardedMarks: number;
  comment: string | null;
}

// ── Student ──

export interface MyOnlineExam {
  id: string;
  name: string;
  examType: OnlineExamType;
  subjectName: string | null;
  description: string | null;
  startUtc: string;
  endUtc: string;
  durationMinutes: number;
  totalMarks: number;
  questionCount: number;
  status: OnlineExamStatus;
  myState: MyExamState;
  attemptsUsed: number;
  maxAttempts: number;
  canStart: boolean;
  lastSubmittedAt: string | null;
  resultAvailable: boolean;
}

export interface AttemptQuestion {
  id: string;
  number: number;
  type: QuestionType;
  text: string;
  marks: number;
  options: { id: string; text: string }[];
}

export interface SavedAnswer {
  questionId: string;
  selectedOptionIds: string[];
  textAnswer: string | null;
  markedForReview: boolean;
}

export interface AttemptSession {
  examId: string;
  attemptId: string;
  attemptNumber: number;
  examName: string;
  subjectName: string | null;
  studentName: string;
  serverNowUtc: string;
  deadlineUtc: string;
  totalMarks: number;
  autoSubmitOnTimeout: boolean;
  allowBackNavigation: boolean;
  showQuestionNumbers: boolean;
  allowReviewBeforeSubmit: boolean;
  questions: AttemptQuestion[];
  answers: SavedAnswer[];
}

export interface AnswerInput {
  questionId: string;
  selectedOptionIds: string[];
  textAnswer: string | null;
  markedForReview: boolean;
}

export interface SubmitResult {
  examId: string;
  attemptId: string;
  examName: string;
  submittedAt: string;
  status: AttemptStatus;
  answered: number;
  totalQuestions: number;
  resultAvailable: boolean;
}

export interface MyResultQuestion {
  number: number;
  type: QuestionType;
  text: string;
  marks: number;
  awardedMarks: number | null;
  isCorrect: boolean | null;
  options: ReviewOption[];
  textAnswer: string | null;
  expectedAnswer: string | null;
  explanation: string | null;
  teacherComment: string | null;
}

export interface MyResult {
  examId: string;
  examName: string;
  subjectName: string | null;
  submittedAt: string | null;
  totalMarks: number;
  obtainedMarks: number;
  percentage: number;
  grade: string;
  passed: boolean;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  pendingEvaluation: boolean;
  showAnswers: boolean;
  questions: MyResultQuestion[];
}

export interface AssignableStudent {
  id: string;
  name: string;
  rollNumber: string | null;
  admissionNumber: string;
  sectionId: string;
  classId: string;
  sectionLabel: string | null;
}
