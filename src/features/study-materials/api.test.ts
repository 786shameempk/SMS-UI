import * as sm from "./api";
import { ACADEMIC_API_BASE_URL, academicHttpClient } from "@/lib/httpClient";
import { apiError, stubClient } from "@/test/utils";

const material = (overrides: Record<string, unknown> = {}) => ({
  id: "m1", tenantId: "t", isGlobal: false, title: "Fractions", description: null, category: "Notes", academicYearId: null, classId: "c5", sectionId: null,
  subjectId: "math", className: "Class 5", sectionName: null, subjectName: "Maths", chapter: null, audience: "Students", status: "Published", createdAt: "",
  updatedAt: null, publishedAt: null, availableFrom: null, availableUntil: null, isScheduled: false, isPinned: false, uploadedByUserId: "u1", uploadedByName: "Meera",
  uploadedByRole: "Teacher", fileName: "f.pdf", contentType: "application/pdf", sizeBytes: 10, isPreviewable: true, viewUrl: "/api/study-materials/m1/view",
  downloadUrl: null, linkUrl: null, viewCount: 1, downloadCount: 0, permissions: { canEdit: true }, ...overrides,
});
const form = (overrides: Record<string, unknown> = {}) => ({
  title: "Fractions", description: "", category: "worksheet", classId: "c5", audience: "everyone", linkUrl: undefined, ...overrides,
});

describe("study materials api", () => {
  it("lists with API enums in the query and maps rows", async () => {
    const calls = stubClient(academicHttpClient, { "GET /api/study-materials": [material()] });

    const [row] = await sm.listStudyMaterials({
      view: "library", status: "draft", category: "notes", classId: "", subjectId: "math", scope: "mine", search: "  frac ",
    } as never);
    await sm.listStudyMaterials({ view: "library", search: " " } as never);

    expect((calls[0].config as { params: unknown }).params).toEqual({
      view: "library", status: "Draft", category: "Notes", classId: undefined, subjectId: "math", scope: "mine", search: "frac",
    });
    expect((calls[1].config as { params: Record<string, unknown> }).params).toMatchObject({ status: undefined, category: undefined, search: undefined });
    expect(row).toMatchObject({
      category: "notes", audience: "students", status: "published", description: undefined, sectionName: undefined, downloadUrl: undefined,
    });
    expect(row.viewUrl).toBe(new URL("/api/study-materials/m1/view", ACADEMIC_API_BASE_URL).toString());
  });

  it("reads my counts", async () => {
    stubClient(academicHttpClient, { "GET /api/study-materials/mine/counts": { drafts: 2 } });
    expect(await sm.getMyStudyMaterialCounts()).toEqual({ drafts: 2 });
  });

  it("creates as multipart, skipping empty fields and reporting progress", async () => {
    const calls = stubClient(academicHttpClient, { "POST /api/study-materials": material() });
    const onProgress = vi.fn();
    const file = new File(["x"], "notes.pdf");

    await sm.createStudyMaterial(form() as never, { publish: true, file, onProgress });

    const body = calls[0].body as FormData;
    const fields = Object.fromEntries([...body.entries()].map(([k, v]) => [k, typeof v === "string" ? v : (v as File).name]));
    expect(fields).toEqual({ title: "Fractions", category: "Worksheet", classId: "c5", audience: "Everyone", publish: "true", file: "notes.pdf" });
    const config = calls[0].config as { headers: unknown; onUploadProgress: (e: { loaded: number; total?: number }) => void };
    expect(config.headers).toEqual({ "Content-Type": "multipart/form-data" });
    config.onUploadProgress({ loaded: 5, total: 10 });
    config.onUploadProgress({ loaded: 5 });
    expect(onProgress.mock.calls).toEqual([[0.5], [0]]);
  });

  it("updates with removeFile and works without a progress callback", async () => {
    const calls = stubClient(academicHttpClient, { "PUT /api/study-materials/m1": material({ status: "Draft" }) });

    const updated = await sm.updateStudyMaterial("m1", form({ linkUrl: "https://x" }) as never, { publish: false, removeFile: true });

    const body = calls[0].body as FormData;
    expect(body.get("publish")).toBe("false");
    expect(body.get("removeFile")).toBe("true");
    expect(body.get("linkUrl")).toBe("https://x");
    expect(body.has("file")).toBe(false);
    expect(() => (calls[0].config as { onUploadProgress: (e: { loaded: number }) => void }).onUploadProgress({ loaded: 1 })).not.toThrow();
    expect(updated.status).toBe("draft");
  });

  it("transitions, pins and deletes", async () => {
    const calls = stubClient(academicHttpClient, {
      "POST /api/study-materials/m1/archive": material({ status: "Archived" }),
      "PUT /api/study-materials/m1/pin": material({ isPinned: true }),
      "DELETE /api/study-materials/m1": null,
    });

    expect((await sm.transitionStudyMaterial("m1", "archive")).status).toBe("archived");
    expect((await sm.pinStudyMaterial("m1", true)).isPinned).toBe(true);
    await sm.deleteStudyMaterial("m1");

    expect(calls[1].body).toEqual({ pinned: true });
  });

  it("surfaces the server's error message", async () => {
    vi.spyOn(academicHttpClient, "delete").mockRejectedValue(apiError(403, { title: "Not yours" }));
    await expect(sm.deleteStudyMaterial("m1")).rejects.toThrow("Not yours");
  });
});
