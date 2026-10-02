import { apiError, stubClient } from "@/test/utils";

/** Fresh module graph per test so the demo-mode flag and the stubbed client always belong to the same instance. */
async function load() {
  const api = await import("./api");
  const { aiHttpClient } = await import("@/lib/httpClient");
  return { ...api, aiHttpClient };
}

const file = (name: string, size = 10) => new File([new Uint8Array(size)], name);

describe("study api", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("asks the study assistant and lists documents for a class", async () => {
    const { askStudyAssistant, listAiDocuments, aiHttpClient } = await load();
    const answer = { conversationId: "c1", answer: "Friction resists motion.", sources: [{ documentId: "d1", documentName: "Ch 4", page: 2 }], usedMaterial: true, notice: null };
    const calls = stubClient(aiHttpClient, { "POST api/ai/study-assistant": answer, "GET api/ai/documents": [] });

    expect(await askStudyAssistant({ message: "What is friction?", mode: "Explain" })).toEqual(answer);
    expect(await listAiDocuments("class-1")).toEqual([]);
    expect(calls[1].config).toEqual({ params: { classId: "class-1" } });
  });

  it("uploads the file as multipart form data with the class, subject and visibility", async () => {
    const { uploadAiDocument, aiHttpClient } = await load();
    const calls = stubClient(aiHttpClient, { "POST api/ai/documents": { id: "d1" } });

    await uploadAiDocument({ file: file("notes.pdf"), title: "Notes", classId: "c1", subjectId: "s1", visibility: "StaffOnly" });

    const form = calls[0].body as FormData;
    expect(form.get("Title")).toBe("Notes");
    expect(form.get("ClassId")).toBe("c1");
    expect(form.get("SubjectId")).toBe("s1");
    expect(form.get("Visibility")).toBe("StaffOnly");
    expect((form.get("File") as File).name).toBe("notes.pdf");
  });

  it("deletes a document and surfaces the server message on failure", async () => {
    const { deleteAiDocument, aiHttpClient } = await load();
    stubClient(aiHttpClient, { "DELETE api/ai/documents/d1": () => { throw apiError(403, { title: "Only the uploader or an administrator can delete this document." }); } });
    await expect(deleteAiDocument("d1")).rejects.toThrow("Only the uploader or an administrator can delete this document.");
  });

  it("validates files before upload", async () => {
    const { validateUpload } = await load();
    expect(validateUpload(null)).toMatch(/choose a file/i);
    expect(validateUpload(file("photo.png"))).toMatch(/only/i);
    expect(validateUpload(file("empty.pdf", 0))).toMatch(/empty/i);
    expect(validateUpload(file("big.pdf", 20 * 1024 * 1024 + 1))).toMatch(/20 MB/);
    expect(validateUpload(file("Chapter.DOCX"))).toBeNull();
  });

  it("does not call the AI service in demo mode", async () => {
    vi.stubEnv("VITE_AI_MOCK", "true");
    vi.resetModules();
    const { askStudyAssistant, listAiDocuments, aiHttpClient } = await load();
    const calls = stubClient(aiHttpClient, {});
    await expect(askStudyAssistant({ message: "x", mode: "Ask" })).rejects.toThrow(/demo mode/i);
    expect(await listAiDocuments()).toEqual([]);
    expect(calls).toHaveLength(0);
  });
});
