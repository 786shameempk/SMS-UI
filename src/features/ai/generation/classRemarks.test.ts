import { apiError, stubClient } from "@/test/utils";
import type { BatchRemarkItem } from "./types";

async function load() {
  const api = await import("./classRemarks");
  const { aiHttpClient } = await import("@/lib/httpClient");
  return { ...api, aiHttpClient };
}

const ok = (studentId: string): BatchRemarkItem => ({ studentId, remark: `Remark for ${studentId}`, basedOn: ["Exam marks"], errorCode: null, error: null });
const ids = (n: number) => Array.from({ length: n }, (_, i) => `s${i + 1}`);
type Body = { students: { studentId: string }[] };

describe("draftClassRemarks", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("sends the class in chunks of five and reports progress after each", async () => {
    const { draftClassRemarks, aiHttpClient } = await load();
    const calls = stubClient(aiHttpClient, {
      "POST api/ai/report-card-remarks/batch": (_u: string, body: unknown) => ({ items: (body as Body).students.map((s) => ok(s.studentId)), aiGenerated: true, status: "Draft", model: "m" }),
    });
    const progress: number[] = [];

    const items = await draftClassRemarks("e1", ids(12), { tone: "Balanced", length: "Short" }, { onProgress: (sofar) => progress.push(sofar.length) });

    expect(calls.map((c) => (c.body as Body).students.length)).toEqual([5, 5, 2]);
    expect(calls[0].body).toMatchObject({ examId: "e1", tone: "Balanced", length: "Short" });
    expect(progress).toEqual([5, 10, 12]);
    expect(items.map((i) => i.studentId)).toEqual(ids(12));
  });

  it("stops sending once a usage limit is reported and marks the rest with that reason", async () => {
    const { draftClassRemarks, aiHttpClient } = await load();
    const quota = "You have reached your daily AI request limit. Try again tomorrow.";
    const calls = stubClient(aiHttpClient, {
      "POST api/ai/report-card-remarks/batch": (_u: string, body: unknown) => ({
        items: (body as Body).students.map((s, i) => (i < 3 ? ok(s.studentId) : { studentId: s.studentId, remark: null, basedOn: [], errorCode: "AI_QUOTA_EXCEEDED", error: quota })),
        aiGenerated: true, status: "Draft", model: "m",
      }),
    });

    const items = await draftClassRemarks("e1", ids(12), { tone: "Balanced", length: "Short" });

    expect(calls).toHaveLength(1);
    expect(items.filter((i) => i.remark)).toHaveLength(3);
    expect(items.slice(3).every((i) => i.error === quota)).toBe(true);
    expect(items).toHaveLength(12);
  });

  it("marks the chunk and the rest as failed when a request fails", async () => {
    const { draftClassRemarks, aiHttpClient } = await load();
    let n = 0;
    stubClient(aiHttpClient, {
      "POST api/ai/report-card-remarks/batch": (_u: string, body: unknown) => {
        n += 1;
        if (n === 2) throw apiError(503, { title: "The AI provider is unavailable." });
        return { items: (body as Body).students.map((s) => ok(s.studentId)), aiGenerated: true, status: "Draft", model: "m" };
      },
    });

    const items = await draftClassRemarks("e1", ids(12), { tone: "Balanced", length: "Short" });

    expect(n).toBe(2);
    expect(items.slice(0, 5).every((i) => i.remark)).toBe(true);
    expect(items.slice(5).every((i) => i.error === "The AI provider is unavailable.")).toBe(true);
  });

  it("stops between chunks when asked", async () => {
    const { draftClassRemarks, aiHttpClient } = await load();
    let stop = false;
    const calls = stubClient(aiHttpClient, {
      "POST api/ai/report-card-remarks/batch": (_u: string, body: unknown) => {
        stop = true;
        return { items: (body as Body).students.map((s) => ok(s.studentId)), aiGenerated: true, status: "Draft", model: "m" };
      },
    });

    const items = await draftClassRemarks("e1", ids(8), { tone: "Balanced", length: "Short" }, { shouldStop: () => stop });

    expect(calls).toHaveLength(1);
    expect(items.slice(5).every((i) => i.errorCode === "STOPPED")).toBe(true);
  });

  it("does not call the AI service in demo mode", async () => {
    vi.stubEnv("VITE_AI_MOCK", "true");
    vi.resetModules();
    const { generateReportCardRemarks, aiHttpClient } = await load();
    const calls = stubClient(aiHttpClient, {});
    await expect(generateReportCardRemarks({ examId: "e", students: [{ studentId: "s" }], tone: "Balanced", length: "Short" })).rejects.toThrow(/demo mode/i);
    expect(calls).toHaveLength(0);
  });
});
