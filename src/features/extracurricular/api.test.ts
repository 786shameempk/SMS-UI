import { describe, expect, it } from "vitest";
import { campusHttpClient } from "@/lib/httpClient";
import { stubClient } from "@/test/utils";
import * as api from "./api";

describe("extracurricular api", () => {
  it("leaves empty filters out of the query string", async () => {
    const calls = stubClient(campusHttpClient, { "GET /api/extracurricular/activities": { items: [], totalCount: 0, pageNumber: 1, pageSize: 25 } });

    await api.listActivities({ search: "", categoryId: undefined, status: "Active", openOnly: false });

    const config = calls[0].config as { params: Record<string, unknown> };
    expect(config.params).toEqual({ status: "Active", openOnly: false, pageNumber: 1, pageSize: 25 });
  });

  it("creates with POST and updates with PUT on the record's own URL", async () => {
    const calls = stubClient(campusHttpClient, {
      "POST /api/extracurricular/teams": { id: "t1" },
      "PUT /api/extracurricular/teams/t1": { id: "t1" },
    });
    const team = { activityId: "a1", name: "U14", code: "U14", color: "#112233", level: null, coachName: null, maxMembers: 12, description: null, isActive: true };

    await api.saveTeam(team);
    await api.saveTeam({ ...team, id: "t1" });

    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual(["POST /api/extracurricular/teams", "PUT /api/extracurricular/teams/t1"]);
  });

  it("sends the shuffle preview request as the server expects it", async () => {
    const calls = stubClient(campusHttpClient, { "POST /api/extracurricular/groups/shuffle/preview": { seed: 5, moves: [], totals: [], lockedMembersKept: 0, unchanged: 0 } });

    const preview = await api.previewShuffle({ academicYear: "2026-27", kind: "House", strategy: "ByClass", scope: "UnassignedOnly", seed: null, groupIds: ["g1"] });

    expect(preview.seed).toBe(5);
    expect(calls[0].body).toMatchObject({ academicYear: "2026-27", kind: "House", strategy: "ByClass", scope: "UnassignedOnly", groupIds: ["g1"] });
  });

  it("applies a shuffle from the previewed moves only", async () => {
    const calls = stubClient(campusHttpClient, { "POST /api/extracurricular/groups/shuffle/apply": { batchId: "b1" } });

    await api.applyShuffle({ academicYear: "2026-27", kind: "House", moves: [{ studentId: "s1", toGroupId: "g2" }], note: "Start of year" });

    expect(calls[0].body).toEqual({ academicYear: "2026-27", kind: "House", moves: [{ studentId: "s1", toGroupId: "g2" }], note: "Start of year" });
  });

  it("verifies a figure through the query string, not the body", async () => {
    const calls = stubClient(campusHttpClient, { "POST /api/extracurricular/sustainability/measurements/m1/verify": { id: "m1", verified: true } });

    await api.verifyMeasurement("m1", true);

    expect((calls[0].config as { params: unknown }).params).toEqual({ verified: true });
  });

  it("sends the register as marks", async () => {
    const calls = stubClient(campusHttpClient, { "PUT /api/extracurricular/sessions/s1/attendance": { saved: 2 } });

    const result = await api.saveSessionAttendance("s1", [{ studentId: "a", status: "Present" }, { studentId: "b", status: "Excused" }]);

    expect(result.saved).toBe(2);
    expect(calls[0].body).toEqual({ marks: [{ studentId: "a", status: "Present" }, { studentId: "b", status: "Excused" }] });
  });
});
