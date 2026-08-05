export type AcademicYearStatus = "upcoming" | "active" | "closed";
export type TermStatus = "upcoming" | "ongoing" | "completed";
export type SubjectType = "core" | "elective";
export type CalendarEventType = "term_start" | "term_end" | "exam" | "holiday" | "other";

export interface AcademicYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  status: AcademicYearStatus;
}

export interface AcademicYearFormValues {
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  status: AcademicYearStatus;
}

export interface Term {
  id: string;
  name: string;
  academicYearId: string;
  startDate: string;
  endDate: string;
  status: TermStatus;
}

export interface TermFormValues {
  name: string;
  academicYearId: string;
  startDate: string;
  endDate: string;
  status: TermStatus;
}

export interface Department {
  id: string;
  name: string;
  description?: string;
}

export interface DepartmentFormValues {
  name: string;
  description?: string;
}

export interface SchoolClass {
  id: string;
  name: string;
  departmentId?: string;
  academicYearId: string;
}

export interface SchoolClassFormValues {
  name: string;
  departmentId?: string;
  academicYearId: string;
}

export interface Section {
  id: string;
  name: string;
  classId: string;
  classTeacherName?: string;
  /** Id-based link into the teachers module; classTeacherName is kept in sync for backward compat. */
  classTeacherStaffId?: string;
  capacity: number;
  currentStrength: number;
}

export interface SectionFormValues {
  name: string;
  classId: string;
  classTeacherName?: string;
  classTeacherStaffId?: string;
  capacity: number;
  currentStrength: number;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  type: SubjectType;
  classIds: string[];
}

export interface SubjectFormValues {
  name: string;
  code: string;
  type: SubjectType;
  classIds: string[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  type: CalendarEventType;
  startDate: string;
  endDate?: string;
  academicYearId?: string;
  description?: string;
}

export interface CalendarEventFormValues {
  title: string;
  type: CalendarEventType;
  startDate: string;
  endDate?: string;
  academicYearId?: string;
  description?: string;
}

export interface MergeSectionsResult {
  mergedSection: Section;
}
