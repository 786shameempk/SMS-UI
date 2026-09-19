import type { SchoolClass, Subject } from "@/features/academics/types";
import type { Student } from "@/features/students/types";

export interface TeacherSubjectAssignment {
  id: string;
  staffId: string;
  subjectId: string;
  classId: string;
}

export interface TeacherSubjectAssignmentFormValues {
  staffId: string;
  subjectId: string;
  classId: string;
}

export type LessonPlanStatus = "draft" | "published";

export interface LessonPlan {
  id: string;
  staffId: string;
  subjectId: string;
  classId: string;
  title: string;
  description: string;
  weekOf: string;
  attachmentNote?: string;
  status: LessonPlanStatus;
  createdAt: string;
  updatedAt: string;
}

export interface LessonPlanFormValues {
  staffId: string;
  subjectId: string;
  classId: string;
  title: string;
  description: string;
  weekOf: string;
  attachmentNote?: string;
  status: LessonPlanStatus;
}

export interface StudentPerformanceRow {
  student: Student;
  averageScore: number;
  grade: string;
}

export interface SubjectClassPerformance {
  assignmentId: string;
  subject: Subject;
  schoolClass: SchoolClass;
  students: StudentPerformanceRow[];
  classAverage: number;
}
