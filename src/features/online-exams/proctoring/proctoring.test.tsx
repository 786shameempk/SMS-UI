import { act, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { academicHttpClient } from "@/lib/httpClient";
import { renderWithProviders, signIn, stubClient } from "@/test/utils";
import * as api from "./api";
import ProctoringConsent from "./ProctoringConsent";
import { useProctoring } from "./useProctoring";
import type { ProctoringSetup } from "./types";

const setup: ProctoringSetup = {
  mode: "Basic", noticeVersion: "2026-10", notice: ["This exam is proctored.", "Events only flag your attempt for a teacher to look at."],
  requireFullscreen: false, warningThreshold: 3, autoSubmitAfterIncidents: 0, snapshotIntervalSeconds: 0, consentGiven: false, consentGivenAt: null,
};

describe("proctoring api", () => {
  it("covers the student and invigilator endpoints", async () => {
    const calls = stubClient(academicHttpClient, {
      "GET /api/online-exams/e1/proctoring": setup,
      "POST /api/online-exams/e1/proctoring/consent": { ...setup, consentGiven: true },
      "POST /api/online-exams/e1/proctoring/events": { incidents: 1, warnings: 0, flagged: false, autoSubmitted: false, message: null },
      "POST /api/online-exams/e1/proctoring/snapshot": null,
      "GET /api/online-exams/e1/proctoring/my-review": null,
      "POST /api/online-exams/e1/proctoring/appeal": { outcome: "Warning", appealStatus: "Open" },
      "GET /api/online-exams/e1/monitor": { examId: "e1", candidates: [] },
      "GET /api/online-exams/e1/attempts/a1/proctoring": { attemptId: "a1", events: [] },
      "GET /api/online-exams/e1/attempts/a1/proctoring/snapshots/v1": new Blob(["x"]),
      "POST /api/online-exams/e1/attempts/a1/proctoring/review": { outcome: "Cleared" },
      "POST /api/online-exams/e1/attempts/a1/proctoring/appeal-decision": { appealStatus: "Upheld" },
    });

    expect((await api.getProctoringSetup("e1")).mode).toBe("Basic");
    expect((await api.giveProctoringConsent("e1", { noticeVersion: "2026-10", cameraAvailable: false, fullscreenAvailable: true, browser: "x" })).consentGiven).toBe(true);
    expect((await api.reportProctoringEvents("e1", [{ sequence: 1, type: "TabHidden", occurredAt: null, detail: null }])).incidents).toBe(1);
    expect(calls[2].body).toEqual({ events: [{ sequence: 1, type: "TabHidden", occurredAt: null, detail: null }] });
    await api.uploadProctoringSnapshot("e1", new Blob(["x"], { type: "image/jpeg" }));
    expect(calls[3].body).toBeInstanceOf(FormData);
    expect(await api.getMyProctoringReview("e1")).toBeNull();
    expect((await api.appealProctoringDecision("e1", "power cut")).appealStatus).toBe("Open");
    expect((await api.getProctoringMonitor("e1")).examId).toBe("e1");
    expect((await api.getProctoringTimeline("e1", "a1")).attemptId).toBe("a1");
    expect(await api.getProctoringSnapshot("e1", "a1", "v1")).toBeInstanceOf(Blob);
    expect((await api.decideProctoringReview("e1", "a1", "Cleared")).outcome).toBe("Cleared");
    expect(calls[9].body).toEqual({ outcome: "Cleared", note: null });
    expect((await api.decideProctoringAppeal("e1", "a1", true, "ok")).appealStatus).toBe("Upheld");
  });
});

describe("useProctoring", () => {
  it("reports a real tab switch with a sequence number and keeps events when offline", async () => {
    const reported: unknown[][] = [];
    let fail = true;
    vi.spyOn(api, "reportProctoringEvents").mockImplementation(async (_id, events) => {
      reported.push(events);
      if (fail) throw new Error("offline");
      return { incidents: 1, warnings: 0, flagged: false, autoSubmitted: false, message: null };
    });
    const config = { mode: "Basic" as const, requireFullscreen: false, warningThreshold: 3, autoSubmitAfterIncidents: 0, snapshotIntervalSeconds: 0 };
    const { result } = renderHook(() => useProctoring("e1", "a1", config, true, () => {}));

    const visibility = vi.spyOn(document, "visibilityState", "get");
    visibility.mockReturnValue("hidden");
    act(() => void document.dispatchEvent(new Event("visibilitychange")));
    const realNow = Date.now;
    vi.spyOn(Date, "now").mockReturnValue(realNow() + 5000);
    visibility.mockReturnValue("visible");
    fail = false;
    act(() => void document.dispatchEvent(new Event("visibilitychange")));

    await waitFor(() => expect(result.current.status?.incidents).toBe(1));
    const flat = reported.flat() as { type: string; sequence: number }[];
    expect(flat.some((e) => e.type === "TabHidden")).toBe(true);
    // The batch that failed was resent with the same sequence numbers.
    const hidden = flat.filter((e) => e.type === "TabHidden").map((e) => e.sequence);
    expect(new Set(hidden).size).toBe(1);
  });

  it("does nothing for an unproctored exam", () => {
    const spy = vi.spyOn(api, "reportProctoringEvents");
    renderHook(() => useProctoring("e1", "a1", null, true, () => {}));
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("ProctoringConsent", () => {
  beforeEach(() => signIn("student"));

  it("shows the notice and only continues after agreeing", async () => {
    const calls = stubClient(academicHttpClient, { "POST /api/online-exams/e1/proctoring/consent": { ...setup, consentGiven: true } });
    const onAgreed = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<ProctoringConsent examId="e1" setup={setup} onAgreed={onAgreed} onCancel={() => {}} />);

    expect(screen.getByText("Events only flag your attempt for a teacher to look at.")).toBeInTheDocument();
    const start = screen.getByRole("button", { name: /I agree, start the exam/ });
    expect(start).toBeDisabled();
    await user.click(screen.getByLabelText("I agree"));
    await user.click(start);
    await waitFor(() => expect(onAgreed).toHaveBeenCalled());
    expect(calls[0].body).toMatchObject({ noticeVersion: "2026-10", cameraAvailable: true });
  });
});
