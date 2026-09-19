import type { HomeworkStatus, ResourceType, SubmissionStatus } from "./types";

const DAY_MS = 1000 * 60 * 60 * 24;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY_MS).toISOString();
const daysFromNow = (n: number) => new Date(Date.now() + n * DAY_MS).toISOString();

/**
 * Teacher/staff records referenced below (teacher@educore.dev, james.carter@educore.dev,
 * priya.nair@educore.dev) already exist by the time this seed runs — the first two ship
 * with the staff module, the third is created by the teachers module's own seed. staffId
 * is resolved by email at seed time (see performSeed in api.ts) so this file never needs
 * to know generated staff ids.
 */
export interface HomeworkSeed {
  id: string;
  teacherEmail: string;
  subjectId: string;
  classId: string;
  title: string;
  description: string;
  assignedDate: string;
  dueDate: string;
  attachmentNote?: string;
  status: HomeworkStatus;
}

export const HOMEWORK_SEED_PLAN: HomeworkSeed[] = [
  {
    id: "hw-1",
    teacherEmail: "teacher@educore.dev",
    subjectId: "subj-2",
    classId: "class-8",
    title: "Algebra practice set 1",
    description: "Solve the linear equations worksheet, questions 1 through 20, showing all working.",
    assignedDate: daysAgo(9),
    dueDate: daysAgo(2),
    attachmentNote: "Worksheet: algebra-practice-1.pdf",
    status: "published",
  },
  {
    id: "hw-2",
    teacherEmail: "teacher@educore.dev",
    subjectId: "subj-2",
    classId: "class-8",
    title: "Quadratic factoring drills",
    description: "Factor the ten quadratic expressions on the handout and check each by expansion.",
    assignedDate: daysAgo(2),
    dueDate: daysFromNow(3),
    status: "published",
  },
  {
    id: "hw-3",
    teacherEmail: "james.carter@educore.dev",
    subjectId: "subj-3",
    classId: "class-8",
    title: "States of matter lab report",
    description: "Write up your observations from the states-of-matter lab demonstration.",
    assignedDate: daysAgo(6),
    dueDate: daysAgo(1),
    attachmentNote: "Lab sheet: states-of-matter.docx",
    status: "published",
  },
  {
    id: "hw-4",
    teacherEmail: "priya.nair@educore.dev",
    subjectId: "subj-1",
    classId: "class-8",
    title: "Essay: my favourite season",
    description: "Write a 300-word descriptive essay using the five-paragraph structure covered in class.",
    assignedDate: daysAgo(1),
    dueDate: daysFromNow(6),
    status: "published",
  },
  {
    id: "hw-5",
    teacherEmail: "james.carter@educore.dev",
    subjectId: "subj-4",
    classId: "class-10",
    title: "Newton's laws problem set",
    description: "Solve the five numerical problems applying Newton's three laws of motion.",
    assignedDate: daysAgo(8),
    dueDate: daysAgo(3),
    status: "published",
  },
  {
    id: "hw-6",
    teacherEmail: "james.carter@educore.dev",
    subjectId: "subj-4",
    classId: "class-10",
    title: "Projectile motion worksheet",
    description: "Complete the projectile-motion practice worksheet and graph the trajectories.",
    assignedDate: daysAgo(3),
    dueDate: daysFromNow(4),
    status: "published",
  },
  {
    id: "hw-7",
    teacherEmail: "priya.nair@educore.dev",
    subjectId: "subj-1",
    classId: "class-3",
    title: "Grammar workbook pages 12-14",
    description: "Complete the common-noun and action-verb exercises on pages 12 to 14.",
    assignedDate: daysAgo(5),
    dueDate: daysAgo(0),
    status: "published",
  },
  {
    id: "hw-8",
    teacherEmail: "priya.nair@educore.dev",
    subjectId: "subj-1",
    classId: "class-3",
    title: "Weekly reading log (draft)",
    description: "Draft of a weekly reading log template — not yet published to students.",
    assignedDate: daysAgo(0),
    dueDate: daysFromNow(7),
    status: "draft",
  },
];

export interface SubmissionSeed {
  homeworkId: string;
  studentId: string;
  status: SubmissionStatus;
  content?: string;
  submittedDaysAgo?: number;
  grade?: string | number;
  feedback?: string;
}

/**
 * Only the "interesting" (non not_submitted) rows are seeded explicitly; api.ts lazily
 * materializes a not_submitted row for every other eligible, active student on first read.
 */
export const SUBMISSION_SEED_PLAN: SubmissionSeed[] = [
  {
    homeworkId: "hw-1",
    studentId: "stu-1",
    status: "graded",
    content: "Attached working for all 20 questions, double-checked answers 15-20.",
    submittedDaysAgo: 3,
    grade: "A",
    feedback: "Neat and accurate work, well done!",
  },
  {
    homeworkId: "hw-3",
    studentId: "stu-1",
    status: "resubmit_requested",
    content: "Observations for the solid-to-liquid transition only.",
    submittedDaysAgo: 2,
    feedback: "Please add the liquid-to-gas transition observations and resubmit.",
  },
  {
    homeworkId: "hw-5",
    studentId: "stu-2",
    status: "graded",
    content: "All five problems solved with force diagrams attached.",
    submittedDaysAgo: 4,
    grade: 92,
    feedback: "Excellent application of the third law.",
  },
  {
    homeworkId: "hw-6",
    studentId: "stu-2",
    status: "submitted",
    content: "Completed worksheet; trajectory graphs described in the notes below.",
    submittedDaysAgo: 1,
  },
  {
    homeworkId: "hw-7",
    studentId: "stu-3",
    status: "submitted",
    content: "Completed pages 12-14, attached answers for all exercises.",
    submittedDaysAgo: 1,
  },
];

