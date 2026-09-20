import { listClasses, listSections } from "@/features/academics/api";
import { listTeachers } from "@/features/teachers/api";
import { listStudents } from "@/features/students/api";
import type { Student } from "@/features/students/types";
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
import {
  DISCUSSION_SEED_PLAN,
  HOMEWORK_SEED_PLAN,
  QUIZ_ATTEMPT_SEED_PLAN,
  QUIZ_SEED_PLAN,
  RESOURCE_SEED_PLAN,
  RESOURCE_VIEW_SEED_PLAN,
  SUBMISSION_SEED_PLAN,
} from "./mock";
import type {
  AssignedHomeworkRow,
  DiscussionComment,
  DiscussionCommentFormValues,
  Homework,
  HomeworkFormValues,
  HomeworkSubmission,
  LearningProgressRow,
  LearningResource,
  LearningResourceFormValues,
  Quiz,
  QuizAttempt,
  QuizFormValues,
} from "./types";

const HOMEWORK_KEY = "sms-mock-homework";
const SUBMISSIONS_KEY = "sms-mock-homework-submissions";
const RESOURCES_KEY = "sms-mock-learning-resources";
const QUIZZES_KEY = "sms-mock-quizzes";
const QUIZ_ATTEMPTS_KEY = "sms-mock-quiz-attempts";
const DISCUSSION_KEY = "sms-mock-discussion-comments";
const RESOURCE_VIEWS_KEY = "sms-mock-resource-views";
const SEEDED_KEY = "sms-mock-homework-seeded";

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

const migrate = <T extends { tenantId: string; branchId?: string }>(records: T[]) =>
  migrateLegacyRecordsToDefaultBranch(migrateLegacyRecordsToDefaultTenant(records));

let homework = migrate(loadJson<Homework[]>(HOMEWORK_KEY, []));
let submissions = migrate(loadJson<HomeworkSubmission[]>(SUBMISSIONS_KEY, []));
let learningResources = migrate(loadJson<LearningResource[]>(RESOURCES_KEY, []));
let quizzes = migrate(loadJson<Quiz[]>(QUIZZES_KEY, []));
let quizAttempts = migrate(loadJson<QuizAttempt[]>(QUIZ_ATTEMPTS_KEY, []));
let discussionComments = migrate(loadJson<DiscussionComment[]>(DISCUSSION_KEY, []));
// resourceViewsByStudent is keyed by studentId, not tagged with tenantId directly — like
// RolePermissionMap in administration/roles, it's only ever reached via a studentId that
// already passed through a tenant-scoped lookup, so an opaque key keeps it safe.
let resourceViewsByStudent = loadJson<Record<string, string[]>>(RESOURCE_VIEWS_KEY, {});

const persistHomework = () => saveJson(HOMEWORK_KEY, homework);
const persistSubmissions = () => saveJson(SUBMISSIONS_KEY, submissions);
const persistResources = () => saveJson(RESOURCES_KEY, learningResources);
const persistQuizzes = () => saveJson(QUIZZES_KEY, quizzes);
const persistQuizAttempts = () => saveJson(QUIZ_ATTEMPTS_KEY, quizAttempts);
const persistDiscussion = () => saveJson(DISCUSSION_KEY, discussionComments);
const persistResourceViews = () => saveJson(RESOURCE_VIEWS_KEY, resourceViewsByStudent);

function requireEntity<T extends { id: string; tenantId: string; branchId: string }>(list: T[], id: string, label: string): T {
  const found = list.find((item) => item.id === id && item.tenantId === getCurrentTenantId() && item.branchId === getCurrentBranchId());
  if (!found) throw new Error(`${label} not found`);
  return found;
}

/**
 * One-time seed layered on top of academics/teachers/students via their public APIs only,
 * mirroring the pattern in features/teachers/api.ts. staffId is resolved by email since
 * staff records are created dynamically and don't have stable ids to hardcode.
 */
