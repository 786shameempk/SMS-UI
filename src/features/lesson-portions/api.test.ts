import { describe, expect, it } from "vitest";
import { academicHttpClient } from "@/lib/httpClient";
import { apiError, stubClient } from "@/test/utils";
import * as api from "./api";

describe("lesson portions api", () => {
  it("leaves empty filters out of the query string", async () => {
    const calls = stubClient(academicHttpClient, { "GET api/portions/syllabi": { items: [], totalCount: 0 } });

    await api.listSyllabi({ classId: "c1", subjectId: undefined, search: "", status: "Published", templates: false, pageSize: 50 });

    expect((calls[0].config as { params: Record<string, unknown> }).params).toEqual({ classId: "c1", status: "Published", templates: false, pageSize: 50 });
  });

  it("creates with POST and updates with PUT on the record's own URL, sending the row version back", async () => {
    const calls = stubClient(academicHttpClient, {
      "POST api/portions/lesson-plans": { id: "lp1" },
      "PUT api/portions/lesson-plans/lp1": { id: "lp1" },
    });
    const values = { classId: "c", subjectId: "s", title: "T", description: "", planType: "Weekly" as const, plannedStartDate: "2026-09-14", plannedEndDate: "2026-09-20", allocatedPeriods: 4, topics: [] };

    await api.createLessonPlan(values);
    await api.updateLessonPlan("lp1", { ...values, changeNote: "moved", rowVersion: "AAA=" });

    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual(["POST api/portions/lesson-plans", "PUT api/portions/lesson-plans/lp1"]);
    expect(calls[1].body).toMatchObject({ changeNote: "moved", rowVersion: "AAA=" });
  });

  it("records progress with the row version so a stale edit is refused by the server", async () => {
    const calls = stubClient(academicHttpClient, { "PUT api/portions/progress": { topicId: "t1" } });

    await api.updateProgress({ sectionId: "s", syllabusTopicId: "t1", status: "Completed", taughtOn: "2026-09-14", periodsUsed: 2, rowVersion: "AAB=" });

    expect(calls[0].body).toMatchObject({ status: "Completed", periodsUsed: 2, rowVersion: "AAB=" });
  });

  it("sends the import as one request", async () => {
    const calls = stubClient(academicHttpClient, { "POST api/portions/syllabi/sy1/import": { chaptersCreated: 1, topicsCreated: 2, warnings: [] } });

    const result = await api.importSyllabus("sy1", [{ chapter: "Numbers", topic: "Place value", periods: 3 }], true);

    expect(result.topicsCreated).toBe(2);
    expect(calls).toHaveLength(1);
    expect(calls[0].body).toEqual({ rows: [{ chapter: "Numbers", topic: "Place value", periods: 3 }], replaceExisting: true });
  });

  it("turns a refusal into an Error with the server's message", async () => {
    stubClient(academicHttpClient, {
      "POST api/portions/lesson-plans/lp1/approve": () => {
        throw apiError(403, { title: "You can't review your own lesson plan." });
      },
    });

    await expect(api.approveLessonPlan("lp1")).rejects.toThrow("You can't review your own lesson plan.");
  });

  it("asks for a revision plan and the family view with their own parameters", async () => {
    const calls = stubClient(academicHttpClient, {
      "GET api/portions/exams/e1/revision-plan": { summary: "", items: [], unscheduled: [], pendingTopics: 0, pendingPeriods: 0, availablePeriods: 0 },
      "GET api/portions/family/overview": [],
    });

    await api.examRevisionPlan("e1", "math", undefined);
    await api.familyOverview("child-1");

    expect((calls[0].config as { params: object }).params).toEqual({ subjectId: "math" });
    expect((calls[1].config as { params: object }).params).toEqual({ studentId: "child-1" });
  });
  // Every adapter function and the verb + URL it must use: a typo in a route would otherwise only show up against a live server.
  const sy = "sy1", ch = "ch1", tp = "tp1", lp = "lp1", ex = "ex1", id = "id1";
  const plan = { classId: "c", subjectId: "s", title: "T", description: "", planType: "Weekly" as const, plannedStartDate: "2026-09-14", plannedEndDate: "2026-09-20", allocatedPeriods: 1, topics: [] };
  const syllabus = { curriculumId: "cu", classId: "c", subjectId: "s", title: "T" };
  const resource = { kind: "Link" as const, title: "R", visibleToFamilies: false };
  const table: Array<[string, () => Promise<unknown>]> = [
    ["GET api/portions/curricula", () => api.listCurricula()],
    ["POST api/portions/curricula", () => api.createCurriculum({ name: "n", board: "Cbse", isActive: true })],
    ["PUT api/portions/curricula/id1", () => api.updateCurriculum(id, { name: "n", board: "Cbse", isActive: true })],
    ["DELETE api/portions/curricula/id1", () => api.deleteCurriculum(id)],
    ["GET api/portions/syllabi", () => api.listSyllabi()],
    [`GET api/portions/syllabi/${sy}`, () => api.getSyllabus(sy)],
    ["POST api/portions/syllabi", () => api.createSyllabus(syllabus)],
    [`PUT api/portions/syllabi/${sy}`, () => api.updateSyllabus(sy, syllabus)],
    [`DELETE api/portions/syllabi/${sy}`, () => api.deleteSyllabus(sy)],
    [`POST api/portions/syllabi/${sy}/publish`, () => api.publishSyllabus(sy)],
    [`POST api/portions/syllabi/${sy}/archive`, () => api.archiveSyllabus(sy)],
    [`POST api/portions/syllabi/${sy}/new-version`, () => api.newSyllabusVersion(sy)],
    [`POST api/portions/syllabi/${sy}/save-as-template`, () => api.saveSyllabusAsTemplate(sy, "n")],
    ["POST api/portions/syllabi/from-template", () => api.syllabusFromTemplate({ templateId: "t", academicYearId: "y", classIds: ["c"] })],
    [`POST api/portions/syllabi/${sy}/import`, () => api.importSyllabus(sy, [], false)],
    [`POST api/portions/syllabi/${sy}/chapters`, () => api.addChapter(sy, { title: "c", plannedPeriods: 1, weight: 1 })],
    [`PUT api/portions/chapters/${ch}`, () => api.updateChapter(ch, { title: "c", plannedPeriods: 1, weight: 1 })],
    [`DELETE api/portions/chapters/${ch}`, () => api.deleteChapter(ch)],
    [`POST api/portions/syllabi/${sy}/chapters/reorder`, () => api.reorderChapters(sy, [])],
    [`POST api/portions/chapters/${ch}/topics`, () => api.addTopic(ch, { title: "t", plannedPeriods: 1, weight: 1 })],
    [`PUT api/portions/topics/${tp}`, () => api.updateTopic(tp, { title: "t", plannedPeriods: 1, weight: 1 })],
    [`DELETE api/portions/topics/${tp}`, () => api.deleteTopic(tp)],
    [`POST api/portions/chapters/${ch}/topics/reorder`, () => api.reorderTopics(ch, [])],
    ["GET api/portions/resources", () => api.listResources()],
    ["POST api/portions/resources", () => api.createResource(resource)],
    ["PUT api/portions/resources/id1", () => api.updateResource(id, resource)],
    ["DELETE api/portions/resources/id1", () => api.deleteResource(id)],
    ["GET api/portions/lesson-plans", () => api.listLessonPlans()],
    [`GET api/portions/lesson-plans/${lp}`, () => api.getLessonPlan(lp)],
    ["POST api/portions/lesson-plans", () => api.createLessonPlan(plan)],
    [`PUT api/portions/lesson-plans/${lp}`, () => api.updateLessonPlan(lp, plan)],
    [`DELETE api/portions/lesson-plans/${lp}`, () => api.deleteLessonPlan(lp)],
    [`POST api/portions/lesson-plans/${lp}/submit`, () => api.submitLessonPlan(lp)],
    [`POST api/portions/lesson-plans/${lp}/approve`, () => api.approveLessonPlan(lp)],
    [`POST api/portions/lesson-plans/${lp}/reject`, () => api.rejectLessonPlan(lp, "why")],
    [`POST api/portions/lesson-plans/${lp}/request-revision`, () => api.requestPlanRevision(lp, "why")],
    [`POST api/portions/lesson-plans/${lp}/reschedule`, () => api.rescheduleLessonPlan(lp, { topics: [], reason: "r" })],
    [`GET api/portions/lesson-plans/${lp}/history`, () => api.lessonPlanHistory(lp)],
    ["GET api/portions/lesson-plans/pending-approval", () => api.pendingApprovals()],
    ["GET api/portions/lesson-plans/pending-updates", () => api.pendingUpdates()],
    ["GET api/portions/lesson-plans/calendar", () => api.planCalendar("2026-09-14", "2026-09-20")],
    ["GET api/portions/lesson-plans/capacity", () => api.planCapacity({ sectionId: "s", subjectId: "s", from: "a", to: "b", requiredPeriods: 1 })],
    ["GET api/portions/progress/my-classes", () => api.myTeachingClasses()],
    [`GET api/portions/progress/syllabus/${sy}/sections/sec1`, () => api.sectionSyllabus(sy, "sec1")],
    ["PUT api/portions/progress", () => api.updateProgress({ sectionId: "s", syllabusTopicId: "t", status: "Completed", periodsUsed: 1 })],
    ["POST api/portions/progress/bulk", () => api.bulkProgress({ sectionId: "s", topicIds: [], status: "Completed", periodsUsed: 1 })],
    ["POST api/portions/progress/id1/correct", () => api.correctProgress(id, { status: "Completed", periodsUsed: 1, reason: "r" })],
    ["GET api/portions/progress/id1/history", () => api.progressHistory(id)],
    ["GET api/portions/dashboard/teacher", () => api.teacherDashboard()],
    ["GET api/portions/dashboard/admin", () => api.adminDashboard()],
    ["GET api/portions/reports/completion", () => api.completionReport()],
    ["GET api/portions/reports/teachers", () => api.teacherReport()],
    ["GET api/portions/reports/pending-chapters", () => api.pendingChaptersReport()],
    ["GET api/portions/reports/delayed", () => api.delayedReport()],
    [`GET api/portions/reports/subjects/${sy}/sections/sec1`, () => api.subjectDrillDown(sy, "sec1")],
    ["GET api/portions/suggestions/catch-up", () => api.catchUpPlan(sy, "sec1")],
    ["GET api/portions/reports/exam-coverage", () => api.examCoverageReport()],
    [`GET api/portions/exams/${ex}/portions`, () => api.getExamPortions(ex)],
    [`PUT api/portions/exams/${ex}/portions`, () => api.setExamPortions(ex, [])],
    [`POST api/portions/exams/${ex}/portions/publish`, () => api.publishExamPortions(ex)],
    [`POST api/portions/exams/${ex}/portions/unpublish`, () => api.unpublishExamPortions(ex)],
    [`GET api/portions/exams/${ex}/coverage`, () => api.examCoverage(ex)],
    ["GET api/portions/settings", () => api.getPortionSettings()],
    ["PUT api/portions/settings", () => api.savePortionSettings({} as never)],
    ["GET api/portions/settings/notification-preferences", () => api.getNotificationPreferences()],
    ["PUT api/portions/settings/notification-preferences", () => api.saveNotificationPreferences([])],
    ["GET api/portions/settings/audit", () => api.listAudit()],
    ["GET api/portions/family/overview", () => api.familyOverview()],
  ];

  it.each(table)("%s", async (expected, call) => {
    const calls = stubClient(academicHttpClient, { "GET .*": {}, "POST .*": {}, "PUT .*": {}, "DELETE .*": {} });
    await call();
    expect(`${calls[0].method} ${calls[0].url}`).toBe(expected);
  });
});
