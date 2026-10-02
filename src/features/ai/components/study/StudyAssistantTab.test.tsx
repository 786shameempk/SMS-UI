import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders, signIn, signOut } from "@/test/utils";
import StudyAssistantTab from "./StudyAssistantTab";
import * as studyApi from "../../study/api";

vi.mock("../../study/api", () => ({ askStudyAssistant: vi.fn() }));
vi.mock("@/features/parent-portal/api", () => ({ getMyChildren: vi.fn(async () => []) }));
vi.mock("@/features/academics/api", () => ({ listClasses: vi.fn(async () => []) }));

describe("StudyAssistantTab", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(signOut);

  it("sends the question with the chosen mode and shows page citations", async () => {
    signIn("student");
    vi.mocked(studyApi.askStudyAssistant).mockResolvedValue({
      conversationId: "c1", answer: "Friction is a force that resists motion.", usedMaterial: true, notice: null,
      sources: [{ documentId: "d1", documentName: "Force and Pressure", page: 3 }],
    });
    const user = userEvent.setup();
    renderWithProviders(<StudyAssistantTab />);

    await user.click(screen.getByRole("button", { name: "Quiz me" }));
    await user.type(screen.getByLabelText("Study question"), "friction{enter}");

    expect(await screen.findByText("Friction is a force that resists motion.")).toBeInTheDocument();
    expect(screen.getByText("[1] Force and Pressure, page 3")).toBeInTheDocument();
    expect(vi.mocked(studyApi.askStudyAssistant).mock.calls[0][0]).toMatchObject({ message: "Quiz me on: friction", mode: "Quiz", studentId: undefined, classId: undefined });
  });

  it("says when the answer did not come from school materials", async () => {
    signIn("student");
    vi.mocked(studyApi.askStudyAssistant).mockResolvedValue({ conversationId: "c1", answer: "General answer.", usedMaterial: false, notice: null, sources: [] });
    const user = userEvent.setup();
    renderWithProviders(<StudyAssistantTab />);

    await user.click(screen.getByRole("button", { name: "Ask" }));
    await user.type(screen.getByLabelText("Study question"), "what is gravity{enter}");

    expect(await screen.findByText(/not found in your school materials/i)).toBeInTheDocument();
  });

  it("shows errors in the conversation", async () => {
    signIn("student");
    vi.mocked(studyApi.askStudyAssistant).mockRejectedValue(new Error("You have reached your daily AI request limit."));
    const user = userEvent.setup();
    renderWithProviders(<StudyAssistantTab />);

    await user.type(screen.getByLabelText("Study question"), "x{enter}");

    await waitFor(() => expect(screen.getByText("You have reached your daily AI request limit.")).toBeInTheDocument());
  });
});
