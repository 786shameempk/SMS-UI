import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { academicHttpClient } from "@/lib/httpClient";
import { allModules, renderWithProviders, signIn, stubClient } from "@/test/utils";
import ScanTab from "./ScanTab";
import CorrectionsTab from "./CorrectionsTab";
import ExceptionsTab from "./ExceptionsTab";
import MyAttendancePassPage from "../pages/MyAttendancePassPage";

const status = (overrides: Record<string, Partial<{ enabled: boolean; ready: boolean; message: string }>> = {}) =>
  ["manual", "qr", "rfid", "biometric", "face"].map((method) => ({
    method,
    enabled: method === "manual",
    ready: method === "manual",
    message: "Switched off.",
    activeDevices: 0,
    onlineDevices: 0,
    ...overrides[method],
  }));

const session = { id: "q1", audience: "Student", sectionId: "s5a", sectionName: "Class 5 - A", date: "2026-10-22", opensAt: "2026-10-22T03:00:00Z",
  closesAt: "2099-10-22T04:00:00Z", status: "Open", direction: "Auto", openedByName: "t@x", accepted: 0, rejected: 0, expected: 30 };

describe("attendance scanning", () => {
  beforeEach(() => signIn("teacher", {}, { ...allModules(), administration: false }));

  it("says plainly when QR and face are switched off instead of pretending", async () => {
    stubClient(academicHttpClient, { "GET /api/attendance/methods/status": status(), "GET /api/attendance/qr/sessions": [] });
    renderWithProviders(<ScanTab />);
    expect(await screen.findByText("QR and face attendance are switched off")).toBeInTheDocument();
    expect(screen.getByText(/Ask an administrator/)).toBeInTheDocument();
  });

  it("checks a pass from a handheld scanner against the server and shows its answer", async () => {
    const calls = stubClient(academicHttpClient, {
      "GET /api/attendance/methods/status": status({ qr: { enabled: true, ready: true, message: "ok" } }),
      "GET /api/attendance/qr/sessions": [session],
      "GET /api/attendance/qr/sessions/q1": session,
      "POST /api/attendance/qr/sessions/q1/scan": {
        eventId: "e1", result: "Rejected", reason: "This pass was already used. Ask for a fresh pass in the app.", personType: "Student", personId: "s1",
        personName: "Asha Nair", attendanceStatus: null, direction: "Auto", date: "2026-10-22", occurredAt: "2026-10-22T03:05:00Z",
      },
      "GET /api/attendance/roster-sections": [],
      "GET /api/classes": [],
      "GET /api/sections": [],
    });
    const user = userEvent.setup();
    renderWithProviders(<ScanTab />);

    await user.click(await screen.findByRole("button", { name: "Resume" }));
    await user.type(screen.getByLabelText("Pass from a handheld scanner"), "SSAP1.abc.def{Enter}");

    expect(await screen.findByText(/already used/)).toBeInTheDocument();
    expect(calls.find((c) => c.url.endsWith("/scan"))?.body).toEqual({ token: "SSAP1.abc.def" });
  });
});

describe("my attendance pass", () => {
  beforeEach(() => signIn("student"));

  it("shows the server's pass as a QR code", async () => {
    stubClient(academicHttpClient, {
      "GET /api/attendance/qr/my-pass": { token: "SSAP1.x.y", expiresAt: new Date(Date.now() + 60_000).toISOString(), lifetimeSeconds: 60, personType: "Student", personName: "Asha Nair" },
    });
    renderWithProviders(<MyAttendancePassPage />);
    expect(await screen.findByText("Asha Nair")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByAltText("Attendance QR pass")).toBeInTheDocument());
  });

  it("explains when there is no pass", async () => {
    vi.spyOn(academicHttpClient, "get").mockRejectedValue(
      Object.assign(new Error("x"), { isAxiosError: true, response: { status: 404, data: { title: "Your login is not linked to a student or staff record." } } }),
    );
    renderWithProviders(<MyAttendancePassPage />);
    expect(await screen.findByText(/not linked to a student or staff record/)).toBeInTheDocument();
  });
});

describe("corrections and exceptions", () => {
  it("lets an administrator approve a pending correction", async () => {
    signIn("admin");
    const correction = { id: "k1", personType: "Student", personId: "s1", personName: "Asha Nair", sectionId: "s5a", date: "2026-10-21", currentStatus: "Absent",
      requestedStatus: "Present", reason: "Science fair", requestedByName: "teacher@x", requestedAt: "2026-10-22T03:00:00Z", status: "Pending", decidedByName: null,
      decidedAt: null, decisionNote: null };
    const calls = stubClient(academicHttpClient, {
      "GET /api/attendance/corrections": [correction],
      "POST /api/attendance/corrections/k1/decide": { ...correction, status: "Approved" },
    });
    const user = userEvent.setup();
    renderWithProviders(<CorrectionsTab />);

    await user.click(await screen.findByRole("button", { name: /Approve/ }));
    await waitFor(() => expect(calls.find((c) => c.url.endsWith("/decide"))?.body).toEqual({ approve: true, note: null }));
  });

  it("shows unknown cards and reviews from the server's exceptions report", async () => {
    signIn("admin");
    stubClient(academicHttpClient, {
      "GET /api/attendance/exceptions": {
        date: "2026-10-22", accepted: 12, duplicates: 2, rejected: 1, pendingReview: 0, rejectedEvents: [], pendingEvents: [],
        unknownIdentifiers: [{ identifierLabel: "••••BEEF", source: "Rfid", deviceName: "Main gate", count: 3, lastSeenAt: "2026-10-22T03:00:00Z" }],
        scannedButAbsent: [], presentWithoutScan: [], staffNotCheckedOut: [], offlineDevices: [],
      },
    });
    renderWithProviders(<ExceptionsTab />);
    expect(await screen.findByText(/••••BEEF/)).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
  });
});
