import * as academics from "./api";
import { academicHttpClient } from "@/lib/httpClient";
import { checkCrud } from "@/test/crud";
import { apiError, stubClient } from "@/test/utils";

const scoped = { tenantId: "t", branchId: "b" };

describe("academics api", () => {
  it("academic years", () =>
    checkCrud({
      client: academicHttpClient,
      base: "/api/academicyears",
      dto: { id: "y1", ...scoped, name: "2026-27", startDate: "2026-06-01", endDate: "2027-03-31", isCurrent: true, status: "Active" },
      values: { name: "2026-27", startDate: "2026-06-01", endDate: "2027-03-31", isCurrent: true, status: "closed" } as never,
      list: academics.listAcademicYears,
      create: academics.createAcademicYear,
      update: academics.updateAcademicYear,
      remove: academics.deleteAcademicYear,
      sent: { name: "2026-27", startDate: "2026-06-01", endDate: "2027-03-31", isCurrent: true, status: "Closed" },
      mapped: { status: "active", isCurrent: true },
      fallback: { dto: { id: "y2", ...scoped, status: "Odd" }, mapped: { status: "upcoming" } },
    }));

  it("terms", () =>
    checkCrud({
      client: academicHttpClient,
      base: "/api/terms",
      dto: { id: "t1", ...scoped, name: "Term 1", academicYearId: "y1", startDate: "a", endDate: "b", status: "Ongoing" },
      values: { name: "Term 1", academicYearId: "y1", startDate: "a", endDate: "b", status: "completed" } as never,
      list: academics.listTerms,
      create: academics.createTerm,
      update: academics.updateTerm,
      remove: academics.deleteTerm,
      sent: { name: "Term 1", academicYearId: "y1", startDate: "a", endDate: "b", status: "Completed" },
      mapped: { status: "ongoing" },
      fallback: { dto: { id: "t2", ...scoped, status: "?" }, mapped: { status: "upcoming" } },
    }));

  it("departments", () =>
    checkCrud({
      client: academicHttpClient,
      base: "/api/departments",
      dto: { id: "d1", ...scoped, name: "Science", description: null },
      values: { name: "Science" } as never,
      list: academics.listDepartments,
      create: academics.createDepartment,
      update: academics.updateDepartment,
      remove: academics.deleteDepartment,
      sent: { name: "Science", description: null },
      mapped: { name: "Science", description: undefined },
    }));

  it("classes", () =>
    checkCrud({
      client: academicHttpClient,
      base: "/api/classes",
      dto: { id: "c1", ...scoped, name: "Class 5", departmentId: null, academicYearId: "y1" },
      values: { name: "Class 5", academicYearId: "y1" } as never,
      list: academics.listClasses,
      create: academics.createClass,
      update: academics.updateClass,
      remove: academics.deleteClass,
      sent: { name: "Class 5", departmentId: null, academicYearId: "y1" },
      mapped: { departmentId: undefined },
    }));

  it("sections, including merging two into one", async () => {
    const dto = { id: "s1", ...scoped, name: "A", classId: "c1", classTeacherName: null, classTeacherStaffId: "st1", capacity: 40, currentStrength: 30 };
    await checkCrud({
      client: academicHttpClient,
      base: "/api/sections",
      dto,
      values: { name: "A", classId: "c1", capacity: 40, currentStrength: 30 } as never,
      list: academics.listSections,
      create: academics.createSection,
      update: academics.updateSection,
      remove: academics.deleteSection,
      sent: { name: "A", classId: "c1", classTeacherName: null, classTeacherStaffId: null, capacity: 40, currentStrength: 30 },
      mapped: { classTeacherName: undefined, classTeacherStaffId: "st1" },
    });
    const calls = stubClient(academicHttpClient, { "POST /api/sections/merge": dto });

    expect((await academics.mergeSections("s1", "s2")).mergedSection.id).toBe("s1");
    expect(calls[0].body).toEqual({ primarySectionId: "s1", secondarySectionId: "s2" });
  });

  it("subjects", () =>
    checkCrud({
      client: academicHttpClient,
      base: "/api/subjects",
      dto: { id: "sub1", ...scoped, name: "Physics", code: "PHY", type: "Elective", classIds: ["c1"] },
      values: { name: "Physics", code: "PHY", type: "core", classIds: ["c1"] } as never,
      list: academics.listSubjects,
      create: academics.createSubject,
      update: academics.updateSubject,
      remove: academics.deleteSubject,
      sent: { name: "Physics", code: "PHY", type: "Core", classIds: ["c1"] },
      mapped: { type: "elective" },
      fallback: { dto: { id: "sub2", ...scoped, type: "?", classIds: [] }, mapped: { type: "core" } },
    }));

  it("calendar events", () =>
    checkCrud({
      client: academicHttpClient,
      base: "/api/calendarevents",
      dto: { id: "e1", ...scoped, title: "Onam", type: "Holiday", startDate: "2026-08-28", endDate: null, academicYearId: null, description: null },
      values: { title: "Onam", type: "term_start", startDate: "2026-08-28" } as never,
      list: academics.listCalendarEvents,
      create: academics.createCalendarEvent,
      update: academics.updateCalendarEvent,
      remove: academics.deleteCalendarEvent,
      sent: { title: "Onam", type: "TermStart", startDate: "2026-08-28", endDate: null, academicYearId: null, description: null },
      mapped: { type: "holiday", endDate: undefined },
      fallback: { dto: { id: "e2", ...scoped, type: "?" }, mapped: { type: "other" } },
    }));

  it("explains rejected deletes", async () => {
    vi.spyOn(academicHttpClient, "delete").mockRejectedValue(apiError(409, { title: "This class still has sections" }));
    await expect(academics.deleteClass("c1")).rejects.toThrow("This class still has sections");
  });
});
