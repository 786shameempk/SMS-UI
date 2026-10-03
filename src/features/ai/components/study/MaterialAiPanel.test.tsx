import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test/utils";
import MaterialAiPanel from "./MaterialAiPanel";
import * as studyApi from "../../study/api";
import type { AiDocument } from "../../study/types";

vi.mock("react-hot-toast", () => ({ default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));
vi.mock("../../study/api", async (original) => ({
  ...(await original<typeof import("../../study/api")>()),
  getMaterialIndex: vi.fn(),
  indexMaterial: vi.fn(),
  askStudyAssistant: vi.fn(),
}));

const doc = (patch: Partial<AiDocument>): AiDocument => ({
  id: "d1", title: "Fractions", fileName: "fractions.pdf", sizeBytes: 100, classId: "c", subjectId: "s", visibility: "StaffOnly",
  status: "Ready", errorCode: null, pageCount: 12, chunkCount: 30, jobId: "j", progress: 100, createdAt: "2026-10-01T00:00:00Z", ...patch,
});

describe("MaterialAiPanel", () => {
  beforeEach(() => vi.clearAllMocks());

  it("answers questions about a ready material with page citations", async () => {
    vi.mocked(studyApi.getMaterialIndex).mockResolvedValue(doc({}));
    vi.mocked(studyApi.askStudyAssistant).mockResolvedValue({
      conversationId: "c1", answer: "A proper fraction is less than one.", usedMaterial: true, notice: null,
      sources: [{ documentId: "d1", documentName: "Fractions", page: 4 }],
    });
    const user = userEvent.setup();
    renderWithProviders(<MaterialAiPanel materialId="m1" fileName="fractions.pdf" canPrepare={false} />);

    expect(await screen.findByText("Ready for AI")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Explain" }));
    await user.type(screen.getByLabelText("Question about this material"), "proper vs improper?");
    await user.click(screen.getByRole("button", { name: /send/i }));

    expect(await screen.findByLabelText("AI answer")).toHaveTextContent("A proper fraction is less than one.");
    expect(screen.getByText("[1] Fractions, page 4")).toBeInTheDocument();
    expect(vi.mocked(studyApi.askStudyAssistant).mock.calls[0][0]).toEqual({ message: "proper vs improper?", mode: "Explain", materialId: "m1", conversationId: undefined });
    expect(screen.queryByRole("button", { name: /refresh/i })).not.toBeInTheDocument();
  });

  it("lets staff prepare a material that was never indexed, and tells learners to ask their teacher", async () => {
    vi.mocked(studyApi.getMaterialIndex).mockResolvedValue(null);
    vi.mocked(studyApi.indexMaterial).mockResolvedValue(doc({ status: "Queued", progress: 0 }));
    const user = userEvent.setup();
    const { unmount } = renderWithProviders(<MaterialAiPanel materialId="m1" fileName="fractions.pdf" canPrepare />);

    await user.click(await screen.findByRole("button", { name: /prepare for ai/i }));

    await waitFor(() => expect(studyApi.indexMaterial).toHaveBeenCalledWith("m1", false));
    expect(await screen.findByRole("progressbar", { name: "Preparing for AI" })).toBeInTheDocument();
    unmount();

    renderWithProviders(<MaterialAiPanel materialId="m1" fileName="fractions.pdf" canPrepare={false} />);
    expect(await screen.findByText(/your teacher hasn.t enabled ai/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /prepare for ai/i })).not.toBeInTheDocument();
  });

  it("offers a retry after a failed read, and explains that links and other files cannot be read", async () => {
    vi.mocked(studyApi.getMaterialIndex).mockResolvedValue(doc({ status: "Failed", errorCode: "AI_DOCUMENT_PROCESSING_ERROR" }));
    vi.mocked(studyApi.indexMaterial).mockResolvedValue(doc({ status: "Queued" }));
    const user = userEvent.setup();
    const { unmount } = renderWithProviders(<MaterialAiPanel materialId="m1" fileName="scan.pdf" canPrepare />);

    await user.click(await screen.findByRole("button", { name: /try again/i }));
    await waitFor(() => expect(studyApi.indexMaterial).toHaveBeenCalledWith("m1", true));
    unmount();

    renderWithProviders(<MaterialAiPanel materialId="m2" fileName="photo.jpg" canPrepare />);
    expect(screen.getByText(/ai can read uploaded pdf/i)).toBeInTheDocument();
    expect(studyApi.getMaterialIndex).not.toHaveBeenCalledWith("m2");
  });
});
