import * as api from "./api";
import { academicHttpClient } from "@/lib/httpClient";
import { apiError, stubClient } from "@/test/utils";

const device = (o: Record<string, unknown> = {}) => ({
  id: "d1", name: "Gate", kind: "FaceKiosk", location: null, serialNumber: null, vendor: null, defaultDirection: "In", keyPrefix: "adk_123456",
  status: "Active", online: true, lastSeenAt: null, lastSeenIp: null, firmwareVersion: null, lastEventAt: null, lastError: null, lastErrorAt: null,
  eventsToday: 2, rejectedToday: 0, ...o,
});
const scan = (o: Record<string, unknown> = {}) => ({
  eventId: "e1", result: "PendingReview", reason: null, personType: "Student", personId: "s1", personName: "Asha", attendanceStatus: null,
  direction: "In", date: "2026-10-22", occurredAt: "2026-10-22T03:00:00Z", ...o,
});
const event = (o: Record<string, unknown> = {}) => ({
  id: "e1", source: "Rfid", deviceId: "d1", deviceName: "Gate", qrSessionId: null, personType: null, personId: null, personName: null,
  identifierLabel: "••••BEEF", direction: "Auto", occurredAt: "", receivedAt: "", attendanceDate: "2026-10-22", result: "Rejected", reason: "Unknown card.",
  confidence: null, reviewDecision: null, reviewedByName: null, reviewedAt: null, reviewNote: null, ...o,
});

