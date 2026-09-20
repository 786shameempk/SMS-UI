import { DEFAULT_TENANT_ID, defaultBranchIdForTenant } from "@/utils/tenant";
import type { StaffFormValues } from "@/features/staff/types";
import type { LessonPlanStatus } from "./types";

const DAY_MS = 1000 * 60 * 60 * 24;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY_MS).toISOString();
const yearsAgo = (n: number) => new Date(Date.now() - n * DAY_MS * 365).toISOString();
const DEFAULT_BRANCH_ID = defaultBranchIdForTenant(DEFAULT_TENANT_ID);

/**
 * The generic staff seed only ships two "Teacher" designated records. These extra
 * teachers are created through staff's own createStaff() API (see performSeed in
 * api.ts) rather than by editing staff/mock.ts, so the staff module stays untouched.
 */
const EXTRA_TEACHER_SEED_BASE: Omit<StaffFormValues, "branchId">[] = [
  {
    firstName: "Priya",
    lastName: "Nair",
    dateOfBirth: yearsAgo(30),
    gender: "female",
    designation: "Teacher",
    department: "English",
    phone: "+91 98450 88112",
    email: "priya.nair@educore.dev",
    address: "21 Jayanagar, Bengaluru",
  },
  {
    firstName: "Arjun",
    lastName: "Mehta",
    dateOfBirth: yearsAgo(36),
    gender: "male",
    designation: "Teacher",
    department: "Social Studies",
    phone: "+91 98450 88223",
    email: "arjun.mehta@educore.dev",
    address: "6 Koramangala, Bengaluru",
  },
  {
    firstName: "Kavya",
    lastName: "Iyer",
    dateOfBirth: yearsAgo(27),
    gender: "female",
    designation: "Teacher",
    department: "Languages",
    phone: "+91 98450 88334",
    email: "kavya.iyer@educore.dev",
    address: "9 Basavanagudi, Bengaluru",
  },
  {
    firstName: "Rahul",
    lastName: "Verma",
    dateOfBirth: yearsAgo(33),
    gender: "male",
    designation: "Teacher",
    department: "Computer Science",
    phone: "+91 98450 88445",
    email: "rahul.verma@educore.dev",
    address: "15 HSR Layout, Bengaluru",
  },
  {
    firstName: "Ananya",
    lastName: "Gupta",
    dateOfBirth: yearsAgo(29),
    gender: "female",
    designation: "Teacher",
    department: "Science",
    phone: "+91 98450 88556",
    email: "ananya.gupta@educore.dev",
    address: "3 Banashankari, Bengaluru",
  },
];

export const EXTRA_TEACHER_SEEDS: StaffFormValues[] = EXTRA_TEACHER_SEED_BASE.map((s) => ({ ...s, branchId: DEFAULT_BRANCH_ID }));

interface SubjectAssignmentSeed {
  teacherEmail: string;
  subjectId: string;
  classId: string;
}

/** stf-1 (Daniel Reyes) and stf-5 (James Carter) are the two pre-existing seeded teachers. */
export const SUBJECT_ASSIGNMENT_PLAN: SubjectAssignmentSeed[] = [
  { teacherEmail: "teacher@educore.dev", subjectId: "subj-2", classId: "class-8" },
  { teacherEmail: "teacher@educore.dev", subjectId: "subj-2", classId: "class-9" },
  { teacherEmail: "james.carter@educore.dev", subjectId: "subj-3", classId: "class-8" },
  { teacherEmail: "james.carter@educore.dev", subjectId: "subj-4", classId: "class-10" },
  { teacherEmail: "priya.nair@educore.dev", subjectId: "subj-1", classId: "class-3" },
  { teacherEmail: "priya.nair@educore.dev", subjectId: "subj-1", classId: "class-8" },
  { teacherEmail: "arjun.mehta@educore.dev", subjectId: "subj-7", classId: "class-6" },
  { teacherEmail: "kavya.iyer@educore.dev", subjectId: "subj-8", classId: "class-3" },
  { teacherEmail: "rahul.verma@educore.dev", subjectId: "subj-9", classId: "class-9" },
  { teacherEmail: "rahul.verma@educore.dev", subjectId: "subj-9", classId: "class-10" },
  { teacherEmail: "ananya.gupta@educore.dev", subjectId: "subj-5", classId: "class-10" },
  { teacherEmail: "ananya.gupta@educore.dev", subjectId: "subj-6", classId: "class-9" },
];

