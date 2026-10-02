import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders, signIn, signOut } from "@/test/utils";
import AssignHomeworkButton from "./AssignHomeworkButton";
import * as homeworkApi from "@/features/homework/api";

vi.mock("react-hot-toast", () => ({ default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));
vi.mock("@/features/homework/api", () => ({ createHomework: vi.fn() }));
vi.mock("@/features/academics/api", () => ({
  listClasses: vi.fn(async () => [{ id: "c1", name: "Grade 7" }]),
  listSubjects: vi.fn(async () => [{ id: "s1", name: "Maths", classIds: ["c1"] }]),
  listSections: vi.fn(async () => []),
}));
vi.mock("@/features/teachers/api", () => ({
  listTeachers: vi.fn(async () => [
    { id: "staff-1", firstName: "Daniel", lastName: "Reyes", email: "Teacher@Educore.dev" },
    { id: "staff-2", firstName: "Other", lastName: "Teacher", email: "other@educore.dev" },
  ]),
}));

describe("AssignHomeworkButton", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(signOut);

  it("opens the homework form prefilled from the draft and saves it as a draft for the signed-in teacher", async () => {
    signIn("teacher", { email: "teacher@educore.dev" });
    vi.mocked(homeworkApi.createHomework).mockImplementation(async (v) => ({ ...v, id: "h1", tenantId: "t", branchId: "b" }));
    const user = userEvent.setup();
    renderWithProviders(<AssignHomeworkButton title="Fractions practice" description={"1. Add 1/2 and 1/3."} classId="c1" subjectId="s1" />);

    // Wait for the teacher list so the signed-in teacher can be matched.
    await waitFor(async () => {
      const { listTeachers } = await import("@/features/teachers/api");
      expect(listTeachers).toHaveBeenCalled();
    });
    await new Promise((r) => setTimeout(r, 0));
    await user.click(screen.getByRole("button", { name: "Assign as homework" }));

    expect(await screen.findByLabelText(/^title/i)).toHaveValue("Fractions practice");
    expect(screen.getByLabelText(/^description/i)).toHaveValue("1. Add 1/2 and 1/3.");
    await user.click(screen.getByRole("button", { name: "Create homework" }));

    await waitFor(() => expect(homeworkApi.createHomework).toHaveBeenCalledTimes(1));
    expect(vi.mocked(homeworkApi.createHomework).mock.calls[0][0]).toMatchObject({
      title: "Fractions practice", classId: "c1", subjectId: "s1", staffId: "staff-1", status: "draft", sectionId: undefined,
    });
    expect(await screen.findByRole("button", { name: "Assigned as homework" })).toBeDisabled();
  });
});