describe("attendance methods api", () => {
  it("converts enums both ways", () => {
    expect(api.fromApiEnum("PendingReview")).toBe("pendingReview");
    expect(api.toApiEnum("faceKiosk")).toBe("FaceKiosk");
    expect(api.toApiEnum(undefined)).toBeUndefined();
    expect(api.fromApiEnum(null)).toBeNull();
  });

  it("reads and saves settings, translating late times", async () => {
    const settings = { qrEnabled: true, rfidEnabled: false, biometricEnabled: false, faceEnabled: false, timeZoneId: "Asia/Kolkata", studentLateAfter: "09:15:00",
      staffLateAfter: null, qrPassLifetimeSeconds: 60, duplicateWindowMinutes: 5, faceMatchThreshold: 0.92, faceReviewThreshold: 0.8, scanEventRetentionDays: 180,
      requireApprovalForPastEdits: false };
    const calls = stubClient(academicHttpClient, {
      "GET /api/attendance/methods/settings": settings,
      "PUT /api/attendance/methods/settings": (_u: string, body: unknown) => body,
      "GET /api/attendance/methods/status": [{ method: "rfid", enabled: true, ready: false, message: "No RFID reader registered.", activeDevices: 0, onlineDevices: 0 }],
    });

    const read = await api.getMethodSettings();
    expect(read.studentLateAfter).toBe("09:15");
    await api.updateMethodSettings({ ...read, staffLateAfter: "08:45" });
    expect(calls[1].body).toMatchObject({ studentLateAfter: "09:15:00", staffLateAfter: "08:45:00" });
    expect((await api.getMethodStatus())[0].ready).toBe(false);
  });

  it("registers, updates, rotates and removes devices", async () => {
    const calls = stubClient(academicHttpClient, {
      "GET /api/attendance/devices": [device()],
      "POST /api/attendance/devices": { device: device({ kind: "Rfid" }), deviceKey: "adk_secret" },
      "PUT /api/attendance/devices/d1": device({ status: "Disabled" }),
      "POST /api/attendance/devices/d1/rotate-key": { device: device(), deviceKey: "adk_new" },
      "DELETE /api/attendance/devices/d1": null,
    });

    expect((await api.listDevices())[0]).toMatchObject({ kind: "faceKiosk", status: "active", defaultDirection: "in" });
    const created = await api.registerDevice({ name: "Gate", kind: "rfid", defaultDirection: "auto", serialNumber: "" });
    expect(created).toMatchObject({ deviceKey: "adk_secret", device: { kind: "rfid" } });
    expect(calls[1].body).toMatchObject({ kind: "Rfid", defaultDirection: "Auto", serialNumber: null, status: "Active" });
    expect((await api.updateDevice("d1", { name: "Gate", kind: "rfid", defaultDirection: "in", status: "disabled" })).status).toBe("disabled");
    expect((await api.rotateDeviceKey("d1")).deviceKey).toBe("adk_new");
    await api.deleteDevice("d1");
  });

  it("links and revokes cards", async () => {
    const credential = { id: "c1", personType: "Staff", personId: "p1", personName: "Tara", kind: "Biometric", label: "••••0101", active: true, createdAt: "", revokedAt: null };
    const calls = stubClient(academicHttpClient, {
      "GET /api/attendance/credentials": [credential],
      "POST /api/attendance/credentials": credential,
      "DELETE /api/attendance/credentials/c1": null,
    });

    expect((await api.listCredentials({ personType: "staff" }))[0]).toMatchObject({ personType: "staff", kind: "biometric" });
    await api.assignCredential({ personType: "student", personId: "s1", kind: "rfid", identifier: "04A3" });
    expect(calls[1].body).toEqual({ personType: "Student", personId: "s1", kind: "Rfid", identifier: "04A3" });
    await api.revokeCredential("c1");
  });

  it("issues passes, runs sessions and scans", async () => {
    const session = { id: "q1", audience: "Student", sectionId: "s5a", sectionName: "5 - A", date: "2026-10-22", opensAt: "", closesAt: "", status: "Open",
      direction: "Auto", openedByName: "t@x", accepted: 1, rejected: 0, expected: 30 };
    const calls = stubClient(academicHttpClient, {
      "GET /api/attendance/qr/my-pass": { token: "SSAP1.x.y", expiresAt: "", lifetimeSeconds: 60, personType: "Staff", personName: "Tara" },
      "GET /api/attendance/qr/sessions": [session],
      "POST /api/attendance/qr/sessions": session,
      "GET /api/attendance/qr/sessions/q1": session,
      "POST /api/attendance/qr/sessions/q1/close": { ...session, status: "Closed" },
      "POST /api/attendance/qr/sessions/q1/scan": scan({ result: "Accepted" }),
      "POST /api/attendance/qr/sessions/q1/face": { scan: scan(), similarity: 0.85, needsManualFallback: false },
    });

    expect((await api.getMyPass()).personType).toBe("staff");
    expect((await api.listScanSessions())[0]).toMatchObject({ audience: "student", status: "open", direction: "auto" });
    await api.openScanSession({ audience: "staff", durationMinutes: 30, direction: "in" });
    expect(calls[2].body).toEqual({ audience: "Staff", sectionId: null, durationMinutes: 30, direction: "In" });
    expect((await api.getScanSession("q1")).id).toBe("q1");
    expect((await api.closeScanSession("q1")).status).toBe("closed");
    expect((await api.scanPass("q1", "SSAP1.x.y")).result).toBe("accepted");
    expect(calls[5].body).toEqual({ token: "SSAP1.x.y" });
    const face = await api.recognizeFaceInSession("q1", new Blob(["x"], { type: "image/jpeg" }));
    expect(face.scan).toMatchObject({ result: "pendingReview", personType: "student" });
    expect(calls[6].body).toBeInstanceOf(FormData);
  });

  it("face consent and enrolment, for staff and for guardians", async () => {
    const consent = { id: "f1", personType: "Student", personId: "s1", personName: "Asha", status: "Granted", givenBy: "Guardian", method: "Form", noticeVersion: "2026-10",
      grantedAt: "", recordedByName: null, withdrawnAt: null, withdrawnReason: null, enrolled: false, sampleCount: 0 };
    const calls = stubClient(academicHttpClient, {
      "GET /api/attendance/face/consents": [consent],
      "POST /api/attendance/face/consents": consent,
      "POST /api/attendance/face/consents/f1/withdraw": { ...consent, status: "Withdrawn" },
      "POST /api/attendance/face/enrollments": { ...consent, enrolled: true, sampleCount: 1 },
      "DELETE /api/attendance/face/enrollments/Student/s1": null,
      "GET /api/attendance/face/my-children": [consent],
      "POST /api/attendance/face/my-children/s1/grant": consent,
      "POST /api/attendance/face/my-children/s1/withdraw": null,
    });

    expect((await api.listFaceConsents("student"))[0]).toMatchObject({ personType: "student", status: "granted" });
    await api.grantFaceConsent({ personType: "student", personId: "s1", givenBy: "Guardian", method: "Form" });
    expect(calls[1].body).toMatchObject({ personType: "Student", noticeVersion: null });
    expect((await api.withdrawFaceConsent("f1", "asked")).status).toBe("withdrawn");
    expect((await api.enrollFace("student", "s1", new Blob(["x"]))).sampleCount).toBe(1);
    await api.deleteFaceEnrollment("student", "s1");
    expect(await api.listMyChildrenFaceConsents()).toHaveLength(1);
    await api.grantFaceConsentForChild("s1");
    await api.withdrawFaceConsentForChild("s1");
  });

  it("events, reviews, corrections, audit and the exceptions report", async () => {
    const correction = { id: "k1", personType: "Student", personId: "s1", personName: "Asha", sectionId: "s5a", date: "2026-10-21", currentStatus: "Absent",
      requestedStatus: "Present", reason: "Fair", requestedByName: "t", requestedAt: "", status: "Pending", decidedByName: null, decidedAt: null, decisionNote: null };
    const calls = stubClient(academicHttpClient, {
      "GET /api/attendance/events": [event()],
      "POST /api/attendance/events/e1/review": event({ result: "Accepted", reviewDecision: "Approved", personType: "Student" }),
      "GET /api/attendance/corrections": [correction],
      "POST /api/attendance/corrections": correction,
      "POST /api/attendance/corrections/k1/decide": { ...correction, status: "Approved" },
      "POST /api/attendance/corrections/k1/cancel": null,
      "GET /api/attendance/audit": [{ id: "a1", personType: "Staff", personId: "p1", personName: "Tara", date: "", action: "CheckedIn", oldStatus: null, newStatus: "Present",
        source: "Biometric", actorName: "Device", details: null, at: "" }],
      "GET /api/attendance/exceptions": {
        date: "2026-10-22", accepted: 3, duplicates: 1, rejected: 1, pendingReview: 1, rejectedEvents: [event()], pendingEvents: [event({ result: "PendingReview" })],
        unknownIdentifiers: [{ identifierLabel: "••••BEEF", source: "Rfid", deviceName: "Gate", count: 2, lastSeenAt: "" }],
        scannedButAbsent: [{ personType: "Student", personId: "s1", personName: "Asha", detail: "x" }], presentWithoutScan: [], staffNotCheckedOut: [], offlineDevices: [device()],
      },
    });

    expect((await api.listScanEvents({ result: "rejected", source: "rfid" }))[0]).toMatchObject({ source: "rfid", result: "rejected" });
    expect(calls[0].config).toMatchObject({ params: { result: "Rejected", source: "Rfid" } });
    expect((await api.reviewScanEvent("e1", true)).reviewDecision).toBe("approved");
    expect((await api.listCorrections("pending"))[0].status).toBe("pending");
    await api.requestCorrection({ personType: "student", personId: "s1", date: "2026-10-21", requestedStatus: "Present", reason: "Fair" });
    expect(calls[3].body).toMatchObject({ personType: "Student" });
    expect((await api.decideCorrection("k1", true)).status).toBe("approved");
    await api.cancelCorrection("k1");
    expect((await api.listAttendanceAudit({ personType: "staff" }))[0]).toMatchObject({ personType: "staff", source: "biometric" });
    const report = await api.getAttendanceExceptions("2026-10-22");
    expect(report.pendingEvents[0].result).toBe("pendingReview");
    expect(report.unknownIdentifiers[0].source).toBe("rfid");
    expect(report.scannedButAbsent[0].personType).toBe("student");
    expect(report.offlineDevices[0].kind).toBe("faceKiosk");
  });

  it("surfaces the server's message on failure", async () => {
    vi.spyOn(academicHttpClient, "get").mockRejectedValue(apiError(503, { title: "No face recognition service is configured." }));
    await expect(api.getMyPass()).rejects.toThrow("No face recognition service is configured.");
  });
});
