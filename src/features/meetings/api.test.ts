import * as meetings from "./api";
import { academicHttpClient, meetingHttpClient } from "@/lib/httpClient";
import { apiError, stubClient } from "@/test/utils";

const any = { "GET .*": {}, "POST .*": {}, "PUT .*": {}, "PATCH .*": {}, "DELETE .*": null };

describe("meetings api", () => {
  it.each([
    ["listMeetings", () => meetings.listMeetings({ mine: true, page: 2 }), "GET", "api/meetings", { mine: true, page: 2 }],
    ["listTodayMeetings", () => meetings.listTodayMeetings(), "GET", "api/meetings/today", { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }],
    ["listUpcomingMeetings", () => meetings.listUpcomingMeetings(), "GET", "api/meetings/upcoming", { days: 14, take: 20 }],
    ["listCalendarEvents", () => meetings.listCalendarEvents("a", "b", "OnlineClass" as never), "GET", "api/meetings/calendar", { from: "a", to: "b", type: "OnlineClass" }],
    ["getMeeting", () => meetings.getMeeting("m1"), "GET", "api/meetings/m1", undefined],
    ["updateMeeting", () => meetings.updateMeeting("m1", { title: "T", recordingEnabled: true, chatEnabled: true }, "All"), "PUT", "api/meetings/m1", { scope: "All" }],
    ["deleteMeeting", () => meetings.deleteMeeting("m1"), "DELETE", "api/meetings/m1", undefined],
    ["publishMeeting", () => meetings.publishMeeting("m1"), "POST", "api/meetings/m1/publish", undefined],
    ["cancelMeeting", () => meetings.cancelMeeting("m1", "Sick"), "POST", "api/meetings/m1/cancel", { scope: "This" }],
    ["rescheduleMeeting", () => meetings.rescheduleMeeting("m1", "2026-10-05T04:30:00Z", 45, "Following"), "POST", "api/meetings/m1/reschedule", { scope: "Following" }],
    ["startMeeting", () => meetings.startMeeting("m1"), "POST", "api/meetings/m1/start", undefined],
    ["endMeeting", () => meetings.endMeeting("m1"), "POST", "api/meetings/m1/end", undefined],
    ["joinMeeting", () => meetings.joinMeeting("m1"), "POST", "api/meetings/m1/join", undefined],
    ["getActivity", () => meetings.getActivity("m1"), "GET", "api/meetings/m1/activity", undefined],
    ["listParticipants", () => meetings.listParticipants("m1"), "GET", "api/meetings/m1/participants", undefined],
    ["addParticipants", () => meetings.addParticipants("m1", []), "POST", "api/meetings/m1/participants", { scope: "This" }],
    ["removeParticipant", () => meetings.removeParticipant("m1", "u1", "All"), "DELETE", "api/meetings/m1/participants/u1", { scope: "All" }],
    ["getAttendance", () => meetings.getAttendance("m1"), "GET", "api/meetings/m1/attendance", undefined],
    ["overrideAttendance", () => meetings.overrideAttendance("m1", "u1", "Present" as never, "Network"), "PUT", "api/meetings/m1/attendance/u1", undefined],
    ["saveNotes", () => meetings.saveNotes("m1", {} as never), "PUT", "api/meetings/m1/notes", undefined],
    ["listMaterials", () => meetings.listMaterials("m1"), "GET", "api/meetings/m1/materials", undefined],
    ["addMaterialLink", () => meetings.addMaterialLink("m1", { kind: "Link" as never, title: "Video", url: "https://x" }), "POST", "api/meetings/m1/materials/link", undefined],
    ["deleteMaterial", () => meetings.deleteMaterial("m1", "mt1"), "DELETE", "api/meetings/m1/materials/mt1", undefined],
    ["listRecordings", () => meetings.listRecordings("m1"), "GET", "api/meetings/m1/recordings", undefined],
    ["getRecordingUrl", () => meetings.getRecordingUrl("m1", "r1"), "GET", "api/meetings/m1/recordings/r1/url", undefined],
    ["updateRecording", () => meetings.updateRecording("m1", "r1", "Staff" as never), "PUT", "api/meetings/m1/recordings/r1", undefined],
    ["deleteRecording", () => meetings.deleteRecording("m1", "r1"), "DELETE", "api/meetings/m1/recordings/r1", undefined],
    ["startRecording", () => meetings.startRecording("m1"), "POST", "api/meetings/m1/recordings/start", undefined],
    ["stopRecording", () => meetings.stopRecording("m1"), "POST", "api/meetings/m1/recordings/stop", undefined],
    ["listChat", () => meetings.listChat("m1"), "GET", "api/meetings/m1/chat", undefined],
    ["postChat", () => meetings.postChat("m1", "Hello"), "POST", "api/meetings/m1/chat", undefined],
    ["pinChat", () => meetings.pinChat("m1", "c1", true), "PATCH", "api/meetings/m1/chat/c1", undefined],
    ["deleteChat", () => meetings.deleteChat("m1", "c1"), "DELETE", "api/meetings/m1/chat/c1", undefined],
    ["toggleChat", () => meetings.toggleChat("m1", false), "PUT", "api/meetings/m1/chat/enabled", undefined],
    ["getSeries", () => meetings.getSeries("s1"), "GET", "api/meeting-series/s1", undefined],
    ["endSeries", () => meetings.endSeries("s1", "Term over"), "POST", "api/meeting-series/s1/end", undefined],
    ["getMeetingReport", () => meetings.getMeetingReport({ sectionId: "s5a" }), "GET", "api/meeting-reports/summary", { sectionId: "s5a" }],
    ["getStudentAttendanceReport", () => meetings.getStudentAttendanceReport({}), "GET", "api/meeting-reports/attendance", {}],
    ["getTeacherReport", () => meetings.getTeacherReport({}), "GET", "api/meeting-reports/teachers", {}],
    ["getMeetingSettings", () => meetings.getMeetingSettings(), "GET", "api/meeting-settings", undefined],
    ["updateMeetingSettings", () => meetings.updateMeetingSettings({} as never), "PUT", "api/meeting-settings", undefined],
    ["scheduleMeeting", () => meetings.scheduleMeeting({} as never), "POST", "api/meetings", undefined],
  ] as const)("%s", async (_name, call, method, url, params) => {
    const calls = stubClient(meetingHttpClient, any);

    await call();

    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ method, url });
    if (params !== undefined) expect((calls[0].config as { params?: unknown }).params).toEqual(params);
  });

  it("sends bodies for cancel, reschedule, chat and attendance overrides", async () => {
    const calls = stubClient(meetingHttpClient, any);

    await meetings.cancelMeeting("m1", "Teacher unwell");
    await meetings.rescheduleMeeting("m1", "2026-10-05T04:30:00Z", 45);
    await meetings.postChat("m1", "Quiz now!", true);
    await meetings.overrideAttendance("m1", "u1", "Present" as never, "Network issue");
    await meetings.endSeries("s1");

    expect(calls.map((c) => c.body)).toEqual([
      { reason: "Teacher unwell" },
      { startUtc: "2026-10-05T04:30:00Z", durationMinutes: 45 },
      { body: "Quiz now!", announcement: true },
      { status: "Present", reason: "Network issue" },
      { reason: undefined },
    ]);
  });

  it("notes: an empty body means there are none yet", async () => {
    stubClient(meetingHttpClient, { "GET api/meetings/m1/notes": "", "GET api/meetings/m2/notes": { summary: "Fractions" } });

    expect(await meetings.getNotes("m1")).toBeNull();
    expect(await meetings.getNotes("m2")).toEqual({ summary: "Fractions" });
  });

  it("uploads materials as multipart form data", async () => {
    const calls = stubClient(meetingHttpClient, any);
    const file = new File(["%PDF"], "chapter4.pdf", { type: "application/pdf" });

    await meetings.uploadMaterial("m1", file, "Chapter 4");
    await meetings.uploadMaterial("m1", file);

    const form = calls[0].body as FormData;
    expect(form.get("file")).toBeInstanceOf(File);
    expect(form.get("title")).toBe("Chapter 4");
    expect((calls[1].body as FormData).has("title")).toBe(false);
    expect((calls[0].config as { headers: Record<string, string> }).headers["Content-Type"]).toBe("multipart/form-data");
  });

  it("downloads a report using the server's file name", async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    URL.createObjectURL = vi.fn(() => "blob:report");
    URL.revokeObjectURL = vi.fn();
    const get = vi.spyOn(meetingHttpClient, "get")
      .mockResolvedValueOnce({ data: new Blob(["a"]), headers: { "content-disposition": "attachment; filename*=UTF-8''student%20attendance.csv" } } as never)
      .mockResolvedValueOnce({ data: new Blob(["a"]), headers: {} } as never)
      .mockRejectedValueOnce(apiError(403, { title: "Reports are available to teachers" }));

    await meetings.downloadReport("attendance", "csv", { sectionId: "s5a" });
    await meetings.downloadReport("teachers", "xlsx", {});

    expect(get.mock.calls[0][1]).toMatchObject({ params: { sectionId: "s5a", format: "csv" }, responseType: "blob" });
    expect(click).toHaveBeenCalledTimes(2);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:report");
    await expect(meetings.downloadReport("teachers", "csv", {})).rejects.toThrow("Reports are available to teachers");
  });

  it("section options are labelled by class and sorted naturally", async () => {
    stubClient(academicHttpClient, {
      "GET api/sections": [{ id: "s10a", name: "A", classId: "c10" }, { id: "s2b", name: "B", classId: "c2" }, { id: "sx", name: "Z", classId: "gone" }],
      "GET api/classes": [{ id: "c10", name: "Class 10" }, { id: "c2", name: "Class 2" }],
      "GET api/subjects": [{ id: "math", name: "Maths", classIds: [] }],
      "GET api/people": [],
    });

    expect((await meetings.listSectionOptions()).map((o) => o.label)).toEqual(["Class · Z", "Class 2 · B", "Class 10 · A"]);
    expect(await meetings.listSubjectOptions()).toHaveLength(1);
    await meetings.searchDirectory("", "Staff");
    expect(meetings.absoluteFileUrl("api/meeting-files/material/1?sig=x")).toMatch(/^https?:.*\/api\/meeting-files\/material\/1\?sig=x$/);
  });

  it("surfaces API problems as errors", async () => {
    vi.spyOn(meetingHttpClient, "post").mockRejectedValue(apiError(409, { title: "This meeting opens for joining at 10:20" }));

    await expect(meetings.joinMeeting("m1")).rejects.toThrow("This meeting opens for joining at 10:20");
  });
});
