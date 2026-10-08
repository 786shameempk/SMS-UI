import type { StaffMember } from "@/features/staff/types";
import type { Student } from "@/features/students/types";
import { groupStudentsByClass, isCurrentStaff, planBulkAdd } from "./bulk";
import type { LibraryMember } from "./types";

const student = (id: string, className: string, status: Student["status"] = "active", section = "A") => ({ id, className, section, status }) as Student;
const staffer = (id: string, status: StaffMember["status"] = "active") => ({ id, status }) as StaffMember;
const member = (personType: LibraryMember["personType"], personId: string) => ({ id: `m-${personId}`, personType, personId }) as LibraryMember;

const students = [
  student("s1", "Class 10"),
  student("s2", "Class 2"),
  student("s3", "Class 2", "active", "B"),
  student("s4", "Class 2", "transferred"),
  student("s5", "Class 3"),
];
const staff = [staffer("t1"), staffer("t2", "on-leave"), staffer("t3", "resigned"), staffer("t4", "terminated")];

describe("library bulk add planning", () => {
  it("groups active students by class, all sections together, in natural order", () => {
    const groups = groupStudentsByClass(students);

    expect(groups.map((g) => [g.key, g.students.length])).toEqual([["Class 2", 2], ["Class 3", 1], ["Class 10", 1]]);
  });

  it("counts staff who still work here (on leave included), not resigned or terminated", () => {
    expect(staff.filter(isCurrentStaff).map((s) => s.id)).toEqual(["t1", "t2"]);
  });

  it("plans the chosen classes and all staff", () => {
    const plan = planBulkAdd({ students, staff, members: [], selection: { classKeys: ["Class 2"], allStaff: true } });

    expect(plan.people).toEqual([
      { personType: "student", personId: "s2" },
      { personType: "student", personId: "s3" },
      { personType: "staff", personId: "t1" },
      { personType: "staff", personId: "t2" },
    ]);
    expect([plan.newStudents, plan.newStaff, plan.alreadyMembers]).toEqual([2, 2, 0]);
  });

  it("leaves out people who are already members, and says how many", () => {
    const plan = planBulkAdd({ students, staff, members: [member("student", "s2"), member("staff", "t1")], selection: { classKeys: ["Class 2"], allStaff: true } });

    expect(plan.people.map((p) => p.personId)).toEqual(["s3", "t2"]);
    expect(plan.alreadyMembers).toBe(2);
  });

  it("treats a student and a staff member with the same id as different people", () => {
    const plan = planBulkAdd({ students: [student("x", "Class 1")], staff: [staffer("x")], members: [member("staff", "x")], selection: { classKeys: ["Class 1"], allStaff: true } });

    expect(plan.people).toEqual([{ personType: "student", personId: "x" }]);
    expect(plan.alreadyMembers).toBe(1);
  });

  it("plans nothing until something is chosen, and never adds transferred students", () => {
    expect(planBulkAdd({ students, staff, members: [], selection: { classKeys: [], allStaff: false } }).people).toEqual([]);
    expect(planBulkAdd({ students, staff, members: [], selection: { classKeys: ["Class 2"], allStaff: false } }).people.map((p) => p.personId)).not.toContain("s4");
  });
});