async function performSeed(): Promise<void> {
  if (loadJson(SEEDED_KEY, false)) return;

  const teachers = await listTeachers();
  const staffIdByEmail = new Map(teachers.map((t) => [t.email.toLowerCase(), t.id] as const));

  if (homework.length === 0) {
    const seeded: Homework[] = [];
    for (const plan of HOMEWORK_SEED_PLAN) {
      const staffId = staffIdByEmail.get(plan.teacherEmail.toLowerCase());
      if (!staffId) continue;
      seeded.push({
        id: plan.id,
        tenantId: DEFAULT_TENANT_ID,
        branchId: defaultBranchIdForTenant(DEFAULT_TENANT_ID),
        title: plan.title,
        description: plan.description,
        subjectId: plan.subjectId,
        classId: plan.classId,
        staffId,
        assignedDate: plan.assignedDate,
        dueDate: plan.dueDate,
        attachmentNote: plan.attachmentNote,
        status: plan.status,
      });
    }
    if (seeded.length) {
      homework = seeded;
      persistHomework();
    }
  }

  if (submissions.length === 0 && SUBMISSION_SEED_PLAN.length) {
    submissions = SUBMISSION_SEED_PLAN.map((plan) => ({
      id: genId("sub"),
      tenantId: DEFAULT_TENANT_ID,
      branchId: defaultBranchIdForTenant(DEFAULT_TENANT_ID),
      homeworkId: plan.homeworkId,
      studentId: plan.studentId,
      status: plan.status,
      content: plan.content ?? "",
      submittedAt: plan.submittedDaysAgo !== undefined ? new Date(Date.now() - plan.submittedDaysAgo * 86400000).toISOString() : undefined,
      grade: plan.grade,
      feedback: plan.feedback,
    }));
    persistSubmissions();
  }

  if (learningResources.length === 0) {
    const seeded: LearningResource[] = [];
    for (const plan of RESOURCE_SEED_PLAN) {
      const staffId = staffIdByEmail.get(plan.teacherEmail.toLowerCase());
      if (!staffId) continue;
      seeded.push({
        id: plan.id,
        tenantId: DEFAULT_TENANT_ID,
        branchId: defaultBranchIdForTenant(DEFAULT_TENANT_ID),
        subjectId: plan.subjectId,
        classId: plan.classId,
        title: plan.title,
        type: plan.type,
        url: plan.url,
        description: plan.description,
        createdByStaffId: staffId,
        quizId: plan.quizId,
        createdAt: new Date().toISOString(),
      });
    }
    if (seeded.length) {
      learningResources = seeded;
      persistResources();
    }
  }

  if (quizzes.length === 0 && QUIZ_SEED_PLAN.length) {
    quizzes = QUIZ_SEED_PLAN.map((plan) => ({
      id: plan.id,
      tenantId: DEFAULT_TENANT_ID,
      branchId: defaultBranchIdForTenant(DEFAULT_TENANT_ID),
      subjectId: plan.subjectId,
      classId: plan.classId,
      title: plan.title,
      questions: plan.questions,
    }));
    persistQuizzes();
  }

  if (discussionComments.length === 0 && DISCUSSION_SEED_PLAN.length) {
    discussionComments = DISCUSSION_SEED_PLAN.map((plan) => ({
      id: genId("disc"),
      tenantId: DEFAULT_TENANT_ID,
      branchId: defaultBranchIdForTenant(DEFAULT_TENANT_ID),
      resourceId: plan.resourceId,
      authorName: plan.authorName,
      authorRole: plan.authorRole,
      text: plan.text,
      postedAt: new Date(Date.now() - plan.postedDaysAgo * 86400000).toISOString(),
    }));
    persistDiscussion();
  }

  if (quizAttempts.length === 0 && QUIZ_ATTEMPT_SEED_PLAN.length) {
    quizAttempts = QUIZ_ATTEMPT_SEED_PLAN.map((plan) => ({
      id: genId("qa"),
      tenantId: DEFAULT_TENANT_ID,
      branchId: defaultBranchIdForTenant(DEFAULT_TENANT_ID),
      quizId: plan.quizId,
      studentId: plan.studentId,
      score: plan.score,
      submittedAt: new Date(Date.now() - plan.submittedDaysAgo * 86400000).toISOString(),
    }));
    persistQuizAttempts();
  }

  if (Object.keys(resourceViewsByStudent).length === 0 && RESOURCE_VIEW_SEED_PLAN.length) {
    const next: Record<string, string[]> = {};
    for (const plan of RESOURCE_VIEW_SEED_PLAN) {
      next[plan.studentId] = [...(next[plan.studentId] ?? []), plan.resourceId];
    }
    resourceViewsByStudent = next;
    persistResourceViews();
  }

  saveJson(SEEDED_KEY, true);
}