export interface LearningResourceSeed {
  id: string;
  teacherEmail: string;
  subjectId: string;
  classId: string;
  title: string;
  type: ResourceType;
  url?: string;
  description?: string;
  quizId?: string;
}

export const RESOURCE_SEED_PLAN: LearningResourceSeed[] = [
  {
    id: "res-1",
    teacherEmail: "teacher@educore.dev",
    subjectId: "subj-2",
    classId: "class-8",
    title: "Algebra basics — video walkthrough",
    type: "video",
    url: "https://www.youtube.com/watch?v=algebra-basics-demo",
    description: "15-minute recap of solving linear equations in one variable.",
  },
  {
    id: "res-2",
    teacherEmail: "james.carter@educore.dev",
    subjectId: "subj-3",
    classId: "class-8",
    title: "States of matter — lecture notes",
    type: "notes",
    url: "https://drive.google.com/file/d/states-of-matter-notes",
    description: "Condensed notes covering solid, liquid, and gas transitions.",
  },
  {
    id: "res-3",
    teacherEmail: "priya.nair@educore.dev",
    subjectId: "subj-1",
    classId: "class-3",
    title: "Grammar worksheet pack",
    type: "pdf",
    url: "https://drive.google.com/file/d/grammar-worksheet-pack",
    description: "Printable common-noun and action-verb practice sheets.",
  },
  {
    id: "res-4",
    teacherEmail: "james.carter@educore.dev",
    subjectId: "subj-4",
    classId: "class-10",
    title: "Newton's laws — slide deck",
    type: "ppt",
    url: "https://drive.google.com/file/d/newtons-laws-slides",
    description: "Slides used in class covering all three laws with worked examples.",
  },
  {
    id: "res-5",
    teacherEmail: "teacher@educore.dev",
    subjectId: "subj-2",
    classId: "class-8",
    title: "Ask your algebra doubts",
    type: "discussion",
    description: "Post questions about the algebra homework here and the teacher will respond.",
  },
  {
    id: "res-6",
    teacherEmail: "james.carter@educore.dev",
    subjectId: "subj-4",
    classId: "class-10",
    title: "Newton's laws — quick quiz",
    type: "quiz",
    quizId: "quiz-1",
    description: "Five quick questions to check your understanding of the three laws.",
  },
];

export interface QuizSeed {
  id: string;
  subjectId: string;
  classId: string;
  title: string;
  questions: Array<{ id: string; text: string; options: string[]; correctIndex: number }>;
}

export const QUIZ_SEED_PLAN: QuizSeed[] = [
  {
    id: "quiz-1",
    subjectId: "subj-4",
    classId: "class-10",
    title: "Newton's laws — quick quiz",
    questions: [
      {
        id: "quiz-1-q1",
        text: "An object in motion stays in motion unless acted on by an external force. Which law is this?",
        options: ["First law", "Second law", "Third law", "Law of gravitation"],
        correctIndex: 0,
      },
      {
        id: "quiz-1-q2",
        text: "F = ma is the mathematical form of which law?",
        options: ["First law", "Second law", "Third law", "None of the above"],
        correctIndex: 1,
      },
      {
        id: "quiz-1-q3",
        text: "For every action there is an equal and opposite reaction. Which law states this?",
        options: ["First law", "Second law", "Third law", "Law of inertia"],
        correctIndex: 2,
      },
      {
        id: "quiz-1-q4",
        text: "The SI unit of force is:",
        options: ["Joule", "Watt", "Newton", "Pascal"],
        correctIndex: 2,
      },
      {
        id: "quiz-1-q5",
        text: "Inertia is the tendency of an object to:",
        options: ["Accelerate on its own", "Resist a change in its state of motion", "Lose mass over time", "Gain energy at rest"],
        correctIndex: 1,
      },
    ],
  },
];

export interface DiscussionSeed {
  resourceId: string;
  authorName: string;
  authorRole: string;
  text: string;
  postedDaysAgo: number;
}

export const DISCUSSION_SEED_PLAN: DiscussionSeed[] = [
  {
    resourceId: "res-5",
    authorName: "Daniel Reyes",
    authorRole: "Teacher",
    text: "Post your questions on the algebra homework here and I'll respond within a day.",
    postedDaysAgo: 4,
  },
  {
    resourceId: "res-5",
    authorName: "Riya Kapoor",
    authorRole: "Student",
    text: "For question 12, do we simplify before or after moving terms across?",
    postedDaysAgo: 3,
  },
  {
    resourceId: "res-5",
    authorName: "Daniel Reyes",
    authorRole: "Teacher",
    text: "Move terms across first, then simplify — that keeps the signs easier to track.",
    postedDaysAgo: 2,
  },
];

export interface QuizAttemptSeed {
  quizId: string;
  studentId: string;
  score: number;
  submittedDaysAgo: number;
}

export const QUIZ_ATTEMPT_SEED_PLAN: QuizAttemptSeed[] = [{ quizId: "quiz-1", studentId: "stu-2", score: 80, submittedDaysAgo: 2 }];

export interface ResourceViewSeed {
  resourceId: string;
  studentId: string;
}

export const RESOURCE_VIEW_SEED_PLAN: ResourceViewSeed[] = [
  { resourceId: "res-1", studentId: "stu-1" },
  { resourceId: "res-5", studentId: "stu-1" },
  { resourceId: "res-4", studentId: "stu-2" },
  { resourceId: "res-3", studentId: "stu-3" },
];
