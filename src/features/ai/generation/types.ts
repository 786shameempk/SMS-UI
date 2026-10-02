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