const seedPromise: Promise<void> = performSeed().catch((err) => {
  console.error("Failed to seed homework mock data", err);
});

function sectionLetterOf(name: string): string {
  return name.replace(/^section\s*/i, "").trim();
}

async function eligibleStudentsFor(hw: Homework): Promise<Student[]> {
  const [students, classes] = await Promise.all([listStudents(), listClasses()]);
  const schoolClass = classes.find((c) => c.id === hw.classId);
  if (!schoolClass) return [];
  let pool = students.filter((s) => s.status === "active" && s.className === schoolClass.name);
  if (hw.sectionId) {
    const sections = await listSections();
    const section = sections.find((s) => s.id === hw.sectionId);
    if (section) {
      const letter = sectionLetterOf(section.name);
      pool = pool.filter((s) => s.section === letter);
    }
  }
  return pool;
}

async function ensureSubmissionsForHomework(hw: Homework): Promise<void> {
  const eligible = await eligibleStudentsFor(hw);
  let changed = false;
  for (const student of eligible) {
    const exists = submissions.some(
      (s) => s.tenantId === hw.tenantId && s.branchId === hw.branchId && s.homeworkId === hw.id && s.studentId === student.id,
    );
    if (!exists) {
      submissions = [
        ...submissions,
        { id: genId("sub"), tenantId: hw.tenantId, branchId: hw.branchId, homeworkId: hw.id, studentId: student.id, content: "", status: "not_submitted" },
      ];
      changed = true;
    }
  }
  if (changed) persistSubmissions();
}

// ── Homework ─────────────────────────────────────────────────────────────

export async function listHomework(): Promise<Homework[]> {
  await seedPromise;
  return mockDelay(scopedToCurrentTenantAndBranch(homework), 350);
}

export async function getHomework(id: string): Promise<Homework> {
  await seedPromise;
  return mockDelay(requireEntity(homework, id, "Homework"), 300);
}

export async function createHomework(values: HomeworkFormValues): Promise<Homework> {
  await seedPromise;
  const item: Homework = { id: genId("hw"), tenantId: getCurrentTenantId(), branchId: getCurrentBranchId(), ...values };
  homework = [item, ...homework];
  persistHomework();
  return mockDelay(item, 400);
}

export async function updateHomework(id: string, values: HomeworkFormValues): Promise<Homework> {
  await seedPromise;
  requireEntity(homework, id, "Homework");
  homework = homework.map((h) => (h.id === id ? { ...h, ...values } : h));
  persistHomework();
  return mockDelay(requireEntity(homework, id, "Homework"), 400);
}

export async function deleteHomework(id: string): Promise<void> {
  await seedPromise;
  const tenantId = getCurrentTenantId();
  const branchId = getCurrentBranchId();
  requireEntity(homework, id, "Homework");
  homework = homework.filter((h) => !(h.id === id && h.tenantId === tenantId && h.branchId === branchId));
  submissions = submissions.filter((s) => !(s.tenantId === tenantId && s.branchId === branchId && s.homeworkId === id));
  persistHomework();
  persistSubmissions();
  return mockDelay(undefined, 350);
}

// ── Submissions ──────────────────────────────────────────────────────────