interface LessonPlanSeed {
  teacherEmail: string;
  subjectId: string;
  classId: string;
  title: string;
  description: string;
  weekOf: string;
  attachmentNote?: string;
  status: LessonPlanStatus;
}

export const LESSON_PLAN_PLAN: LessonPlanSeed[] = [
  {
    teacherEmail: "teacher@educore.dev",
    subjectId: "subj-2",
    classId: "class-8",
    title: "Algebra basics - week 1",
    description: "Introduce linear equations in one variable with worked examples and practice sets.",
    weekOf: daysAgo(7).slice(0, 10),
    attachmentNote: "Worksheet: algebra-basics-w1.pdf",
    status: "published",
  },
  {
    teacherEmail: "teacher@educore.dev",
    subjectId: "subj-2",
    classId: "class-9",
    title: "Quadratic equations - factoring",
    description: "Cover factoring methods for quadratic equations, including word problems.",
    weekOf: daysAgo(-7).slice(0, 10),
    status: "draft",
  },
  {
    teacherEmail: "james.carter@educore.dev",
    subjectId: "subj-3",
    classId: "class-8",
    title: "States of matter",
    description: "Lab demonstration on solid, liquid, and gas transitions with observation sheets.",
    weekOf: daysAgo(3).slice(0, 10),
    attachmentNote: "Lab sheet: states-of-matter.docx",
    status: "published",
  },
  {
    teacherEmail: "james.carter@educore.dev",
    subjectId: "subj-4",
    classId: "class-10",
    title: "Newton's laws of motion",
    description: "Derive and apply the three laws of motion with real-world examples.",
    weekOf: daysAgo(-3).slice(0, 10),
    status: "draft",
  },
  {
    teacherEmail: "priya.nair@educore.dev",
    subjectId: "subj-1",
    classId: "class-3",
    title: "Grammar - nouns and verbs",
    description: "Introduce common and proper nouns, action verbs, with picture-based worksheets.",
    weekOf: daysAgo(10).slice(0, 10),
    status: "published",
  },
  {
    teacherEmail: "priya.nair@educore.dev",
    subjectId: "subj-1",
    classId: "class-8",
    title: "Essay writing techniques",
    description: "Structuring a five-paragraph essay: introduction, body, and conclusion.",
    weekOf: daysAgo(-1).slice(0, 10),
    attachmentNote: "Sample essays: essay-samples.pdf",
    status: "draft",
  },
  {
    teacherEmail: "rahul.verma@educore.dev",
    subjectId: "subj-9",
    classId: "class-9",
    title: "Intro to Python - variables and loops",
    description: "Hands-on session covering variables, data types, and for/while loops.",
    weekOf: daysAgo(5).slice(0, 10),
    attachmentNote: "Starter code: python-intro.zip",
    status: "published",
  },
  {
    teacherEmail: "ananya.gupta@educore.dev",
    subjectId: "subj-5",
    classId: "class-10",
    title: "Periodic table deep dive",
    description: "Trends across periods and groups; electronegativity and atomic radius.",
    weekOf: daysAgo(1).slice(0, 10),
    status: "published",
  },
];

interface ClassTeacherSeed {
  sectionId: string;
  teacherEmail: string;
}

export const CLASS_TEACHER_PLAN: ClassTeacherSeed[] = [
  { sectionId: "sec-8-a", teacherEmail: "teacher@educore.dev" },
  { sectionId: "sec-10-b", teacherEmail: "james.carter@educore.dev" },
  { sectionId: "sec-3-a", teacherEmail: "priya.nair@educore.dev" },
];
