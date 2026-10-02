import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test/utils";
import RemarkAssistant from "./RemarkAssistant";
import * as generationApi from "../../generation/api";

vi.mock("../../generation/api", () => ({ generateReportCardRemark: vi.fn() }));

const draft = {
  content: { remark: "Ravi did very well in Maths and should revise English grammar.", basedOn: ["Exam marks", "Your observations"] },
  aiGenerated: true,
  status: "Draft" as const,
  model: "m",
};

describe("RemarkAssistant", () => {
  beforeEach(() => vi.clearAllMocks());

  it("drafts a remark from the exam and only hands it over when the teacher chooses to use it", async () => {
    vi.mocked(generationApi.generateReportCardRemark).mockResolvedValue(draft);
    const onUse = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<RemarkAssistant examId="e1" studentId="s1" onUse={onUse} />);

    await user.click(screen.getByRole("button", { name: /draft with ai/i }));
    await user.type(screen.getByLabelText(/your observations/i), "Participates well");
    await user.click(screen.getByRole("button", { name: /generate draft/i }));

    expect(await screen.findByLabelText("Draft remark")).toHaveTextContent(draft.content.remark);
    expect(screen.getByText("Exam marks")).toBeInTheDocument(); // "Based on" badges
    expect(vi.mocked(generationApi.generateReportCardRemark).mock.calls[0][0]).toEqual({
      examId: "e1", studentId: "s1", tone: "Encouraging", length: "Medium", observations: "Participates well",
    });
    expect(onUse).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /use this remark/i }));
    expect(onUse).toHaveBeenCalledWith(draft.content.remark);
  });

  it("shows the server's reason when no draft can be made", async () => {
    vi.mocked(generationApi.generateReportCardRemark).mockRejectedValue(new Error("No marks are recorded for this student in this exam yet."));
    const user = userEvent.setup();
    renderWithProviders(<RemarkAssistant examId="e1" studentId="s1" onUse={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /draft with ai/i }));
    await user.click(screen.getByRole("button", { name: /generate draft/i }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("No marks are recorded"));
    expect(screen.queryByRole("button", { name: /use this remark/i })).not.toBeInTheDocument();
  });
});
