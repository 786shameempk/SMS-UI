/** Mirrors AiService's generation DTOs (api/ai/generate-*). Everything it returns is an unreviewed draft. */

export type AiQuestionKind = "MCQ" | "TrueFalse" | "FillInBlank" | "ShortAnswer" | "LongAnswer";
export type AiDifficulty = "Easy" | "Medium" | "Hard";

export interface GenerationResult<T> {
  content: T;
  aiGenerated: boolean;
  status: "Draft";
  model: string;
}

export interface ClassSubjectBody {
  classId: string;
  subjectId: string;
}

export interface GeneratedQuestion {
  question: string;
  type: AiQuestionKind;
  marks: number;
  difficulty: AiDifficulty;
  options: string[];
  correctAnswer: string;
  explanation: string;
  learningObjective: string;
}

export interface GeneratedQuestionSet {
  questions: GeneratedQuestion[];
}

export interface QuestionsRequest extends ClassSubjectBody {
  chapter: string;
  questionCount: number;
  difficulty: AiDifficulty;
  questionTypes: AiQuestionKind[];
  learningObjectives?: string;
  material?: string;
}

export interface ExamSectionRequest {
  type: AiQuestionKind;
  count: number;
  marksEach: number;
}

export interface ExamRequest extends ClassSubjectBody {
  chapters: string[];
  totalMarks?: number;
  durationMinutes: number;
  easy: number;
  medium: number;
  hard: number;
  sections: ExamSectionRequest[];
  learningObjectives?: string;
  material?: string;
}

export interface GeneratedSection {
  name: string;
  instructions: string;
  questions: GeneratedQuestion[];
}

export interface AnswerKeyEntry {
  section: string;
  number: number;
  answer: string;
  explanation: string;
  marks: number;
}

export interface ExamPaper {
  title: string;
  totalMarks: number;
  durationMinutes: number;
  sections: GeneratedSection[];
  answerKey: AnswerKeyEntry[];
  difficultyCounts: Record<string, number>;
}

export interface WorksheetRequest extends ClassSubjectBody {
  topic: string;
  difficulty: AiDifficulty;
  questionCount: number;
  language?: string;
  kinds?: string[];
}

export interface WorksheetItem {
  prompt: string;
  options: string[];
  answer: string;
  marks: number;
}

export interface WorksheetSection {
  kind: string;
  instructions: string;
  items: WorksheetItem[];
}

export interface Worksheet {
  title: string;
  sections: WorksheetSection[];
}

export interface LessonPlanRequest extends ClassSubjectBody {
  topic: string;
  durationMinutes: number;
  learningObjectives?: string;
  studentLevel?: string;
}

export interface LessonActivity {
  title: string;
  description: string;
  minutes: number;
}

export interface LessonPlan {
  title: string;
  learningObjectives: string[];
  introduction: LessonActivity;
  teachingActivities: LessonActivity[];
  examples: string[];
  studentActivities: LessonActivity[];
  assessment: string;
  homework: string;
  materialsRequired: string[];
  differentiationSuggestions: string[];
}

export interface HomeworkRequest extends ClassSubjectBody {
  topic: string;
  difficulty: AiDifficulty;
  taskCount: number;
  learningObjectives?: string;
  performanceSummary?: string;
}

export interface HomeworkTask {
  description: string;
  difficulty: AiDifficulty;
  estimatedMinutes: number;
  learningObjective: string;
}

export interface Homework {
  title: string;
  instructions: string;
  tasks: HomeworkTask[];
  extensionTask: string;
  supportTask: string;
}

export type RemarkTone = "Encouraging" | "Balanced" | "Formal";
export type RemarkLength = "Short" | "Medium";

/** AiService reads the marks itself (with the teacher's token); the request only says which student and exam. */
export interface ReportCardRemarkRequest {
  examId: string;
  studentId: string;
  observations?: string;
  tone: RemarkTone;
  length: RemarkLength;
  language?: string;
}

export interface ReportCardRemark {
  remark: string;
  /** Which records the draft used, e.g. "Exam marks", "Earlier exams", "Your observations". */
  basedOn: string[];
}

export interface RemarkStyle {
  tone: RemarkTone;
  length: RemarkLength;
  language?: string;
}

export interface ReportCardRemarkBatchRequest extends RemarkStyle {
  examId: string;
  students: { studentId: string; observations?: string }[];
}

/** One student's draft, or why there is none (errorCode/error). */
export interface BatchRemarkItem {
  studentId: string;
  remark: string | null;
  basedOn: string[];
  errorCode: string | null;
  error: string | null;
}

export interface ReportCardRemarkBatchResult {
  items: BatchRemarkItem[];
  aiGenerated: boolean;
  status: "Draft";
  model: string | null;
}

export interface DifficultConcept {
  concept: string;
  questionNumbers: number[];
  evidence: string;
}

export interface RevisionTopic {
  topic: string;
  reason: string;
  suggestion: string;
}

/** Computed by AiService from the exam statistics, not by the model. */
export interface TopicStat {
  topic: string;
  questionNumbers: number[];
  averageCorrect: number;
}

export interface ExamInsights {
  summary: string;
  difficultConcepts: DifficultConcept[];
  revisionTopics: RevisionTopic[];
  teachingSuggestions: string[];
  studentsSubmitted: number;
  classAverage: number | null;
  topics: TopicStat[];
  weakestQuestions: { number: number; text: string; topic: string | null; correctPercentage: number; unansweredPercentage: number }[];
}

export interface PerformancePoint {
  area: string;
  evidence: string;
}

export interface ImprovementArea extends PerformancePoint {
  suggestion: string;
}

/** A subject across the recent exams (oldest first); null where the student was absent or the exam could not be read. */
export interface SubjectTrend {
  subject: string;
  percentages: (number | null)[];
  change: number | null;
}

export interface StudentPerformance {
  summary: string;
  strengths: PerformancePoint[];
  areasToImprove: ImprovementArea[];
  talkingPoints: string[];
  exams: { exam: string; percentage: number; grade: string | null }[];
  recentExamNames: string[];
  subjects: SubjectTrend[];
  attendancePercent: number | null;
  attendanceDays: number;
}
