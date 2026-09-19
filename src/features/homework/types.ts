export type HomeworkStatus = "draft" | "published";

export interface Homework {
  id: string;
  title: string;
  description: string;
  subjectId: string;
  classId: string;
  sectionId?: string;
  staffId: string;
  assignedDate: string;
  dueDate: string;
  attachmentNote?: string;
  status: HomeworkStatus;
}

export interface HomeworkFormValues {
  title: string;
  description: string;
  subjectId: string;
  classId: string;
  sectionId?: string;
  staffId: string;
  assignedDate: string;
  dueDate: string;
  attachmentNote?: string;
  status: HomeworkStatus;
}

export type SubmissionStatus = "not_submitted" | "submitted" | "graded" | "resubmit_requested";

export interface HomeworkSubmission {
  id: string;
  homeworkId: string;
  studentId: string;
  submittedAt?: string;
  content: string;
  status: SubmissionStatus;
  grade?: string | number;
  feedback?: string;
}

/** A homework paired with the signed-in student's own submission row, for the student-facing list. */
export interface AssignedHomeworkRow {
  homework: Homework;
  submission: HomeworkSubmission;
}

export type ResourceType = "video" | "notes" | "pdf" | "ppt" | "quiz" | "discussion";

export interface LearningResource {
  id: string;
  subjectId: string;
  classId: string;
  title: string;
  type: ResourceType;
  url?: string;
  description?: string;
  createdByStaffId: string;
  /** Set only when type === "quiz", linking to the underlying Quiz record. */
  quizId?: string;
  createdAt: string;
}

export interface LearningResourceFormValues {
  subjectId: string;
  classId: string;
  title: string;
  type: ResourceType;
  url?: string;
  description?: string;
  createdByStaffId: string;
}

export interface QuizQuestion {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
}

export interface Quiz {
  id: string;
  subjectId: string;
  classId: string;
  title: string;
  questions: QuizQuestion[];
}

export interface QuizFormValues {
  subjectId: string;
  classId: string;
  title: string;
  questions: Array<{ text: string; options: string[]; correctIndex: number }>;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  studentId: string;
  score: number;
  submittedAt: string;
}

export interface DiscussionComment {
  id: string;
  resourceId: string;
  authorName: string;
  authorRole: string;
  text: string;
  postedAt: string;
}

export interface DiscussionCommentFormValues {
  authorName: string;
  authorRole: string;
  text: string;
}

export interface LearningProgressRow {
  studentId: string;
  studentName: string;
  className: string;
  section: string;
  homeworkAssignedCount: number;
  homeworkSubmittedOnTimeCount: number;
  homeworkSubmittedOnTimePct: number;
  resourceCount: number;
  resourceViewedCount: number;
  resourceViewedPct: number;
}
