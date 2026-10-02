import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test/utils";
import StudyMaterialsPanel from "./StudyMaterialsPanel";
import * as studyApi from "../../study/api";
import type { AiDocument } from "../../study/types";

vi.mock("react-hot-toast", () => ({ default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));
vi.mock("@/features/academics/api", () => ({
  listClasses: vi.fn(async () => [{ id: "c1", name: "Grade 7" }]),
  listSubjects: vi.fn(async () => [{ id: "s1", name: "Science", classIds: [] }]),
}));
vi.mock("../../study/api", async (original) => ({
  ...(await original<typeof import("../../study/api")>()),
  listAiDocuments: vi.fn(),
  uploadAiDocument: vi.fn(),
  deleteAiDocument: vi.fn(),
}));
// Radix Select is awkward in jsdom; a plain button stands in for choosing a class and subject.
vi.mock("../generation/shared", () => ({
  ClassSubjectFields: ({ onChange }: { onChange: (v: { classId: string; subjectId: string }) => void }) => (
    <button type="button" onClick={() => onChange({ classId: "c1", subjectId: "s1" })}>pick class and subject</button>
  ),
}));

const doc = (patch: Partial<AiDocument>): AiDocument => ({
  id: "d1", title: "Force and Pressure", fileName: "force.pdf", sizeBytes: 2048, classId: "c1", subjectId: "s1", visibility: "Class",
  status: "Ready", errorCode: null, pageCount: 12, chunkCount: 30, jobId: "j1", progress: 100, createdAt: "2026-10-02T10:00:00Z", ...patch,
});

describe("StudyMaterialsPanel", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists materials with their class, subject and indexing state", async () => {
    vi.mocked(studyApi.listAiDocuments).mockResolvedValue([
      doc({}),
      doc({ id: "d2", title: "Light", status: "Processing", progress: 40 }),
      doc({ id: "d3", title: "Scanned", status: "Failed", errorCode: "AI_DOCUMENT_PROCESSING_ERROR" }),
    ]);
    renderWithProviders(<StudyMaterialsPanel />);

    expect(await screen.findByText("Force and Pressure")).toBeInTheDocument();
    expect(await screen.findByText(/Grade 7 · Science · force\.pdf · 2 KB · 12 pages/)).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Indexing Light" })).toHaveAttribute("aria-valuenow", "40");
    expect(screen.getByText(/scanned pdfs/i)).toBeInTheDocument();
  });

  it("uploads a file for the chosen class and subject, defaulting the title to the file name", async () => {
    vi.mocked(studyApi.listAiDocuments).mockResolvedValue([]);
    vi.mocked(studyApi.uploadAiDocument).mockResolvedValue(doc({ status: "Queued" }));
    const user = userEvent.setup();
    renderWithProviders(<StudyMaterialsPanel />);

    const submit = screen.getByRole("button", { name: /upload and index/i });
    expect(submit).toBeDisabled();
    await user.upload(screen.getByLabelText("File"), new File(["text"], "chapter-4.pdf"));
    await user.click(screen.getByRole("button", { name: /pick class/i }));
    await user.click(submit);

    await waitFor(() => expect(studyApi.uploadAiDocument).toHaveBeenCalled());
    expect(vi.mocked(studyApi.uploadAiDocument).mock.calls[0][0]).toMatchObject({ title: "chapter-4", classId: "c1", subjectId: "s1", visibility: "Class" });
  });

  it("blocks unsupported files before uploading", async () => {
    vi.mocked(studyApi.listAiDocuments).mockResolvedValue([]);
    const user = userEvent.setup({ applyAccept: false });
    renderWithProviders(<StudyMaterialsPanel />);

    await user.upload(screen.getByLabelText("File"), new File(["x"], "photo.png"));
    await user.click(screen.getByRole("button", { name: /pick class/i }));

    expect(screen.getByText(/only .pdf/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /upload and index/i })).toBeDisabled();
  });

  it("deletes a material after confirmation", async () => {
    vi.mocked(studyApi.listAiDocuments).mockResolvedValue([doc({})]);
    vi.mocked(studyApi.deleteAiDocument).mockResolvedValue();
    const user = userEvent.setup();
    renderWithProviders(<StudyMaterialsPanel />);

    await user.click(await screen.findByRole("button", { name: "Delete Force and Pressure" }));
    await user.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(vi.mocked(studyApi.deleteAiDocument).mock.calls[0][0]).toBe("d1"));
  });
});