export async function listSubmissionsForHomework(homeworkId: string): Promise<HomeworkSubmission[]> {
  await seedPromise;
  const tenantId = getCurrentTenantId();
  const branchId = getCurrentBranchId();
  const hw = homework.find((h) => h.id === homeworkId && h.tenantId === tenantId && h.branchId === branchId);
  if (hw) await ensureSubmissionsForHomework(hw);
  return mockDelay(submissions.filter((s) => s.tenantId === tenantId && s.branchId === branchId && s.homeworkId === homeworkId), 350);
}

export async function listAssignedHomework(studentId: string): Promise<AssignedHomeworkRow[]> {
  await seedPromise;
  const tenantId = getCurrentTenantId();
  const branchId = getCurrentBranchId();
  const [students, classes] = await Promise.all([listStudents(), listClasses()]);
  const student = students.find((s) => s.id === studentId);
  if (!student) return mockDelay([], 300);

  const schoolClass = classes.find((c) => c.name === student.className);
  const relevant = schoolClass
    ? homework.filter((h) => h.tenantId === tenantId && h.branchId === branchId && h.status === "published" && h.classId === schoolClass.id)
    : [];
  for (const hw of relevant) await ensureSubmissionsForHomework(hw);

  const rows: AssignedHomeworkRow[] = [];
  for (const hw of relevant) {
    const submission = submissions.find((s) => s.tenantId === tenantId && s.branchId === branchId && s.homeworkId === hw.id && s.studentId === studentId);
    if (submission) rows.push({ homework: hw, submission });
  }
  return mockDelay(rows, 400);
}

export async function submitHomework(homeworkId: string, studentId: string, content: string): Promise<HomeworkSubmission> {
  await seedPromise;
  const tenantId = getCurrentTenantId();
  const branchId = getCurrentBranchId();
  const hw = homework.find((h) => h.id === homeworkId && h.tenantId === tenantId && h.branchId === branchId);
  if (!hw) {
    await mockDelay(null, 300);
    throw new Error("Homework not found");
  }
  await ensureSubmissionsForHomework(hw);
  const existing = submissions.find((s) => s.tenantId === tenantId && s.branchId === branchId && s.homeworkId === homeworkId && s.studentId === studentId);
  if (!existing) {
    await mockDelay(null, 300);
    throw new Error("Student is not eligible for this homework");
  }
  const updated: HomeworkSubmission = {
    ...existing,
    content,
    submittedAt: new Date().toISOString(),
    status: "submitted",
    grade: undefined,
  };
  submissions = submissions.map((s) => (s.id === existing.id ? updated : s));
  persistSubmissions();
  return mockDelay(updated, 450);
}

export async function gradeSubmission(submissionId: string, grade: string | number, feedback?: string): Promise<HomeworkSubmission> {
  await seedPromise;
  const existing = requireEntity(submissions, submissionId, "Submission");
  const updated: HomeworkSubmission = { ...existing, grade, feedback, status: "graded" };
  submissions = submissions.map((s) => (s.id === submissionId ? updated : s));
  persistSubmissions();
  return mockDelay(updated, 400);
}

export async function requestResubmission(submissionId: string, feedback: string): Promise<HomeworkSubmission> {
  await seedPromise;
  const existing = requireEntity(submissions, submissionId, "Submission");
  const updated: HomeworkSubmission = { ...existing, feedback, status: "resubmit_requested", grade: undefined };
  submissions = submissions.map((s) => (s.id === submissionId ? updated : s));
  persistSubmissions();
  return mockDelay(updated, 400);
}

// ── Learning resources ───────────────────────────────────────────────────

export async function listLearningResources(): Promise<LearningResource[]> {
  await seedPromise;
  return mockDelay(scopedToCurrentTenantAndBranch(learningResources), 350);
}

export async function createLearningResource(values: LearningResourceFormValues): Promise<LearningResource> {
  await seedPromise;
  const resource: LearningResource = {
    id: genId("res"),
    tenantId: getCurrentTenantId(),
    branchId: getCurrentBranchId(),
    ...values,
    createdAt: new Date().toISOString(),
  };
  learningResources = [resource, ...learningResources];
  persistResources();
  return mockDelay(resource, 400);
}

