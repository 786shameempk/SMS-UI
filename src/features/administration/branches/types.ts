export type BranchStatus = "active" | "inactive";

/** Which classes teachers see in the mobile app (per branch). */
export type TeacherClassScope = "assigned_and_subject" | "assigned" | "all";

export const TEACHER_CLASS_SCOPE_OPTIONS: { value: TeacherClassScope; label: string; description: string }[] = [
  {
    value: "assigned_and_subject",
    label: "Class teacher + assigned subject classes",
    description: "Classes they are class teacher of or teach in the timetable, plus every section of a class they are assigned a subject in.",
  },
  { value: "assigned", label: "Class teacher / timetable classes only", description: "Only classes they are class teacher of or teach in the timetable." },
  { value: "all", label: "All classes", description: "Every class of the current academic year." },
];

export interface Branch {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  status: BranchStatus;
  teacherClassScope: TeacherClassScope;
  createdAt: string;
}

export interface BranchFormValues {
  name: string;
  code: string;
  address?: string;
  phone?: string;
  status: BranchStatus;
  teacherClassScope: TeacherClassScope;
}
