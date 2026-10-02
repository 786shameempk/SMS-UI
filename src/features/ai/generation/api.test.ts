import { apiError, stubClient } from "@/test/utils";

/** Fresh module graph per test so the demo-mode flag and the stubbed client always belong to the same instance. */
async function load() {
  const api = await import("./api");
  const { aiHttpClient } = await import("@/lib/httpClient");
  return { ...api, aiHttpClient };
}

describe("generation api", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("posts the request to the matching AiService endpoint and returns the draft", async () => {
    const { generateQuestions, generateExam, generateWorksheet, generateLessonPlan, generateHomework, generateReportCardRemark, aiHttpClient } = await load();
    const draft = { content: { questions: [] }, aiGenerated: true, status: "Draft", model: "m" };
    const calls = stubClient(aiHttpClient, {
      "POST api/ai/generate-questions": draft, "POST api/ai/generate-exam": draft, "POST api/ai/generate-worksheet": draft,
      "POST api/ai/generate-lesson-plan": draft, "POST api/ai/generate-homework": draft, "POST api/ai/report-card-remark": draft,
    });

    const body = { classId: "c", subjectId: "s" };
    expect(await generateQuestions({ ...body, chapter: "x", questionCount: 1, difficulty: "Easy", questionTypes: ["MCQ"] })).toEqual(draft);
    await generateExam({ ...body, chapters: ["x"], durationMinutes: 30, easy: 100, medium: 0, hard: 0, sections: [] });
    await generateWorksheet({ ...body, topic: "t", difficulty: "Easy", questionCount: 1 });
    await generateLessonPlan({ ...body, topic: "t", durationMinutes: 30 });
    await generateHomework({ ...body, topic: "t", difficulty: "Easy", taskCount: 1 });
    await generateReportCardRemark({ examId: "e", studentId: "st", tone: "Balanced", length: "Short" });

    expect(calls.map((c) => c.url)).toEqual(["api/ai/generate-questions", "api/ai/generate-exam", "api/ai/generate-worksheet", "api/ai/generate-lesson-plan", "api/ai/generate-homework", "api/ai/report-card-remark"]);
  });

  it("surfaces the server message when generation is rejected", async () => {
    const { generateQuestions, aiHttpClient } = await load();
    stubClient(aiHttpClient, { "POST api/ai/generate-questions": () => { throw apiError(403, { title: "You do not have access to this AI feature." }); } });
    await expect(generateQuestions({ classId: "c", subjectId: "s", chapter: "x", questionCount: 1, difficulty: "Easy", questionTypes: ["MCQ"] })).rejects.toThrow("You do not have access to this AI feature.");
  });

  it("refuses in demo mode instead of inventing exam content", async () => {
    vi.stubEnv("VITE_AI_MOCK", "true");
    vi.resetModules();
    const { generateQuestions, aiHttpClient } = await load();
    const calls = stubClient(aiHttpClient, {});
    await expect(generateQuestions({ classId: "c", subjectId: "s", chapter: "x", questionCount: 1, difficulty: "Easy", questionTypes: ["MCQ"] })).rejects.toThrow(/demo mode/i);
    expect(calls).toHaveLength(0);
  });
});
