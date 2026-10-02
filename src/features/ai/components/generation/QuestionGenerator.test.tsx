import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test/utils";
import QuestionGenerator from "./QuestionGenerator";
import * as generationApi from "../../generation/api";
import * as examApi from "@/features/online-exams/api";

vi.mock("react-hot-toast", () => ({ default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));
vi.mock("../../generation/api", () => ({ generateQuestions: vi.fn() }));
vi.mock("@/features/online-exams/api", () => ({ importQuestions: vi.fn() }));
// Radix Select is awkward in jsdom; a plain button stands in for choosing a class and subject.
vi.mock("./shared", async (original) => ({
  ...(await original<typeof import("./shared")>()),
  ClassSubjectFields: ({ onChange }: { onChange: (v: { classId: string; subjectId: string }) => void }) => (
    <button onClick={() => onChange({ classId: "c1", subjectId: "s1" })}>pick class and subject</button>
  ),
}));

const draft = {
  content: {
    questions: [
      { question: "What is force?", type: "ShortAnswer" as const, marks: 2, difficulty: "Easy" as const, options: [], correctAnswer: "A push or pull", explanation: "Definition", learningObjective: "Define force" },
      { question: "Unit of force?", type: "MCQ" as const, marks: 1, difficulty: "Medium" as const, options: ["Newton", "Joule", "Watt", "Pascal"], correctAnswer: "Newton", explanation: "SI unit", learningObjective: "Units" },
    ],
  },
  aiGenerated: true,
  status: "Draft" as const,
  model: "m",
};

async function generateDraft(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /pick class/i }));
  await user.type(screen.getByLabelText(/chapter/i), "Force");
  await user.click(screen.getByRole("button", { name: /generate draft/i }));
}

describe("QuestionGenerator", () => {
  beforeEach(() => vi.clearAllMocks());

  it("asks for the missing fields before calling the AI", async () => {
    const user = userEvent.setup();
    renderWithProviders(<QuestionGenerator />);

    await user.click(screen.getByRole("button", { name: /generate draft/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Choose a class.");
    expect(generationApi.generateQuestions).not.toHaveBeenCalled();
  });

  it("shows an AI-generated draft, lets the teacher edit it, and only saves on approval", async () => {
    const user = userEvent.setup();
    vi.mocked(generationApi.generateQuestions).mockResolvedValue(draft);
    vi.mocked(examApi.importQuestions).mockResolvedValue({ imported: 2, errors: [] });
    renderWithProviders(<QuestionGenerator />);

    await generateDraft(user);

    expect(await screen.findByText("AI generated")).toBeInTheDocument();
    expect(screen.getByText(/Draft — review before use/)).toBeInTheDocument();
    expect(vi.mocked(generationApi.generateQuestions).mock.calls[0][0]).toMatchObject({ classId: "c1", subjectId: "s1", chapter: "Force", questionCount: 10 });
    expect(examApi.importQuestions).not.toHaveBeenCalled();

    const text = screen.getByLabelText("Question 1 text");
    await user.clear(text);
    await user.type(text, "Define force in your own words.");
    await user.click(screen.getByRole("button", { name: /approve & add to question bank/i }));

    await waitFor(() => expect(examApi.importQuestions).toHaveBeenCalledTimes(1));
    const sent = vi.mocked(examApi.importQuestions).mock.calls[0][0];
    expect(sent).toHaveLength(2);
    expect(sent[0].content.text).toBe("Define force in your own words.");
    expect(sent.every((q) => q.tags.includes("ai-generated"))).toBe(true);
    expect(await screen.findByText("Added to question bank")).toBeInTheDocument();
  });

  it("starts from the given defaults and files approved questions under what was generated", async () => {
    const user = userEvent.setup();
    const onPublished = vi.fn();
    vi.mocked(generationApi.generateQuestions).mockResolvedValue(draft);
    vi.mocked(examApi.importQuestions).mockResolvedValue({ imported: 2, errors: [] });
    renderWithProviders(<QuestionGenerator defaults={{ classId: "c9", subjectId: "s9", chapter: "Light" }} onPublished={onPublished} />);

    expect(screen.getByLabelText(/chapter/i)).toHaveValue("Light");
    await user.click(screen.getByRole("button", { name: /generate draft/i }));
    await screen.findByText("AI generated");
    // Changing the form after generating must not move the draft to another class or topic.
    await user.click(screen.getByRole("button", { name: /pick class/i }));
    await user.clear(screen.getByLabelText(/chapter/i));
    await user.type(screen.getByLabelText(/chapter/i), "Sound");
    await user.click(screen.getByRole("button", { name: /approve & add to question bank/i }));

    await waitFor(() => expect(examApi.importQuestions).toHaveBeenCalledTimes(1));
    expect(vi.mocked(examApi.importQuestions).mock.calls[0][0][0]).toMatchObject({ classId: "c9", subjectId: "s9", topic: "Light" });
    await waitFor(() => expect(onPublished).toHaveBeenCalled());
  });

  it("rejecting a draft discards it without saving", async () => {
    const user = userEvent.setup();
    vi.mocked(generationApi.generateQuestions).mockResolvedValue(draft);
    renderWithProviders(<QuestionGenerator />);
    await generateDraft(user);
    await screen.findByText("AI generated");

    await user.click(screen.getByRole("button", { name: /reject/i }));

    expect(screen.queryByText("AI generated")).not.toBeInTheDocument();
    expect(examApi.importQuestions).not.toHaveBeenCalled();
  });

  it("removing every question blocks approval", async () => {
    const user = userEvent.setup();
    vi.mocked(generationApi.generateQuestions).mockResolvedValue({ ...draft, content: { questions: [draft.content.questions[0]] } });
    renderWithProviders(<QuestionGenerator />);
    await generateDraft(user);
    await screen.findByText("AI generated");

    await user.click(screen.getByRole("button", { name: /remove question 1/i }));

    expect(screen.getByRole("button", { name: /approve & add to question bank/i })).toBeDisabled();
  });

  it("disables the generate button while waiting for the AI", async () => {
    const user = userEvent.setup();
    let release!: (v: typeof draft) => void;
    vi.mocked(generationApi.generateQuestions).mockReturnValue(new Promise((r) => (release = r)));
    renderWithProviders(<QuestionGenerator />);

    await generateDraft(user);

    await waitFor(() => expect(screen.getByRole("button", { name: /generate draft/i })).toBeDisabled());
    release(draft);
    await screen.findByText("AI generated");
  });
});