export async function updateLearningResource(id: string, values: LearningResourceFormValues): Promise<LearningResource> {
  await seedPromise;
  requireEntity(learningResources, id, "Learning resource");
  learningResources = learningResources.map((r) => (r.id === id ? { ...r, ...values } : r));
  persistResources();
  return mockDelay(requireEntity(learningResources, id, "Learning resource"), 400);
}

export async function deleteLearningResource(id: string): Promise<void> {
  await seedPromise;
  const tenantId = getCurrentTenantId();
  const branchId = getCurrentBranchId();
  requireEntity(learningResources, id, "Learning resource");
  learningResources = learningResources.filter((r) => !(r.id === id && r.tenantId === tenantId && r.branchId === branchId));
  discussionComments = discussionComments.filter((c) => !(c.tenantId === tenantId && c.branchId === branchId && c.resourceId === id));
  persistResources();
  persistDiscussion();
  return mockDelay(undefined, 350);
}

// ── Quizzes ──────────────────────────────────────────────────────────────

export async function listQuizzes(): Promise<Quiz[]> {
  await seedPromise;
  return mockDelay(scopedToCurrentTenantAndBranch(quizzes), 300);
}

export async function getQuiz(id: string): Promise<Quiz> {
  await seedPromise;
  return mockDelay(requireEntity(quizzes, id, "Quiz"), 300);
}

export async function createQuiz(values: QuizFormValues, createdByStaffId: string): Promise<Quiz> {
  await seedPromise;
  const tenantId = getCurrentTenantId();
  const branchId = getCurrentBranchId();
  const quiz: Quiz = {
    id: genId("quiz"),
    tenantId,
    branchId,
    subjectId: values.subjectId,
    classId: values.classId,
    title: values.title,
    questions: values.questions.map((q) => ({ id: genId("q"), ...q })),
  };
  quizzes = [quiz, ...quizzes];
  persistQuizzes();

  const resource: LearningResource = {
    id: genId("res"),
    tenantId,
    branchId,
    subjectId: values.subjectId,
    classId: values.classId,
    title: values.title,
    type: "quiz",
    quizId: quiz.id,
    description: `Quiz with ${quiz.questions.length} question${quiz.questions.length === 1 ? "" : "s"}.`,
    createdByStaffId,
    createdAt: new Date().toISOString(),
  };
  learningResources = [resource, ...learningResources];
  persistResources();

  return mockDelay(quiz, 450);
}

export async function deleteQuiz(id: string): Promise<void> {
  await seedPromise;
  const tenantId = getCurrentTenantId();
  const branchId = getCurrentBranchId();
  requireEntity(quizzes, id, "Quiz");
  quizzes = quizzes.filter((q) => !(q.id === id && q.tenantId === tenantId && q.branchId === branchId));
  learningResources = learningResources.filter((r) => !(r.tenantId === tenantId && r.branchId === branchId && r.quizId === id));
  quizAttempts = quizAttempts.filter((a) => !(a.tenantId === tenantId && a.branchId === branchId && a.quizId === id));
  persistQuizzes();
  persistResources();
  persistQuizAttempts();
  return mockDelay(undefined, 350);
}

export async function listQuizAttempts(quizId?: string): Promise<QuizAttempt[]> {
  await seedPromise;
  const scoped = scopedToCurrentTenantAndBranch(quizAttempts);
  const result = quizId ? scoped.filter((a) => a.quizId === quizId) : scoped;
  return mockDelay(result, 300);
}

export async function submitQuizAttempt(quizId: string, studentId: string, answers: number[]): Promise<QuizAttempt> {
  await seedPromise;
  const quiz = requireEntity(quizzes, quizId, "Quiz");
  const correct = quiz.questions.reduce((count, q, i) => (answers[i] === q.correctIndex ? count + 1 : count), 0);
  const score = quiz.questions.length ? Math.round((correct / quiz.questions.length) * 100) : 0;
  const attempt: QuizAttempt = {
    id: genId("qa"),
    tenantId: quiz.tenantId,
    branchId: quiz.branchId,
    quizId,
    studentId,
    score,
    submittedAt: new Date().toISOString(),
  };
  quizAttempts = [attempt, ...quizAttempts];
  persistQuizAttempts();
  return mockDelay(attempt, 400);
}

