import type { StaffMember } from "@/features/staff/types";
import type { Student } from "@/features/students/types";
import type { LibraryMember, LibraryPersonType } from "./types";

export interface ClassGroup {
  /** The class name, e.g. "Class 5" (all its sections together). */
  key: string;
  students: Student[];
}

export interface BulkSelection {
  /** Class names whose students should join. */
  classKeys: string[];
  allStaff: boolean;
}

export interface BulkPlan {
  /** People who would be added now, in the form the API takes. */
  people: { personType: LibraryPersonType; personId: string }[];
  newStudents: number;
  newStaff: number;
  /** Chosen people who are already members and will be left as they are. */
  alreadyMembers: number;
}

/** Staff who still work at the school. On leave still counts; resigned and terminated do not. */
export const isCurrentStaff = (s: Pick<StaffMember, "status">) => s.status === "active" || s.status === "on-leave";

/** Active students grouped by class (all sections together), classes in natural order ("Class 2" before "Class 10"). */
export function groupStudentsByClass(students: Student[]): ClassGroup[] {
  const groups = new Map<string, Student[]>();
  for (const s of students) {
    if (s.status !== "active") continue;
    groups.set(s.className, [...(groups.get(s.className) ?? []), s]);
  }
  return [...groups]
    .map(([key, list]) => ({ key, students: list }))
    .sort((a, b) => a.key.localeCompare(b.key, undefined, { numeric: true }));
}

/** What a bulk add would do right now: new members, and who is skipped for already being one. */
export function planBulkAdd(args: { students: Student[]; staff: StaffMember[]; members: LibraryMember[]; selection: BulkSelection }): BulkPlan {
  const { students, staff, members, selection } = args;
  const memberKey = new Set(members.map((m) => `${m.personType}:${m.personId}`));

  const chosenClasses = new Set(selection.classKeys);
  const chosenStudents = students.filter((s) => s.status === "active" && chosenClasses.has(s.className));
  const chosenStaff = selection.allStaff ? staff.filter(isCurrentStaff) : [];

  const wanted = [
    ...chosenStudents.map((s) => ({ personType: "student" as const, personId: s.id })),
    ...chosenStaff.map((s) => ({ personType: "staff" as const, personId: s.id })),
  ];
  const people = wanted.filter((p) => !memberKey.has(`${p.personType}:${p.personId}`));

  return {
    people,
    newStudents: people.filter((p) => p.personType === "student").length,
    newStaff: people.filter((p) => p.personType === "staff").length,
    alreadyMembers: wanted.length - people.length,
  };
}
