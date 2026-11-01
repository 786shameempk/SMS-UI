import { describe, expect, it } from "vitest";
import { academicHttpClient } from "@/lib/httpClient";
import { stubClient } from "@/test/utils";
import * as api from "./api";

describe("appraisal api", () => {
  it("leaves empty filters out of the query string", async () => {
    const calls = stubClient(academicHttpClient, { "GET api/appraisal/cycles": [] });
    await api.listCycles({ status: "InProgress", academicYearId: undefined });
    expect((calls[0].config as { params: Record<string, unknown> }).params).toEqual({ status: "InProgress" });
  });

  it("uses the reviewer's own endpoints for the review form, draft and submit", async () => {
    const calls = stubClient(academicHttpClient, {
      "GET api/appraisal/reviews/mine": [],
      "GET api/appraisal/reviews/a1": { assignmentId: "a1" },
      "PUT api/appraisal/reviews/a1/draft": {},
      "POST api/appraisal/reviews/a1/submit": {},
    });
    await api.listMyReviews(true);
    await api.getReviewForm("a1");
    await api.saveDraft("a1", [{ questionId: "q", rating: 4 }]);
    await api.submitReview("a1", [{ questionId: "q", rating: 4 }]);
    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual(["GET api/appraisal/reviews/mine", "GET api/appraisal/reviews/a1", "PUT api/appraisal/reviews/a1/draft", "POST api/appraisal/reviews/a1/submit"]);
    expect((calls[0].config as { params: Record<string, unknown> }).params).toEqual({ includeSubmitted: true });
    expect(calls[3].body).toEqual({ answers: [{ questionId: "q", rating: 4 }] });
  });

  it("sends only the answers and never a score or weight", async () => {
    const calls = stubClient(academicHttpClient, { "POST api/appraisal/reviews/a1/submit": {} });
    await api.submitReview("a1", [{ questionId: "q", rating: 5, text: "Great" }]);
    expect(Object.keys(calls[0].body as object)).toEqual(["answers"]);
  });

  it("creates and updates a cycle on its own URL and sends the row version back", async () => {
    const calls = stubClient(academicHttpClient, { "POST api/appraisal/cycles": {}, "PUT api/appraisal/cycles/c1": {} });
    const values = { name: "2026", startDate: "2026-04-01", endDate: "2027-03-31", evaluationPeriod: "", appraisalType: "Annual", templateVersionId: "v1", eligibleDepartmentIds: [], eligibleCategories: [], allowDuplicateParticipants: false };
    await api.createCycle(values);
    await api.updateCycle("c1", { ...values, rowVersion: "AAA=" });
    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual(["POST api/appraisal/cycles", "PUT api/appraisal/cycles/c1"]);
    expect(calls[1].body).toMatchObject({ rowVersion: "AAA=" });
  });

  it("publishes, amends scoring and finalizes through the dedicated routes", async () => {
    const calls = stubClient(academicHttpClient, {
      "POST api/appraisal/cycles/c1/publish": {},
      "POST api/appraisal/cycles/c1/amend-scoring": {},
      "POST api/appraisal/participants/p1/finalize": {},
      "POST api/appraisal/participants/p1/release": {},
    });
    await api.publishCycle("c1");
    await api.amendCycleScoring("c1", { reason: "Principal asked", weights: [{ category: "*", group: "principal", weight: 30 }] });
    await api.finalizeParticipant("p1", { remarks: "Good year", releaseToEmployee: true });
    await api.releaseParticipant("p1", false);
    expect(calls[1].body).toMatchObject({ reason: "Principal asked", weights: [{ category: "*", group: "principal", weight: 30 }] });
    expect(calls[2].body).toEqual({ remarks: "Good year", releaseToEmployee: true });
    expect((calls[3].config as { params: Record<string, unknown> }).params).toEqual({ release: false });
  });

  it("passes the report filters and downloads the CSV as a blob", async () => {
    const calls = stubClient(academicHttpClient, { "GET api/appraisal/reports/employee-wise": { key: "employee-wise", rows: [], columns: [], notes: [] }, "GET api/appraisal/reports/employee-wise/csv": new Blob(["a,b"]) });
    await api.getReport("employee-wise", { cycleId: "c1", category: "", from: "2026-04-01" });
    await api.downloadReportCsv("employee-wise", { cycleId: "c1" });
    expect((calls[0].config as { params: Record<string, unknown> }).params).toEqual({ cycleId: "c1", from: "2026-04-01" });
    expect((calls[1].config as { responseType?: string }).responseType).toBe("blob");
  });

  it("selects participants by people, department or everyone eligible", async () => {
    const calls = stubClient(academicHttpClient, { "POST api/appraisal/cycles/c1/participants": [] });
    await api.addParticipants("c1", { allEligible: true });
    expect(calls[0].body).toEqual({ allEligible: true });
  });
});