// ── Discussion comments ──────────────────────────────────────────────────

export async function listDiscussionComments(resourceId: string): Promise<DiscussionComment[]> {
  await seedPromise;
  const tenantId = getCurrentTenantId();
  const branchId = getCurrentBranchId();
  return mockDelay(discussionComments.filter((c) => c.tenantId === tenantId && c.branchId === branchId && c.resourceId === resourceId), 300);
}

export async function addDiscussionComment(resourceId: string, values: DiscussionCommentFormValues): Promise<DiscussionComment> {
  await seedPromise;
  const comment: DiscussionComment = {
    id: genId("disc"),
    tenantId: getCurrentTenantId(),
    branchId: getCurrentBranchId(),
    resourceId,
    ...values,
    postedAt: new Date().toISOString(),
  };
  discussionComments = [...discussionComments, comment];
  persistDiscussion();
  return mockDelay(comment, 350);
}

// ── Resource views ───────────────────────────────────────────────────────

export async function getViewedResourceIds(studentId: string): Promise<string[]> {
  await seedPromise;
  return mockDelay(resourceViewsByStudent[studentId] ?? [], 200);
}

export async function markResourceViewed(studentId: string, resourceId: string): Promise<void> {
  await seedPromise;
  const existing = resourceViewsByStudent[studentId] ?? [];
  if (!existing.includes(resourceId)) {
    resourceViewsByStudent = { ...resourceViewsByStudent, [studentId]: [...existing, resourceId] };
    persistResourceViews();
  }
  return mockDelay(undefined, 150);
}

// ── Progress overview ────────────────────────────────────────────────────

export async function getLearningProgress(): Promise<LearningProgressRow[]> {
  await seedPromise;
  const tenantId = getCurrentTenantId();
  const branchId = getCurrentBranchId();
  const [students, classes] = await Promise.all([listStudents(), listClasses()]);
  const active = students.filter((s) => s.status === "active");

  const rows: LearningProgressRow[] = [];
  for (const student of active) {
    const schoolClass = classes.find((c) => c.name === student.className);
    const studentHomework = schoolClass
      ? homework.filter((h) => h.tenantId === tenantId && h.branchId === branchId && h.status === "published" && h.classId === schoolClass.id)
      : [];
    for (const hw of studentHomework) await ensureSubmissionsForHomework(hw);

    let onTime = 0;
    for (const hw of studentHomework) {
      const submission = submissions.find(
        (s) => s.tenantId === tenantId && s.branchId === branchId && s.homeworkId === hw.id && s.studentId === student.id,
      );
      if (submission?.submittedAt && submission.status !== "not_submitted" && new Date(submission.submittedAt) <= new Date(hw.dueDate)) {
        onTime++;
      }
    }

    const resourcesForClass = schoolClass
      ? learningResources.filter((r) => r.tenantId === tenantId && r.branchId === branchId && r.classId === schoolClass.id)
      : [];
    const viewed = new Set(resourceViewsByStudent[student.id] ?? []);
    const viewedCount = resourcesForClass.filter((r) => viewed.has(r.id)).length;

    rows.push({
      studentId: student.id,
      studentName: `${student.firstName} ${student.lastName}`,
      className: student.className,
      section: student.section,
      homeworkAssignedCount: studentHomework.length,
      homeworkSubmittedOnTimeCount: onTime,
      homeworkSubmittedOnTimePct: studentHomework.length ? Math.round((onTime / studentHomework.length) * 100) : 0,
      resourceCount: resourcesForClass.length,
      resourceViewedCount: viewedCount,
      resourceViewedPct: resourcesForClass.length ? Math.round((viewedCount / resourcesForClass.length) * 100) : 0,
    });
  }

  return mockDelay(rows, 450);
}
